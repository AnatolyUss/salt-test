import * as http from 'node:http';

import { Express } from 'express-serve-static-core';
import { plainToInstance } from 'class-transformer';
const supertest = require('supertest');
import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';

import { getExpressApp } from '../../src/lib/app';
import { disconnectRedisClient, getRedisClient } from '../../src/storage/redis/data-source';
import { dropMongoConnections } from '../../src/storage/mongo/data-source';
import { ModelEntity } from '../../src/storage/mongo/entity/model.entity';
import { ModelDto } from '../../src/dto/model.dto';
import { ModelService } from '../../src/service/model.service';
import models from '../fixtures/model.fixture';

describe('request service integration tests', (): void => {
  let server: http.Server;
  let app: Express;
  let redisClient: any;
  const modelService = new ModelService();

  beforeAll(async (): Promise<void> => {
    ({ app, redisClient } = await getExpressApp());
    server = app.listen();

    // Load models to both MongoDB and Redis.
    await Promise.all(
      models.map(async (rawModel: Record<string, any>): Promise<void> => {
        const modelDto = plainToInstance(ModelDto, rawModel);
        await modelService.saveModel(modelDto);
      }),
    );
  });

  afterAll(async (): Promise<void> => {
    await Promise.all(
      models.map(async (rawModel: Record<string, any>): Promise<void> => {
        await Promise.all([
          redisClient.del(modelService.getKey(rawModel.path, rawModel.method)),
          ModelEntity.deleteOne({ path: rawModel.path, method: rawModel.method }),
        ]);
      }),
    );

    await Promise.all([dropMongoConnections(), disconnectRedisClient(redisClient)]);
    server.close();
  });

  it('should yield no abnormalities for endpoint "GET /users/info"', async (): Promise<void> => {
    const request = {
      path: '/users/info',
      method: 'GET',
      query_params: [
        {
          name: 'with_extra_data',
          value: false,
        },
      ],
      headers: [
        {
          name: 'Authorization',
          value: 'Bearer 56ee9b7a-da8e-45a1-aade-a57761b912c4',
        },
      ],
      body: [],
    };

    const response = await supertest.agent(server).post('/request').send(request);

    expect(response.status).toBe(200);
    expect(response.body.data).toStrictEqual({
      isAbnormal: false,
      abnormalFields: {},
    });
  });

  it('should yield abnormalities for endpoint "GET /users/info", due to missing "Authorization" header and user_id type missmatch', async (): Promise<void> => {
    const request = {
      path: '/users/info',
      method: 'GET',
      query_params: [
        {
          name: 'with_extra_data',
          value: true,
        },
        {
          name: 'user_id',
          value: 'd9b96787786b',
        },
      ],
      headers: [],
      body: [],
    };

    const response = await supertest.agent(server).post('/request').send(request);

    expect(response.status).toBe(200);
    expect(response.body.data).toStrictEqual({
      isAbnormal: true,
      abnormalFields: {
        'query_params:user_id': [
          {
            type: 'type_missmatch',
            description: 'Field user_id must be of type[s] Int,UUID',
          },
        ],
        'headers:Authorization': [
          {
            type: 'required_field_missing',
            description: 'Required field Authorization is missing',
          },
        ],
      },
    });
  });

  it('should yield no abnormalities for endpoint "GET /users/info", --', async (): Promise<void> => {
    const request = {
      path: '/users/info',
      method: 'GET',
      query_params: [
        {
          name: 'with_extra_data',
          value: false,
        },
      ],
      headers: [
        {
          name: 'Authorization',
          value: 'Bearer 8aaadc6a-fe9c-4014-b425-75421022aebe',
        },
      ],
      body: [],
    };

    const response = await supertest.agent(server).post('/request').send(request);

    expect(response.status).toBe(200);
    expect(response.body.data).toStrictEqual({
      isAbnormal: false,
      abnormalFields: {},
    });
  });
});
