import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('outbox_events')
@Index(['publishedAt', 'nextAttemptAt', 'createdAt'])
@Index(['scopeType', 'scopeId', 'id'])
export class OutboxEvent {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ type: 'int', default: 0 })
  attemptCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  nextAttemptAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  deadLetteredAt: Date | null;

  @Column({ type: 'varchar', length: 64 })
  eventType: string;

  @Column({ type: 'varchar', length: 32 })
  scopeType: string;

  @Column({ type: 'int', nullable: true })
  scopeId: number | null;

  @Column({ type: 'varchar', length: 64 })
  entityType: string;

  @Column({ type: 'varchar', length: 128 })
  entityId: string;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, unknown>;

  @Column({ type: 'int', nullable: true })
  actorUserId: number | null;

  @Column({ type: 'uuid', nullable: true })
  clientOpId: string | null;
}
