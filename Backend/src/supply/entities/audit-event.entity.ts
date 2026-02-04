import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('audit_events')
@Index(['entityType', 'entityId'])
@Index(['createdAt'])
export class AuditEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64 })
  entityType: string;

  @Column({ type: 'int' })
  entityId: number;

  @Column({ type: 'varchar', length: 64 })
  action: string;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'jsonb', nullable: true })
  meta: Record<string, unknown> | null;

  @Column({ type: 'int' })
  actorId: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
