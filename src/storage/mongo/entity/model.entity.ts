import { Schema, model } from 'mongoose';

import { HttpMethod } from '../../../lib/type/http-method.enum';
import { Type } from '../../../lib/type/type.enum';
import { ValidationUnitTemplateDto } from '../../../dto/validation-unit-template.dto';
import { ModelDto } from '../../../dto/model.dto';

// The data is already validated using ModelDto.
const validationUnitTemplateSchema = new Schema<ValidationUnitTemplateDto>({
  name: { type: String, required: true, minlength: 1, maxlength: 255 },
  required: { type: Boolean, required: true },
  types: { type: [String], enum: Object.values(Type), required: true },
});

const validationUnitsDefinition = { type: [validationUnitTemplateSchema], required: true };

// The data is already populated by ModelService, prior saving.
const groupsToNamesUnitsMapDefinition = { required: true, type: Object };

// The data is already populated by ModelService, prior saving.
const groupsToRequiredFieldsMapDefinition = { required: true, type: Object };

// The data is already validated using ModelDto.
const modelSchema = new Schema<ModelDto>({
  path: { type: String, required: true, minlength: 1, maxlength: 255 },
  method: { type: String, enum: Object.values(HttpMethod), required: true },
  query_params: validationUnitsDefinition,
  headers: validationUnitsDefinition,
  body: validationUnitsDefinition,
  groupsToNamesUnitsMap: groupsToNamesUnitsMapDefinition,
  groupsToRequiredFieldsMap: groupsToRequiredFieldsMapDefinition,
});

export const ModelEntity = model<ModelDto>('Model', modelSchema);
