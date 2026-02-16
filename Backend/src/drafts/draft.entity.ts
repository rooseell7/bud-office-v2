/**
 * STEP 7: Server drafts for autosave.
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('drafts')
@Index(['userId', 'key'], { unique: true })
@Index(['projectId', 'entityType'])
@Index(['updatedAt'])
export class Draft {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'varchar', length: 32 })
  scopeType: string;

  @Column({ type: 'int', nullable: true })
  projectId: number | null;

  @Column({ type: 'varchar', length: 64 })
  entityType: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  entityId: string | null;

  @Column({ type: 'varchar', length: 256 })
  key: string;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, unknown>;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'int', default: 1 })
  version: number;
}
