import { IsArray, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SupplyReceiptItemDto {
  @IsOptional() @IsInt() sourceOrderItemId?: number | null;
  @IsOptional() @IsInt() materialId?: number | null;
  @IsOptional() @IsString() customName?: string | null;
  @IsString() unit: string;
  @IsNumber() @Min(0, { message: 'Кількість не може бути від\'ємною' }) qtyReceived: number;
  @IsOptional() @IsNumber() @Min(0, { message: 'Ціна не може бути від\'ємною' }) unitPrice?: number | null;
  @IsOptional() @IsString() note?: string | null;
}

export class UpdateSupplyReceiptDto {
  @IsOptional() @IsString() docNumber?: string | null;
  @IsOptional() @IsString() comment?: string | null;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SupplyReceiptItemDto)
  items?: SupplyReceiptItemDto[];
}
