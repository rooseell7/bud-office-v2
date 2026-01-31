import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Document } from './document.entity';
import { DocumentSheetOp, UNDOABLE_OP_TYPES } from './document-sheet-op.entity';
import { SheetSnapshot } from './sheet-snapshot.entity';

const SNAPSHOT_OPS_INTERVAL = 100;

export type UndoResult =
  | { ok: true; snapshot: Record<string, any>; version: number }
  | { ok: false; reason: 'NO_OP' | 'UNDO_CONFLICT' | 'NOT_ALLOWED'; details?: string };

export type RedoResult =
  | { ok: true; snapshot: Record<string, any>; version: number }
  | { ok: false; reason: 'NO_OP' | 'CONFLICT' | 'NOT_ALLOWED'; details?: string };

@Injectable()
export class SheetOpsService {
  private readonly logger = new Logger(SheetOpsService.name);

  constructor(
    @InjectRepository(Document)
    private readonly docRepo: Repository<Document>,
    @InjectRepository(DocumentSheetOp)
    private readonly opsRepo: Repository<DocumentSheetOp>,
    @InjectRepository(SheetSnapshot)
    private readonly snapshotRepo: Repository<SheetSnapshot>,
  ) {}

  async recordOp(
    documentId: number,
    userId: number | null,
    type: string,
    payload: Record<string, any>,
    options?: { undoGroupId?: string; clientOpId?: string },
  ): Promise<DocumentSheetOp> {
    const op = this.opsRepo.create({
      documentId,
      userId,
      type,
      payload,
      undoGroupId: options?.undoGroupId ?? null,
      clientOpId: options?.clientOpId ?? null,
    });
    const saved = await this.opsRepo.save(op);

    if (type === 'SNAPSHOT_UPDATE' && payload?.nextSnapshot) {
      const count = await this.opsRepo.count({ where: { documentId } });
      if (count % SNAPSHOT_OPS_INTERVAL === 0) {
        const start = Date.now();
        await this.snapshotRepo.save(
          this.snapshotRepo.create({
            documentId,
            version: count,
            lastOpId: saved.id,
            snapshot: payload.nextSnapshot,
          }),
        );
        this.logger.log(`sheet snapshot doc=${documentId} v=${count} in ${Date.now() - start}ms`);
      }
    }
    return saved;
  }

  async getLastUndoableOp(
    documentId: number,
    userId: number | null,
  ): Promise<DocumentSheetOp | null> {
    if (!userId) return null;
    const op = await this.opsRepo.findOne({
      where: {
        documentId,
        userId,
        isUndone: false,
        type: In(UNDOABLE_OP_TYPES),
      },
      order: { id: 'DESC' },
    });
    return op ?? null;
  }

  async requestUndo(
    documentId: number,
    userId: number | null,
  ): Promise<UndoResult> {
    const doc = await this.docRepo.findOne({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');
    if (!userId) return { ok: false, reason: 'NOT_ALLOWED', details: 'User required' };

    const lastOp = await this.getLastUndoableOp(documentId, userId);
    if (!lastOp) {
      this.logger.debug(`undo rejected doc=${documentId} user=${userId} reason=NO_OP`);
      return { ok: false, reason: 'NO_OP' };
    }

    const currentMeta = (doc as any).meta ?? {};
    const currentSnapshot = currentMeta.sheetSnapshot;

    if (lastOp.type === 'SNAPSHOT_UPDATE') {
      const prev = lastOp.payload?.prevSnapshot;
      if (!prev || typeof prev !== 'object') {
        return { ok: false, reason: 'UNDO_CONFLICT', details: 'Missing prev snapshot' };
      }
      const next = lastOp.payload?.nextSnapshot;
      if (currentSnapshot && next && JSON.stringify(currentSnapshot) !== JSON.stringify(next)) {
        this.logger.warn(`undo conflict doc=${documentId} user=${userId} op=${lastOp.id}`);
        return { ok: false, reason: 'UNDO_CONFLICT', details: 'Document changed by others' };
      }

      const inverseOp = await this.opsRepo.save(
        this.opsRepo.create({
          documentId,
          userId,
          type: 'SNAPSHOT_UPDATE',
          payload: { prevSnapshot: currentSnapshot, nextSnapshot: prev },
          inverseOfOpId: lastOp.id,
        }),
      );

      await this.opsRepo.update(lastOp.id, { isUndone: true, undoneByOpId: inverseOp.id });

      const newMeta = { ...currentMeta, sheetSnapshot: prev };
      (doc as any).meta = newMeta;
      (doc as any).revision = ((doc as any).revision ?? 0) + 1;
      await this.docRepo.save(doc);

      return {
        ok: true,
        snapshot: prev,
        version: (doc as any).revision ?? 1,
      };
    }

    return { ok: false, reason: 'NO_OP', details: `Undo for type ${lastOp.type} not implemented` };
  }

  async requestRedo(
    documentId: number,
    userId: number | null,
  ): Promise<RedoResult> {
    const doc = await this.docRepo.findOne({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');
    if (!userId) return { ok: false, reason: 'NOT_ALLOWED', details: 'User required' };

    const lastUndone = await this.opsRepo.findOne({
      where: { documentId, userId, isUndone: true },
      order: { id: 'DESC' },
    });
    if (!lastUndone) return { ok: false, reason: 'NO_OP' };

    const inverseOp = await this.opsRepo.findOne({
      where: { inverseOfOpId: lastUndone.id },
    });
    if (!inverseOp || inverseOp.type !== 'SNAPSHOT_UPDATE') {
      return { ok: false, reason: 'NO_OP', details: 'Redo not supported' };
    }

    const targetSnapshot = lastUndone.payload?.nextSnapshot ?? lastUndone.payload;
    if (!targetSnapshot || typeof targetSnapshot !== 'object') {
      return { ok: false, reason: 'CONFLICT', details: 'Invalid redo target' };
    }

    const currentMeta = (doc as any).meta ?? {};
    const currentSnapshot = currentMeta.sheetSnapshot;
    const expectedCurrent = inverseOp.payload?.nextSnapshot;
    if (expectedCurrent != null && JSON.stringify(currentSnapshot) !== JSON.stringify(expectedCurrent)) {
      return { ok: false, reason: 'CONFLICT', details: 'Document changed since undo' };
    }

    await this.opsRepo.update(lastUndone.id, { isUndone: false, undoneByOpId: null });
    await this.opsRepo.update(inverseOp.id, { isUndone: true });

    const newMeta = { ...currentMeta, sheetSnapshot: targetSnapshot };
    (doc as any).meta = newMeta;
    (doc as any).revision = ((doc as any).revision ?? 0) + 1;
    await this.docRepo.save(doc);

    return {
      ok: true,
      snapshot: targetSnapshot,
      version: (doc as any).revision ?? 1,
    };
  }
}
