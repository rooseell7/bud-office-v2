import { IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class CreateMaterialDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  unit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  sku?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  consumptionPerM2?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  consumptionPerLm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weightKg?: number;
}
