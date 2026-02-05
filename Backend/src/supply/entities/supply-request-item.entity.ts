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
import { SupplyRequest } from './supply-request.entity';

@Entity('supply_request_items')
@Index(['requestId'])
export class SupplyRequestItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  requestId: number;

  @Column({ type: 'varchar', length: 32, default: 'manual' })
  sourceType: string;

  @Column({ type: 'int', nullable: true })
  sourceQuoteId: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  sourceStageId: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  sourceQuoteRowId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sourceMaterialFingerprint: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sourceStageName: string | null;

  @Column({ type: 'int', nullable: true })
  materialId: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customName: string | null;

  @Column({ type: 'varchar', length: 64 })
  unit: string;

  @Column({ type: 'decimal', precision: 14, scale: 4 })
  qty: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'varchar', length: 16, default: 'normal' })
  priority: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => SupplyRequest, (r) => r.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requestId' })
  request: SupplyRequest;
}
