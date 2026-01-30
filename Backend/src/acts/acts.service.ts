import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';

import { Document } from '../documents/document.entity';
import { Act } from './act.entity';
import { CreateActFromQuoteDto } from './dto/create-act-from-quote.dto';
import { CreateActDto } from './dto/create-act.dto';
import { UpdateActDto } from './dto/update-act.dto';

type RowType = 'meta' | 'section' | 'work' | 'percent' | 'subtotal';

type ActRow = {
  rowType: RowType;
  sectionKey?: string;

  // meta
  header?: Record<string, any>;

  // section/subtotal
  title?: string;

  // work/percent
  name?: string;
  unit?: string;
  qty?: number;
  price?: number;
  costPrice?: number;
  amount?: number;
  amountCost?: number;

  // percent
  percentValue?: number;
};

function n(v: unknown): number {
  const x = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(x) ? x : 0;
}

function todayYmd(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getUserId(req: Request): number | null {
  const anyReq = req as any;
  const id = anyReq?.user?.id;
  const v = typeof id === 'number' ? id : Number(id);
  return Number.isFinite(v) ? v : null;
}

const ALLOWED_ROW_TYPES = new Set<RowType>(['meta', 'section', 'work', 'percent', 'subtotal']);

@Injectable()
export class ActsService {
  constructor(
    @InjectRepository(Act) private readonly repo: Repository<Act>,
    @InjectRepository(Document) private readonly documents: Repository<Document>,
  ) {}

  private sanitizeRows(items: any[] | undefined): ActRow[] {
    const src = Array.isArray(items) ? items : [];
    const out: ActRow[] = [];

    for (const r of src) {
      if (!r || typeof r !== 'object') continue;
      const rowType = String((r as any).rowType ?? '').trim() as RowType;
      if (!ALLOWED_ROW_TYPES.has(rowType)) continue;

      // Ми завжди переобчислюємо amounts/subtotals на сервері.
      if (rowType === 'meta') {
        const hdr: any = { ...(((r as any).header ?? {}) as any) };
        // захист: в актах матеріали не використовуємо
        if ('materials' in hdr) delete hdr.materials;
        out.push({ rowType: 'meta', header: hdr });
        continue;
      }

      if (rowType === 'section') {
        const title = String((r as any).title ?? '').trim();
        const sectionKey = String((r as any).sectionKey ?? '').trim();
        out.push({ rowType: 'section', title: title || 'Етап', sectionKey: sectionKey || undefined });
        continue;
      }

      if (rowType === 'work') {
        const name = String((r as any).name ?? '').trim();
        const unit = String((r as any).unit ?? '').trim();
        const qty = n((r as any).qty);
        const price = n((r as any).price);
        const costPrice = n((r as any).costPrice);
        const sectionKey = String((r as any).sectionKey ?? '').trim();
        out.push({ rowType: 'work', sectionKey: sectionKey || undefined, name, unit, qty, price, costPrice });
        continue;
      }

      if (rowType === 'percent') {
        const name = String((r as any).name ?? '').trim() || 'Додатково';
        const percentValue = n((r as any).percentValue ?? (r as any).pct);
        const sectionKey = String((r as any).sectionKey ?? '').trim();
        out.push({ rowType: 'percent', sectionKey: sectionKey || undefined, name, percentValue });
        continue;
      }

      // subtotal — ігноруємо при input, бо генеруємо самі
    }

    // ensure meta
    if (!out.some((r) => r.rowType === 'meta')) {
      out.unshift({ rowType: 'meta', header: {} });
    }

    // ensure at least one section + one work
    if (!out.some((r) => r.rowType === 'section')) {
      out.push({ rowType: 'section', sectionKey: 'sec_1', title: 'Роботи' });
    }
    if (!out.some((r) => r.rowType === 'work')) {
      const firstSec = out.find((r) => r.rowType === 'section') as any;
      out.push({ rowType: 'work', sectionKey: firstSec?.sectionKey ?? 'sec_1', name: '', unit: '', qty: 0, price: 0, costPrice: 0 });
    }

    // normalize sectionKey
    let secCounter = 0;
    let currentSec: string | undefined;
    for (const r of out) {
      if (r.rowType === 'section') {
        secCounter += 1;
        if (!r.sectionKey) r.sectionKey = `sec_${secCounter}`;
        currentSec = r.sectionKey;
      } else if (r.rowType === 'work' || r.rowType === 'percent') {
        if (!r.sectionKey) r.sectionKey = currentSec ?? `sec_${Math.max(1, secCounter)}`;
      }
    }

    return out;
  }

  private compute(items: ActRow[]): { items: ActRow[]; totalAmount: number; totalCost: number } {
    // remove any subtotals
    const base = items.filter((r) => r.rowType !== 'subtotal');

    // compute work amounts
    const computed = base.map((r) => {
      if (r.rowType === 'work') {
        const qty = n(r.qty);
        const price = n(r.price);
        const costPrice = n(r.costPrice);
        const amount = Math.round(qty * price * 100) / 100;
        const amountCost = Math.round(qty * costPrice * 100) / 100;
        return { ...r, qty, price, costPrice, amount, amountCost };
      }
      if (r.rowType === 'percent') {
        return { ...r, percentValue: n(r.percentValue) };
      }
      return r;
    });

    // gather sections
    const sections: string[] = [];
    for (const r of computed) {
      if (r.rowType === 'section' && r.sectionKey) sections.push(r.sectionKey);
    }

    // precompute sums per section
    const sums: Record<string, { workSum: number; workCost: number; percentSum: number; percentCost: number }> = {};
    for (const key of sections) sums[key] = { workSum: 0, workCost: 0, percentSum: 0, percentCost: 0 };

    for (const r of computed) {
      const key = r.sectionKey;
      if (!key || !sums[key]) continue;
      if (r.rowType === 'work') {
        sums[key].workSum += n(r.amount);
        sums[key].workCost += n(r.amountCost);
      }
    }

    // compute percent rows amounts based on workSum/workCost
    const withPercentAmounts = computed.map((r) => {
      if (r.rowType !== 'percent') return r;
      const key = r.sectionKey;
      if (!key || !sums[key]) return r;
      const pct = n(r.percentValue);
      const amount = Math.round(sums[key].workSum * (pct / 100) * 100) / 100;
      const amountCost = Math.round(sums[key].workCost * (pct / 100) * 100) / 100;
      // accumulate
      sums[key].percentSum += amount;
      sums[key].percentCost += amountCost;
      return { ...r, amount, amountCost };
    });

    // insert subtotal rows after last row of each section
    const out: ActRow[] = [];
    for (let i = 0; i < withPercentAmounts.length; i++) {
      const r = withPercentAmounts[i];
      out.push(r);
      if (r.rowType === 'section') continue;

      const key = r.sectionKey;
      if (!key || !sums[key]) continue;

      const next = withPercentAmounts[i + 1];
      // Кінець секції: коли наступний рядок — новий `section` (або кінець масиву).
      // Не ускладнюємо умовою з sectionKey, щоб уникнути TS-звужень типів.
      const isEndOfSection = !next || next.rowType === 'section';

      // кінець секції: коли наступний рядок — новий section (або кінець масиву)
      if (isEndOfSection) {
        const s = sums[key];
        const amount = Math.round((s.workSum + s.percentSum) * 100) / 100;
        const amountCost = Math.round((s.workCost + s.percentCost) * 100) / 100;
        out.push({ rowType: 'subtotal', sectionKey: key, title: 'Разом', amount, amountCost });
      }
    }

    // ensure subtotal exists per section even if section has no work rows (edge)
    for (const key of sections) {
      const has = out.some((r) => r.rowType === 'subtotal' && r.sectionKey === key);
      if (!has) {
        const s = sums[key];
        const amount = Math.round((s.workSum + s.percentSum) * 100) / 100;
        const amountCost = Math.round((s.workCost + s.percentCost) * 100) / 100;
        out.push({ rowType: 'subtotal', sectionKey: key, title: 'Разом', amount, amountCost });
      }
    }

    let totalAmount = 0;
    let totalCost = 0;
    for (const r of out) {
      if (r.rowType === 'subtotal') {
        totalAmount += n(r.amount);
        totalCost += n(r.amountCost);
      }
    }

    totalAmount = Math.round(totalAmount * 100) / 100;
    totalCost = Math.round(totalCost * 100) / 100;

    return { items: out, totalAmount, totalCost };
  }

  private shape(act: Act) {
    const { items, totalAmount, totalCost } = this.compute(this.sanitizeRows(act.items as any));
    return { ...act, items, totalAmount, totalCost } as any;
  }

  async findAll() {
    const rows = await this.repo.find({ order: { id: 'DESC' } });
    return rows.map((a) => this.shape(a));
  }

  async findOne(id: number) {
    const act = await this.repo.findOne({ where: { id } });
    if (!act) throw new NotFoundException('Act not found');
    return this.shape(act);
  }

  async create(dto: CreateActDto, req: Request) {
    const uid = getUserId(req);
    const foremanId = Number.isFinite(Number(dto.foremanId)) ? Number(dto.foremanId) : uid;
    if (!foremanId) throw new BadRequestException('foremanId is required');

    const safeRows = this.sanitizeRows(dto.items);
    const computed = this.compute(safeRows);

    const act = this.repo.create({
      projectId: dto.projectId,
      foremanId,
      actDate: String(dto.actDate ?? '').trim() || todayYmd(),
      items: computed.items as any,
      status: dto.status ?? 'draft',
    });

    const saved = await this.repo.save(act);
    return { ...saved, items: computed.items, totalAmount: computed.totalAmount, totalCost: computed.totalCost };
  }

  async createFromQuote(dto: CreateActFromQuoteDto, req: Request) {
    const uid = getUserId(req);
    if (!uid) throw new BadRequestException('User not resolved');

    const doc = await this.documents.findOne({ where: { id: dto.quoteId } });
    if (!doc) throw new NotFoundException('Quote document not found');
    if (String(doc.type).trim() !== 'quote') throw new BadRequestException('Document is not a quote');
    if (!doc.projectId || Number(doc.projectId) !== Number(dto.projectId)) {
      throw new BadRequestException('projectId mismatch with quote document');
    }

    const meta: any = doc.meta ?? {};
    const title = String(doc.title ?? meta?.title ?? 'Акт виконаних робіт').trim();
    const stages = Array.isArray(meta?.stages) ? meta.stages : Array.isArray(meta?.template?.stages) ? meta.template.stages : [];

    const rows: ActRow[] = [{ rowType: 'meta', header: { sourceQuoteId: doc.id, sourceQuoteTitle: title } }];

    let secIdx = 0;
    for (const st of stages) {
      const stageName = String(st?.name ?? '').trim();
      if (!stageName) continue;
      secIdx += 1;
      const key = `sec_${secIdx}`;
      rows.push({ rowType: 'section', sectionKey: key, title: `Етап ${secIdx}: ${stageName}` });

      const works = Array.isArray(st?.works) ? st.works : [];
      for (const w of works) {
        const name = String(w?.name ?? '').trim();
        if (!name) continue;
        const unit = String(w?.unit ?? '').trim();
        const qty = n(w?.qty);
        // у КП ціна для клієнта — clientPrice (string)
        const price = n(w?.clientPrice ?? w?.price);
        const costPrice = n(w?.costPrice);
        rows.push({ rowType: 'work', sectionKey: key, name, unit, qty, price, costPrice });
      }

      const percents = Array.isArray(st?.percents) ? st.percents : [];
      for (const p of percents) {
        const pct = n(p?.pct ?? p?.percentValue);
        const pn = String(p?.name ?? '').trim() || 'Додатково';
        if (!pct) continue;
        rows.push({ rowType: 'percent', sectionKey: key, name: pn, percentValue: pct });
      }

      // матеріали з КП — ігноруємо (акти без матеріалів)
    }

    const safe = this.sanitizeRows(rows as any);
    const computed = this.compute(safe);

    const act = this.repo.create({
      projectId: dto.projectId,
      foremanId: uid,
      actDate: String(dto.actDate ?? '').trim() || todayYmd(),
      items: computed.items as any,
      status: 'draft',
    });

    const saved = await this.repo.save(act);
    return { ...saved, items: computed.items, totalAmount: computed.totalAmount, totalCost: computed.totalCost };
  }

  async update(id: number, dto: UpdateActDto, req: Request) {
    const act = await this.repo.findOne({ where: { id } });
    if (!act) throw new NotFoundException('Act not found');

    const uid = getUserId(req);
    if (dto.projectId !== undefined) act.projectId = dto.projectId as any;
    if (dto.actDate !== undefined) act.actDate = dto.actDate as any;
    if (dto.status !== undefined) act.status = dto.status as any;

    // foremanId: якщо не передали — лишаємо як є, або підставимо user.id якщо було пусто
    if (dto.foremanId !== undefined) {
      act.foremanId = dto.foremanId as any;
    } else if (!act.foremanId && uid) {
      act.foremanId = uid as any;
    }

    const safeRows = dto.items !== undefined ? this.sanitizeRows(dto.items as any) : this.sanitizeRows(act.items as any);
    const computed = this.compute(safeRows);
    act.items = computed.items as any;

    const saved = await this.repo.save(act);
    return { ...saved, items: computed.items, totalAmount: computed.totalAmount, totalCost: computed.totalCost };
  }

  async remove(id: number) {
    const act = await this.repo.findOne({ where: { id } });
    if (!act) throw new NotFoundException('Act not found');
    await this.repo.remove(act);
  }
}
