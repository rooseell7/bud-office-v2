import { IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class QuoteMaterialSelectionDto {
  @IsString()
  stageId: string;

  @IsOptional()
  @IsString()
  stageName?: string | null;

  @IsOptional()
  @IsString()
  quoteRowId?: string | null;

  @IsOptional()
  @IsInt()
  materialId?: number | null;

  @IsOptional()
  @IsString()
  customName?: string | null;

  @IsString()
  unit: string;

  @IsNumber()
  @Min(0)
  qty: number;

  @IsOptional()
  @IsString()
  fingerprint?: string | null;
}

export class AddQuoteMaterialsDto {
  @IsInt()
  quoteId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteMaterialSelectionDto)
  selections: QuoteMaterialSelectionDto[];

  @IsOptional()
  @IsIn(['add_missing_only', 'replace_qty_for_existing', 'add_separate', 'merge_qty'])
  mode?: 'add_missing_only' | 'replace_qty_for_existing' | 'add_separate' | 'merge_qty';

  /** When set to 'remaining', audit message is "Додано з КП (залишок): …" and meta includes filterMode. */
  @IsOptional()
  @IsIn(['remaining'])
  filterMode?: 'remaining';
}
