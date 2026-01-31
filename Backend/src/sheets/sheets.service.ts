import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../documents/document.entity';
import { DocumentVersion } from '../documents/document-version.entity';
import { DocumentSheetOp } from '../documents/document-sheet-op.entity';
import { SheetSnapshot } from '../documents/sheet-snapshot.entity';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import { buildFromTemplate, listTemplates } from './templates/buildFromTemplate';

const HISTORY_LIMIT_MAX = 100;

@Injectable()
export class SheetsService {
  private readonly logger = new Logger(SheetsService.name);

  constructor(
    @InjectRepository(Document)
    private readonly docRepo: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private readonly versionRepo: Repository<DocumentVersion>,
    @InjectRepository(DocumentSheetOp)
    private readonly opsRepo: Repository<DocumentSheetOp>,
    @InjectRepository(SheetSnapshot)
    private readonly snapshotRepo: Repository<SheetSnapshot>,
  ) {}

  getTemplates() {
    return listTemplates();
  }

  async createFromTemplate(
    payload: { templateId: string; entityType?: string; entityId?: number; title?: string; projectId?: number },
    userId: number | null,
  ) {
    const { templateId, entityType, entityId, title, projectId } = payload;
    if (!templateId?.trim()) throw new BadRequestException('templateId required');

    const snapshot = buildFromTemplate(templateId);
    const docType = templateId.toLowerCase();
    const doc = await this.docRepo.save(
      this.docRepo.create({
        type: docType,
        title: title ?? (docType === 'quote' ? 'Комерційна пропозиція' : docType === 'act' ? 'Акт' : 'Накладна'),
        status: 'draft',
        projectId: projectId ?? null,
        sourceType: entityType ?? null,
        sourceId: entityId ?? null,
        meta: {
          sheetSnapshot: snapshot,
          sheetRevision: 1,
          templateVersion: snapshot.templateVersion,
        },
        createdById: userId ?? null,
      }),
    );
    this.logger.log(`sheet created from template doc=${doc.id} template=${templateId} user=${userId}`);
    return { id: doc.id, document: doc };
  }

  async getHistory(documentId: number, limit = 50): Promise<any[]> {
    const l = Math.min(Math.max(limit, 1), HISTORY_LIMIT_MAX);
    const [versions, ops] = await Promise.all([
      this.versionRepo.find({
        where: { documentId },
        order: { id: 'DESC' },
        take: l,
      }),
      this.opsRepo.find({
        where: { documentId, type: 'SNAPSHOT_UPDATE' },
        order: { id: 'DESC' },
        take: l,
      }),
    ]);
    const items: any[] = [
      ...versions.map((v) => ({
        kind: 'version',
        id: v.id,
        documentId: v.documentId,
        type: v.type,
        action: v.type === 'manual' ? 'manual_save' : 'auto_save',
        createdAt: v.createdAt,
        createdById: v.createdById,
        note: v.note,
        hasSnapshot: !!v.snapshot,
      })),
      ...ops
        .filter((o) => !o.isUndone)
        .map((o) => ({
          kind: 'op',
          id: o.id,
          documentId: o.documentId,
          type: o.type,
          action: 'edit',
          createdAt: o.createdAt,
          createdById: o.userId,
          note: null,
          hasSnapshot: !!o.payload?.nextSnapshot,
        })),
    ];
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items.slice(0, l);
  }

  async getVersionSnapshot(documentId: number, versionId: number): Promise<Record<string, any>> {
    const v = await this.versionRepo.findOne({
      where: { id: versionId, documentId },
    });
    if (!v?.snapshot) throw new NotFoundException('Version not found');
    return v.snapshot;
  }

  async getOpSnapshot(documentId: number, opId: number): Promise<Record<string, any>> {
    const op = await this.opsRepo.findOne({
      where: { id: opId, documentId, type: 'SNAPSHOT_UPDATE' },
    });
    const snap = op?.payload?.nextSnapshot;
    if (!snap || typeof snap !== 'object') throw new NotFoundException('Op snapshot not found');
    return snap;
  }

  async restoreVersion(
    documentId: number,
    versionId: number,
    userId: number | null,
  ): Promise<Record<string, any>> {
    const doc = await this.docRepo.findOne({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');

    const v = await this.versionRepo.findOne({
      where: { id: versionId, documentId },
    });
    if (!v?.snapshot) throw new NotFoundException('Version not found');

    const snapshot = v.snapshot;
    const meta = (doc as any).meta ?? {};
    (doc as any).meta = { ...meta, sheetSnapshot: snapshot };
    (doc as any).revision = ((doc as any).revision ?? 0) + 1;
    await this.docRepo.save(doc);

    await this.opsRepo.save(
      this.opsRepo.create({
        documentId,
        userId,
        type: 'RESTORE_VERSION',
        payload: { versionId, snapshot },
      }),
    );

    this.logger.log(`sheet restore doc=${documentId} version=${versionId} by user=${userId}`);
    return snapshot;
  }

  async exportXlsx(documentId: number): Promise<Buffer> {
    const doc = await this.docRepo.findOne({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');

    const meta = (doc as any).meta ?? {};
    const snap = meta.sheetSnapshot;
    if (!snap || typeof snap !== 'object') throw new NotFoundException('No sheet data');

    const values = snap.values ?? snap.rawValues ?? [];
    const columns = snap.columns ?? [];
    const colCount = snap.colCount ?? (values[0]?.length ?? 0);

    const wsData: (string | number)[][] = [];
    const headers = columns.map((c: any) => c?.title ?? '');
    if (headers.some(Boolean)) wsData.push(headers);

    for (const row of values) {
      const r = Array(colCount)
        .fill('')
        .map((_, i) => row?.[i] ?? '');
      wsData.push(r);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const widths = snap.columnWidths
      ? Object.entries(snap.columnWidths)
        .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
        .map(([, w]) => ({ wch: Math.min(50, Math.max(10, (w as number) / 8)) }))
      : [];
    if (widths.length) ws['!cols'] = widths;

    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }

  async exportPdf(documentId: number): Promise<Buffer> {
    const doc = await this.docRepo.findOne({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');

    const meta = (doc as any).meta ?? {};
    const snap = meta.sheetSnapshot;
    if (!snap || typeof snap !== 'object') throw new NotFoundException('No sheet data');

    const values = snap.values ?? snap.rawValues ?? [];
    const columns = snap.columns ?? [];
    const colCount = snap.colCount ?? (values[0]?.length ?? 0);

    return new Promise((resolve, reject) => {
      const pd = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];
      pd.on('data', (c: Buffer) => chunks.push(c));
      pd.on('end', () => resolve(Buffer.concat(chunks)));
      pd.on('error', reject);

      const colWidth = 80;
      const rowHeight = 20;
      const headers = columns.map((c: any) => c?.title ?? '');
      const headerRow = headers.length ? headers : Array(colCount).fill('');

      pd.fontSize(10);
      let y = 40;

      const drawRow = (row: (string | number)[], bold = false) => {
        if (bold) pd.font('Helvetica-Bold');
        let x = 40;
        for (let c = 0; c < colCount; c++) {
          const val = String(row?.[c] ?? '').slice(0, 20);
          pd.text(val, x, y, { width: colWidth - 4 });
          x += colWidth;
        }
        pd.font('Helvetica');
        y += rowHeight;
      };

      drawRow(headerRow, true);
      pd.moveTo(40, y - 5).lineTo(40 + colCount * colWidth, y - 5).stroke();
      for (const row of values) {
        const r = Array(colCount)
          .fill('')
          .map((_, i) => row?.[i] ?? '');
        drawRow(r);
      }

      pd.end();
    });
  }
}
