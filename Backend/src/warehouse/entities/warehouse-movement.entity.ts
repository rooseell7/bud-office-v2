import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';

import { Warehouse } from '../../warehouses/warehouse.entity';
import { Project } from '../../projects/project.entity';
import { User } from '../../users/user.entity';
import { WarehouseMovementItem } from './warehouse-movement-item.entity';

export type WarehouseMovementType = 'IN' | 'OUT' | 'TRANSFER';

@Entity('warehouse_movements')
export class WarehouseMovement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 10 })
  @Index()
  type: WarehouseMovementType;

  @Column({ type: 'int', nullable: true })
  fromWarehouseId: number | null;

  @ManyToOne(() => Warehouse, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fromWarehouseId' })
  fromWarehouse: Warehouse | null;

  @Column({ type: 'int', nullable: true })
  toWarehouseId: number | null;

  @ManyToOne(() => Warehouse, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'toWarehouseId' })
  toWarehouse: Warehouse | null;

  // OUT може бути на об’єкт (projects.id = int)
  @Column({ type: 'int', nullable: true })
  objectId: number | null;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'objectId' })
  object: Project | null;

  // User.id = number → int
  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // ✅ позиції руху (warehouse_movement_items)
  @OneToMany(() => WarehouseMovementItem, (it) => it.movement)
  items: WarehouseMovementItem[];

  @CreateDateColumn()
  createdAt: Date;
}