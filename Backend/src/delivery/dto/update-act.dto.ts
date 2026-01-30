import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
  IsNumber,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateActItemDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  qty?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  price?: number;
}

export class UpdateActDto {
  // stages.id = UUID
  @IsOptional()
  @IsUUID('4')
  stageId?: string | null;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsString()
  date?: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  comment?: string | null;

  @IsOptional()
  @IsIn(['draft', 'done'])
  status?: 'draft' | 'done';

  /**
   * safe-save: UI може надсилати рядки з порожнім name — такі рядки ігноруємо.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateActItemDto)
  items?: UpdateActItemDto[];
}
