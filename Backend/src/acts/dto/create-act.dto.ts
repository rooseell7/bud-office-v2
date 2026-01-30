import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateActDto {
  @IsInt()
  projectId!: number;

  @IsOptional()
  @IsInt()
  foremanId?: number;

  // YYYY-MM-DD
  @IsString()
  actDate!: string;

  @IsOptional()
  @IsArray()
  items?: any[];

  @IsOptional()
  @IsString()
  status?: string;
}
