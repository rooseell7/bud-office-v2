import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';

import { User } from '../../users/user.entity';
import { Project } from '../../projects/project.entity';
import { Stage } from '../../stages/stage.entity';
import { DeliveryActItem } from './delivery-act-item.entity';

@Entity('delivery_acts')
@Index(['projectId', 'createdAt'])
@Index(['userId', 'projectId'])
export class DeliveryAct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  @Index()
  projectId: number;

  @ManyToOne(() => Project, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  // stages.id = UUID
  @Column({ type: 'uuid', nullable: true })
  @Index()
  stageId: string | null;

  @ManyToOne(() => Stage, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'stageId' })
  stage: Stage | null;

  @Column({ type: 'varchar', length: 50 })
  number: string;

  @Column({ type: 'date' })
  date: string; // YYYY-MM-DD

  /**
   * Статус акту. На цьому етапі використовується для UX (чернетка/готово).
   * Затвердження (approve) — окремий крок.
   */
  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: 'draft' | 'done';

  @Column({ type: 'varchar', length: 500, nullable: true })
  comment: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  totalAmount: string;

  @Column({ type: 'int' })
  @Index()
  userId: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => DeliveryActItem, (i) => i.act, { cascade: true })
  items: DeliveryActItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
