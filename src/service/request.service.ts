import { validate as uuidValidate } from 'uuid';

import { ModelDto } from '../dto/model.dto';
import { RequestDto } from '../dto/request.dto';
import { ValidationUnitDto } from '../dto/validation-unit.dto';
import { AbnormalityReason, ValidationResponseDto } from '../dto/validation-response.dto';
import { Type } from '../lib/type/type.enum';
import { AbnormalityType } from '../lib/type/abnormality-type.enum';

export class RequestService {
  public validateRequest(requestDto: RequestDto, modelDto: ModelDto): ValidationResponseDto {
    // Iterate over following arrays 'query_params', 'headers' and 'body' to determine anomalies.
    // TODO: theoretically, iterations of "array.reduce" below should be parallelized.
    return Object.keys(modelDto.groupsToNamesUnitsMap).reduce(
      (validationResponseDto: ValidationResponseDto, groupName: string) => {
        const response = this.validateParamsGroup(groupName, requestDto, modelDto);

        if (response.isAbnormal) {
          validationResponseDto.isAbnormal = true;

          for (const abnormalField in response.abnormalFields) {
            // Avoid possible override of fields with the same name,
            // but from different groups ('query_params', 'headers' and 'body').
            const groupAndField = `${groupName}:${abnormalField}`;
            validationResponseDto.abnormalFields[groupAndField] =
              response.abnormalFields[abnormalField];
          }
        }

        return validationResponseDto;
      },
      new ValidationResponseDto(),
    );
  }

  public validateParamsGroup(
    groupName: string,
    requestDto: RequestDto,
    modelDto: ModelDto,
  ): ValidationResponseDto {
    // Currently, there are two main flows to validate params:
    // 1.
    // Run through "POST /request" input and validate against corresponding validation template.
    // Along the way, we can find fields, which don't have corresponding validation template - yet another anomaly.
    // 2.
    // Must make sure, that all the required fields actually appear in the "POST /request" input.
    const validationResponseDto = new ValidationResponseDto();

    // Note, group names are the same for both RequestDto and ModelDto.
    // Both DTOs were thoroughly validated prior being saved to Redis and Mongo.
    const validationUnits = requestDto[groupName as keyof RequestDto] as ValidationUnitDto[];
    const validationUnitTemplates = modelDto.groupsToNamesUnitsMap[groupName];

    validationUnits.forEach((unit: ValidationUnitDto) => {
      // Validation unit's template can be picked by name.
      // Note:
      // 1. Both the unit, and it's corresponding template, must share the name, validated using name's and request's DTOs.
      // 2. Query params, headers and body were prearranged as name-value maps prior saving.
      // 3. Some endpoints, received via "POST /request", may not have corresponding validation template.
      const template = validationUnitTemplates[unit.name];

      if (!template) {
        validationResponseDto.isAbnormal = true;
        const abnormalityReason: AbnormalityReason = {
          type: AbnormalityType.VALIDATION_TEMPLATE_MISSING,
          description: `Field ${unit.name} missing validation template`,
        };

        // TODO: take it out to a dedicated method.
        if (unit.name in validationResponseDto.abnormalFields) {
          validationResponseDto.abnormalFields[unit.name].push(abnormalityReason);
        } else {
          validationResponseDto.abnormalFields = { [unit.name]: [abnormalityReason] };
        }
      }

      if (template.required) {
        // Current validation unit (field from "POST /request" input) appears to be "required".
        // Mark corresponding field in "groupsToRequiredFieldsMap" as true.
        modelDto.groupsToRequiredFieldsMap[groupName][template.name] = true;
      }

      this.validateType(unit, template.types, groupName, validationResponseDto);
    });

    this.addMissingRequiredFields(groupName, modelDto, validationResponseDto);
    return validationResponseDto;
  }

  public validateType(
    unit: ValidationUnitDto,
    allowedTypes: Type[],
    groupName: string,
    validationResponseDto: ValidationResponseDto,
  ): void {
    const isValidValue = allowedTypes.some((type: Type) => this.isValueOfType(type, unit.value));

    if (isValidValue) {
      return;
    }

    validationResponseDto.isAbnormal = true;
    const abnormalityReason: AbnormalityReason = {
      type: AbnormalityType.TYPE_MISSMATCH,
      description: `Field ${unit.name} must be of type[s] ${Object.values(allowedTypes).join(',')}`,
    };

    if (unit.name in validationResponseDto.abnormalFields) {
      validationResponseDto.abnormalFields[unit.name].push(abnormalityReason);
    } else {
      validationResponseDto.abnormalFields = { [unit.name]: [abnormalityReason] };
    }
  }

  public addMissingRequiredFields(
    groupName: string,
    modelDto: ModelDto,
    validationResponseDto: ValidationResponseDto,
  ): void {
    for (const field in modelDto.groupsToRequiredFieldsMap[groupName]) {
      if (!modelDto.groupsToRequiredFieldsMap[groupName][field]) {
        validationResponseDto.isAbnormal = true;
        const abnormalityReason: AbnormalityReason = {
          type: AbnormalityType.REQUIRED_FIELD_MISSING,
          description: `Required field ${field} is missing`,
        };

        if (field in validationResponseDto.abnormalFields) {
          validationResponseDto.abnormalFields[field].push(abnormalityReason);
        } else {
          validationResponseDto.abnormalFields = { [field]: [abnormalityReason] };
        }
      }
    }
  }

  public isValueOfType(type: Type, value: any): boolean {
    switch (type) {
      case Type.Auth_Token:
        return this.isAuthToken(value);
      case Type.Date:
        return this.isDate(value);
      case Type.UUID:
        return this.isUUID(value);
      case Type.Email:
        return this.isEmail(value);
      case Type.List:
        return this.isList(value);
      case Type.Boolean:
        return this.isBoolean(value);
      case Type.Int:
        return this.isInt(value);
      case Type.String:
        return this.isString(value);
      default:
        throw new Error(`Unexpected type ${type}`);
    }
  }

  public isInt(x: any): boolean {
    return x === parseInt(x, 10);
  }

  public isString(x: any): boolean {
    return typeof x === 'string';
  }

  public isBoolean(x: any): boolean {
    return typeof x === 'boolean';
  }

  public isList(x: any): boolean {
    return Array.isArray(x);
  }

  public isAuthToken(x: any): boolean {
    if (!this.isString(x)) {
      return false;
    }

    return x.startsWith('Bearer ');
  }

  public isUUID(x: any): boolean {
    return uuidValidate(x);
  }

  public isEmail(x: any): boolean {
    if (!this.isString(x)) {
      return false;
    }

    const re =
      /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return !!x.match(re);
  }

  public isDate(x: any): boolean {
    // Expected format is a date-string, formatted as "dd-mm-yyyy".
    if (!this.isString(x)) {
      return false;
    }

    if (x.length !== 10) {
      return false;
    }

    const [day, monthIndex, year] = x.split('-');
    const date = new Date(year, monthIndex - 1, day);
    const dd = date.getDate();
    const mm = date.getMonth() + 1;
    const yyyy = date.getFullYear();
    return x === `${this.formatNumber(dd)}-${this.formatNumber(mm)}-${this.formatNumber(yyyy)}`;
  }

  private formatNumber(num: number): string {
    return num < 10 ? `0${num}` : num.toString();
  }
}
