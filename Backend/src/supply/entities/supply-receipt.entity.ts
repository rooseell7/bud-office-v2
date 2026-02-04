import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SupplyReceiptItem } from './supply-receipt-item.entity';

@Entity('supply_receipts')
@Index(['projectId'])
@Index(['sourceOrderId'])
@Index(['status'])
export class SupplyReceipt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  projectId: number;

  @Column({ type: 'int' })
  sourceOrderId: number;

  @Column({ type: 'int', nullable: true })
  supplierId: number | null;

  @Column({ type: 'varchar', length: 32, default: 'draft' })
  status: string;

  @Column({ type: 'timestamptz', nullable: true })
  receivedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  receivedById: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  docNumber: string | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  total: string | null;

  @Column({ type: 'int' })
  createdById: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => SupplyReceiptItem, (item) => item.receipt)
  items: SupplyReceiptItem[];
}
