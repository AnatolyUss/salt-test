import { AbnormalityType } from '../lib/type/abnormality-type.enum';

export type AbnormalFieldName = string;

export type AbnormalityReason = {
  type: AbnormalityType;
  description: string;
};

export type AbnormalFields = Record<AbnormalFieldName, AbnormalityReason[]>;

export class ValidationResponseDto {
  public constructor(
    public isAbnormal: boolean = false,
    public abnormalFields: AbnormalFields = {},
  ) {}
}
