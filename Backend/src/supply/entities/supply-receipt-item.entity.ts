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
import { SupplyReceipt } from './supply-receipt.entity';

@Entity('supply_receipt_items')
@Index(['receiptId'])
export class SupplyReceiptItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  receiptId: number;

  @Column({ type: 'int', nullable: true })
  sourceOrderItemId: number | null;

  @Column({ type: 'int', nullable: true })
  materialId: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customName: string | null;

  @Column({ type: 'varchar', length: 64 })
  unit: string;

  @Column({ type: 'decimal', precision: 14, scale: 4 })
  qtyReceived: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  unitPrice: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'boolean', default: false })
  isSubstitution: boolean;

  @Column({ type: 'int', nullable: true })
  originalMaterialId: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  originalCustomName: string | null;

  @Column({ type: 'int', nullable: true })
  substituteMaterialId: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  substituteCustomName: string | null;

  @Column({ type: 'text', nullable: true })
  substitutionReason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => SupplyReceipt, (r) => r.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiptId' })
  receipt: SupplyReceipt;
}
