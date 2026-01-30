import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('document_versions')
@Index(['documentId'])
@Index(['documentId', 'createdAt'])
export class DocumentVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  documentId: number;

  @Column({ type: 'varchar', length: 16, default: 'auto' })
  type: 'auto' | 'manual';

  @Column({ type: 'jsonb', nullable: true })
  snapshot: Record<string, any> | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  @Column({ type: 'int', nullable: true })
  createdById: number | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
