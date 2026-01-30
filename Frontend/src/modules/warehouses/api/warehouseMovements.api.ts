import type {
  PagedResult,
  WarehouseMovement,
  WarehouseMovementsQuery,
  Id,
} from '../types/warehouse-movement.types';

// ✅ правильний імпорт під твою структуру (src/api/apiClient.ts)
import apiClient from '../../../api/apiClient';

function cleanQuery(q?: WarehouseMovementsQuery): Record<string, any> {
  const x: Record<string, any> = {};
  if (!q) return x;

  const put = (k: keyof WarehouseMovementsQuery) => {
    const v = q[k];
    if (v === undefined || v === null || v === '') return;
    x[k] = v;
  };

  put('type');
  put('materialId');
  put('objectId');
  put('fromWarehouseId');
  put('toWarehouseId');
  put('dateFrom');
  put('dateTo');
  put('offset');
  put('limit');

  return x;
}

export async function getWarehouseMovements(
  warehouseId: Id,
  query?: WarehouseMovementsQuery,
) {
  const params = cleanQuery(query);
  const res = await apiClient.get<PagedResult<WarehouseMovement>>(
    `/warehouse/movements/${warehouseId}`,
    { params },
  );
  return res.data;
}
