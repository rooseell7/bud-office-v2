import { IsDateString, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateTransactionInDto {
  @IsDateString()
  date: string;

  @IsInt()
  @Min(1)
  walletId: number;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @MaxLength(8)
  currency: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fxRate?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountUAH?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  projectId?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  counterparty?: string | null;

  @IsOptional()
  @IsString()
  comment?: string | null;
}
