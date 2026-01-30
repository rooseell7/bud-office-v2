import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Warehouse } from '../warehouses/warehouse.entity';
import { Material } from '../materials/material.entity';

export type OperationType = 'IN' | 'OUT';

@Entity('operations')
export class Operation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: OperationType;

  @ManyToOne(() => Warehouse, { eager: true })
  warehouse: Warehouse;

  @ManyToOne(() => Material, { eager: true })
  material: Material;

  @Column('decimal', { precision: 12, scale: 3 })
  quantity: number;

  @Column({ nullable: true })
  projectId?: string;

  @Column({ nullable: true })
  comment?: string;

  @CreateDateColumn()
  createdAt: Date;
}
