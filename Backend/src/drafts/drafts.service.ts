/**
 * STEP 7: Server drafts — autosave for forms.
 * Draft key: draft:{entityType}:{mode}:{projectId?}:{entityId?}
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Draft } from './draft.entity';

export type DraftUpsertParams = {
  key: string;
  payload: Record<string, unknown>;
  projectId?: number | null;
  entityType: string;
  entityId?: string | null;
  scopeType: 'global' | 'project' | 'entity';
};

/** APPENDIX D: Draft keys (STRICT). */
export function buildDraftKey(params: {
  entityType: string;
  mode: 'create' | 'edit';
  projectId: number;
  entityId?: string | null;
}): string {
  const { entityType, mode, projectId, entityId } = params;
  const base = `draft:${entityType}:${mode}:project:${projectId}`;
  return entityId != null ? `${base}:${entityId}` : base;
}

@Injectable()
export class DraftsService {
  constructor(
    @InjectRepository(Draft)
    private readonly repo: Repository<Draft>,
  ) {}

  async get(key: string, userId: number): Promise<Draft | null> {
    const row = await this.repo.findOne({
      where: { key, userId },
    });
    return row ?? null;
  }

  async upsert(userId: number, params: DraftUpsertParams): Promise<Draft> {
    const existing = await this.repo.findOne({
      where: { key: params.key, userId },
    });
    const data = {
      userId,
      scopeType: params.scopeType,
      projectId: params.projectId ?? null,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      key: params.key,
      payload: params.payload ?? {},
    };
    if (existing) {
      existing.payload = data.payload;
      existing.scopeType = data.scopeType;
      existing.projectId = data.projectId;
      existing.entityType = data.entityType;
      existing.entityId = data.entityId;
      existing.version = existing.version + 1;
      await this.repo.save(existing);
      return existing;
    }
    const row = this.repo.create(data);
    return this.repo.save(row);
  }

  async delete(key: string, userId: number): Promise<void> {
    const result = await this.repo.delete({ key, userId });
    if (result.affected === 0) {
      throw new NotFoundException('Draft not found');
    }
  }

  async getRecent(userId: number, projectId?: number, entityType?: string): Promise<Draft[]> {
    const qb = this.repo
      .createQueryBuilder('d')
      .where('d."userId" = :userId', { userId })
      .orderBy('d."updatedAt"', 'DESC')
      .take(20);
    if (projectId != null) qb.andWhere('d."projectId" = :projectId', { projectId });
    if (entityType) qb.andWhere('d."entityType" = :entityType', { entityType });
    return qb.getMany();
  }
}
