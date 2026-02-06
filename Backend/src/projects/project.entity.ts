import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  name: string;

  // ✅ ЯВНИЙ тип колонки text + TS тип string|null
  @Column({ type: 'text', nullable: true })
  type: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  city: string | null;

  /** Execution status: planned | active | paused | completed | cancelled */
  @Column({ type: 'text', default: 'planned' })
  status: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true, name: 'area_m2' })
  areaM2: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true, name: 'finish_class' })
  finishClass: string | null;

  @Column({ type: 'date', nullable: true, name: 'planned_start_at' })
  plannedStartAt: string | null;

  @Column({ type: 'date', nullable: true, name: 'planned_end_at' })
  plannedEndAt: string | null;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[] | null;

  @Column({ type: 'jsonb', nullable: true, name: 'access_info' })
  accessInfo: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /** Canonical sales stage (lead_new, kp_sent, deal_signed, etc.). Source of truth for CRM. */
  @Column({ type: 'varchar', length: 32, default: 'lead_new', name: 'sales_stage' })
  salesStage: string;

  @Column({ type: 'int' })
  userId: number;

  /** CRM: responsible sales person (nullable). */
  @Column({ type: 'int', nullable: true, name: 'owner_id' })
  ownerId: number | null;

  @Column({ type: 'int', nullable: true })
  clientId: number | null;

  @Column({ type: 'int', nullable: true })
  foremanId: number | null;

  @Column({ type: 'int', nullable: true })
  estimatorId: number | null;

  @Column({ type: 'int', nullable: true })
  supplyManagerId: number | null;

  /** CRM: опис наступної дії по об'єкту (sales); в БД — next_action */
  @Column({ type: 'text', nullable: true, name: 'next_action' })
  nextAction: string | null;

  /** CRM: термін виконання наступної дії; в БД — next_action_due */
  @Column({ type: 'date', nullable: true, name: 'next_action_due' })
  nextActionDue: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
