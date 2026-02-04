/**
 * Domain event from server (domain:event). Used for invalidate/refetch.
 */
export type DomainEntity =
  | 'project'
  | 'task'
  | 'transaction'
  | 'wallet'
  | 'object';

export type DomainAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'status_changed';

export interface DomainEvent {
  eventId: string;
  ts: string;
  actorId: string | number;
  entity: DomainEntity;
  action: DomainAction;
  entityId: string | number;
  projectId?: string | number | null;
  payload?: Record<string, unknown>;
  eventVersion?: 1;
}
