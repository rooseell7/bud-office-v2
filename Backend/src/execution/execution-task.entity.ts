import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ExecutionTaskStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  DONE = 'done',
  CANCELED = 'canceled',
}

export enum ExecutionTaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/**
 * Задача відділу реалізації. Прив'язана до об'єкта (project) та опційно до етапу (stage).
 */
@Entity('execution_tasks')
@Index(['projectId', 'createdAt'])
@Index(['assigneeId', 'projectId'])
export class ExecutionTask {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  projectId: number;

  @Column({ type: 'int', nullable: true })
  stageId: number | null;

  @Column({ type: 'varchar', length: 512 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int' })
  assigneeId: number;

  @Column({ type: 'varchar', length: 32, default: ExecutionTaskStatus.NEW })
  status: ExecutionTaskStatus;

  @Column({ type: 'varchar', length: 16, default: ExecutionTaskPriority.MEDIUM })
  priority: ExecutionTaskPriority;

  @Column({ type: 'date', nullable: true })
  dueDate: Date | null;

  @Column({ type: 'int' })
  createdById: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
