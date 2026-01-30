import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DeliveryWorkLog } from './entities/delivery-work-log.entity';
import { DeliveryAct } from './entities/delivery-act.entity';
import { DeliveryActItem } from './entities/delivery-act-item.entity';

import { CreateWorkLogDto } from './dto/create-work-log.dto';
import { CreateActDto } from './dto/create-act.dto';
import { UpdateActDto } from './dto/update-act.dto';

function toNum(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toMoney2(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function toQty3(n: number): string {
  return (Math.round(n * 1000) / 1000).toFixed(3);
}

@Injectable()
export class DeliveryService {
  constructor(
    @InjectRepository(DeliveryWorkLog)
    private readonly workRepo: Repository<DeliveryWorkLog>,
    @InjectRepository(DeliveryAct)
    private readonly actRepo: Repository<DeliveryAct>,
    @InjectRepository(DeliveryActItem)
    private readonly actItemRepo: Repository<DeliveryActItem>,
  ) {}

  // -------------------------
  // WORK LOGS
  // -------------------------
  async getWorkLogs(userId: number, projectId: number) {
    if (!projectId || projectId < 1) throw new BadRequestException('projectId некоректний');

    return this.workRepo.find({
      where: { userId, projectId } as any,
      order: { createdAt: 'DESC' } as any,
    });
  }

  async createWorkLog(userId: number, dto: CreateWorkLogDto) {
    if (!dto?.projectId || dto.projectId < 1) throw new BadRequestException('projectId некоректний');
    if (!dto?.name?.trim()) throw new BadRequestException('name є обовʼязковим');

    const qty = toNum(dto.qty);
    const price = toNum(dto.price);
    if (qty <= 0) throw new BadRequestException('qty має бути > 0');
    if (price < 0) throw new BadRequestException('price має бути >= 0');

    const amount = qty * price;

    const work = this.workRepo.create({
      projectId: dto.projectId,
      // stageId тепер UUID string | null
      stageId: dto.stageId ?? null,
      name: dto.name.trim(),
      qty: toQty3(qty),
      unit: dto.unit?.trim() ? dto.unit.trim() : null,
      price: toMoney2(price),
      amount: toMoney2(amount),
      status: dto.status ?? 'draft',
      userId,
    });

    return this.workRepo.save(work);
  }

  async setWorkStatus(userId: number, workId: number, status: 'draft' | 'done') {
    const w = await this.workRepo.findOne({ where: { id: workId, userId } as any });
    if (!w) throw new BadRequestException('Роботу не знайдено');
    w.status = status;
    return this.workRepo.save(w);
  }

  // -------------------------
  // ACTS
  // -------------------------
  async getActs(userId: number, projectId: number) {
    if (!projectId || projectId < 1) throw new BadRequestException('projectId некоректний');

    return this.actRepo.find({
      where: { userId, projectId } as any,
      relations: ['items'],
      order: { createdAt: 'DESC' } as any,
    });
  }

  async createAct(userId: number, dto: CreateActDto) {
    if (!dto?.projectId || dto.projectId < 1) throw new BadRequestException('projectId некоректний');
    if (!dto?.number?.trim()) throw new BadRequestException('number є обовʼязковим');
    if (!dto?.date?.trim()) throw new BadRequestException('date є обовʼязковою');
    // safe-save: items можуть бути відсутні або містити порожні рядки
    const items = Array.isArray(dto.items) ? dto.items : [];
    let total = 0;

    const act = this.actRepo.create({
      projectId: dto.projectId,
      // stageId тепер UUID string | null
      stageId: dto.stageId ?? null,
      number: dto.number.trim(),
      date: dto.date.trim(),
      status: dto.status ?? 'draft',
      comment: dto.comment?.trim() ? dto.comment.trim() : null,
      totalAmount: '0.00',
      userId,
      items: [],
    });

    for (const it of items) {
      const name = it?.name?.toString().trim() ?? '';
      if (!name) continue; // порожні рядки ігноруємо

      const qty = Math.max(0, toNum(it.qty));
      const price = Math.max(0, toNum(it.price));
      const amount = qty * price;
      total += amount;

      const row = this.actItemRepo.create({
        name,
        qty: toQty3(qty),
        unit: it.unit?.toString().trim() ? it.unit.toString().trim() : null,
        price: toMoney2(price),
        amount: toMoney2(amount),
      });

      act.items.push(row);
    }

    act.totalAmount = toMoney2(total);
    return this.actRepo.save(act);
  }

  async getAct(userId: number, actId: number) {
    if (!actId || actId < 1) throw new BadRequestException('id некоректний');

    const act = await this.actRepo.findOne({
      where: { id: actId, userId } as any,
      relations: ['items'],
    });

    if (!act) throw new BadRequestException('Акт не знайдено');
    return act;
  }

  /**
   * Safe-save для акту: якщо items присутні — перезаписуємо повністю.
   * Порожні рядки (без name) ігноруємо.
   */
  async updateAct(userId: number, actId: number, dto: UpdateActDto) {
    const act = await this.getAct(userId, actId);

    if (dto.number !== undefined) {
      const v = (dto.number ?? '').toString().trim();
      if (!v) throw new BadRequestException('number є обовʼязковим');
      act.number = v;
    }

    if (dto.date !== undefined) {
      const v = (dto.date ?? '').toString().trim();
      if (!v) throw new BadRequestException('date є обовʼязковою');
      act.date = v;
    }

    if (dto.stageId !== undefined) {
      act.stageId = dto.stageId ? dto.stageId : null;
    }

    if (dto.comment !== undefined) {
      const v = (dto.comment ?? '').toString().trim();
      act.comment = v ? v : null;
    }

    if (dto.status !== undefined) {
      act.status = dto.status;
    }

    let total = 0;

    if (dto.items !== undefined) {
      // повний перезапис items
      await this.actItemRepo.delete({ actId: act.id } as any);
      act.items = [];

      const items = Array.isArray(dto.items) ? dto.items : [];
      for (const it of items) {
        const name = it?.name?.toString().trim() ?? '';
        if (!name) continue;

        const qty = Math.max(0, toNum(it.qty));
        const price = Math.max(0, toNum(it.price));
        const amount = qty * price;
        total += amount;

        act.items.push(
          this.actItemRepo.create({
            name,
            qty: toQty3(qty),
            unit: it.unit?.toString().trim() ? it.unit.toString().trim() : null,
            price: toMoney2(price),
            amount: toMoney2(amount),
          }),
        );
      }
    } else {
      // items не змінюємо — перерахуємо total по поточних
      total = (act.items ?? []).reduce((s, r) => s + toNum(r.amount), 0);
    }

    act.totalAmount = toMoney2(total);
    return this.actRepo.save(act);
  }

  async deleteAct(userId: number, actId: number) {
    if (!actId || actId < 1) throw new BadRequestException('id некоректний');
    await this.actRepo.delete({ id: actId, userId } as any);
    return { ok: true };
  }

  // -------------------------
  // ANALYTICS (простий)
  // -------------------------
  async analytics(userId: number, projectId: number) {
    const works = await this.getWorkLogs(userId, projectId);
    const acts = await this.getActs(userId, projectId);

    const worksSum = works.reduce((s, w) => s + toNum(w.amount), 0);
    const actsSum = acts.reduce((s, a) => s + toNum(a.totalAmount), 0);

    return {
      projectId,
      worksSum: toMoney2(worksSum),
      actsSum: toMoney2(actsSum),
      diff: toMoney2(worksSum - actsSum),
      worksCount: works.length,
      actsCount: acts.length,
    };
  }
}
