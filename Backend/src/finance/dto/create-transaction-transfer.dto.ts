import { IsDateString, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateTransactionTransferDto {
  @IsDateString()
  date: string;

  @IsInt()
  @Min(1)
  fromWalletId: number;

  @IsInt()
  @Min(1)
  toWalletId: number;

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
  @IsString()
  comment?: string | null;
}
