import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type DocumentStatus = 'draft' | 'final' | 'void';

/**
 * Documents foundation (v2.1)
 * Єдина таблиця для первинки/актів/підтверджень, із можливістю лінкуватися
 * на джерело (invoice, operation, act тощо) без жорстких FK.
 */
@Entity('documents')
@Index(['type', 'status'])
@Index(['sourceType', 'sourceId'])
@Index(['projectId'])
export class Document {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Тип документа (foundation). Приклади: invoice, payment_confirmation, act, operation_proof.
   */
  @Column({ type: 'varchar', length: 64 })
  type: string;

  /**
   * Людинозрозуміла назва/заголовок (опційно).
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string | null;

  @Column({ type: 'varchar', length: 16, default: 'draft' })
  status: DocumentStatus;

  /**
   * Номер/серія документа (опційно).
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  number: string | null;

  /**
   * Дата документа (не createdAt).
   */
  @Column({ type: 'date', nullable: true })
  documentDate: string | null;

  /**
   * Прив'язка до об'єкта/проєкту (у Buduy зараз це projectId).
   */
  @Column({ type: 'int', nullable: true })
  projectId: number | null;

  /**
   * Джерело, з якого згенеровано/пов'язано документ.
   * Напр.: sourceType='invoice', sourceId=123
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  sourceType: string | null;

  @Column({ type: 'int', nullable: true })
  sourceId: number | null;

  /**
   * Сума документа (опційно).
   */
  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  total: string | null;

  @Column({ type: 'varchar', length: 8, default: 'UAH' })
  currency: string;

  /**
   * Додаткові поля конкретного типу документа.
   */
  @Column({ type: 'jsonb', nullable: true })
  meta: Record<string, any> | null;

  /**
   * Хто створив (user.id). Без FK, щоб не ламати існуючу БД при розгортаннях.
   */
  @Column({ type: 'int', nullable: true })
  createdById: number | null;

  /** Safe-edit lock: user holding edit session */
  @Column({ type: 'int', nullable: true })
  editSessionUserId: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  editSessionToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  editSessionExpiresAt: Date | null;

  /** Revision for optimistic locking */
  @Column({ type: 'int', default: 0 })
  revision: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
