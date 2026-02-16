/**
 * STEP 7: Server drafts API.
 */
import { Controller, Get, Put, Delete, Query, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DraftsService, buildDraftKey } from './drafts.service';

function getUserId(req: any): number {
  const id = req?.user?.id ?? req?.user?.sub;
  const n = typeof id === 'number' ? id : Number(id);
  return Number.isFinite(n) ? n : 0;
}

@Controller('drafts')
@UseGuards(JwtAuthGuard)
export class DraftsController {
  constructor(private readonly draftsService: DraftsService) {}

  @Get()
  async get(@Query('key') key: string, @Req() req: any) {
    const userId = getUserId(req ?? {});
    if (!key?.trim()) return null;
    const draft = await this.draftsService.get(key.trim(), userId);
    return draft ? { payload: draft.payload, updatedAt: draft.updatedAt } : null;
  }

  @Put()
  async upsert(
    @Query('key') key: string,
    @Body() body: { payload?: Record<string, unknown>; projectId?: number; entityType?: string; entityId?: string; scopeType?: string },
    @Req() req?: any,
  ) {
    const userId = getUserId(req ?? {});
    if (!key?.trim()) throw new Error('key is required');
    const b = body ?? {};
    const draft = await this.draftsService.upsert(userId, {
      key: key.trim(),
      payload: b.payload ?? {},
      projectId: b.projectId ?? null,
      entityType: b.entityType ?? 'unknown',
      entityId: b.entityId ?? null,
      scopeType: (b.scopeType as 'global' | 'project' | 'entity') ?? 'project',
    });
    return { ok: true, updatedAt: draft.updatedAt };
  }

  @Delete()
  async delete(@Query('key') key: string, @Req() req: any) {
    const userId = getUserId(req ?? {});
    if (!key?.trim()) return { ok: true };
    await this.draftsService.delete(key.trim(), userId);
    return { ok: true };
  }

  @Get('recent')
  async recent(
    @Req() req: any,
    @Query('projectId') projectId?: string,
    @Query('entityType') entityType?: string,
  ) {
    const userId = getUserId(req ?? {});
    const projectIdNum = projectId ? parseInt(projectId, 10) : undefined;
    const list = await this.draftsService.getRecent(userId, projectIdNum, entityType ?? undefined);
    return { items: list.map((d) => ({ key: d.key, entityType: d.entityType, updatedAt: d.updatedAt })) };
  }
}
