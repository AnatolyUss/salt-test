import * as http from 'node:http';

import { Express } from 'express-serve-static-core';
const supertest = require('supertest');
import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';

import { getExpressApp } from '../../src/lib/app';
import { disconnectRedisClient } from '../../src/storage/redis/data-source';
import { dropMongoConnections } from '../../src/storage/mongo/data-source';
import { Model } from '../../src/storage/mongo/entity/model.entity';

describe('model tests', (): void => {
  let server: http.Server;
  let app: Express;
  let redisClient: any;

  beforeAll(async (): Promise<void> => {
    ({ app, redisClient } = await getExpressApp());
    server = app.listen();
  });

  afterAll(async (): Promise<void> => {
    await Promise.all([dropMongoConnections(), disconnectRedisClient(redisClient)]);
    server.close();
  });

  it('', async (): Promise<void> => {
    const response = await supertest.agent(server).post('/model').send({ a: 1, b: 2 });

    expect(response.status).toBe(201);
    // expect(response.headers.location).toBe(targetUrl);
  });
});
