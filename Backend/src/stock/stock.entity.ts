import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
} from 'typeorm';
import { Warehouse } from '../warehouses/warehouse.entity';
import { Material } from '../materials/material.entity';

@Entity('stock')
@Unique(['warehouse', 'material'])
export class Stock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Warehouse, { eager: true })
  warehouse: Warehouse;

  @ManyToOne(() => Material, { eager: true })
  material: Material;

  @Column('decimal', { precision: 12, scale: 3, default: 0 })
  quantity: number;

  @Column('decimal', { precision: 12, scale: 3, default: 0 })
  minQuantity: number;
}
