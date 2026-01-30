import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateStageDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsInt()
  @Min(1)
  objectId: number;
}
