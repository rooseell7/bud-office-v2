export class WarehouseOutDto {
  fromWarehouseId: number;
  objectId: string; // uuid
  items: { materialId: number; qty: number; price: number }[];
}
