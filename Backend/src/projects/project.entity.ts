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

  @Column({ type: 'text', default: 'planned' })
  status: string;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'int', nullable: true })
  clientId: number | null;

  @Column({ type: 'int', nullable: true })
  foremanId: number | null;

  @Column({ type: 'int', nullable: true })
  estimatorId: number | null;

  @Column({ type: 'int', nullable: true })
  supplyManagerId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
