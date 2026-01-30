// FILE: bud_office-backend/src/warehouse/dto/save-warehouse-movement-draft.dto.ts

import { IsInt, IsPositive, IsObject } from 'class-validator';

export class SaveWarehouseMovementDraftDto {
  @IsInt()
  @IsPositive()
  warehouseId: number;

  @IsObject()
  payload: Record<string, any>;
}