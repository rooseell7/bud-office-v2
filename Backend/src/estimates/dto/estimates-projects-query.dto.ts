import { IsOptional, IsString, IsIn, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class EstimatesProjectsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  quoteStatus?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasUnpaidInvoices?: boolean;

  @IsOptional()
  @IsString()
  activeFrom?: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  activeTo?: string; // YYYY-MM-DD

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

export interface EstimatesProjectItemDto {
  projectId: number;
  name: string;
  address: string | null;
  client: { id: number | string; name: string } | null;
  quote: {
    lastQuoteId: number | null;
    status: string | null;
    total: string | null;
    updatedAt: string | null;
  };
  acts: { count: number; lastActAt: string | null };
  invoices: { count: number; unpaidCount: number; lastInvoiceAt: string | null };
  lastActivityAt: string | null;
}

export interface EstimatesProjectsResponseDto {
  items: EstimatesProjectItemDto[];
  total: number;
}
