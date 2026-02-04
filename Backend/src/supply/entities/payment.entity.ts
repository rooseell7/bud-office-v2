import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Payable } from './payable.entity';

@Entity('payments')
@Index(['payableId'])
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  payableId: number;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: string;

  @Column({ type: 'date' })
  paidAt: string;

  @Column({ type: 'varchar', length: 16, default: 'bank' })
  method: string;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'int' })
  createdById: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Payable, (p) => p.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payableId' })
  payable: Payable;
}
