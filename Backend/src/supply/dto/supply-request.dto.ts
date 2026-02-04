import { IsArray, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SupplyRequestItemDto {
  @IsOptional() @IsInt() materialId?: number | null;
  @IsOptional() @IsString() customName?: string | null;
  @IsString() unit: string;
  @IsNumber() @Min(0) qty: number;
  @IsOptional() @IsString() note?: string | null;
  @IsOptional() @IsString() priority?: string;
}

export class CreateSupplyRequestDto {
  @IsInt() @Min(1) projectId: number;
  @IsOptional() @IsString() neededAt?: string | null;
  @IsOptional() @IsString() comment?: string | null;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SupplyRequestItemDto)
  items?: SupplyRequestItemDto[];
}

export class UpdateSupplyRequestDto {
  @IsOptional() @IsString() neededAt?: string | null;
  @IsOptional() @IsString() comment?: string | null;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SupplyRequestItemDto)
  items?: SupplyRequestItemDto[];
}
