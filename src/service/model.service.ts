import { plainToInstance } from 'class-transformer';

import { ModelEntity } from '../storage/mongo/entity/model.entity';
import { ModelDto } from '../dto/model.dto';
import { getRedisClient } from '../storage/redis/data-source';
import { ValidationUnitTemplateDto } from '../dto/validation-unit-template.dto';

export class ModelService {
  public initializeNamesToUnitsMaps(modelDto: ModelDto): void {
    for (const field in modelDto.groupsToNamesUnitsMap) {
      // 'query_params', 'headers' and 'body'.
      const namesToUnits = modelDto.groupsToNamesUnitsMap[field];
      const templates = modelDto[field as keyof ModelDto] as ValidationUnitTemplateDto[];

      templates.forEach((template: ValidationUnitTemplateDto) => {
        namesToUnits[template.name] = template;
      });
    }
  }

  public initializeRequiredFieldsMap(modelDto: ModelDto): void {
    for (const field in modelDto.groupsToRequiredFieldsMap) {
      // 'query_params', 'headers' and 'body'.
      const requiredFields = modelDto.groupsToRequiredFieldsMap[field];
      const templates = modelDto[field as keyof ModelDto] as ValidationUnitTemplateDto[];

      templates.forEach((template: ValidationUnitTemplateDto) => {
        if (template.required) {
          requiredFields[template.name] = false; // false - means "initially unchecked" required field.
        }
      });
    }
  }

  public async saveModel(modelDto: ModelDto): Promise<void> {
    // Arrange query params, headers and body as maps, prior saving.
    // Eventually it will speed up real-time requests validation,
    // due to reduced time complexity - "O(n)" instead of "O(n^2)".
    this.initializeNamesToUnitsMaps(modelDto);
    this.initializeRequiredFieldsMap(modelDto);

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

  public async setModelMongo(modelDto: ModelDto, modeDelete: boolean = false): Promise<void> {
    const path = modelDto.path;
    const method = modelDto.method;

    try {
      if (modeDelete) {
        await ModelEntity.deleteOne({ path, method });
      } else {
        await ModelEntity.updateOne({ path, method }, { $set: modelDto }, { upsert: true });
      }
    } catch (mongoError) {
      console.error(this.setModelMongo.name, { path, method, modeDelete, mongoError });
      // It is unclear, what type of object Mongoose module throws in case of error.
      // Hence, mongoError is wrapped by the built-in Error.
      // That's in order to eventually distinguish between success and failure.
      throw new Error(JSON.stringify(mongoError));
    }
  }

  public async setModelRedis(modelDto: ModelDto, modeDelete: boolean = false): Promise<void> {
    const key = this.getKey(modelDto.path, modelDto.method);

    try {
      const redisClient = await getRedisClient();

      if (modeDelete) {
        await redisClient.del(key);
      } else {
        await redisClient.set(key, this.serializeModelRedis(modelDto));
      }
    } catch (redisError) {
      console.error(this.setModelRedis.name, { key, modeDelete, redisError });
      // It is unclear, what type of object Redis module throws in case of error.
      // Hence, redisError is wrapped by the built-in Error.
      // That's in order to eventually distinguish between success and failure.
      throw new Error(JSON.stringify(redisError));
    }
  }

  public async getModel(path: string, method: string): Promise<ModelDto | undefined> {
    // In most cases, requested model will be found in Redis.
    let modelDto = await this.getModelRedis(path, method);

    if (modelDto) {
      // Requested model was found in Redis.
      return modelDto;
    }

    // The model might be missing due to possible failure during model upload,
    // or, for example, due to Redis instance crash.
    // Try to find the model in Mongo.
    modelDto = await this.getModelMongo(path, method);

    if (!modelDto) {
      // Requested model not found in both Redis and Mongo.
      return undefined;
    }

    // Requested model was found in Mongo.
    // Save it in Redis prior returning to the consumer.
    await this.setModelRedis(modelDto);
    return modelDto;
  }

  public async getModelMongo(path: string, method: string): Promise<ModelDto | undefined> {
    try {
      const rawModel = await ModelEntity.findOne({ path, method });
      return rawModel ? this.parseModelMongo(rawModel) : undefined;
    } catch (mongoError) {
      console.error(this.getModelMongo.name, { path, method, mongoError });
      // It is unclear, what type of object Mongoose module throws in case of error.
      // Hence, mongoError is wrapped by the built-in Error.
      // That's in order to eventually distinguish between success and failure.
      throw new Error(JSON.stringify(mongoError));
    }
  }

  public async getModelRedis(path: string, method: string): Promise<ModelDto | undefined> {
    const key = this.getKey(path, method);

    try {
      const redisClient = await getRedisClient();
      const rawModel = await redisClient.get(key);
      return rawModel ? this.parseModelRedis(rawModel) : undefined;
    } catch (redisError) {
      console.error(this.getModelRedis.name, { key, redisError });
      // It is unclear, what type of object Redis module throws in case of error.
      // Hence, redisError is wrapped by the built-in Error.
      // That's in order to eventually distinguish between success and failure.
      throw new Error(JSON.stringify(redisError));
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

  private parseModelMongo(rawModel: Record<string, any>): ModelDto {
    return plainToInstance(ModelDto, rawModel);
  }
}
