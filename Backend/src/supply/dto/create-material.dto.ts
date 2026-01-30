import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateMaterialDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
