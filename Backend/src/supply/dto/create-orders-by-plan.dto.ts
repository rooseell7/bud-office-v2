import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateOrdersByPlanDto {
  @IsOptional() @IsString() mode?: 'use_last_purchase';
  @IsOptional() @IsBoolean() includeUnassigned?: boolean;
  @IsOptional() @IsString() unassignedStrategy?: 'single_order_no_supplier';
}
