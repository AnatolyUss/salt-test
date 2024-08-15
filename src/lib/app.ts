import 'dotenv/config';
import 'reflect-metadata';

import * as express from 'express';
import { Express } from 'express-serve-static-core';
import * as bodyParser from 'body-parser';
import * as connectTimeout from 'connect-timeout';
import helmet from 'helmet';
import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { ensureMongoConnection } from '../storage/mongo/data-source';
import { getRedisClient } from '../storage/redis/data-source';
import { ResponseDto } from '../dto/response.dto';
import { ModelDto } from '../dto/model.dto';
import { ModelService } from '../service/model.service';

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

  app.post(
    '/model',
    async (request: express.Request, response: express.Response): Promise<void> => {
      try {
        const modelDto = plainToInstance(ModelDto, request.body);
        const errors = validateSync(modelDto);

        if (errors.length !== 0) {
          response.status(400).json(new ResponseDto('Validation failed', JSON.stringify(errors)));
          return;
        }

        const modelService = new ModelService();
        await modelService.saveModel(modelDto);
        response.status(201).json(new ResponseDto('Ok'));
      } catch (error) {
        console.error('"POST /model" errors', error);
        response.status(500).json(new ResponseDto('Error occurred'));
      }
    },
  );

  app.post(
    '/request',
    async (request: express.Request, response: express.Response): Promise<void> => {
      //
      // The status is 200 instead of 201 as per explicit request at the task definition.
      response.status(200).json(new ResponseDto('Ok'));
    },
  );

  return { app, redisClient };
};
