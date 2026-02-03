import { IsBoolean, IsOptional, IsString, IsIn, MaxLength } from 'class-validator';

export class CreateWalletDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsIn(['cash', 'fop', 'bank'])
  type?: string;

  @IsString()
  @MaxLength(8)
  currency: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  details?: string | null;
}
