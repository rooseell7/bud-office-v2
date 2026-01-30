import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum StageStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  PAUSED = 'paused',
}

@Entity('stages')
@Index(['userId', 'objectId'])
export class Stage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  // ⬇️ КЛЮЧОВИЙ ФІКС ТУТ
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ default: StageStatus.PLANNED })
  status: StageStatus;

  @Column({ type: 'int', default: 0 })
  order: number;

  // FK → projects.id
  @Column({ type: 'int' })
  objectId: number;

  @Column({ type: 'int' })
  userId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
