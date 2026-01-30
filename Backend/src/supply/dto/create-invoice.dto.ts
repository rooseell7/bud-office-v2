import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class InvoiceItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  materialId?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  qty?: string;

  @IsOptional()
  @IsString()
  supplierPrice?: string;

  @IsOptional()
  @IsString()
  clientPrice?: string;
}

function toIntMin1OrUndef(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n < 1) return undefined;
  return Math.trunc(n);
}

function toISODateOrUndef(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return undefined;
    return v.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (!s) return undefined;
  // очікуємо YYYY-MM-DD; інші формати не валідую тут, бо це чернетка
  return s;
}

export class CreateInvoiceDto {
  /**
   * Тип накладної:
   * - external: постачальник → обʼєкт (основний сценарій)
   * - internal: внутрішня (на склад / зі складу)
   */
  @IsOptional()
  @IsString()
  type?: 'external' | 'internal' | string;

  /** Для internal-накладної: напрям IN/OUT */
  @IsOptional()
  @IsString()
  internalDirection?: 'IN' | 'OUT' | string;

  /** Для internal-накладної: склад */
  @IsOptional()
  @Transform(({ value }) => toIntMin1OrUndef(value))
  @IsInt()
  @Min(1)
  warehouseId?: number;

  @IsOptional()
  @Transform(({ value }) => toIntMin1OrUndef(value))
  @IsInt()
  @Min(1)
  projectId?: number;

  /**
   * Backward compatibility alias.
   * Деякі екрани фронту історично надсилали `objectId` замість `projectId`.
   * У service робимо мапінг objectId -> projectId.
   */
  @IsOptional()
  @Transform(({ value }) => toIntMin1OrUndef(value))
  @IsInt()
  @Min(1)
  objectId?: number;

  @IsOptional()
  @Transform(({ value }) => toIntMin1OrUndef(value))
  @IsInt()
  @Min(1)
  supplyManagerId?: number;

  @IsOptional()
  @Transform(({ value }) => toISODateOrUndef(value))
  @IsString()
  invoiceDate?: string;

  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items?: InvoiceItemDto[];

  @IsOptional()
  @IsString()
  status?: string;
}
