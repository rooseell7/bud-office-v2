import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SupplyOrder } from './supply-order.entity';

@Entity('supply_order_items')
@Index(['orderId'])
export class SupplyOrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  orderId: number;

  @Column({ type: 'int', nullable: true })
  sourceRequestItemId: number | null;

  @Column({ type: 'int', nullable: true })
  materialId: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customName: string | null;

  @Column({ type: 'varchar', length: 64 })
  unit: string;

  @Column({ type: 'decimal', precision: 14, scale: 4 })
  qtyPlanned: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  unitPrice: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => SupplyOrder, (o) => o.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: SupplyOrder;
}
