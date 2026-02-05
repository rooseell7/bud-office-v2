import { IsArray, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class LastPurchasesBatchDto {
  @IsArray() @IsInt({ each: true }) materialIds: number[];
  @IsOptional() @IsInt() projectId?: number;
}

export class RecentSuppliersBatchDto {
  @IsArray() @IsInt({ each: true }) materialIds: number[];
  @IsOptional() @IsInt() projectId?: number;
  @IsOptional() @IsNumber() @Min(1) limit?: number;
}
