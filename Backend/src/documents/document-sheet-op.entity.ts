import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Document } from './document.entity';

export const UNDOABLE_OP_TYPES = [
  'CELL_COMMIT',
  'PASTE_RANGE',
  'SET_COL_FORMULA',
  'RENAME_COL',
  'SET_FILTER',
  'CLEAR_FILTER',
  'SET_FREEZE_ROWS',
  'SET_FREEZE_COLS',
  'SORT_ROWS',
  'SNAPSHOT_UPDATE',
] as const;

export type UndoableOpType = (typeof UNDOABLE_OP_TYPES)[number];

/**
 * Sheet operation for op-log (BLOCK 13).
 * Stores granular ops for multi-user Undo/Redo.
 */
@Entity('document_sheet_ops')
@Index(['documentId', 'userId'])
@Index(['documentId', 'createdAt'])
export class DocumentSheetOp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  documentId: number;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'documentId' })
  document: Document;

  @Column({ type: 'int', nullable: true })
  userId: number | null;

  @Column({ type: 'varchar', length: 64 })
  type: string;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, any>;

  @Column({ type: 'uuid', nullable: true })
  undoGroupId: string | null;

  @Column({ type: 'boolean', default: false })
  isUndone: boolean;

  @Column({ type: 'int', nullable: true })
  undoneByOpId: number | null;

  @Column({ type: 'int', nullable: true })
  inverseOfOpId: number | null;

  @Column({ type: 'uuid', nullable: true })
  clientOpId: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
