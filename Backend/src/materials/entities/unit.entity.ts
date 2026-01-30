import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Material } from './material.entity';

@Entity('units')
export class Unit {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32 })
  code: string; // "шт", "кг", "м2", "м.п."

  @Column({ type: 'varchar', length: 128, nullable: true })
  name?: string | null; // "Штука", "Кілограм" (опційно)

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => Material, (m) => m.unitRef)
  materials: Material[];
}
