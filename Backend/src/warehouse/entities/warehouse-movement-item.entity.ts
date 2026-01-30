import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { WarehouseMovement } from './warehouse-movement.entity';
import { Material } from '../../supply/material.entity';

@Entity('warehouse_movement_items')
export class WarehouseMovementItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  movementId: number;

  @ManyToOne(() => WarehouseMovement, (m) => m.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'movementId' })
  movement: WarehouseMovement;

  @Column()
  @Index()
  materialId: number;

  @ManyToOne(() => Material, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'materialId' })
  material: Material;

  @Column({ type: 'numeric', precision: 14, scale: 3 })
  qty: string;

  // фіксована ціна на момент руху
  @Column({ type: 'numeric', precision: 14, scale: 2 })
  price: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: string;
}