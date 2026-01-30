import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { User } from '../../users/user.entity';
import { Project } from '../../projects/project.entity';
import { Stage } from '../../stages/stage.entity';

export type DeliveryWorkStatus = 'draft' | 'done';

@Entity('delivery_work_logs')
@Index(['projectId', 'createdAt'])
@Index(['userId', 'projectId'])
export class DeliveryWorkLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  @Index()
  projectId: number;

  @ManyToOne(() => Project, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  stageId: string | null;

  @ManyToOne(() => Stage, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'stageId' })
  stage: Stage | null;

  @Column({ type: 'varchar', length: 250 })
  name: string;

  @Column({ type: 'numeric', precision: 14, scale: 3, default: 0 })
  qty: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  unit: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  price: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  amount: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: DeliveryWorkStatus;

  @Column({ type: 'int' })
  @Index()
  userId: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
