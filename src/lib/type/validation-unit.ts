import { Type } from './type.enum';

export interface IValidationUnit {
  name: string;
  required: boolean;
  types: Type[];
}
