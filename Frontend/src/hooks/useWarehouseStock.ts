import { useQuery } from '@tanstack/react-query';
import { getWarehouseStock } from '../api/stock.api';

export function useWarehouseStock(warehouseId: string) {
  return useQuery({
    queryKey: ['warehouse-stock', warehouseId],
    queryFn: () => getWarehouseStock(warehouseId),
    enabled: !!warehouseId,
  });
}
