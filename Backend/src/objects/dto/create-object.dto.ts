import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateObjectDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  status?: string;

  // ✅ ключове: clientId не обовʼязковий
  @IsOptional()
  @IsInt()
  @Min(1)
  clientId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  foremanId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatorId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  supplyManagerId?: number;
}
