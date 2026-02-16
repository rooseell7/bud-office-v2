import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';

export type AuditMeta = {
  ip?: string;
  userAgent?: string;
  requestId?: string;
  clientOpId?: string;
  route?: string;
};

export type AuditLogParams = {
  actorUserId: number;
  action: string;
  entityType: string;
  entityId: string | number;
  projectId?: number | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  meta?: AuditMeta | null;
};

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async log(params: AuditLogParams): Promise<void> {
    const row = this.repo.create({
      actorUserId: params.actorUserId,
      action: params.action,
      entityType: params.entityType,
      entityId: String(params.entityId),
      projectId: params.projectId ?? null,
      before: params.before ?? null,
      after: params.after ?? null,
      meta: (params.meta as Record<string, unknown>) ?? null,
    });
    await this.repo.save(row);
  }

  /** Log within existing transaction (same manager as business + outbox). */
  async logTx(manager: EntityManager, params: AuditLogParams): Promise<void> {
    const repo = manager.getRepository(AuditLog);
    const row = repo.create({
      actorUserId: params.actorUserId,
      action: params.action,
      entityType: params.entityType,
      entityId: String(params.entityId),
      projectId: params.projectId ?? null,
      before: params.before ?? null,
      after: params.after ?? null,
      meta: (params.meta as Record<string, unknown>) ?? null,
    });
    await repo.save(row);
  }
}
