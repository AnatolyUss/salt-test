import * as http from 'node:http';

import { Express } from 'express-serve-static-core';
import { plainToInstance } from 'class-transformer';
const supertest = require('supertest');
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

import { getExpressApp } from '../../src/lib/app';
import { disconnectRedisClient } from '../../src/storage/redis/data-source';
import { dropMongoConnections } from '../../src/storage/mongo/data-source';
import { ModelEntity } from '../../src/storage/mongo/entity/model.entity';
import { ModelDto } from '../../src/dto/model.dto';
import { ModelService } from '../../src/service/model.service';
import models from '../fixture/model.fixture';

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
    // Purge models from both MongoDB and Redis.
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

  it('should yield abnormalities for endpoint "POST /users/create", due to multiple types of errors/mismatches', async (): Promise<void> => {
    const request = {
      path: '/users/create',
      method: 'POST',
      query_params: [],
      headers: [],
      body: [
        {
          name: 'firstName',
          value: 'John',
        },
        {
          name: 'lastName',
          value: 777,
        },
        {
          name: 'phone',
          value: '0555555555',
        },
        {
          name: 'email',
          value: '@@doe.test',
        },
        {
          name: 'email_2',
          value: 'abc@mail.test',
        },
        {
          name: 'username',
          value: 'john_doe',
        },
        {
          name: 'the-password',
          value: 'test',
        },
        {
          name: 'address',
          value: 'Test Road',
        },
        {
          name: 'dob',
          value: '01-21-1980',
        },
      ],
    };

    const response = await supertest.agent(server).post('/request').send(request);

    expect(response.status).toBe(200);
    expect(response.body.data).toStrictEqual({
      isAbnormal: true,
      abnormalFields: {
        'body:lastName': [
          {
            type: 'type_missmatch',
            description: 'Field lastName must be of type[s] String',
          },
        ],
        'body:email': [
          {
            type: 'type_missmatch',
            description: 'Field email must be of type[s] Email',
          },
        ],
        'body:email_2': [
          {
            type: 'validation_template_missing',
            description: 'Field email_2 missing validation template',
          },
        ],
        'body:the-password': [
          {
            type: 'validation_template_missing',
            description: 'Field the-password missing validation template',
          },
        ],
        'body:dob': [
          {
            type: 'type_missmatch',
            description: 'Field dob must be of type[s] Date',
          },
        ],
        'body:password': [
          {
            type: 'required_field_missing',
            description: 'Required field password is missing',
          },
        ],
      },
    });
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

  it('should yield no abnormalities for endpoint "GET /users/info", everything is correct', async (): Promise<void> => {
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

  it('should yield abnormalities for endpoint "GET /users/info", due to user_id type_missmatch', async (): Promise<void> => {
    const request = {
      path: '/users/info',
      method: 'GET',
      query_params: [
        {
          name: 'user_id',
          value: '0769e264b503',
        },
      ],
      headers: [
        {
          name: 'Authorization',
          value: 'Bearer 8c7d5996-7318-4a93-bc07-ea4734e333ce',
        },
      ],
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
      },
    });
  });

  it('should yield no abnormalities for endpoint "POST /users/create"', async (): Promise<void> => {
    const request = {
      path: '/users/create',
      method: 'POST',
      query_params: [],
      headers: [],
      body: [
        {
          name: 'firstName',
          value: 'John',
        },
        {
          name: 'lastName',
          value: 'Doe',
        },
        {
          name: 'phone',
          value: '0555555555',
        },
        {
          name: 'email',
          value: 'john@doe.test',
        },
        {
          name: 'username',
          value: 'john_doe',
        },
        {
          name: 'password',
          value: 'test',
        },
        {
          name: 'address',
          value: 'Test Road',
        },
        {
          name: 'dob',
          value: '01-01-1980',
        },
      ],
    };

    const response = await supertest.agent(server).post('/request').send(request);

    expect(response.status).toBe(200);
    expect(response.body.data).toStrictEqual({
      isAbnormal: false,
      abnormalFields: {},
    });
  });

  it('should yield abnormalities for endpoint "POST /users/create", due to missing firstName', async (): Promise<void> => {
    const request = {
      path: '/users/create',
      method: 'POST',
      query_params: [],
      headers: [],
      body: [
        {
          name: 'lastName',
          value: 'Doe2',
        },
        {
          name: 'phone',
          value: 'no',
        },
        {
          name: 'email',
          value: 'john2@doe.test',
        },
        {
          name: 'username',
          value: 'john_doe',
        },
        {
          name: 'password',
          value: 'test2',
        },
        {
          name: 'address',
          value: 'Test Road',
        },
        {
          name: 'dob',
          value: '01-01-1980',
        },
      ],
    };

    const response = await supertest.agent(server).post('/request').send(request);

    expect(response.status).toBe(200);
    expect(response.body.data).toStrictEqual({
      isAbnormal: true,
      abnormalFields: {
        'body:firstName': [
          {
            type: 'required_field_missing',
            description: 'Required field firstName is missing',
          },
        ],
      },
    });
  });

  it('should yield no abnormalities for endpoint "POST /users/create", although some optional fields are missing', async (): Promise<void> => {
    const request = {
      path: '/users/create',
      method: 'POST',
      query_params: [],
      headers: [],
      body: [
        {
          name: 'firstName',
          value: 'John3',
        },
        {
          name: 'lastName',
          value: 'Doe3',
        },
        {
          name: 'phone',
          value: '0565555555',
        },
        {
          name: 'email',
          value: 'john3@doe3.test',
        },
        {
          name: 'username',
          value: 'john_doe3',
        },
        {
          name: 'password',
          value: 'test3',
        },
      ],
    };

    const response = await supertest.agent(server).post('/request').send(request);

    expect(response.status).toBe(200);
    expect(response.body.data).toStrictEqual({
      isAbnormal: false,
      abnormalFields: {},
    });
  });

  it('should yield abnormalities for endpoint "POST /users/create", due to malformed email', async (): Promise<void> => {
    const request = {
      path: '/users/create',
      method: 'POST',
      query_params: [],
      headers: [],
      body: [
        {
          name: 'firstName',
          value: 'John4',
        },
        {
          name: 'lastName',
          value: 'Doe4',
        },
        {
          name: 'phone',
          value: '0555855555',
        },
        {
          name: 'email',
          value: 777777,
        },
        {
          name: 'username',
          value: 'john_doe4',
        },
        {
          name: 'password',
          value: 'test4',
        },
        {
          name: 'address',
          value: 'Test Road',
        },
      ],
    };

    const response = await supertest.agent(server).post('/request').send(request);

    expect(response.status).toBe(200);
    expect(response.body.data).toStrictEqual({
      isAbnormal: true,
      abnormalFields: {
        'body:email': [
          {
            type: 'type_missmatch',
            description: 'Field email must be of type[s] Email',
          },
        ],
      },
    });
  });

  it('should yield no abnormalities for endpoint "GET /orders/info"', async (): Promise<void> => {
    const request = {
      path: '/orders/info',
      method: 'GET',
      query_params: [
        {
          name: 'order_id',
          value: '8c7d5996-7318-4a93-bc07-ea4734e333ce',
        },
      ],
      headers: [
        {
          name: 'Authorization',
          value: 'Bearer ebb3cbbe938c4776bd22a4ec2ea8b2ca',
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

  it('should yield no abnormalities for endpoint "GET /orders/info", no required params in query_params', async (): Promise<void> => {
    const request = {
      path: '/orders/info',
      method: 'GET',
      query_params: [],
      headers: [
        {
          name: 'Authorization',
          value: 'Bearer ebb3cbbe938c4776bd22a4ec2ea8b2ca',
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

  it('should yield no abnormalities for endpoint "GET /orders/info"', async (): Promise<void> => {
    const request = {
      path: '/orders/info',
      method: 'GET',
      query_params: [
        {
          name: 'order_id',
          value: 55555,
        },
      ],
      headers: [
        {
          name: 'Authorization',
          value: 'Bearer ebb3cbbe938c4776bd22a4ec2ea8b2ca',
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

  it('should yield no abnormalities for endpoint "POST /orders/create"', async (): Promise<void> => {
    const request = {
      path: '/orders/create',
      method: 'POST',
      query_params: [],
      headers: [
        {
          name: 'Authorization',
          value: 'Bearer ebb3cbbe938c4776bd22a4ec2ea8b2ca',
        },
      ],
      body: [
        {
          name: 'address',
          value: 'Test Road',
        },
        {
          name: 'order_type',
          value: 4,
        },
        {
          name: 'items',
          value: [
            {
              id: 'a5',
              amount: 5,
            },
            {
              id: 'a3',
              amount: 2,
            },
          ],
        },
      ],
    };

    const response = await supertest.agent(server).post('/request').send(request);

    expect(response.status).toBe(200);
    expect(response.body.data).toStrictEqual({
      isAbnormal: false,
      abnormalFields: {},
    });
  });

  it('should yield abnormalities for endpoint "POST /orders/create", due to order_type type missmatch', async (): Promise<void> => {
    const request = {
      path: '/orders/create',
      method: 'POST',
      query_params: [],
      headers: [
        {
          name: 'Authorization',
          value: 'Bearer ebb3cbbe938c4776bd22a4ec2ea8b2ca',
        },
      ],
      body: [
        {
          name: 'address',
          value: 'Test Road',
        },
        {
          name: 'order_type',
          value: 'banana',
        },
        {
          name: 'items',
          value: [
            {
              id: 'a5',
              amount: 5,
            },
          ],
        },
      ],
    };

    const response = await supertest.agent(server).post('/request').send(request);

    expect(response.status).toBe(200);
    expect(response.body.data).toStrictEqual({
      isAbnormal: true,
      abnormalFields: {
        'body:order_type': [
          {
            type: 'type_missmatch',
            description: 'Field order_type must be of type[s] Int',
          },
        ],
      },
    });
  });

  it('should yield abnormalities for endpoint "POST /orders/create", due to address field missing', async (): Promise<void> => {
    const request = {
      path: '/orders/create',
      method: 'POST',
      query_params: [],
      headers: [
        {
          name: 'Authorization',
          value: 'Bearer ebb3cbbe938c4776bd22a4ec2ea8b2ca',
        },
      ],
      body: [
        {
          name: 'order_type',
          value: 3,
        },
        {
          name: 'items',
          value: 55,
        },
      ],
    };

    const response = await supertest.agent(server).post('/request').send(request);

    expect(response.status).toBe(200);
    expect(response.body.data).toStrictEqual({
      isAbnormal: true,
      abnormalFields: {
        'body:items': [
          {
            type: 'type_missmatch',
            description: 'Field items must be of type[s] List',
          },
        ],
        'body:address': [
          {
            type: 'required_field_missing',
            description: 'Required field address is missing',
          },
        ],
      },
    });
  });

  it('should yield no abnormalities for endpoint "PATCH /orders/create"', async (): Promise<void> => {
    const request = {
      path: '/orders/update',
      method: 'PATCH',
      query_params: [],
      headers: [
        {
          name: 'Authorization',
          value: 'Bearer ebb3cbbe938c4776bd22a4ec2ea8b2ca',
        },
      ],
      body: [
        {
          name: 'order_id',
          value: '46da6990-7c28-4a1c-9efa-7c0396067ce4',
        },
        {
          name: 'address',
          value: 'New Test Road',
        },
        {
          name: 'order_type',
          value: 7,
        },
        {
          name: 'items',
          value: [
            {
              id: 'a1',
              amount: 3,
            },
            {
              id: 'a2',
              amount: 4,
            },
          ],
        },
      ],
    };

    const response = await supertest.agent(server).post('/request').send(request);

    expect(response.status).toBe(200);
    expect(response.body.data).toStrictEqual({
      isAbnormal: false,
      abnormalFields: {},
    });
  });

  it('should yield abnormalities for endpoint "PATCH /orders/create", due to missing order_id field', async (): Promise<void> => {
    const request = {
      path: '/orders/update',
      method: 'PATCH',
      query_params: [],
      headers: [
        {
          name: 'Authorization',
          value: 'Bearer ebb3cbbe938c4776bd22a4ec2ea8b2ca',
        },
      ],
      body: [
        {
          name: 'order_type',
          value: 88,
        },
        {
          name: 'items',
          value: [
            {
              id: 'a1',
              amount: 3,
            },
            {
              id: 'a2',
              amount: 4,
            },
          ],
        },
      ],
    };

    const response = await supertest.agent(server).post('/request').send(request);

    expect(response.status).toBe(200);
    expect(response.body.data).toStrictEqual({
      isAbnormal: true,
      abnormalFields: {
        'body:order_id': [
          {
            type: 'required_field_missing',
            description: 'Required field order_id is missing',
          },
        ],
      },
    });
  });

  it('should yield no abnormalities for endpoint "PATCH /orders/create", body params are correct', async (): Promise<void> => {
    const request = {
      path: '/orders/update',
      method: 'PATCH',
      query_params: [],
      headers: [
        {
          name: 'Authorization',
          value: 'Bearer ebb3cbbe938c4776bd22a4ec2ea8b2ca',
        },
      ],
      body: [
        {
          name: 'order_id',
          value: '46da6390-7c78-4a1c-9efa-7c0396067ce4',
        },
        {
          name: 'address',
          value: 'Very New Test Road',
        },
        {
          name: 'order_type',
          value: 8,
        },
        {
          name: 'items',
          value: [
            {
              id: 'a3',
              amount: 3,
            },
            {
              id: 'a5',
              amount: 4,
            },
          ],
        },
      ],
    };

    const response = await supertest.agent(server).post('/request').send(request);

    expect(response.status).toBe(200);
    expect(response.body.data).toStrictEqual({
      isAbnormal: false,
      abnormalFields: {},
    });
  });

  it('should yield abnormalities for endpoint "PATCH /orders/create", due to order_type type missmatch', async (): Promise<void> => {
    const request = {
      path: '/orders/update',
      method: 'PATCH',
      query_params: [],
      headers: [
        {
          name: 'Authorization',
          value: 'Bearer ebb3cbbe938c4776bd22a4ec2ea8b2ca',
        },
      ],
      body: [
        {
          name: 'order_id',
          value: '46da6390-7c78-4a1c-9efa-7c0396067ce4',
        },
        {
          name: 'address',
          value: 'Very New Test Road',
        },
        {
          name: 'order_type',
          value: 'type1',
        },
      ],
    };

    const response = await supertest.agent(server).post('/request').send(request);

    expect(response.status).toBe(200);
    expect(response.body.data).toStrictEqual({
      isAbnormal: true,
      abnormalFields: {
        'body:order_type': [
          {
            type: 'type_missmatch',
            description: 'Field order_type must be of type[s] Int',
          },
        ],
      },
    });
  });

  it('should yield abnormalities for endpoint "PATCH /orders/create", due to address_2 has no validation template', async (): Promise<void> => {
    const request = {
      path: '/orders/update',
      method: 'PATCH',
      query_params: [],
      headers: [
        {
          name: 'Authorization',
          value: 'Bearer ebb3cbbe938c4776bd22a4ec2ea8b2ca',
        },
      ],
      body: [
        {
          name: 'order_id',
          value: '46da6390-7c78-4a1c-9efa-7c0396067ce4',
        },
        {
          name: 'address_2',
          value: 'Very New Test Road',
        },
        {
          name: 'order_type',
          value: 8,
        },
        {
          name: 'items',
          value: [
            {
              id: 'a3',
              amount: 3,
            },
            {
              id: 'a5',
              amount: 4,
            },
          ],
        },
      ],
    };

    const response = await supertest.agent(server).post('/request').send(request);

    expect(response.status).toBe(200);
    expect(response.body.data).toStrictEqual({
      isAbnormal: true,
      abnormalFields: {
        'body:address_2': [
          {
            type: 'validation_template_missing',
            description: 'Field address_2 missing validation template',
          },
        ],
      },
    });
  });
});
