import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SupplyRequestTemplateItemDto {
  @IsOptional() @IsInt() materialId?: number | null;
  @IsOptional() @IsString() customName?: string | null;
  @IsString() unit: string;
  @IsNumber() @Min(0, { message: 'Кількість не може бути від\'ємною' }) qtyDefault: number;
  @IsOptional() @IsString() note?: string | null;
  @IsOptional() @IsString() priority?: string;
}

export class CreateSupplyRequestTemplateDto {
  @IsString() name: string;
  @IsOptional() @IsInt() projectId?: number | null;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SupplyRequestTemplateItemDto)
  items?: SupplyRequestTemplateItemDto[];
}

export class UpdateSupplyRequestTemplateDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SupplyRequestTemplateItemDto)
  items?: SupplyRequestTemplateItemDto[];
}

export class CreateRequestFromTemplateDto {
  @IsInt() @Min(1) projectId: number;
  @IsOptional() @IsString() neededAt?: string | null;
  @IsOptional() @IsString() comment?: string | null;
}

export class SaveRequestAsTemplateDto {
  @IsString() name: string;
  @IsOptional() @IsBoolean() projectScoped?: boolean;
}
