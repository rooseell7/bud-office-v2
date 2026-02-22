import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../documents/document.entity';
import { DocumentSheetOp } from '../documents/document-sheet-op.entity';
import { SheetSnapshot } from '../documents/sheet-snapshot.entity';

const LOCK_TTL_MS = 30_000;
const HEARTBEAT_INTERVAL_MS = 10_000;

type CellLock = { userId: number; expiresAt: number };
type DocLock = { userId: number; expiresAt: number };
type PresenceUser = { userId: number | null; cursor?: { row: number; col: number } };
type JoinInfo = { docId: number | string; userId: number | null; mode: 'edit' | 'readonly' };

@Injectable()
export class CollabService {
  private readonly logger = new Logger(CollabService.name);

  private cellLocks = new Map<string, CellLock>();
  private docLocks = new Map<number | string, DocLock>();
  private presence = new Map<string, PresenceUser>();
  private joins = new Map<string, Map<number | string, JoinInfo>>();
  private docToSockets = new Map<number | string, Set<string>>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @InjectRepository(Document)
    private readonly docRepo: Repository<Document>,
    @InjectRepository(DocumentSheetOp)
    private readonly opsRepo: Repository<DocumentSheetOp>,
    @InjectRepository(SheetSnapshot)
    private readonly snapshotRepo: Repository<SheetSnapshot>,
  ) {
    this.startHeartbeat();
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, lock] of this.cellLocks) {
        if (lock.expiresAt < now) this.cellLocks.delete(key);
      }
      for (const [docId, lock] of this.docLocks) {
        if (lock.expiresAt < now) this.docLocks.delete(docId);
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private cellKey(docId: number | string, row: number, col: number): string {
    return `${docId}:${row}:${col}`;
  }

  joinDoc(socketId: string, docId: number | string, userId: number | null, mode: 'edit' | 'readonly') {
    let byDoc = this.joins.get(socketId);
    if (!byDoc) {
      byDoc = new Map();
      this.joins.set(socketId, byDoc);
    }
    byDoc.set(docId, { docId, userId, mode });

    let sockets = this.docToSockets.get(docId);
    if (!sockets) {
      sockets = new Set();
      this.docToSockets.set(docId, sockets);
    }
    sockets.add(socketId);
  }

  leaveDoc(socketId: string, docId: number | string) {
    this.joins.get(socketId)?.delete(docId);
    this.docToSockets.get(docId)?.delete(socketId);
    this.presence.delete(`${socketId}:${docId}`);
  }

  leaveAll(socketId: string, userId: number | null) {
    const byDoc = this.joins.get(socketId);
    if (byDoc) {
      for (const [docId] of byDoc) {
        this.leaveDoc(socketId, docId);
      }
      this.joins.delete(socketId);
    }
    for (const [key, lock] of this.cellLocks) {
      if (lock.userId === userId) this.cellLocks.delete(key);
    }
    for (const [docId, lock] of this.docLocks) {
      if (lock.userId === userId) this.docLocks.delete(docId);
    }
  }

  canLock(socketId: string, docId: number | string): boolean {
    const info = this.joins.get(socketId)?.get(docId);
    return info?.mode === 'edit';
  }

  lockCell(docId: number | string, row: number, col: number, userId: number | null) {
    if (userId == null) return;
    const key = this.cellKey(docId, row, col);
    this.cellLocks.set(key, { userId, expiresAt: Date.now() + LOCK_TTL_MS });
  }

  unlockCell(socketId: string, docId: number | string, row: number, col: number) {
    const key = this.cellKey(docId, row, col);
    this.cellLocks.delete(key);
  }

  lockDoc(docId: number | string, userId: number | null) {
    if (userId == null) return;
    this.docLocks.set(docId, { userId, expiresAt: Date.now() + LOCK_TTL_MS });
  }

  unlockDoc(socketId: string, docId: number | string) {
    this.docLocks.delete(docId);
  }

  updatePresence(socketId: string, docId: number | string, userId: number | null, cursor?: { row: number; col: number }) {
    this.presence.set(`${socketId}:${docId}`, { userId, cursor });
  }

  getLocks(docId: number | string): { cellLocks: Record<string, number>; docLock: number | null } {
    const cellLocks: Record<string, number> = {};
    const now = Date.now();
    for (const [key, lock] of this.cellLocks) {
      if (key.startsWith(`${docId}:`) && lock.expiresAt > now) {
        cellLocks[key] = lock.userId;
      }
    }
    const dl = this.docLocks.get(docId);
    const docLock = dl && dl.expiresAt > now ? dl.userId : null;
    return { cellLocks, docLock };
  }

  getPresence(docId: number | string): PresenceUser[] {
    const sockets = this.docToSockets.get(docId);
    if (!sockets) return [];
    const result: PresenceUser[] = [];
    for (const sid of sockets) {
      const p = this.presence.get(`${sid}:${docId}`);
      if (p) result.push(p);
    }
    return result;
  }

  async getDocState(docId: number): Promise<{ snapshot: Record<string, any>; version: number } | null> {
    const doc = await this.docRepo.findOne({ where: { id: docId } });
    if (!doc) return null;
    const meta = (doc as any).meta ?? {};
    const snapshot = meta.sheetSnapshot;
    const version = meta.sheetRevision ?? 0;
    if (!snapshot || typeof snapshot !== 'object') return null;
    return { snapshot, version };
  }

  async applyOp(
    docId: number,
    baseVersion: number,
    clientOpId: string,
    op: { type: string; payload: Record<string, any> },
    userId: number | null,
  ): Promise<
    | { ok: true; version: number; opId: number }
    | { ok: false; reason: string; details?: string }
  > {
    const existing = await this.opsRepo.findOne({
      where: { documentId: docId, clientOpId },
    });
    if (existing) {
      this.logger.debug(`applyOp dedup doc=${docId} clientOpId=${clientOpId}`);
      return { ok: true, version: (await this.getDocState(docId))?.version ?? 0, opId: existing.id };
    }

    const doc = await this.docRepo.findOne({ where: { id: docId } });
    if (!doc) return { ok: false, reason: 'NOT_FOUND' };

    const meta = (doc as any).meta ?? {};
    const currentVersion = meta.sheetRevision ?? 0;
    if (baseVersion !== currentVersion) {
      this.logger.warn(
        `applyOp VERSION_MISMATCH doc=${docId} baseVersion=${baseVersion} currentVersion=${currentVersion} clientOpId=${clientOpId?.slice(0, 8)} userId=${userId}`,
      );
      return { ok: false, reason: 'VERSION_MISMATCH', details: `expected ${baseVersion}, got ${currentVersion}` };
    }

    let nextSnapshot: Record<string, any> | null = null;
    if (op.type === 'SNAPSHOT_UPDATE' && op.payload?.nextSnapshot) {
      nextSnapshot = op.payload.nextSnapshot;
    } else if (op.type === 'CELL_COMMIT' && op.payload?.changes) {
      const snap = meta.sheetSnapshot ?? {};
      nextSnapshot = this.applyCellCommit(snap, op.payload);
    }
    if (!nextSnapshot) {
      return { ok: false, reason: 'UNSUPPORTED_OP', details: op.type };
    }

    (doc as any).meta = {
      ...meta,
      sheetSnapshot: nextSnapshot,
      sheetRevision: currentVersion + 1,
    };
    await this.docRepo.save(doc);
    this.logger.log(`[collab] persisted snapshot { docId=${docId} newVersion=${currentVersion + 1} }`);

    const savedOp = await this.opsRepo.save(
      this.opsRepo.create({
        documentId: docId,
        userId,
        type: op.type,
        payload: op.payload,
        clientOpId,
      }),
    );

    const count = await this.opsRepo.count({ where: { documentId: docId } });
    if (count % 100 === 0) {
      await this.snapshotRepo.save(
        this.snapshotRepo.create({
          documentId: docId,
          version: count,
          lastOpId: savedOp.id,
          snapshot: nextSnapshot,
        }),
      );
    }

    return { ok: true, version: currentVersion + 1, opId: savedOp.id };
  }

  private applyCellCommit(snap: Record<string, any>, payload: any): Record<string, any> {
    const changes = payload.changes ?? [payload];
    const rawValues = (snap.rawValues ?? []).map((r: string[]) => [...r]);
    const colCount = snap.colCount ?? rawValues[0]?.length ?? 0;
    const rowCount = snap.rowCount ?? rawValues.length;
    for (const c of changes) {
      const r = c.row ?? c.r ?? 0;
      const col = c.col ?? c.c ?? 0;
      if (r >= 0 && r < rowCount && col >= 0 && col < colCount) {
        const next = c.next ?? c.value ?? '';
        if (!rawValues[r]) rawValues[r] = Array(colCount).fill('');
        rawValues[r][col] = next;
      }
    }
    return {
      ...snap,
      rawValues,
      values: rawValues.map((r: string[]) => [...r]),
    };
  }
}
