// FILE: bud_office-backend/src/warehouse/entities/warehouse-movement-draft.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Чернетка введення операції складу.
 * Зберігаємо payload форми (JSONB) для відновлення після перезавантаження/закриття.
 *
 * Важливо:
 * - Чернетки не впливають на залишки.
 * - Чернетка належить користувачу (userId) і складу (warehouseId).
 */
@Entity('warehouse_movement_drafts')
@Index(['userId', 'warehouseId'], { unique: true })
export class WarehouseMovementDraft {
  @PrimaryGeneratedColumn()
  id: number;

  // У БД колонки у snake_case (таблиця створювалась SQL-скриптом)
  @Column({ type: 'int', name: 'user_id' })
  userId: number;

  @Column({ type: 'int', name: 'warehouse_id' })
  warehouseId: number;

  // Збережений стан форми (type, docNo, note, items, ...)
  @Column({ type: 'jsonb' })
  payload: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}