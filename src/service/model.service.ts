import { plainToInstance } from 'class-transformer';

import { ModelEntity } from '../storage/mongo/entity/model.entity';
import { ModelDto } from '../dto/model.dto';
import { getRedisClient } from '../storage/redis/data-source';

export class ModelService {
  public async saveModel(modelDto: ModelDto): Promise<void> {
    // !!!Note, Promise.allSettled never throws.
    const [mongoResult, redisResult] = await Promise.allSettled([
      this.setModelMongo(modelDto),
      this.setModelRedis(modelDto),
    ]);

    const mongoUpdateFailed = mongoResult.status === 'rejected';
    const redisUpdateFailed = redisResult.status === 'rejected';

    if (!mongoUpdateFailed && !redisUpdateFailed) {
      // Successfully saved the model in both MongoDB and Redis.
      return;
    }

    const modeDelete = true; // Attempt rollback changes, following failed "transaction".

    if (mongoUpdateFailed && redisUpdateFailed) {
      // NO NEED to revert any operation, since both failed.
      // Just throw an Error after rest of checks.
    } else if (mongoUpdateFailed) {
      await this.setModelRedis(modelDto, modeDelete);
    } else if (redisUpdateFailed) {
      await this.setModelMongo(modelDto, modeDelete);
    }

    // Notify the consumer, that current operation has failed.
    throw new Error(
      `${this.saveModel.name} has failed to save the model ${JSON.stringify(modelDto)}`,
    );
  }

  public async setModelMongo(
    modelDto: ModelDto,
    modeDelete: boolean = false,
    retriesCount: number = 3,
  ): Promise<void> {
    const path = modelDto.path;
    const method = modelDto.method;

    try {
      if (modeDelete) {
        await ModelEntity.deleteOne({ path, method });
      } else {
        await ModelEntity.updateOne({ path, method }, { $set: modelDto }, { upsert: true });
      }
    } catch (mongoError) {
      if (retriesCount === 0) {
        console.error(this.setModelMongo.name, { path, method, modeDelete, mongoError });
        // It is unclear, what type of object Mongoose module throws in case of error.
        // Hence, redisError is wrapped by the built-in Error.
        // That's in order to eventually distinguish between success and failure.
        throw new Error(JSON.stringify(mongoError));
      }

      setTimeout(
        async () => {
          await this.setModelMongo(modelDto, modeDelete, retriesCount - 1);
        },
        Math.floor(Math.random() * 20) + 10, // Random timeout between 10MS and 20MS.
      );
    }
  }

  public async setModelRedis(
    modelDto: ModelDto,
    modeDelete: boolean = false,
    retriesCount: number = 3,
  ): Promise<void> {
    const key = this.getKey(modelDto.path, modelDto.method);

    try {
      const redisClient = await getRedisClient();

      if (modeDelete) {
        await redisClient.del(key);
      } else {
        await redisClient.set(key, this.serializeModelRedis(modelDto));
      }
    } catch (redisError) {
      if (retriesCount === 0) {
        console.error(this.setModelRedis.name, { key, modeDelete, redisError });
        // It is unclear, what type of object Redis module throws in case of error.
        // Hence, redisError is wrapped by the built-in Error.
        // That's in order to eventually distinguish between success and failure.
        throw new Error(JSON.stringify(redisError));
      }

      const timeoutMs = Math.floor(Math.random() * (20 - 10) + 10); // Random timeout between 10MS and 20MS.
      await new Promise(resolve => setTimeout(resolve, timeoutMs));
      await this.setModelRedis(modelDto, modeDelete, retriesCount - 1);
    }
  }

  public getKey(path: string, method: string): string {
    return `${path}:${method}`;
  }

  private serializeModelRedis(modelDto: ModelDto): string {
    return JSON.stringify(modelDto);
  }

  private parseModelRedis(serializedModel: string): ModelDto {
    return plainToInstance(ModelDto, JSON.parse(serializedModel));
  }
}
