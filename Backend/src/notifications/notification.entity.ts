/**
 * STEP 10: Notifications (inbox + realtime).
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('notifications')
@Index(['userId', 'readAt', 'createdAt'])
@Index(['projectId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'int' })
  userId: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'varchar', length: 64 })
  type: string;

  @Column({ type: 'varchar', length: 256 })
  title: string;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  body: string | null;

  @Column({ type: 'int', nullable: true })
  projectId: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  entityType: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  entityId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ type: 'timestamptz', nullable: true })
  readAt: Date | null;
}
