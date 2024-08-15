import 'dotenv/config';
import 'reflect-metadata';

import * as express from 'express';
import { Express } from 'express-serve-static-core';
import * as bodyParser from 'body-parser';
import * as connectTimeout from 'connect-timeout';
import helmet from 'helmet';

import { ensureMongoConnection } from '../storage/mongo/data-source';
import { getRedisClient } from '../storage/redis/data-source';
import { ResponseDto } from '../dto/response.dto';

export const getExpressApp = async (): Promise<{ app: Express; redisClient: any }> => {
  process
    .on('unhandledRejection', (reason, promise): void => {
      console.error(reason, 'Unhandled Promise rejection', promise);
    })
    .on('uncaughtException', (error: Error): void => {
      console.error(error, 'Uncaught Exception thrown');
      process.exit(1);
    });

  const [redisClient] = await Promise.all([getRedisClient(), ensureMongoConnection()]);
  const app: Express = express();

  app.use(connectTimeout(process.env.CONNECT_TIMEOUT as string));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(helmet()); // Protect the app from some well-known web vulnerabilities by setting HTTP headers appropriately.

  app.post('/model', (request: express.Request, response: express.Response): void => {
    response.status(201).json(new ResponseDto('Ok'));
  });

  app.post('/request', (request: express.Request, response: express.Response): void => {
    // The status is 200 instead of 201 as per explicit request at the task definition.
    response.status(200).json(new ResponseDto('Ok'));
  });

  return { app, redisClient };
};
