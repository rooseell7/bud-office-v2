import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('project_contacts')
export class ProjectContact {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'project_id' })
  projectId: number;

  @Column({ type: 'varchar', length: 32 })
  type: string; // call | meeting | message | other

  @Column({ type: 'text', nullable: true })
  result: string | null;

  @Column({ type: 'timestamptz', name: 'at' })
  at: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'int', nullable: true, name: 'created_by_id' })
  createdById: number | null;
}
