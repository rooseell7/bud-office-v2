import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateStageDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
