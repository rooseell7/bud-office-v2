import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('work_items')
export class WorkItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  unit: string;

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  defaultRateMaster: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  defaultRateClient: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
