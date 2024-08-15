import {
  IsArray,
  ValidateNested,
  IsDefined,
  IsEnum,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

import { HttpMethod } from '../lib/type/http-method.enum';
import { ValidationUnitDto } from './validation-unit.dto';

export class ModelDto {
  @IsDefined({ message: '"path" is missing' })
  @IsString({ message: '"path" must be a string' })
  @MinLength(1, { message: '"path" is too short' }) // Prevents an empty string.
  @MaxLength(255, { message: '"path" is too long' })
  path: string;

  @IsDefined({ message: '"method" is missing' })
  @IsEnum(HttpMethod, {
    each: true,
    message: `"method" can only be one of following: ${Object.values(HttpMethod)}`,
  })
  method: HttpMethod;

  @IsArray({ message: '"query_params" must be an array' })
  @ValidateNested({ message: '"query_params" validation failed' })
  @Type(() => ValidationUnitDto)
  query_params: ValidationUnitDto[];

  @IsArray({ message: '"headers" must be an array' })
  @ValidateNested({ message: '"headers" validation failed' })
  @Type(() => ValidationUnitDto)
  headers: ValidationUnitDto[];

  @IsArray({ message: '"body" must be an array' })
  @ValidateNested({ message: '"body" validation failed' })
  @Type(() => ValidationUnitDto)
  body: ValidationUnitDto[];
}
