import { IsArray, IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class MoveItemsDto {
  @IsInt() @Min(1) toOrderId: number;
  @IsArray() @IsInt({ each: true }) itemIds: number[];
  @IsOptional() @IsBoolean() mergeDuplicates?: boolean;
}
