import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { OutboxService, type ScopeType } from './outbox/outbox.service';
import { buildInvalidateHints, type InvalidateHint } from './invalidate-hints';

export type EmitEntityChangedParams = {
  scopeType?: ScopeType; // Auto-determined if not provided
  scopeId?: number | null;
  entityType: string;
  entityId: string | number;
  projectId?: number | null;
  actorUserId?: number | null;
  clientOpId?: string | null;
  hint?: InvalidateHint | null; // Override auto-generated hints
  action?: string;
};

/** Patch payload for frontend cache update (STEP 3). */
export type RealtimePatch = {
  op: 'merge' | 'delete' | 'create';
  fields?: Record<string, unknown>;
  snapshot?: Record<string, unknown>;
};

export type EmitEntityChangedTxParams = {
  scopeType?: 'global' | 'project' | 'user';
  scopeId?: number | null;
  eventType: 'entity.changed' | 'entity.deleted' | 'entity.created';
  entityType: string;
  entityId: string;
  projectId?: number | null;
  actorUserId?: number | null;
  clientOpId?: string | null;
  hint?: InvalidateHint | null;
  payloadExtra?: Record<string, unknown> | null;
  /** Version for out-of-order protection (patch engine). */
  entityVersion?: number | null;
  /** ISO string; alternative to entityVersion. */
  updatedAt?: string | null;
  /** Patch for frontend cache (merge/delete/create). */
  patch?: RealtimePatch | null;
};

/**
 * Writes to outbox_events only; OutboxPublisher emits bo:invalidate.
 * Use emitEntityChangedTx(manager, ...) inside the same transaction as business + audit.
 * Automatically determines scopeType (project if projectId exists, else global) and invalidate hints.
 */
@Injectable()
export class RealtimeEmitterService {
  constructor(private readonly outboxService: OutboxService) {}

  /**
   * Enqueue outbox event within existing transaction (critical: same tx as save + audit).
   * Auto-determines scopeType from projectId and invalidate hints from entityType.
   */
  async emitEntityChangedTx(manager: EntityManager, params: EmitEntityChangedTxParams): Promise<void> {
    // Determine scope: if projectId exists → project room, else global
    const scopeType: 'global' | 'project' | 'user' =
      params.scopeType ?? (params.projectId != null ? 'project' : 'global');
    const scopeId = params.scopeId ?? (scopeType === 'project' ? params.projectId : null);

    // Build invalidate hints (unless overridden)
    const action = params.eventType === 'entity.created' ? 'created' : params.eventType === 'entity.deleted' ? 'deleted' : 'changed';
    const invalidateHint: InvalidateHint | null =
      params.hint ??
      buildInvalidateHints({
        entityType: params.entityType,
        entityId: params.entityId,
        projectId: params.projectId ?? null,
        action,
      });

    await this.outboxService.enqueueTx(manager, {
      eventType: params.eventType,
      scopeType,
      scopeId,
      entityType: params.entityType,
      entityId: params.entityId,
      payload: {
        projectId: params.projectId ?? null,
        invalidate: invalidateHint ?? undefined,
        entityVersion: params.entityVersion ?? undefined,
        updatedAt: params.updatedAt ?? undefined,
        patch: params.patch ?? undefined,
        ...(params.payloadExtra ?? {}),
      },
      actorUserId: params.actorUserId ?? null,
      clientOpId: params.clientOpId ?? null,
    });
  }

  async emitEntityChanged(params: EmitEntityChangedParams): Promise<void> {
    const scopeType: ScopeType = params.scopeType ?? (params.projectId != null ? 'project' : 'global');
    const scopeId = params.scopeId ?? (scopeType === 'project' ? params.projectId : null);
    const invalidateHint: InvalidateHint | null =
      params.hint ??
      buildInvalidateHints({
        entityType: params.entityType,
        entityId: params.entityId,
        projectId: params.projectId ?? null,
        action: 'changed',
      });

    await this.outboxService.enqueue({
      eventType: 'entity.changed',
      scopeType,
      scopeId,
      entityType: params.entityType,
      entityId: params.entityId,
      payload: {
        projectId: params.projectId ?? null,
        invalidate: invalidateHint ?? undefined,
      },
      actorUserId: params.actorUserId ?? null,
      clientOpId: params.clientOpId ?? null,
    });
  }

  async emitEntityDeleted(params: Omit<EmitEntityChangedParams, 'action'>): Promise<void> {
    const scopeType: ScopeType = params.scopeType ?? (params.projectId != null ? 'project' : 'global');
    const scopeId = params.scopeId ?? (scopeType === 'project' ? params.projectId : null);
    const invalidateHint: InvalidateHint | null =
      params.hint ??
      buildInvalidateHints({
        entityType: params.entityType,
        entityId: params.entityId,
        projectId: params.projectId ?? null,
        action: 'deleted',
      });

    await this.outboxService.enqueue({
      eventType: 'entity.deleted',
      scopeType,
      scopeId,
      entityType: params.entityType,
      entityId: params.entityId,
      payload: {
        projectId: params.projectId ?? null,
        invalidate: invalidateHint ?? undefined,
      },
      actorUserId: params.actorUserId ?? null,
      clientOpId: params.clientOpId ?? null,
    });
  }
}
