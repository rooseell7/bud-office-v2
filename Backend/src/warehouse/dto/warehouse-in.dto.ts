import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsInt,
  IsNumber,
  Min,
} from 'class-validator';

export class WarehouseInItemDto {
  @IsInt()
  materialId: number;

  @IsNumber()
  @Min(0.000001)
  qty: number;

  @IsNumber()
  @Min(0)
  price: number;
}

export class WarehouseInDto {
  @IsInt()
  toWarehouseId: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WarehouseInItemDto)
  items: WarehouseInItemDto[];
}
