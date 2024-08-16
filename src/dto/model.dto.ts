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
import { ValidationUnitTemplateDto } from './validation-unit-template.dto';

export type ValidationUnitTemplateName = string;

export type RequiredFieldChecked = boolean;

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

  @IsDefined({ message: '"query_params" is missing' })
  @IsArray({ message: '"query_params" must be an array' })
  @ValidateNested({ message: '"query_params" validation failed' })
  @Type(() => ValidationUnitTemplateDto)
  query_params: ValidationUnitTemplateDto[];

  @IsDefined({ message: '"headers" is missing' })
  @IsArray({ message: '"headers" must be an array' })
  @ValidateNested({ message: '"headers" validation failed' })
  @Type(() => ValidationUnitTemplateDto)
  headers: ValidationUnitTemplateDto[];

  @IsDefined({ message: '"body" is missing' })
  @IsArray({ message: '"body" must be an array' })
  @ValidateNested({ message: '"body" validation failed' })
  @Type(() => ValidationUnitTemplateDto)
  body: ValidationUnitTemplateDto[];

  // Each value is a mapping of param names with their corresponding validation templates.
  // Note, native ES6 Map is not used, since Map cannot be JSON-stringified as is
  // - some heavy manipulations must be applied.
  readonly groupsToNamesUnitsMap: Record<
    string,
    Record<ValidationUnitTemplateName, ValidationUnitTemplateDto>
  > = { query_params: {}, headers: {}, body: {} };

  // Each value is a mapping of param names,
  // with their corresponding mapping of required field and boolean,
  // indicating if it was already checked.
  // Eventually, it helps to validate the "POST /request" input in O(n) time complexity.
  readonly groupsToRequiredFieldsMap: Record<
    string,
    Record<ValidationUnitTemplateName, RequiredFieldChecked>
  > = { query_params: {}, headers: {}, body: {} };
}
