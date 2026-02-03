import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TransactionType {
  IN = 'in',
  OUT = 'out',
  TRANSFER = 'transfer',
}

@Entity('finance_transactions')
@Index(['date', 'id'])
@Index(['walletId', 'date'])
@Index(['projectId', 'date'])
@Index(['fromWalletId', 'date'])
@Index(['toWalletId', 'date'])
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 16 })
  type: TransactionType;

  @Column({ type: 'date' })
  date: Date;

  /** For IN/OUT: the wallet. For TRANSFER: source. */
  @Column({ type: 'int', nullable: true })
  walletId: number | null;

  @Column({ type: 'int', nullable: true })
  fromWalletId: number | null;

  @Column({ type: 'int', nullable: true })
  toWalletId: number | null;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 8 })
  currency: string;

  @Column({ type: 'decimal', precision: 12, scale: 6, nullable: true })
  fxRate: number | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  amountUAH: number | null;

  @Column({ type: 'int', nullable: true })
  projectId: number | null;

  @Column({ type: 'int', nullable: true })
  categoryId: number | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  counterparty: string | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'int' })
  createdById: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
