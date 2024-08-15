import { Schema } from 'mongoose';

import { HttpMethod } from './http-method.enum';
import { IValidationUnit } from './validation-unit';

export interface IModel {
  _id: Schema.Types.ObjectId;
  path: string;
  method: HttpMethod;
  query_params: IValidationUnit[];
  headers: IValidationUnit[];
  body: IValidationUnit[];
}
