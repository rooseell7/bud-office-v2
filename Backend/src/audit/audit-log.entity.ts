import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('audit_log')
@Index(['createdAt'])
@Index(['entityType', 'entityId'])
@Index(['projectId', 'createdAt'])
@Index(['actorUserId', 'createdAt'])
@Index(['action'])
export class AuditLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'int' })
  actorUserId: number;

  @Column({ type: 'varchar', length: 128 })
  action: string;

  @Column({ type: 'varchar', length: 64 })
  entityType: string;

  @Column({ type: 'varchar', length: 128 })
  entityId: string;

  @Column({ type: 'int', nullable: true })
  projectId: number | null;

  @Column({ type: 'jsonb', nullable: true })
  before: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  after: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  meta: Record<string, unknown> | null;
}
