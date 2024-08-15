import { ValidateNested, IsDefined, IsEnum, IsString, MinLength, MaxLength } from 'class-validator';

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

  @ValidateNested({ message: '"query_params" validation failed' })
  query_params: ValidationUnitDto[];

  @ValidateNested({ message: '"headers" validation failed' })
  headers: ValidationUnitDto[];

  @ValidateNested({ message: '"body" validation failed' })
  body: ValidationUnitDto[];
}
