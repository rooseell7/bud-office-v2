import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SupplyRequestTemplate } from './supply-request-template.entity';

@Entity('supply_request_template_items')
@Index(['templateId'])
export class SupplyRequestTemplateItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  templateId: number;

  @Column({ type: 'int', nullable: true })
  materialId: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customName: string | null;

  @Column({ type: 'varchar', length: 64 })
  unit: string;

  @Column({ type: 'decimal', precision: 14, scale: 4, default: 0 })
  qtyDefault: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'varchar', length: 16, default: 'normal' })
  priority: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => SupplyRequestTemplate, (t) => t.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'templateId' })
  template: SupplyRequestTemplate;
}
