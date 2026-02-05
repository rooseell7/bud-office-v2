import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class CreateReceiptQuickDto {
  @IsOptional()
  @IsIn(['remaining'])
  mode?: 'remaining';

  @IsOptional()
  @IsBoolean()
  includeZeroLines?: boolean;
}
