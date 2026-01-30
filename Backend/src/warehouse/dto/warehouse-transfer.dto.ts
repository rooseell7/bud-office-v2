export class WarehouseTransferDto {
  fromWarehouseId: number;
  toWarehouseId: number;
  items: { materialId: number; qty: number; price: number }[];
}
