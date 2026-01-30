import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

function toIntOrUndef(v: unknown): number | undefined {
  if (v === '' || v === null || v === undefined) return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export class InvoicesQueryDto {
  // Сумісність: фронт фільтрує по objectId
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => toIntOrUndef(value))
  objectId?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => toIntOrUndef(value))
  skip?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => toIntOrUndef(value))
  take?: number;
}
