import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import { Document, type DocumentStatus } from './document.entity';
import { DocumentEvent } from './document-event.entity';
import { DocumentVersion } from './document-version.entity';
import { DocumentSheetOp } from './document-sheet-op.entity';
import { SheetSnapshot } from './sheet-snapshot.entity';
import { SheetOpsService } from './sheet-ops.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentsQueryDto } from './dto/documents-query.dto';

const TTL_SEC = 90;

function toApi(d: Document) {
  return {
    id: d.id,
    type: d.type,
    title: d.title,
    status: d.status,
    number: d.number,
    documentDate: d.documentDate,
    projectId: d.projectId,
    sourceType: d.sourceType,
    sourceId: d.sourceId,
    total: d.total,
    currency: d.currency,
    meta: d.meta,
    createdById: d.createdById,
    editSessionUserId: (d as any).editSessionUserId,
    editSessionExpiresAt: (d as any).editSessionExpiresAt,
    revision: (d as any).revision ?? 0,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

function isSessionExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return new Date() >= expiresAt;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document)
    private readonly repo: Repository<Document>,
    @InjectRepository(DocumentEvent)
    private readonly eventRepo: Repository<DocumentEvent>,
    @InjectRepository(DocumentVersion)
    private readonly versionRepo: Repository<DocumentVersion>,
    @InjectRepository(DocumentSheetOp)
    private readonly sheetOpsRepo: Repository<DocumentSheetOp>,
    @InjectRepository(SheetSnapshot)
    private readonly snapshotRepo: Repository<SheetSnapshot>,
    private readonly sheetOpsService: SheetOpsService,
  ) {}

  private async getEntity(id: number): Promise<Document> {
    const doc = await this.repo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  private async addEvent(
    documentId: number,
    action: string,
    payload: Record<string, any> | null,
    userId: number | null,
  ) {
    await this.eventRepo.save(
      this.eventRepo.create({ documentId, action, payload, userId }),
    );
  }

  async findAll(q: DocumentsQueryDto) {
    const limit = Math.min(Math.max(q.limit ?? 50, 1), 200);
    const offset = Math.max(q.offset ?? 0, 0);

    const where: any = {};
    if (q.type) where.type = q.type;
    if (q.status) where.status = q.status;
    if (q.projectId !== undefined) where.projectId = q.projectId;
    if (q.sourceType) where.sourceType = q.sourceType;
    if (q.sourceId !== undefined) where.sourceId = q.sourceId;

    // простий q-пошук по title/number
    // TypeORM ILike працює в Postgres.
    const hasQ = Boolean(q.q && q.q.trim());

    const [rows, total] = await this.repo.findAndCount({
      where: hasQ
        ? [
            { ...where, title: ILike(`%${q.q!.trim()}%`) },
            { ...where, number: ILike(`%${q.q!.trim()}%`) },
          ]
        : where,
      order: { id: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      items: rows.map(toApi),
      total,
      limit,
      offset,
    };
  }

  async findOne(id: number) {
    const doc = await this.getEntity(id);
    const meta = (doc as any).meta;
    if (meta?.sheetSnapshot) {
      const revision = meta.sheetRevision ?? 0;
      this.logger.log(`[load] snapshot { docId=${id} revision=${revision} }`);
    }
    return toApi(doc);
  }

  async create(dto: CreateDocumentDto, userId: number | null) {
    if (!dto.type?.trim()) throw new BadRequestException('type is required');

    const doc = await this.repo.save(
      this.repo.create({
        type: dto.type.trim(),
        title: dto.title?.trim() ?? null,
        status: dto.status ?? 'draft',
        number: dto.number?.trim() ?? null,
        documentDate: dto.documentDate ?? null,
        projectId: dto.projectId ?? null,
        sourceType: dto.sourceType?.trim() ?? null,
        sourceId: dto.sourceId ?? null,
        total: dto.total ?? null,
        currency: (dto.currency ?? 'UAH').trim(),
        meta: dto.meta ?? null,
        createdById: userId ?? null,
      }),
    );

    await this.addEvent(doc.id, 'created', { dto }, userId);
    return toApi(doc);
  }

  async update(
    id: number,
    dto: UpdateDocumentDto,
    userId: number | null,
  ) {
    const doc = await this.getEntity(id);
    const d = doc as any;

    if (dto.expectedRevision !== undefined) {
      const current = d.revision ?? 0;
      if (current !== dto.expectedRevision) {
        throw new ConflictException('Revision conflict');
      }
    }

    if (d.editSessionUserId != null && !isSessionExpired(d.editSessionExpiresAt)) {
      if (d.editSessionUserId !== userId) {
        throw new HttpException('Document is being edited by another user', HttpStatus.LOCKED);
      }
      if (dto.editSessionToken && d.editSessionToken !== d.editSessionToken) {
        throw new HttpException('Invalid edit session token', HttpStatus.LOCKED);
      }
    }

    const before = { ...toApi(doc) };

    if (dto.type !== undefined) doc.type = String(dto.type).trim();
    if (dto.title !== undefined) doc.title = dto.title ? String(dto.title).trim() : null;
    if (dto.status !== undefined) doc.status = dto.status;
    if (dto.number !== undefined) doc.number = dto.number ? String(dto.number).trim() : null;
    if (dto.documentDate !== undefined) doc.documentDate = dto.documentDate ?? null;
    if (dto.projectId !== undefined) doc.projectId = dto.projectId ?? null;
    if (dto.sourceType !== undefined) doc.sourceType = dto.sourceType ? String(dto.sourceType).trim() : null;
    if (dto.sourceId !== undefined) doc.sourceId = dto.sourceId ?? null;
    if (dto.total !== undefined) doc.total = dto.total ?? null;
    if (dto.currency !== undefined) doc.currency = String(dto.currency ?? 'UAH').trim();
    if (dto.meta !== undefined) {
      const meta = dto.meta ?? null;
      const prevSnapshot = (meta as any)?.sheetPrevSnapshot;
      const nextSnapshot = (meta as any)?.sheetSnapshot;
      if (prevSnapshot != null && nextSnapshot != null && typeof prevSnapshot === 'object' && typeof nextSnapshot === 'object') {
        const opStart = Date.now();
        await this.sheetOpsService.recordOp(
          doc.id,
          userId,
          'SNAPSHOT_UPDATE',
          { prevSnapshot, nextSnapshot },
        );
        this.logger.debug(`sheet op SNAPSHOT_UPDATE doc=${doc.id} latency=${Date.now() - opStart}ms`);
      }
      const metaToSave = meta && typeof meta === 'object' ? { ...meta } : null;
      if (metaToSave && 'sheetPrevSnapshot' in metaToSave) delete (metaToSave as any).sheetPrevSnapshot;
      doc.meta = metaToSave;
    }

    (doc as any).revision = ((doc as any).revision ?? 0) + 1;
    const saved = await this.repo.save(doc);
    await this.addEvent(saved.id, 'updated', { before, after: toApi(saved) }, userId);
    return toApi(saved);
  }

  async setStatus(id: number, status: DocumentStatus, userId: number | null) {
    const doc = await this.getEntity(id);
    const prev = doc.status;
    if (prev === status) return toApi(doc);

    doc.status = status;
    const saved = await this.repo.save(doc);
    await this.addEvent(saved.id, 'status_changed', { from: prev, to: status }, userId);
    return toApi(saved);
  }

  async remove(id: number, userId: number | null) {
    const doc = await this.getEntity(id);
    try {
      await this.addEvent(id, 'deleted', null, userId);
    } catch (e) {
      this.logger.warn('Could not add deleted event (audit)', e as Error);
    }
    await this.sheetOpsRepo.delete({ documentId: id });
    await this.snapshotRepo.delete({ documentId: id });
    await this.versionRepo.delete({ documentId: id });
    await this.eventRepo.delete({ documentId: id });
    await this.repo.remove(doc);
    return { ok: true };
  }

  async acquireEditSession(id: number, userId: number | null) {
    const doc = await this.getEntity(id);
    const d = doc as any;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TTL_SEC * 1000);

    if (isSessionExpired(d.editSessionExpiresAt)) {
      d.editSessionUserId = userId;
      d.editSessionToken = `tk_${id}_${userId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      d.editSessionExpiresAt = expiresAt;
      await this.repo.save(doc);
      return {
        token: d.editSessionToken,
        expiresAt: d.editSessionExpiresAt,
        holder: userId,
      };
    }

    if (d.editSessionUserId === userId) {
      d.editSessionExpiresAt = expiresAt;
      await this.repo.save(doc);
      return {
        token: d.editSessionToken,
        expiresAt: d.editSessionExpiresAt,
        holder: userId,
      };
    }

    throw new ConflictException({
      holderUserId: d.editSessionUserId,
      expiresAt: d.editSessionExpiresAt,
    });
  }

  async heartbeatEditSession(
    id: number,
    token: string,
    userId: number | null,
  ) {
    const doc = await this.getEntity(id);
    const d = doc as any;
    if (isSessionExpired(d.editSessionExpiresAt)) {
      throw new ConflictException('Session expired');
    }
    if (d.editSessionToken !== token || d.editSessionUserId !== userId) {
      throw new HttpException('Invalid session', HttpStatus.LOCKED);
    }
    d.editSessionExpiresAt = new Date(Date.now() + TTL_SEC * 1000);
    await this.repo.save(doc);
    return { ok: true };
  }

  async releaseEditSession(id: number, token: string, userId: number | null) {
    const doc = await this.getEntity(id);
    const d = doc as any;
    if (d.editSessionToken !== token || d.editSessionUserId !== userId) {
      throw new HttpException('Invalid session', HttpStatus.LOCKED);
    }
    d.editSessionUserId = null;
    d.editSessionToken = null;
    d.editSessionExpiresAt = null;
    await this.repo.save(doc);
    return { ok: true };
  }

  private static readonly VERSION_LIMIT = 30;

  async listVersions(documentId: number) {
    await this.getEntity(documentId);
    const items = await this.versionRepo.find({
      where: { documentId },
      order: { id: 'DESC' },
      take: DocumentsService.VERSION_LIMIT,
    });
    return {
      items: items.map((v) => ({
        id: v.id,
        documentId: v.documentId,
        type: v.type,
        snapshot: v.snapshot,
        note: v.note,
        createdById: v.createdById,
        createdAt: v.createdAt,
      })),
    };
  }

  async createVersion(
    documentId: number,
    type: 'auto' | 'manual',
    snapshot: Record<string, any>,
    note?: string,
    userId?: number | null,
  ) {
    await this.getEntity(documentId);
    const version = await this.versionRepo.save(
      this.versionRepo.create({
        documentId,
        type,
        snapshot,
        note: note ?? null,
        createdById: userId ?? null,
      }),
    );
    const count = await this.versionRepo.count({ where: { documentId } });
    if (count > DocumentsService.VERSION_LIMIT) {
      const toDelete = await this.versionRepo.find({
        where: { documentId },
        order: { id: 'ASC' },
        take: count - DocumentsService.VERSION_LIMIT,
      });
      await this.versionRepo.remove(toDelete);
    }
    return {
      id: version.id,
      documentId: version.documentId,
      type: version.type,
      createdAt: version.createdAt,
    };
  }

  async restoreVersion(documentId: number, versionId: number, userId: number | null) {
    const doc = await this.getEntity(documentId);
    const version = await this.versionRepo.findOne({
      where: { id: versionId, documentId },
    });
    if (!version) throw new NotFoundException('Version not found');
    const snapshot = version.snapshot;
    if (!snapshot || typeof snapshot !== 'object') throw new BadRequestException('Invalid snapshot');
    (doc as any).meta = { ...(doc.meta ?? {}), sheetSnapshot: snapshot };
    const saved = await this.repo.save(doc);
    return toApi(saved);
  }

  async events(id: number) {
    await this.getEntity(id);
    const items = await this.eventRepo.find({
      where: { documentId: id },
      order: { id: 'DESC' },
      take: 200,
    });
    return {
      items: items.map((e) => ({
        id: e.id,
        documentId: e.documentId,
        action: e.action,
        payload: e.payload,
        userId: e.userId,
        createdAt: e.createdAt,
      })),
    };
  }
}
