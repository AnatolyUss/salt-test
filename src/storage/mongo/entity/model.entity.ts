import { Schema, model } from 'mongoose';

import { HttpMethod } from '../../../lib/type/http-method.enum';
// import { IValidationUnit } from '../../../lib/type/validation-unit';
// import { IModel } from '../../../lib/type/model';
import { Type } from '../../../lib/type/type.enum';
import { ValidationUnitDto } from '../../../dto/validation-unit.dto';
import { ModelDto } from '../../../dto/model.dto';

export const validationUnitSchema = new Schema<ValidationUnitDto>({
  name: { type: String, required: true, minlength: 1, maxlength: 255 },
  required: { type: Boolean, required: true },
  types: { type: [String], enum: Object.values(Type), required: true },
});

// Or, just [validationUnitSchema]...
const validationUnitsDefinition = { type: [validationUnitSchema], required: true };

const modelSchema = new Schema<ModelDto>({
  path: { type: String, required: true, minlength: 1, maxlength: 255 },
  method: { type: String, enum: Object.values(HttpMethod), required: true },
  query_params: validationUnitsDefinition,
  headers: validationUnitsDefinition,
  body: validationUnitsDefinition,
});

export const Model = model<ModelDto>('Model', modelSchema);
