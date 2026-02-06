import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export const NEXT_ACTION_TYPES = ['call', 'meeting', 'send_kp', 'follow_up', 'other'] as const;
export type NextActionType = (typeof NEXT_ACTION_TYPES)[number];

@Entity('project_next_actions')
export class ProjectNextAction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'project_id' })
  projectId: number;

  @Column({ type: 'varchar', length: 32 })
  type: string;

  @Column({ type: 'date', name: 'due_at' })
  dueAt: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'completed_at' })
  completedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'int', nullable: true, name: 'actorId' })
  actorId: number | null;
}
