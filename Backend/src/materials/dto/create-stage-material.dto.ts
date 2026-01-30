import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateStageMaterialDto {
  @IsNotEmpty()
  @IsUUID()
  stageId: string;

  @IsNotEmpty()
  @IsUUID()
  materialId: string;

  @IsNotEmpty()
  @IsString()
  qty: string; // приймаємо як строку, напр "10" або "2.5"

  @IsOptional()
  @IsString()
  price?: string; // "123.45"

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
