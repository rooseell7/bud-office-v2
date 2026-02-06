import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Project } from '../projects/project.entity';
import { Deal } from '../deals/deal.entity';
import { User } from '../users/user.entity';
import { ProjectNextAction } from './entities/project-next-action.entity';
import { ProjectContact } from './entities/project-contact.entity';
import { ActivityService } from '../activity/activity.service';

const SALES_STAGE_LABELS: Record<string, string> = {
  lead_new: 'Новий',
  contact_made: 'Контакт',
  meeting_scheduled: 'Зустріч запланована',
  meeting_done: 'Зустріч проведена',
  kp_preparing: 'КП готується',
  kp_sent: 'КП відправлено',
  kp_negotiation: 'Узгодження',
  deal_signed: 'Угода підписана',
  handoff_to_exec: 'Передано в реалізацію',
  paused: 'Пауза',
  lost: 'Втрачено',
};

export interface SalesProjectItemDto {
  projectId: number;
  name: string;
  address: string | null;
  client: { id: number | string; name: string; phone?: string } | null;
  salesStage: string;
  deal: { id: number; title: string; amount: string; stage: string; status: string } | null;
  nextAction: { type: string; dueAt: string } | null;
  lastContactAt: string | null;
  owner: { id: number; name: string } | null;
}

export interface SalesProjectsQueryDto {
  q?: string;
  salesStage?: string;
  ownerId?: number;
  nextActionBucket?: 'today' | 'this_week' | 'overdue' | 'any';
  page?: number;
  limit?: number;
}

export interface SalesProjectsResponseDto {
  items: SalesProjectItemDto[];
  total: number;
}

export interface SalesProjectDetailsDto {
  projectId: number;
  name: string;
  address: string | null;
  client: { id: number | string; name: string; phone: string } | null;
  salesStage: string;
  deal: { id: number; title: string; amount: string; stage: string; status: string } | null;
  nextAction: { type: string; dueAt: string; note?: string } | null;
  owner: { id: number; name: string } | null;
}

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Deal)
    private readonly dealRepo: Repository<Deal>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ProjectNextAction)
    private readonly nextActionRepo: Repository<ProjectNextAction>,
    @InjectRepository(ProjectContact)
    private readonly contactRepo: Repository<ProjectContact>,
    private readonly activityService: ActivityService,
  ) {}

  /** Список користувачів для фільтра "Власник" (id, name). */
  async getOwnerCandidates(): Promise<{ id: number; name: string }[]> {
    const users = await this.userRepo.find({
      where: { isActive: true },
      select: ['id', 'fullName'],
      order: { fullName: 'ASC' },
    });
    return users.map((u) => ({ id: u.id, name: (u as any).fullName ?? `User ${u.id}` }));
  }

  async getProjectsList(query: SalesProjectsQueryDto): Promise<SalesProjectsResponseDto> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const offset = (page - 1) * limit;

    const qb = this.projectRepo
      .createQueryBuilder('p')
      .orderBy('p.updatedAt', 'DESC');

    if (query.q?.trim()) {
      qb.andWhere('(p.name ILIKE :q OR p.address ILIKE :q)', { q: `%${query.q.trim()}%` });
    }
    if (query.salesStage?.trim()) {
      qb.andWhere('p.salesStage = :salesStage', { salesStage: query.salesStage.trim() });
    }
    if (query.ownerId != null && Number.isFinite(query.ownerId)) {
      qb.andWhere('(p.ownerId = :ownerId OR (p.ownerId IS NULL AND p.userId = :ownerId))', { ownerId: query.ownerId });
    }

    const projects = await qb.getMany();
    const projectIds = projects.map((p) => p.id);
    if (projectIds.length === 0) {
      return { items: [], total: 0 };
    }

    const [deals, users, nextActions, clientRows] = await Promise.all([
      this.dealRepo.find({ where: { projectId: In(projectIds) } }),
      this.userRepo.find({
        where: { id: In([...new Set(projects.map((p) => p.ownerId ?? p.userId).filter((id): id is number => id != null))]) },
        select: ['id', 'fullName'],
      }),
      this.nextActionRepo.find({
        where: { projectId: In(projectIds), completedAt: IsNull() },
      }),
      (async () => {
        const cids = [...new Set(projects.map((p) => p.clientId).filter((id): id is number => id != null))];
        if (cids.length === 0) return [];
        try {
          return await this.projectRepo.manager.query(
            'SELECT id, name, phone FROM clients WHERE id = ANY($1::int[])',
            [cids],
          );
        } catch {
          return [];
        }
      })(),
    ]);

    const dealByProject = new Map<number, Deal>();
    for (const d of deals) {
      if (d.projectId != null && !dealByProject.has(d.projectId)) {
        dealByProject.set(d.projectId, d);
      }
    }
    const userMap = new Map(users.map((u) => [u.id, { id: u.id, name: u.fullName ?? `User ${u.id}` }]));
    const nextActionByProject = new Map<number, ProjectNextAction>();
    for (const na of nextActions) {
      if (!nextActionByProject.has(na.projectId)) {
        nextActionByProject.set(na.projectId, na);
      }
    }
    const clientMap = new Map<number, { id: number; name: string; phone?: string }>();
    for (const c of clientRows ?? []) {
      clientMap.set(c.id, { id: c.id, name: c.name ?? '', phone: c.phone });
    }

    const items: SalesProjectItemDto[] = projects.map((p) => {
      const deal = dealByProject.get(p.id);
      const ownerId = p.ownerId ?? p.userId;
      const owner = userMap.get(ownerId);
      const na = nextActionByProject.get(p.id);
      const lastContactAt = na?.dueAt ?? (deal?.updatedAt ? new Date(deal.updatedAt).toISOString().slice(0, 10) : null);

      return {
        projectId: p.id,
        name: p.name,
        address: p.address ?? null,
        client: p.clientId != null ? (clientMap.get(p.clientId) ?? { id: p.clientId, name: '—' }) : null,
        salesStage: p.salesStage ?? 'lead_new',
        deal: deal
          ? { id: deal.id, title: deal.title, amount: deal.amount, stage: deal.stage, status: deal.status }
          : null,
        nextAction: na ? { type: na.type, dueAt: na.dueAt } : null,
        lastContactAt,
        owner: owner ?? null,
      };
    });

    let filtered = items;
    if (query.nextActionBucket && query.nextActionBucket !== 'any') {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekEndStr = weekEnd.toISOString().slice(0, 10);

      filtered = filtered.filter((i) => {
        const due = i.nextAction?.dueAt;
        if (!due) return false;
        switch (query.nextActionBucket) {
          case 'today':
            return due === today;
          case 'this_week':
            return due >= today && due <= weekEndStr;
          case 'overdue':
            return due < today;
          default:
            return true;
        }
      });
    }

    const total = filtered.length;
    const pageItems = filtered.slice(offset, offset + limit);
    return { items: pageItems, total };
  }

  async getProjectDetails(projectId: number): Promise<SalesProjectDetailsDto> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Проєкт не знайдено');

    let client: SalesProjectDetailsDto['client'] = null;
    if (project.clientId != null) {
      try {
        const rows = await this.projectRepo.manager.query(
          'SELECT id, name, phone FROM clients WHERE id = $1 LIMIT 1',
          [project.clientId],
        );
        if (Array.isArray(rows) && rows[0]) {
          const c = rows[0];
          client = { id: c.id, name: String(c.name ?? ''), phone: String(c.phone ?? '') };
        }
      } catch {
        // ignore
      }
    }

    const deal = await this.dealRepo.findOne({ where: { projectId } });
    const ownerId = project.ownerId ?? project.userId;
    const owner = await this.userRepo.findOne({ where: { id: ownerId }, select: ['id', 'fullName'] });
    const activeNext = await this.nextActionRepo.findOne({
      where: { projectId, completedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    return {
      projectId: project.id,
      name: project.name,
      address: project.address ?? null,
      client,
      salesStage: project.salesStage ?? 'lead_new',
      deal: deal
        ? { id: deal.id, title: deal.title, amount: deal.amount, stage: deal.stage, status: deal.status }
        : null,
      nextAction: activeNext
        ? { type: activeNext.type, dueAt: activeNext.dueAt, note: activeNext.note ?? undefined }
        : null,
      owner: owner ? { id: owner.id, name: owner.fullName ?? `User ${owner.id}` } : null,
    };
  }

  async setNextAction(
    projectId: number,
    body: { type: string; dueAt: string; note?: string },
    actorId: number | null,
  ): Promise<{ completedPrevious: boolean }> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Проєкт не знайдено');

    const existing = await this.nextActionRepo.findOne({
      where: { projectId, completedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    let completedPrevious = false;
    if (existing) {
      existing.completedAt = new Date();
      await this.nextActionRepo.save(existing);
      completedPrevious = true;
      const typeLabel = this.nextActionTypeLabel(existing.type);
      await this.activityService.logProjectAudit({
        projectId,
        actorId,
        action: 'next_action_done',
        summary: `Дію виконано: ${typeLabel}`,
        payload: { type: existing.type, dueAt: existing.dueAt },
      });
    }

    const dueAt = String(body.dueAt ?? '').trim().slice(0, 10);
    if (!dueAt) throw new BadRequestException('dueAt обов\'язковий');
    const type = String(body.type ?? 'other').trim().toLowerCase();
    const na = this.nextActionRepo.create({
      projectId,
      type: ['call', 'meeting', 'send_kp', 'follow_up', 'other'].includes(type) ? type : 'other',
      dueAt,
      note: body.note?.trim() || null,
      actorId,
    });
    await this.nextActionRepo.save(na);
    const typeLabel = this.nextActionTypeLabel(na.type);
    await this.activityService.logProjectAudit({
      projectId,
      actorId,
      action: 'next_action_set',
      summary: `Наступна дія: ${typeLabel} до ${dueAt}`,
      payload: { type: na.type, dueAt: na.dueAt },
    });
    return { completedPrevious };
  }

  async completeAction(projectId: number, actorId: number | null, comment?: string): Promise<void> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Проєкт не знайдено');

    const active = await this.nextActionRepo.findOne({
      where: { projectId, completedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    if (!active) return;
    active.completedAt = new Date();
    await this.nextActionRepo.save(active);
    const typeLabel = this.nextActionTypeLabel(active.type);
    await this.activityService.logProjectAudit({
      projectId,
      actorId,
      action: 'next_action_done',
      summary: comment ? `Дію виконано: ${typeLabel}. ${comment}` : `Дію виконано: ${typeLabel}`,
      payload: { type: active.type, dueAt: active.dueAt },
    });
  }

  private nextActionTypeLabel(type: string): string {
    const t = String(type).toLowerCase();
    if (t === 'call') return 'Дзвінок';
    if (t === 'meeting') return 'Зустріч';
    if (t === 'send_kp') return 'Відправити КП';
    if (t === 'follow_up') return 'Дозвон';
    return type || 'Інше';
  }

  async getContacts(projectId: number): Promise<
    { id: number; type: string; result: string | null; at: string; createdAt: string; createdById: number | null }[]
  > {
    await this.projectRepo.findOneOrFail({ where: { id: projectId } });
    const rows = await this.contactRepo.find({
      where: { projectId },
      order: { at: 'DESC' },
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      result: r.result,
      at: r.at instanceof Date ? r.at.toISOString() : String(r.at),
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      createdById: r.createdById,
    }));
  }

  async addContact(
    projectId: number,
    body: { type?: string; result?: string; at?: string },
    actorId: number | null,
  ): Promise<{ id: number; type: string; result: string | null; at: string }> {
    await this.projectRepo.findOneOrFail({ where: { id: projectId } });
    const type = ['call', 'meeting', 'message', 'other'].includes(String(body.type || '').toLowerCase())
      ? String(body.type).toLowerCase()
      : 'other';
    const at = body.at?.trim() ? new Date(body.at) : new Date();
    const contact = this.contactRepo.create({
      projectId,
      type,
      result: body.result?.trim() || null,
      at,
      createdById: actorId,
    });
    const saved = await this.contactRepo.save(contact);
    const typeLabel = type === 'call' ? 'Дзвінок' : type === 'meeting' ? 'Зустріч' : type === 'message' ? 'Повідомлення' : 'Контакт';
    await this.activityService.logProjectAudit({
      projectId,
      actorId,
      action: 'contact_log',
      summary: `Контакт: ${typeLabel} — ${saved.result || '(без опису)'}`,
      payload: { contactId: saved.id, type: saved.type },
    });
    return {
      id: saved.id,
      type: saved.type,
      result: saved.result,
      at: saved.at instanceof Date ? saved.at.toISOString() : String(saved.at),
    };
  }
}
