import { IsDefined, IsString, MinLength, MaxLength } from 'class-validator';

export class ValidationUnitDto {
  @IsDefined({ message: '"name" is missing' })
  @IsString({ message: '"name" must be a string' })
  @MinLength(1, { message: '"name" is too short' }) // Prevents an empty string.
  @MaxLength(255, { message: '"name" is too long' })
  name: string;

  @IsDefined({ message: '"value" is missing' })
  value: any;
}
