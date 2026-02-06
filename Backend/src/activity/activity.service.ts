import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './activity-log.entity';
import type { DomainEvent } from '../realtime/domain-event.types';

export type ActivityLogDto = {
  id: number;
  ts: string;
  actorId: number | null;
  entity: string;
  action: string;
  entityId: number;
  projectId: number | null;
  summary: string | null;
  payload: Record<string, unknown> | null;
};

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly repo: Repository<ActivityLog>,
  ) {}

  async findRecent(limit: number, projectId?: number): Promise<ActivityLogDto[]> {
    const qb = this.repo
      .createQueryBuilder('a')
      .orderBy('a.ts', 'DESC')
      .take(limit);
    if (projectId != null && Number.isFinite(projectId)) {
      qb.andWhere('a.projectId = :projectId', { projectId });
    }
    const rows = await qb.getMany();
    return rows.map((r) => ({
      id: r.id,
      ts: r.ts.toISOString(),
      actorId: r.actorId,
      entity: r.entity,
      action: r.action,
      entityId: r.entityId,
      projectId: r.projectId,
      summary: r.summary,
      payload: r.payload,
    }));
  }

  /** Log project audit event for timeline (sales stage, next action, etc.). */
  async logProjectAudit(params: {
    projectId: number;
    actorId: number | null;
    action: string;
    summary: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    const row = this.repo.create({
      ts: new Date(),
      actorId: params.actorId,
      entity: 'project',
      action: params.action,
      entityId: params.projectId,
      projectId: params.projectId,
      summary: params.summary,
      payload: params.payload ?? null,
    });
    await this.repo.save(row);
  }

  async log(event: DomainEvent): Promise<void> {
    const summary = (event as any).payload?.summary && typeof (event as any).payload.summary === 'string'
      ? (event as any).payload.summary
      : this.summaryFor(event);
    const row = this.repo.create({
      ts: new Date(event.ts),
      actorId: typeof event.actorId === 'number' ? event.actorId : parseInt(String(event.actorId), 10) || null,
      entity: event.entity,
      action: event.action,
      entityId: typeof event.entityId === 'number' ? event.entityId : parseInt(String(event.entityId), 10),
      projectId: event.projectId != null ? (typeof event.projectId === 'number' ? event.projectId : parseInt(String(event.projectId), 10)) : null,
      summary,
      payload: event.payload ?? null,
    });
    await this.repo.save(row);
  }

  private summaryFor(event: DomainEvent): string {
    const e = event.entity;
    const a = event.action;
    if (e === 'task') {
      if (a === 'created') return 'Створено задачу';
      if (a === 'status_changed') return 'Змінено статус задачі';
      if (a === 'updated') return 'Оновлено задачу';
    }
    if (e === 'transaction') return a === 'created' ? 'Додано транзакцію' : 'Оновлено транзакцію';
    if (e === 'wallet') return a === 'created' ? 'Створено гаманець' : 'Оновлено гаманець';
    if (e === 'project') return a === 'created' ? 'Створено об\'єкт' : a === 'status_changed' ? 'Змінено статус об\'єкта' : 'Оновлено об\'єкт';
    return `${e}:${a}`;
  }
}
