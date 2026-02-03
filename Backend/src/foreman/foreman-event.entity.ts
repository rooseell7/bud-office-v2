import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum ForemanEventType {
  WORK_LOG = 'WORK_LOG',
  MATERIAL_RECEIPT = 'MATERIAL_RECEIPT',
  ISSUE = 'ISSUE',
  COMMENT = 'COMMENT',
  // Задачі відділу реалізації (єдиний контур timeline)
  TASK_CREATED = 'TASK_CREATED',
  TASK_STATUS_CHANGE = 'TASK_STATUS_CHANGE',
  TASK_COMMENT = 'TASK_COMMENT',
}

/**
 * Події виконроба по об'єкту (project).
 * objectId = projects.id
 */
@Entity('foreman_events')
@Index(['objectId', 'createdAt'])
export class ForemanEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  objectId: number;

  @Column({ type: 'varchar', length: 64 })
  type: ForemanEventType;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any> | null;

  @Column({ type: 'int', nullable: true })
  createdById: number | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
