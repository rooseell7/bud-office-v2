import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class MergeOrdersDto {
  @IsInt() @Min(1) targetOrderId: number;
  @IsOptional() @IsString() strategy?: string;
  @IsOptional() @IsBoolean() mergeDuplicates?: boolean;
  @IsOptional() @IsBoolean() cancelSourceOrder?: boolean;
}
