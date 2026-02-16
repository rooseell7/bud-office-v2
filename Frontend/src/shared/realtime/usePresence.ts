/**
 * STEP 4: Hook for presence (who's online, who's on project/entity) and edit state.
 * Uses RealtimeContext (presenceState, editState, sendPresenceHello, etc.).
 */

import { useCallback, useContext } from 'react';
import { useRealtime } from '../../realtime/RealtimeContext';

export type PresenceUser = {
  userId: number;
  name: string;
  initials?: string;
  role?: string | null;
  module?: string | null;
  projectId?: number | null;
  entityType?: string | null;
  entityId?: string | null;
  mode?: 'view' | 'edit';
  lastSeenAt: string;
};

export type EditingUser = {
  userId: number;
  name: string;
  initials?: string;
  startedAt: number;
  lastSeenAt: number;
};

export type PresenceState = {
  globalUsers: PresenceUser[];
  projectUsers: Record<number, PresenceUser[]>;
  entityUsers: Record<string, PresenceUser[]>;
};

export type EditState = Record<string, EditingUser[]>;

export type UsePresenceResult = {
  /** All online users (from last bo:presence:state scope=global). */
  globalUsers: PresenceUser[];
  /** Users currently in this project (from scope=project). */
  projectUsers: (projectId: number) => PresenceUser[];
  /** Users currently viewing/editing this entity (from scope=entity). */
  entityUsers: (entityType: string, entityId: string) => PresenceUser[];
  /** Who is editing this entity (from bo:edit:state). */
  editors: (entityType: string, entityId: string) => EditingUser[];
  /** Send presence hello (call on route change). */
  sendPresenceHello: (context: {
    module?: string | null;
    projectId?: number | null;
    entityType?: string | null;
    entityId?: string | number | null;
    route?: string | null;
    mode?: 'view' | 'edit';
  }) => void;
  sendPresenceLeave: () => void;
  sendEditBegin: (entityType: string, entityId: string, projectId?: number) => void;
  sendEditEnd: (entityType: string, entityId: string) => void;
};

function emptyPresenceState(): PresenceState {
  return { globalUsers: [], projectUsers: {}, entityUsers: {} };
}

function reducePresenceState(prev: PresenceState, payload: PresenceStatePayload): PresenceState {
  const users = payload.users as PresenceUser[];
  if (payload.scope === 'global') {
    return { ...prev, globalUsers: users };
  }
  if (payload.scope === 'project' && payload.scopeId) {
    const projectId = parseInt(payload.scopeId, 10);
    if (Number.isFinite(projectId)) {
      return { ...prev, projectUsers: { ...prev.projectUsers, [projectId]: users } };
    }
  }
  if (payload.scope === 'entity' && payload.scopeId) {
    const key = payload.scopeId;
    return { ...prev, entityUsers: { ...prev.entityUsers, [key]: users } };
  }
  return prev;
}

/** Hook: presence + edit state and senders from RealtimeContext. */
export function usePresence(): UsePresenceResult {
  const realtime = useRealtime();
  const state = realtime?.presenceState ?? emptyPresenceState();
  const editState = realtime?.editState ?? {};
  const projectUsers = useCallback(
    (projectId: number) => state.projectUsers[projectId] ?? [],
    [state.projectUsers],
  );
  const entityUsers = useCallback(
    (entityType: string, entityId: string) =>
      state.entityUsers[`${entityType}:${entityId}`] ?? [],
    [state.entityUsers],
  );
  const editors = useCallback(
    (entityType: string, entityId: string) =>
      editState[`${entityType}:${entityId}`] ?? [],
    [editState],
  );
  return {
    globalUsers: state.globalUsers,
    projectUsers,
    entityUsers,
    editors,
    sendPresenceHello: realtime?.sendPresenceHello ?? (() => {}),
    sendPresenceLeave: realtime?.sendPresenceLeave ?? (() => {}),
    sendEditBegin: realtime?.sendEditBegin ?? (() => {}),
    sendEditEnd: realtime?.sendEditEnd ?? (() => {}),
  };
}

export { reducePresenceState, emptyPresenceState };
