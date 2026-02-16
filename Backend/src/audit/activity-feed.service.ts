/**
 * STEP 6: Activity Feed based on audit_log.
 * Provides global, project, and entity-scoped activity with actor info.
 */
import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { User } from '../users/user.entity';
import { Project } from '../projects/project.entity';

export type ActivityItemDto = {
  id: string;
  createdAt: string;
  actor: { id: number; name: string; initials: string };
  action: string;
  entity: { type: string; id: string; title: string | null };
  projectId: number | null;
  meta: Record<string, unknown> | null;
};

export type ActivityFeedParams = {
  scope: 'global' | 'project' | 'entity';
  projectId?: number | null;
  entityType?: string | null;
  entityId?: string | null;
  actorUserId?: number | null;
  actionPrefix?: string | null;
  from?: string | null;
  to?: string | null;
  cursor?: string | null;
  limit?: number;
};

export type ActivityFeedResult = {
  items: ActivityItemDto[];
  nextCursor: string | null;
};

const ENTITY_TITLE_MAP: Record<string, (id: string, meta?: Record<string, unknown>) => string | null> = {
  invoice: (_id, m) => (m?.entityTitle && typeof m.entityTitle === 'string') ? m.entityTitle : null,
  act: (_id, m) => (m?.entityTitle && typeof m.entityTitle === 'string') ? m.entityTitle : null,
  order: (_id, m) => (m?.entityTitle && typeof m.entityTitle === 'string') ? m.entityTitle : null,
  supply_order: (_id, m) => (m?.entityTitle && typeof m.entityTitle === 'string') ? m.entityTitle : null,
  warehouse_movement: (_id, m) => (m?.entityTitle && typeof m.entityTitle === 'string') ? m.entityTitle : null,
  client: (_id, m) => (m?.entityTitle && typeof m.entityTitle === 'string') ? m.entityTitle : null,
  project: (_id, m) => (m?.entityTitle && typeof m.entityTitle === 'string') ? m.entityTitle : null,
};

function resolveEntityTitle(entityType: string, entityId: string, meta?: Record<string, unknown> | null): string | null {
  const fn = ENTITY_TITLE_MAP[entityType];
  if (fn) return fn(entityId, meta ?? undefined);
  const t = meta?.entityTitle;
  return t && typeof t === 'string' ? t : null;
}

@Injectable()
export class ActivityFeedService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  async getFeed(params: ActivityFeedParams, userId: number): Promise<ActivityFeedResult> {
    const { scope, projectId, entityType, entityId } = params;
    const limit = Math.min(params.limit ?? 50, 200);
    const cursor = params.cursor ? parseInt(params.cursor, 10) : null;

    // Permissions
    if (scope === 'global') {
      const perms = await this.getUserPermissions(userId);
      if (!perms.includes('activity:read:global') && !perms.includes('system:manage')) {
        throw new ForbiddenException('Global activity requires activity:read:global');
      }
    } else if (scope === 'project' && projectId != null) {
      await this.ensureProjectAccess(userId, projectId);
    } else if (scope === 'entity' && entityType && entityId) {
      await this.ensureEntityAccess(userId, entityType, entityId);
    }

    const qb = this.auditRepo
      .createQueryBuilder('a')
      .select([
        'a.id',
        'a."createdAt"',
        'a."actorUserId"',
        'a.action',
        'a."entityType"',
        'a."entityId"',
        'a."projectId"',
        'a.meta',
      ])
      .orderBy('a.id', 'DESC')
      .take(limit + 1);

    if (cursor != null && Number.isFinite(cursor)) {
      qb.andWhere('a.id < :cursor', { cursor });
    }

    if (scope === 'project' && projectId != null) {
      qb.andWhere('a."projectId" = :projectId', { projectId });
    }
    if (scope === 'entity' && entityType && entityId) {
      qb.andWhere('a."entityType" = :entityType', { entityType });
      qb.andWhere('a."entityId" = :entityId', { entityId });
    }
    if (params.actorUserId != null && Number.isFinite(params.actorUserId)) {
      qb.andWhere('a."actorUserId" = :actorUserId', { actorUserId: params.actorUserId });
    }
    if (params.actionPrefix && params.actionPrefix.trim()) {
      qb.andWhere('a.action LIKE :prefix', { prefix: `${params.actionPrefix.trim()}%` });
    }
    if (params.from && /^\d{4}-\d{2}-\d{2}/.test(params.from)) {
      qb.andWhere('a."createdAt" >= :from', { from: params.from });
    }
    if (params.to && /^\d{4}-\d{2}-\d{2}/.test(params.to)) {
      qb.andWhere('a."createdAt" < :toEnd', { toEnd: `${params.to}T23:59:59.999Z` });
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore && slice.length > 0 ? String(slice[slice.length - 1].id) : null;

    const usersById = new Map<number, { fullName: string }>();
    const actorIds = [...new Set(slice.map((r) => r.actorUserId).filter(Boolean))];
    if (actorIds.length > 0) {
      const users = await this.userRepo.find({
        where: actorIds.map((id) => ({ id })),
        select: ['id', 'fullName'],
      });
      users.forEach((u) => usersById.set(u.id, { fullName: u.fullName }));
    }

    const items: ActivityItemDto[] = slice.map((r) => {
      const uid = r.actorUserId ?? 0;
      const u = usersById.get(uid);
      const name = u?.fullName ?? `User ${uid}`;
      const initials = (name ?? 'U').trim().slice(0, 2).toUpperCase() || 'U';
      const meta = r.meta as Record<string, unknown> | null;
      const entityTitle = resolveEntityTitle(r.entityType, r.entityId, meta);
      return {
        id: String(r.id),
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
        actor: { id: uid, name, initials },
        action: r.action ?? '',
        entity: {
          type: r.entityType ?? '',
          id: r.entityId ?? '',
          title: entityTitle,
        },
        projectId: r.projectId ?? null,
        meta: meta ?? null,
      };
    });

    return { items, nextCursor };
  }

  private async getUserPermissions(userId: number): Promise<string[]> {
    const { resolvePermissionsFromRoles } = await import('../auth/permissions/permissions');
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['roles'],
      select: ['id', 'roles'],
    });
    if (!user) return [];
    return resolvePermissionsFromRoles(user.roles ?? []);
  }

  private async ensureProjectAccess(userId: number, projectId: number): Promise<void> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new ForbiddenException('Project not found');
    const perms = await this.getUserPermissions(userId);
    if (perms.includes('activity:read:global') || perms.includes('system:manage')) return;
    if (perms.includes('projects:read')) return;
    const hasRole =
      project.userId === userId ||
      project.ownerId === userId ||
      project.foremanId === userId ||
      project.estimatorId === userId ||
      project.supplyManagerId === userId;
    if (!hasRole) throw new ForbiddenException('No access to project');
  }

  private async ensureEntityAccess(userId: number, entityType: string, entityId: string): Promise<void> {
    const projectId = await this.resolveEntityProjectId(entityType, entityId);
    if (projectId != null) {
      await this.ensureProjectAccess(userId, projectId);
    } else {
      const perms = await this.getUserPermissions(userId);
      if (!perms.includes('activity:read:global') && !perms.includes('system:manage')) {
        throw new ForbiddenException('No access to entity');
      }
    }
  }

  private async resolveEntityProjectId(entityType: string, entityId: string): Promise<number | null> {
    const id = parseInt(entityId, 10);
    if (!Number.isFinite(id)) return null;
    switch (entityType) {
      case 'act': {
        const r = await this.auditRepo.manager.query(
          `SELECT "projectId" FROM acts WHERE id = $1`,
          [id],
        );
        return r?.[0]?.projectId ?? null;
      }
      case 'invoice': {
        const r = await this.auditRepo.manager.query(
          `SELECT "projectId" FROM invoices WHERE id = $1`,
          [id],
        );
        return r?.[0]?.projectId ?? null;
      }
      case 'order':
      case 'supply_order': {
        const r = await this.auditRepo.manager.query(
          `SELECT "projectId" FROM supply_orders WHERE id = $1`,
          [id],
        );
        return r?.[0]?.projectId ?? null;
      }
      case 'project':
        return id;
      default:
        return null;
    }
  }
}
