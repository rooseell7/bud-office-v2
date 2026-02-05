import { IsArray, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SupplyOrderItemDto {
  @IsOptional() @IsInt() sourceRequestItemId?: number | null;
  @IsOptional() @IsInt() materialId?: number | null;
  @IsOptional() @IsString() customName?: string | null;
  @IsString() unit: string;
  @IsNumber() @Min(0, { message: 'Кількість не може бути від\'ємною' }) qtyPlanned: number;
  @IsOptional() @IsNumber() @Min(0, { message: 'Ціна не може бути від\'ємною' }) unitPrice?: number | null;
  @IsOptional() @IsString() note?: string | null;
}

export class CreateSupplyOrderDto {
  @IsInt() @Min(1) projectId: number;
  @IsOptional() @IsInt() sourceRequestId?: number | null;
  @IsOptional() @IsInt() supplierId?: number | null;
  @IsOptional() @IsString() deliveryType?: string;
  @IsOptional() @IsString() deliveryDatePlanned?: string | null;
  @IsOptional() @IsString() paymentTerms?: string | null;
  @IsOptional() @IsString() comment?: string | null;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SupplyOrderItemDto)
  items?: SupplyOrderItemDto[];
}

export class UpdateSupplyOrderDto {
  @IsOptional() @IsInt() supplierId?: number | null;
  @IsOptional() @IsString() deliveryType?: string;
  @IsOptional() @IsString() deliveryDatePlanned?: string | null;
  @IsOptional() @IsString() paymentTerms?: string | null;
  @IsOptional() @IsString() comment?: string | null;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SupplyOrderItemDto)
  items?: SupplyOrderItemDto[];
}

export class SetOrderStatusDto {
  @IsString() status: string;
}
