// FILE: bud_office-backend/src/warehouse/dto/warehouse-movements-query.dto.ts

import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

function toInt(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export class WarehouseMovementsQueryDto {
  /**
   * IN | OUT | TRANSFER
   */
  @IsOptional()
  @IsIn(['IN', 'OUT', 'TRANSFER'])
  type?: 'IN' | 'OUT' | 'TRANSFER';

  /**
   * Фільтр по матеріалу (по items)
   */
  @IsOptional()
  @Transform(({ value }) => toInt(value))
  @IsInt()
  @Min(1)
  materialId?: number;

  /**
   * OUT може бути на обʼєкт (objectId у movement)
   */
  @IsOptional()
  @Transform(({ value }) => toInt(value))
  @IsInt()
  @Min(1)
  objectId?: number;

  /**
   * TRANSFER: фільтр по складу-джерелу/отримувачу
   */
  @IsOptional()
  @Transform(({ value }) => toInt(value))
  @IsInt()
  @Min(1)
  fromWarehouseId?: number;

  @IsOptional()
  @Transform(({ value }) => toInt(value))
  @IsInt()
  @Min(1)
  toWarehouseId?: number;

  /**
   * Дата "від" / "до" (ISO8601) — по m.createdAt
   */
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  /**
   * Пагінація
   */
  @IsOptional()
  @Transform(({ value }) => toInt(value))
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @Transform(({ value }) => toInt(value))
  @IsInt()
  @Min(1)
  limit?: number;

  /**
   * Загальний пошук (поки не використовується — у movement немає текстових полів)
   */
  @IsOptional()
  @IsString()
  q?: string;
}
