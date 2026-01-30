import type { Warehouse } from './types';

export const mockWarehouses: Warehouse[] = [
  { id: 1, name: 'Склад Красів', address: 'Львівська обл., Красів', notes: 'Основний склад' },
  { id: 2, name: 'Склад Офіс', address: 'Львів, офіс', notes: 'Малий склад/витратники' },
  { id: 3, name: 'Склад Проєкт (тимчасовий)', address: 'Обʼєкт', notes: 'Під конкретний обʼєкт' },
];
