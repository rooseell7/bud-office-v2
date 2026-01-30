// FILE: bud_office-backend/src/attachments/attachment.entity.ts

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Attachment — універсальне сховище файлів, які прив’язані до сутності (invoice, document, operation, etc.).
 *
 * На цьому кроці (D1) наша задача — відновити роботу існуючого фронту Invoices:
 * - POST /attachments/upload
 * - GET  /attachments (list)
 *
 * Тому model максимально простий і backward-compatible.
 */

@Entity('attachments')
@Index(['entityType', 'entityId'])
export class Attachment {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Тип сутності: 'invoice', 'document', ...
   */
  @Column({ type: 'varchar', length: 64 })
  entityType: string;

  /**
   * ID сутності (int). На поточному етапі достатньо number.
   */
  @Column({ type: 'int' })
  entityId: number;

  @Column({ type: 'varchar', length: 255 })
  originalName: string;

  @Column({ type: 'varchar', length: 255 })
  fileName: string;

  @Column({ type: 'varchar', length: 255 })
  mimeType: string;

  @Column({ type: 'bigint' })
  size: string;

  /**
   * Відносний шлях у файловій системі (наприклад: uploads/attachments/xxx.pdf)
   */
  @Column({ type: 'varchar', length: 512 })
  path: string;

  /**
   * Хто завантажив (user.id). Зберігаємо як number (int) для сумісності з типом req.user.id у проєкті.
   */
  @Column({ type: 'int', nullable: true })
  uploadedByUserId: number | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
