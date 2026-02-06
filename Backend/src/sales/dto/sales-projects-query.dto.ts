import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SalesProjectsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  salesStage?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ownerId?: number;

  @IsOptional()
  @IsString()
  @IsIn(['today', 'this_week', 'overdue', 'any'])
  nextActionBucket?: 'today' | 'this_week' | 'overdue' | 'any';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
