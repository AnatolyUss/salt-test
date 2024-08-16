import * as http from 'node:http';

import { Express } from 'express-serve-static-core';
const supertest = require('supertest');
import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';

import { getExpressApp } from '../../src/lib/app';
import { disconnectRedisClient } from '../../src/storage/redis/data-source';
import { dropMongoConnections } from '../../src/storage/mongo/data-source';
import { ModelEntity } from '../../src/storage/mongo/entity/model.entity';
import { ModelService } from '../../src/service/model.service';

describe('model tests', (): void => {
  let server: http.Server;
  let app: Express;
  let redisClient: any;
  const modelService = new ModelService();
  const path = '/orders/update';
  const method = 'PATCH';

  beforeAll(async (): Promise<void> => {
    ({ app, redisClient } = await getExpressApp());
    server = app.listen();
  });

  afterAll(async (): Promise<void> => {
    await Promise.all([dropMongoConnections(), disconnectRedisClient(redisClient)]);
    server.close();
  });

  afterEach(async (): Promise<void> => {
    await Promise.all([
      redisClient.del(modelService.getKey(path, method)),
      ModelEntity.deleteOne({ path, method }),
    ]);
  });

  it('should save "PATCH /orders/update" successfully', async (): Promise<void> => {
    const model = {
      path,
      method,
      query_params: [],
      headers: [
        {
          name: 'Authorization',
          types: ['Auth-Token'],
          required: true,
        },
      ],
      body: [
        {
          name: 'order_id',
          types: ['Int', 'UUID'],
          required: true,
        },
        {
          name: 'address',
          types: ['String'],
          required: false,
        },
        {
          name: 'order_type',
          types: ['Int'],
          required: false,
        },
        {
          name: 'items',
          types: ['List'],
          required: false,
        },
      ],
    };

    const response = await supertest.agent(server).post('/model').send(model);

    expect(response.status).toBe(201);
    expect(response.body.data).toBe('Ok');
  });

  it('should fail to save "PATCH /orders/update" due to malformed input', async (): Promise<void> => {
    const model = {
      path,
      method,
      query_params: [],
      headers: [
        {
          name: 'Authorization',
          types: ['Auth-Token'],
          required: true,
        },
      ],
      body: [
        {
          name: 'order_id',
          types: ['Int', 'uuid'],
          required: true,
        },
        {
          name: 'address',
          types: [],
          required: false,
        },
        {
          name: 'order_type',
          types: ['Int'],
        },
        {
          name: 'items',
          types: ['List'],
          required: false,
        },
      ],
    };

    const response = await supertest.agent(server).post('/model').send(model);

    expect(response.status).toBe(400);
    expect(response.body.data).toBe('Validation failed');

    const errors = JSON.parse(response.body.error);
    const errors0 = errors[0].children[0].children[0].constraints;
    expect(errors0).toStrictEqual({
      isEnum:
        '"types" can only be one of following: Int,String,Boolean,List,Date,Email,UUID,Auth-Token',
    });

    const errors1 = errors[0].children[1].children[0].constraints;
    expect(errors1).toStrictEqual({
      arrayNotEmpty: '"types" array must be non empty',
    });

    const errors2 = errors[0].children[2].children[0].constraints;
    expect(errors2).toStrictEqual({
      isDefined: '"required" is missing',
      isBoolean: '"required" must be a boolean',
    });
  });
});
