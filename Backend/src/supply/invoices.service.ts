import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import PDFDocument from 'pdfkit';

import { Invoice } from './invoice.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoicesQueryDto } from './dto/invoices-query.dto';
import { RealtimeEmitterService } from '../realtime/realtime-emitter.service';
import { buildPatchForEntity } from '../realtime/invalidate-hints';

function toIsoDate(d?: unknown): string | null {
  if (d === null || d === undefined) return null;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  const s = String(d).trim();
  if (!s) return null;
  // приймаємо або YYYY-MM-DD, або ISO і обрізаємо до дати
  const m = s.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2})/);
  return m ? m[1] : null;
}

// Відповідь сумісна з фронтом (src/modules/invoices/api/invoices.api.ts)
function toApi(inv: Invoice) {
  return {
    id: inv.id,
    objectId: inv.projectId ?? 0,
    // v2.1: у поточній БД немає колонок type/internalDirection/warehouseId,
    // тому для сумісності з фронтом віддаємо дефолти.
    type: 'external',
    internalDirection: null,
    warehouseId: null,
    supplierName: inv.supplierName ?? null,
    customerName: null,
    supplierMarginPct: null,
    customerMarginPct: null,
    status: inv.status,
    items: Array.isArray(inv.items) ? inv.items : [],
    totalSupplier: inv.total ?? '0',
    totalCustomer: inv.total ?? '0',
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
    // В БД `invoiceDate` має тип DATE; у Entity тримаємо як string, тому нормалізуємо.
    invoiceDate: toIsoDate(inv.invoiceDate),

    // У таблиці `invoices` в БД немає колонки `name`, але UI зручніше мати підпис
    name: `Накладна #${inv.id}`,
  };
}

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly repo: Repository<Invoice>,
    private readonly dataSource: DataSource,
    private readonly realtimeEmitter: RealtimeEmitterService,
  ) {}

  private async getEntity(id: number): Promise<Invoice> {
    if (!Number.isFinite(id) || id <= 0) throw new BadRequestException('Invalid id');
    const inv = await this.repo.findOne({ where: { id } });
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  async findAll(q: InvoicesQueryDto) {
    const take = q.take && q.take > 0 ? Math.min(q.take, 200) : 200;
    const skip = q.skip && q.skip >= 0 ? q.skip : 0;

    const qb = this.repo.createQueryBuilder('i').orderBy('i.id', 'DESC');

    if (q.objectId) qb.andWhere('i.projectId = :projectId', { projectId: q.objectId });

    if (q.status) qb.andWhere('i.status = :status', { status: q.status });

    if (q.q) {
      const s = `%${q.q}%`;
      qb.andWhere('(CAST(i.id AS text) ILIKE :s OR i.supplierName ILIKE :s)', { s });
    }

    qb.take(take).skip(skip);

    const items = await qb.getMany();
    return items.map(toApi);
  }

  async findOne(id: number) {
    if (!Number.isFinite(id) || id <= 0) throw new BadRequestException('Invalid id');
    const inv = await this.repo.findOne({ where: { id } });
    if (!inv) throw new NotFoundException('Invoice not found');
    return toApi(inv);
  }

  async create(dto: CreateInvoiceDto, userId?: number) {
    // Backward-compatible: приймаємо `objectId` і мапимо його у projectId.
    const projectId = dto.projectId ?? (dto as any).objectId;
    const pid = projectId && Number(projectId) > 0
      ? (typeof projectId === 'number' ? projectId : Number(projectId))
      : null;

    // Основний сценарій: постачальник → обʼєкт (обʼєкт обовʼязковий)
    if (!pid || pid < 1) {
      throw new BadRequestException('projectId (або objectId) є обов\'язковим для external-накладної');
    }

    const inv = this.repo.create({
      projectId: pid,
      // supplyManagerId: беремо з авторизованого користувача (якщо є), інакше ...
      supplyManagerId: (userId ?? dto.supplyManagerId) ?? null,
      // У БД invoiceDate типу DATE; тримаємо як ISO-дату (YYYY-MM-DD)
      // IMPORTANT: у схемі БД `invoiceDate` має NOT NULL, тому якщо з фронту не прийшло — ставимо "сьогодні".
      invoiceDate: toIsoDate(dto.invoiceDate) ?? toIsoDate(new Date()),
      supplierName: dto.supplierName ?? null,
      items: (dto.items ?? []) as any[],
      total: '0',
      status: (dto.status ?? 'draft') as any,
    });

    const sum = (inv.items ?? []).reduce((acc: number, it: any) => {
      const a = Number(it?.amountClient ?? it?.amountSupplier ?? 0);
      return acc + (Number.isFinite(a) ? a : 0);
    }, 0);
    inv.total = String(sum);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const saved = await qr.manager.getRepository(Invoice).save(inv);
      const patch = buildPatchForEntity('invoice', 'created', {
        id: saved.id,
        projectId: saved.projectId,
        status: saved.status,
        total: saved.total,
        updatedAt: saved.updatedAt,
      });
      await this.realtimeEmitter.emitEntityChangedTx(qr.manager, {
        eventType: 'entity.created',
        entityType: 'invoice',
        entityId: String(saved.id),
        projectId: saved.projectId ?? null,
        actorUserId: userId ?? null,
        updatedAt: saved.updatedAt?.toISOString?.() ?? undefined,
        patch: patch ?? undefined,
      });
      await qr.commitTransaction();
      return toApi(saved);
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  async update(id: number, dto: UpdateInvoiceDto) {
    const inv = await this.getEntity(id);

    if (dto.projectId !== undefined) inv.projectId = dto.projectId ?? null;

    if (dto.supplyManagerId !== undefined) inv.supplyManagerId = dto.supplyManagerId ?? null;
    if (dto.invoiceDate !== undefined) inv.invoiceDate = toIsoDate(dto.invoiceDate) ?? toIsoDate(new Date());
    if (dto.supplierName !== undefined) inv.supplierName = dto.supplierName ?? null;
    if (dto.items !== undefined) inv.items = (dto.items ?? []) as any[];

    // v2.1: internal-поля (type/internalDirection/warehouseId) поки не зберігаємо в БД.

    const sum = (inv.items ?? []).reduce((acc: number, it: any) => {
      const a = Number(it?.amountClient ?? it?.amountSupplier ?? 0);
      return acc + (Number.isFinite(a) ? a : 0);
    }, 0);
    inv.total = String(sum);

    if (dto.status !== undefined) inv.status = (dto.status ?? inv.status) as any;

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const saved = await qr.manager.getRepository(Invoice).save(inv);
      const patch = buildPatchForEntity('invoice', 'changed', {
        id: saved.id,
        projectId: saved.projectId,
        status: saved.status,
        total: saved.total,
        updatedAt: saved.updatedAt,
      });
      await this.realtimeEmitter.emitEntityChangedTx(qr.manager, {
        eventType: 'entity.changed',
        entityType: 'invoice',
        entityId: String(saved.id),
        projectId: saved.projectId ?? null,
        updatedAt: saved.updatedAt?.toISOString?.() ?? undefined,
        patch: patch ?? undefined,
      });
      await qr.commitTransaction();
      return toApi(saved);
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  async remove(id: number) {
    const inv = await this.getEntity(id);
    const projectId = inv.projectId;
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      await qr.manager.getRepository(Invoice).remove(inv);
      await this.realtimeEmitter.emitEntityChangedTx(qr.manager, {
        eventType: 'entity.deleted',
        entityType: 'invoice',
        entityId: String(id),
        projectId: projectId ?? null,
        patch: { op: 'delete' },
      });
      await qr.commitTransaction();
      return { ok: true };
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  async generatePdf(id: number): Promise<Buffer> {
    const inv = await this.getEntity(id);

    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    const chunks: Buffer[] = [];
    doc.on('data', (c: any) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    doc.fontSize(18).text(`Накладна #${inv.id}`, { align: 'left' });
    doc.moveDown(0.5);

    doc.fontSize(10).text(`Object/Project ID: ${inv.projectId ?? '-'}`);
    doc.text(`Постачальник: ${inv.supplierName ?? '-'}`);
    doc.text(`Дата: ${toIsoDate(inv.invoiceDate) ?? '-'}`);
    doc.text(`Статус: ${inv.status}`);
    doc.moveDown(1);

    doc.fontSize(12).text('Позиції', { underline: true });
    doc.moveDown(0.5);

    const items = Array.isArray(inv.items) ? inv.items : [];
    items.forEach((it: any, idx: number) => {
      const name = it.materialName ?? it.name ?? `Позиція ${idx + 1}`;
      const qty = it.qty ?? '';
      const unit = it.unit ?? '';
      const sp = it.supplierPrice ?? '';
      const cp = it.clientPrice ?? '';
      const as = it.amountSupplier ?? '';
      const ac = it.amountClient ?? '';
      doc.fontSize(10).text(
        `${idx + 1}. ${name}  ${qty} ${unit}  | пост: ${sp} / сума: ${as}  | клієнт: ${cp} / сума: ${ac}`,
      );
    });

    doc.moveDown(1);
    doc.fontSize(12).text(`Разом: ${inv.total}`, { align: 'right' });

    doc.end();
    return done;
  }
}
