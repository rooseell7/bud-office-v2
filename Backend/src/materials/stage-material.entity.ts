import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Stage } from '../stages/stage.entity';
import { Material } from './material.entity';

@Entity('stage_materials')
@Index(['userId', 'createdAt'])
@Index(['stageId'])
@Index(['materialId'])
export class StageMaterial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Stage, { onDelete: 'CASCADE' })
  stage: Stage;

  @Column()
  stageId: string;

  @ManyToOne(() => Material, { onDelete: 'RESTRICT' })
  material: Material;

  @Column()
  materialId: string;

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  qty: string; // decimal як string

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  price?: string | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
