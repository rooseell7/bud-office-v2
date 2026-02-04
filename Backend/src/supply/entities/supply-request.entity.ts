import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SupplyRequestItem } from './supply-request-item.entity';

@Entity('supply_requests')
@Index(['projectId'])
@Index(['status'])
export class SupplyRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  projectId: number;

  @Column({ type: 'varchar', length: 32, default: 'draft' })
  status: string;

  @Column({ type: 'date', nullable: true })
  neededAt: string | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'int' })
  createdById: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => SupplyRequestItem, (item) => item.request)
  items: SupplyRequestItem[];
}
