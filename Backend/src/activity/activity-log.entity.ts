import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('activity_log')
@Index(['ts'])
@Index(['projectId', 'ts'])
export class ActivityLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'timestamptz' })
  ts: Date;

  @Column({ type: 'int', nullable: true })
  actorId: number | null;

  @Column({ type: 'varchar', length: 64 })
  entity: string;

  @Column({ type: 'varchar', length: 32 })
  action: string;

  @Column({ type: 'int' })
  entityId: number;

  @Column({ type: 'int', nullable: true })
  projectId: number | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  summary: string | null;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;
}
