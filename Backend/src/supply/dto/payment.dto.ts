import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AddPaymentDto {
  @IsNumber() @Min(0.01) amount: number;
  @IsString() paidAt: string; // YYYY-MM-DD
  @IsOptional() @IsString() method?: string;
  @IsOptional() @IsString() comment?: string | null;
}
