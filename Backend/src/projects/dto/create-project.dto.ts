import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  clientId?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  foremanId?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatorId?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  supplyManagerId?: number | null;
}
