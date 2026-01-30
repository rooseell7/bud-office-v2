import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Warehouse } from '../../warehouses/warehouse.entity';
import { Material } from '../../supply/material.entity';

@Entity('warehouse_balances')
@Index(['warehouseId', 'materialId'], { unique: true })
export class WarehouseBalance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  warehouseId: number;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouseId' })
  warehouse: Warehouse;

  @Column()
  materialId: number;

  @ManyToOne(() => Material)
  @JoinColumn({ name: 'materialId' })
  material: Material;

  @Column({ type: 'numeric', precision: 14, scale: 3, default: 0 })
  qty: string;
}
