import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SupplyOrderItem } from './supply-order-item.entity';

@Entity('supply_orders')
@Index(['projectId'])
@Index(['status'])
@Index(['supplierId'])
export class SupplyOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  projectId: number;

  @Column({ type: 'int', nullable: true })
  sourceRequestId: number | null;

  @Column({ type: 'int', nullable: true })
  supplierId: number | null;

  @Column({ type: 'varchar', length: 32, default: 'draft' })
  status: string;

  @Column({ type: 'varchar', length: 32, default: 'supplier_to_object' })
  deliveryType: string;

  @Column({ type: 'date', nullable: true })
  deliveryDatePlanned: string | null;

  @Column({ type: 'text', nullable: true })
  paymentTerms: string | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'int' })
  createdById: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => SupplyOrderItem, (item) => item.order)
  items: SupplyOrderItem[];
}
