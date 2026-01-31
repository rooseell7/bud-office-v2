import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('sheet_snapshots')
@Index(['documentId'])
@Index(['documentId', 'version'])
export class SheetSnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  documentId: number;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'int', nullable: true })
  lastOpId: number | null;

  @Column({ type: 'jsonb' })
  snapshot: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
