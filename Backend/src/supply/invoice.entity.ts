import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * IMPORTANT
 * У вашій поточній БД таблиця `invoices` має camelCase-колонки (projectId, supplyManagerId, invoiceDate, createdAt, updatedAt),
 * тому НЕ задаємо `name:` у декораторах @Column — інакше TypeORM генерує SQL під lowercase-колонки і падає.
 */
@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn()
  id: number;

  // Прив’язка до проєкту (поки що можемо тримати nullable для чернеток)
  @Column({ type: 'int', nullable: true })
  projectId: number | null;

  // Відповідальний менеджер постачання (user.id)
  @Column({ type: 'int', nullable: true })
  supplyManagerId: number | null;

  // Дата накладної (DB: date)
  @Column({ type: 'date', nullable: true })
  invoiceDate: string | null;

  // Постачальник (поки як текст)
  @Column({ type: 'varchar', nullable: true })
  supplierName: string | null;

  /**
   * NOTE (v2.1 compatibility)
   * У поточній БД таблиця `invoices` НЕ містить колонок для internal-накладних
   * (type/internalDirection/warehouseId). Щоб не ловити 500 у Postgres,
   * зберігаємо лише базову схему: projectId, supplyManagerId, invoiceDate,
   * supplierName, items, total, status, createdAt, updatedAt.
   *
   * Internal IN/OUT повернемо після міграції БД.
   */

  // Позиції (DB: jsonb)
  @Column({ type: 'jsonb', nullable: false, default: () => "'[]'::jsonb" })
  items: any[];

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: false, default: 0 })
  total: string;

  @Column({ type: 'varchar', length: 32, nullable: false, default: 'draft' })
  status: 'draft' | 'sent' | 'paid' | string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
