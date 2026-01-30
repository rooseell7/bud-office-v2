import { IsInt, IsObject, IsOptional, IsString, MaxLength, IsIn, IsDateString, IsNumberString } from 'class-validator';
import { Type } from 'class-transformer';

import type { DocumentStatus } from '../document.entity';

const STATUSES: DocumentStatus[] = ['draft', 'final', 'void'];

export class CreateDocumentDto {
  @IsString()
  @MaxLength(64)
  type: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: DocumentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  number?: string;

  /** YYYY-MM-DD */
  @IsOptional()
  @IsDateString()
  documentDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  projectId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sourceType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sourceId?: number;

  @IsOptional()
  @IsNumberString()
  total?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, any>;
}
