import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum ExecutionTaskEventType {
  STATUS_CHANGE = 'status_change',
  COMMENT = 'comment',
}

/**
 * Подія по задачі (зміна статусу, коментар). Історія для задачі + джерело для timeline.
 */
@Entity('execution_task_events')
@Index(['taskId', 'createdAt'])
export class ExecutionTaskEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  taskId: number;

  @Column({ type: 'varchar', length: 32 })
  type: ExecutionTaskEventType;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ type: 'int', nullable: true })
  createdById: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
