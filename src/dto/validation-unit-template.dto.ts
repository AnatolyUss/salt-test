import {
  IsArray,
  ArrayNotEmpty,
  IsDefined,
  IsEnum,
  IsString,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';

import { Type } from '../lib/type/type.enum';

export class ValidationUnitTemplateDto {
  @IsDefined({ message: '"name" is missing' })
  @IsString({ message: '"name" must be a string' })
  @MinLength(1, { message: '"name" is too short' }) // Prevents an empty string.
  @MaxLength(255, { message: '"name" is too long' })
  name: string;

  @IsDefined({ message: '"required" is missing' })
  @IsBoolean({ message: '"required" must be a boolean' })
  required: boolean;

  @IsDefined({ message: '"types" is missing' })
  @IsArray({ message: '"types" must be an array' })
  @ArrayNotEmpty({ message: '"types" array must be non empty' })
  @IsEnum(Type, {
    each: true,
    message: `"types" can only be one of following: ${Object.values(Type)}`,
  })
  types: Type[];
}
