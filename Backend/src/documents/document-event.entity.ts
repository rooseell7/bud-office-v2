import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Аудит/стрічка подій документа.
 * Мінімальний foundation-формат: action + payload.
 */
@Entity('document_events')
@Index(['documentId', 'createdAt'])
export class DocumentEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  documentId: number;

  /**
   * Напр.: created, updated, status_changed, file_attached, file_removed
   */
  @Column({ type: 'varchar', length: 64 })
  action: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any> | null;

  @Column({ type: 'int', nullable: true })
  userId: number | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
