import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ActivityService } from '../activity/activity.service';

export interface ProjectSummaryDto {
  id: number;
  name: string;
  address: string | null;
  client: { id: number | string; name: string; phone: string } | null;
  salesStage: string;
  executionStatus: string | null;
}

export interface ProjectDetailsDto extends ProjectSummaryDto {
  city: string | null;
  type: string | null;
  areaM2: string | null;
  finishClass: string | null;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  tags: string[] | null;
  accessInfo: Record<string, unknown> | null;
  notes: string | null;
  ownerId: number | null;
  foremanId: number | null;
  estimatorId: number | null;
  supplyManagerId: number | null;
  owner: { id: number; name: string } | null;
  foreman: { id: number; name: string } | null;
  estimator: { id: number; name: string } | null;
  supplyManager: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEventDto {
  type: string;
  at: string;
  title: string;
  entity?: { type: string; id: number };
  entityId?: number;
  actor?: { id: number; name: string };
  meta?: Record<string, unknown>;
}

export interface ProjectTimelineQueryDto {
  from?: string; // YYYY-MM-DD
  to?: string;
  types?: string; // comma: quote,act,invoice,activity
  limit?: number;
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly activityService: ActivityService,
  ) {}

  findAll(): Promise<Project[]> {
    return this.projectRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<Project> {
    const project = await this.projectRepo.findOne({ where: { id } });
    if (!project) throw new NotFoundException('Проєкт не знайдено');
    return project;
  }

  /** Канонічна шапка обʼєкта: id, name, address, client (якщо є), salesStage, executionStatus. */
  async getSummary(id: number): Promise<ProjectSummaryDto> {
    const project = await this.findOne(id);
    let client: ProjectSummaryDto['client'] = null;
    if (project.clientId != null) {
      try {
        const clientRow = await this.projectRepo.manager.query(
          'SELECT id, name, phone FROM clients WHERE id = $1 LIMIT 1',
          [project.clientId],
        );
        if (Array.isArray(clientRow) && clientRow[0]) {
          const c = clientRow[0];
          client = { id: c.id, name: String(c.name ?? ''), phone: String(c.phone ?? '') };
        }
      } catch {
        // клієнт може бути в іншій таблиці — залишаємо null
      }
    }
    const salesStage = project.salesStage ?? project.status ?? 'lead_new';
    return {
      id: project.id,
      name: project.name,
      address: project.address ?? null,
      client,
      salesStage,
      executionStatus: project.status ?? null,
    };
  }

  async create(dto: CreateProjectDto, userId: number): Promise<Project> {
    const project = this.projectRepo.create({
      name: dto.name,
      address: dto.address ?? null,
      city: dto.city ?? null,
      type: dto.type ?? null,
      status: dto.executionStatus ?? dto.status ?? 'planned',
      areaM2: dto.areaM2 != null ? String(dto.areaM2) : null,
      finishClass: dto.finishClass ?? null,
      plannedStartAt: dto.plannedStartAt?.trim().slice(0, 10) ?? null,
      plannedEndAt: dto.plannedEndAt?.trim().slice(0, 10) ?? null,
      tags: dto.tags ?? null,
      accessInfo: dto.accessInfo ?? null,
      notes: dto.notes ?? null,
      salesStage: dto.salesStage ?? 'lead_new',
      userId,
      clientId: dto.clientId ?? null,
      ownerId: dto.ownerId ?? null,
      foremanId: dto.foremanId ?? null,
      estimatorId: dto.estimatorId ?? null,
      supplyManagerId: dto.supplyManagerId ?? null,
      nextAction: dto.nextAction ?? null,
      nextActionDue: dto.nextActionDue?.trim().slice(0, 10) ?? null,
    });
    const saved = await this.projectRepo.save(project);
    await this.activityService.logProjectAudit({
      projectId: saved.id,
      actorId: userId,
      action: 'project_created',
      summary: `Створено об'єкт: ${saved.name}`,
      payload: { name: saved.name },
    });
    return saved;
  }

  /** Повний профіль для форм: проект + client short + assignments (owner, foreman, estimator, supplyManager). */
  async getDetails(id: number): Promise<ProjectDetailsDto> {
    const project = await this.findOne(id);
    const summary = await this.getSummary(id);
    const manager = this.projectRepo.manager;
    const userIds = [
      project.ownerId ?? project.userId,
      project.foremanId,
      project.estimatorId,
      project.supplyManagerId,
    ].filter((id): id is number => id != null && Number.isFinite(id));
    let userMap = new Map<number, string>();
    if (userIds.length > 0) {
      const uniq = [...new Set(userIds)];
      const rows = await manager.query(
        'SELECT id, "fullName" FROM users WHERE id = ANY($1::int[])',
        [uniq],
      );
      for (const u of rows ?? []) {
        userMap.set(u.id, u.fullName ?? `User ${u.id}`);
      }
    }
    const toUser = (uid: number | null) =>
      uid != null ? { id: uid, name: userMap.get(uid) ?? `User ${uid}` } : null;

    return {
      ...summary,
      city: project.city ?? null,
      type: project.type ?? null,
      areaM2: project.areaM2 ?? null,
      finishClass: project.finishClass ?? null,
      plannedStartAt: project.plannedStartAt ?? null,
      plannedEndAt: project.plannedEndAt ?? null,
      tags: project.tags ?? null,
      accessInfo: project.accessInfo ?? null,
      notes: project.notes ?? null,
      ownerId: project.ownerId ?? null,
      foremanId: project.foremanId ?? null,
      estimatorId: project.estimatorId ?? null,
      supplyManagerId: project.supplyManagerId ?? null,
      owner: toUser(project.ownerId ?? project.userId ?? null),
      foreman: toUser(project.foremanId),
      estimator: toUser(project.estimatorId),
      supplyManager: toUser(project.supplyManagerId),
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  async update(id: number, dto: UpdateProjectDto, actorId: number | null): Promise<Project> {
    const project = await this.findOne(id);
    const fieldsChanged: string[] = [];

    if (dto.name !== undefined && dto.name !== project.name) { project.name = dto.name; fieldsChanged.push('name'); }
    if (dto.type !== undefined) { project.type = dto.type ?? null; fieldsChanged.push('type'); }
    if (dto.address !== undefined) { project.address = dto.address ?? null; fieldsChanged.push('address'); }
    if (dto.city !== undefined) { project.city = dto.city ?? null; fieldsChanged.push('city'); }
    if (dto.status !== undefined) { project.status = dto.status; fieldsChanged.push('status'); }
    if (dto.executionStatus !== undefined) { project.status = dto.executionStatus; fieldsChanged.push('executionStatus'); }
    if (dto.areaM2 !== undefined) { project.areaM2 = dto.areaM2 != null ? String(dto.areaM2) : null; fieldsChanged.push('areaM2'); }
    if (dto.finishClass !== undefined) { project.finishClass = dto.finishClass ?? null; fieldsChanged.push('finishClass'); }
    if (dto.plannedStartAt !== undefined) { project.plannedStartAt = dto.plannedStartAt?.trim().slice(0, 10) ?? null; fieldsChanged.push('plannedStartAt'); }
    if (dto.plannedEndAt !== undefined) { project.plannedEndAt = dto.plannedEndAt?.trim().slice(0, 10) ?? null; fieldsChanged.push('plannedEndAt'); }
    if (dto.tags !== undefined) { project.tags = dto.tags ?? null; fieldsChanged.push('tags'); }
    if (dto.accessInfo !== undefined) { project.accessInfo = dto.accessInfo ?? null; fieldsChanged.push('accessInfo'); }
    if (dto.notes !== undefined) { project.notes = dto.notes ?? null; fieldsChanged.push('notes'); }
    if (dto.clientId !== undefined) { project.clientId = dto.clientId ?? null; fieldsChanged.push('clientId'); }
    if (dto.foremanId !== undefined) { project.foremanId = dto.foremanId ?? null; fieldsChanged.push('foremanId'); }
    if (dto.estimatorId !== undefined) { project.estimatorId = dto.estimatorId ?? null; fieldsChanged.push('estimatorId'); }
    if (dto.supplyManagerId !== undefined) { project.supplyManagerId = dto.supplyManagerId ?? null; fieldsChanged.push('supplyManagerId'); }
    if (dto.nextAction !== undefined) { project.nextAction = dto.nextAction ?? null; fieldsChanged.push('nextAction'); }
    if (dto.nextActionDue !== undefined) { project.nextActionDue = dto.nextActionDue?.trim().slice(0, 10) ?? null; fieldsChanged.push('nextActionDue'); }
    if (dto.salesStage !== undefined) { project.salesStage = dto.salesStage; fieldsChanged.push('salesStage'); }
    if (dto.ownerId !== undefined) { project.ownerId = dto.ownerId ?? null; fieldsChanged.push('ownerId'); }

    const saved = await this.projectRepo.save(project);
    if (fieldsChanged.length > 0) {
      await this.activityService.logProjectAudit({
        projectId: id,
        actorId,
        action: 'project_updated',
        summary: `Оновлено об'єкт: ${fieldsChanged.join(', ')}`,
        payload: { fields: fieldsChanged },
      });
    }
    return saved;
  }

  async remove(id: number): Promise<void> {
    const project = await this.findOne(id);
    await this.projectRepo.remove(project);
  }

  /** Health indicators for header badges. */
  async getHealth(projectId: number): Promise<{
    missingClient: boolean;
    missingForeman: boolean;
    missingContract: boolean;
    hasOverdueNextAction: boolean;
    hasUnpaidInvoices: boolean;
  }> {
    const project = await this.findOne(projectId);
    const manager = this.projectRepo.manager;

    let hasOverdueNextAction = false;
    let hasUnpaidInvoices = false;
    let missingContract = true;

    const [nextRows, invRows, attRows] = await Promise.all([
      manager.query(
        `SELECT 1 FROM project_next_actions WHERE project_id = $1 AND completed_at IS NULL AND due_at < CURRENT_DATE LIMIT 1`,
        [projectId],
      ),
      manager.query(
        `SELECT COUNT(*)::int AS c FROM invoices WHERE "projectId" = $1 AND (status IS NULL OR status != 'paid')`,
        [projectId],
      ),
      manager.query(
        `SELECT 1 FROM attachments WHERE "entityType" = 'project' AND "entityId" = $1 AND tag = 'contract' LIMIT 1`,
        [projectId],
      ),
    ]);

    if (Array.isArray(nextRows) && nextRows.length > 0) hasOverdueNextAction = true;
    if (Array.isArray(invRows) && invRows[0]?.c > 0) hasUnpaidInvoices = true;
    if (Array.isArray(attRows) && attRows.length > 0) missingContract = false;

    return {
      missingClient: project.clientId == null,
      missingForeman: project.foremanId == null,
      missingContract,
      hasOverdueNextAction,
      hasUnpaidInvoices,
    };
  }

  /** Уніфікований таймлайн подій по об'єкту: activity_log, КП, акти, накладні. */
  async getTimeline(
    projectId: number,
    query: ProjectTimelineQueryDto,
  ): Promise<TimelineEventDto[]> {
    await this.findOne(projectId);
    const limit = Math.min(100, Math.max(1, query.limit ?? 50));
    const typesSet = query.types
      ? new Set(query.types.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))
      : null;
    const from = query.from?.trim().slice(0, 10);
    const to = query.to?.trim().slice(0, 10);

    const events: TimelineEventDto[] = [];
    const manager = this.projectRepo.manager;

    const addFrom = (
      type: string,
      at: Date | string,
      title: string,
      entity?: { type: string; id: number },
      entityId?: number,
      actor?: { id: number; name: string },
      meta?: Record<string, unknown>,
    ) => {
      const atStr = typeof at === 'string' ? at : new Date(at).toISOString();
      const atDate = atStr.slice(0, 10);
      if (from && atDate < from) return;
      if (to && atDate > to) return;
      if (typesSet && !typesSet.has(type)) return;
      events.push({ type, at: atStr, title, entity, entityId, actor, meta });
    };

    if (!typesSet || typesSet.has('activity')) {
      const activityRows = await manager.query(
        `SELECT id, ts, entity, action, "entityId", summary, "actorId", payload FROM activity_log
         WHERE "projectId" = $1 ORDER BY ts DESC LIMIT $2`,
        [projectId, limit],
      );
      const actorIds = [...new Set((activityRows ?? []).map((r: any) => r.actorId).filter((id: any) => id != null && Number.isFinite(id)))];
      let actorMap = new Map<number, string>();
      if (actorIds.length > 0) {
        const userRows = await manager.query(
          'SELECT id, "fullName" FROM users WHERE id = ANY($1::int[])',
          [actorIds],
        );
        for (const u of userRows ?? []) {
          actorMap.set(u.id, u.fullName ?? `User ${u.id}`);
        }
      }
      for (const r of activityRows ?? []) {
        const at = r.ts;
        const title = r.summary ?? `${r.entity}:${r.action}`;
        const eventType = r.action || 'activity';
        const actor = r.actorId != null ? { id: r.actorId, name: actorMap.get(r.actorId) ?? `User ${r.actorId}` } : undefined;
        addFrom(eventType, at, title, { type: 'project', id: projectId }, r.entityId, actor, r.payload ?? { entity: r.entity, action: r.action });
      }
    }

    if (!typesSet || typesSet.has('quote')) {
      const rows = await manager.query(
        `SELECT id, title, status, "updatedAt" FROM documents
         WHERE type = 'quote' AND "projectId" = $1 ORDER BY "updatedAt" DESC LIMIT $2`,
        [projectId, limit],
      );
      for (const r of rows ?? []) {
        addFrom('quote', r.updatedAt, r.title ?? `КП #${r.id}`, { type: 'quote', id: r.id }, r.id, undefined, { status: r.status });
      }
    }

    if (!typesSet || typesSet.has('act')) {
      const rows = await manager.query(
        `SELECT id, act_date AS "actDate", status, "updatedAt" FROM acts WHERE "projectId" = $1 ORDER BY "updatedAt" DESC LIMIT $2`,
        [projectId, limit],
      );
      for (const r of rows ?? []) {
        addFrom('act', r.updatedAt, `Акт #${r.id} (${r.actDate})`, { type: 'act', id: r.id }, r.id, undefined, { status: r.status });
      }
    }

    if (!typesSet || typesSet.has('invoice')) {
      const rows = await manager.query(
        `SELECT id, status, "updatedAt" FROM invoices WHERE "projectId" = $1 ORDER BY "updatedAt" DESC LIMIT $2`,
        [projectId, limit],
      );
      for (const r of rows ?? []) {
        addFrom('invoice', r.updatedAt, `Накладна #${r.id}`, { type: 'invoice', id: r.id }, r.id, undefined, { status: r.status });
      }
    }

    events.sort((a, b) => (b.at > a.at ? 1 : -1));
    return events.slice(0, limit);
  }
}
