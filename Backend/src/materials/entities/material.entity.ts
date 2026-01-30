import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MaterialCategory } from './material-category.entity';
import { Unit } from './unit.entity';

@Entity('materials')
export class Material {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  // Backward compatible (якщо ти не хочеш ламати фронт одразу)
  @Column({ type: 'varchar', length: 64, nullable: true })
  unit?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  sku?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  basePrice: string;

  /**
   * Норма витрати матеріалу на 1 м² (для попередніх розрахунків).
   * Зберігаємо як decimal string (як і basePrice) для стабільності.
   */
  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0 })
  consumptionPerM2: string;

  /**
   * Норма витрати матеріалу на 1 м.п. (для попередніх розрахунків).
   */
  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0 })
  consumptionPerLm: string;

  /**
   * Вага (кг) для 1 одиниці матеріалу. Опційно.
   * Зберігаємо як decimal string для стабільності.
   */
  @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true })
  weightKg?: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Relations
  @Column({ type: 'int', nullable: true })
  categoryId?: number | null;

  @ManyToOne(() => MaterialCategory, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category?: MaterialCategory | null;

  @Column({ type: 'int', nullable: true })
  unitId?: number | null;

  @ManyToOne(() => Unit, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'unitId' })
  unitRef?: Unit | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
