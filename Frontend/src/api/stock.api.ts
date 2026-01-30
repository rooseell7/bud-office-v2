import api from './client';

export interface StockItem {
  id: string;
  materialName: string;
  unit: string;
  quantity: number;
  minQuantity: number;
}

export async function getWarehouseStock(
  warehouseId: string,
): Promise<StockItem[]> {
  const { data } = await api.get(
    `/warehouses/${warehouseId}/stock`,
  );
  return data;
}
