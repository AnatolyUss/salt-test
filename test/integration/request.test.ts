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

describe('request tests', (): void => {
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

  it('xxx', async (): Promise<void> => {
    //
  });
});
