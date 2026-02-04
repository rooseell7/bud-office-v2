import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Payment } from './payment.entity';

@Entity('payables')
@Index(['projectId'])
@Index(['status'])
export class Payable {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  projectId: number;

  @Column({ type: 'int', nullable: true })
  supplierId: number | null;

  @Column({ type: 'int', unique: true })
  sourceReceiptId: number;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: '0' })
  paidAmount: string;

  @Column({ type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ type: 'int' })
  createdById: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Payment, (p) => p.payable)
  payments: Payment[];
}
