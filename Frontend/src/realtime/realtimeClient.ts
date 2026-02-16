/**
 * Realtime WebSocket client: domain:event + bo:invalidate (outbox).
 * Connects with JWT, joins global + project rooms, resync on reconnect.
 */

import { io, Socket } from 'socket.io-client';
import { wsBaseUrl } from '../shared/config/env';
import type { DomainEvent } from './types';
import { emitInvalidate, invalidateAll, type InvalidatePayload } from './invalidateBus';

const DEDUP = new Set<string>();

/** STEP 4: presence state from server (bo:presence:state). */
export type PresenceStatePayload = {
  scope: 'global' | 'project' | 'entity';
  scopeId?: string;
  users: Array<{
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
  }>;
};

/** STEP 4: edit state from server (bo:edit:state). */
export type EditStatePayload = {
  entityType: string;
  entityId: string;
  editors: Array<{ userId: number; name: string; initials?: string; startedAt: number; lastSeenAt: number }>;
};

export type RealtimeClientOptions = {
  url?: string;
  token: string | null;
  userId?: number | null;
  onEvent?: (ev: DomainEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onInvalidate?: (payload: InvalidatePayload) => void;
  onNotify?: (payload: any) => void;
  onPresenceState?: (payload: PresenceStatePayload) => void;
  onEditState?: (payload: EditStatePayload) => void;
};

const PRESENCE_PING_INTERVAL_MS = 45_000;
/** STEP 5: heartbeat every 25s when tab visible; slower when hidden. */
const PRESENCE_HEARTBEAT_MS = 25_000;
const PRESENCE_HEARTBEAT_HIDDEN_MS = 60_000;

export class RealtimeClient {
  private socket: Socket | null = null;
  private options: RealtimeClientOptions;
  private seenIds = new Set<string>();
  private presencePingTimer: ReturnType<typeof setInterval> | null = null;
  private presenceHeartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private visibilityUnsub: (() => void) | null = null;

  constructor(options: RealtimeClientOptions) {
    this.options = options;
  }

  connect(): void {
    if (this.socket?.connected) return;
    const url = this.options.url ?? wsBaseUrl;
    this.socket = io(url, {
      auth: { token: this.options.token },
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });
    this.visibilityUnsub = this.attachVisibilityListener();
    this.socket.on('connect', () => {
      const rooms: string[] = ['global', 'presence:global'];
      if (this.options.userId != null) rooms.push(`user:${this.options.userId}`);
      this.socket?.emit('bo:join', { rooms });
      this.startPresencePing();
      this.startPresenceHeartbeat();
      this.options.onConnect?.();
    });
    this.socket.on('disconnect', () => {
      this.stopPresencePing();
      this.stopPresenceHeartbeat();
      this.options.onDisconnect?.();
    });
    this.socket.on('bo:presence:state', (payload: PresenceStatePayload) => {
      this.options.onPresenceState?.(payload);
    });
    this.socket.on('bo:edit:state', (payload: EditStatePayload) => {
      this.options.onEditState?.(payload);
    });
    this.socket.on('bo:notify', (payload: any) => {
      this.options.onNotify?.(payload);
    });
    this.socket.on('bo:invalidate', (payload: InvalidatePayload) => {
      if (payload?.eventId) {
        try {
          localStorage.setItem('bud.realtime.lastEventId', String(payload.eventId));
        } catch {
          /* ignore */
        }
        emitInvalidate(payload);
        // invalidateAll() called only if no invalidate hints (fallback)
        if (!payload.invalidate?.queries || payload.invalidate.queries.length === 0) {
          invalidateAll();
        }
        this.options.onInvalidate?.(payload);
      }
    });
    this.socket.on('domain:event', (ev: DomainEvent) => {
      if (!ev?.eventId) return;
      if (DEDUP.has(ev.eventId) || this.seenIds.has(ev.eventId)) return;
      DEDUP.add(ev.eventId);
      this.seenIds.add(ev.eventId);
      const DEDUP_MAX = 500;
      if (this.seenIds.size > DEDUP_MAX) {
        const arr = [...this.seenIds].slice(-Math.floor(DEDUP_MAX / 2));
        this.seenIds.clear();
        arr.forEach((id) => this.seenIds.add(id));
      }
      this.options.onEvent?.(ev);
    });
  }

  disconnect(): void {
    this.visibilityUnsub?.();
    this.visibilityUnsub = null;
    this.stopPresencePing();
    this.stopPresenceHeartbeat();
    this.socket?.emit('bo:presence:leave');
    this.socket?.disconnect();
    this.socket = null;
  }

  /** STEP 5: when tab is hidden, reduce heartbeat frequency; when visible, 25s. */
  private attachVisibilityListener(): () => void {
    const handler = () => {
      if (typeof document === 'undefined') return;
      if (!this.socket?.connected) return;
      const hidden = document.visibilityState === 'hidden';
      this.stopPresenceHeartbeat();
      const ms = hidden ? PRESENCE_HEARTBEAT_HIDDEN_MS : PRESENCE_HEARTBEAT_MS;
      this.presenceHeartbeatTimer = setInterval(() => {
        this.socket?.emit('bo:presence:heartbeat');
      }, ms);
    };
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', handler);
      handler();
    }
    return () => {
      if (typeof document !== 'undefined' && document.removeEventListener) {
        document.removeEventListener('visibilitychange', handler);
      }
    };
  }

  private startPresencePing(): void {
    this.stopPresencePing();
    this.presencePingTimer = setInterval(() => {
      this.socket?.emit('realtime', { type: 'PRESENCE_PING' });
    }, PRESENCE_PING_INTERVAL_MS);
  }

  private stopPresencePing(): void {
    if (this.presencePingTimer) {
      clearInterval(this.presencePingTimer);
      this.presencePingTimer = null;
    }
  }

  private startPresenceHeartbeat(): void {
    this.stopPresenceHeartbeat();
    const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    const ms = hidden ? PRESENCE_HEARTBEAT_HIDDEN_MS : PRESENCE_HEARTBEAT_MS;
    this.presenceHeartbeatTimer = setInterval(() => {
      this.socket?.emit('bo:presence:heartbeat');
    }, ms);
  }

  private stopPresenceHeartbeat(): void {
    if (this.presenceHeartbeatTimer) {
      clearInterval(this.presenceHeartbeatTimer);
      this.presenceHeartbeatTimer = null;
    }
  }

  /** STEP 4: send presence context (call on route change). */
  sendPresenceHello(context: {
    module?: string | null;
    projectId?: number | null;
    entityType?: string | null;
    entityId?: string | number | null;
    route?: string | null;
    mode?: 'view' | 'edit';
  }): void {
    this.socket?.emit('bo:presence:hello', context);
  }

  sendPresenceLeave(): void {
    this.socket?.emit('bo:presence:leave');
  }

  sendEditBegin(entityType: string, entityId: string, projectId?: number): void {
    this.socket?.emit('bo:edit:begin', { entityType, entityId, projectId });
  }

  sendEditEnd(entityType: string, entityId: string): void {
    this.socket?.emit('bo:edit:end', { entityType, entityId });
  }

  joinProject(projectId: number): void {
    this.socket?.emit('realtime', { type: 'JOIN_PROJECT', projectId });
  }

  leaveProject(projectId: number): void {
    this.socket?.emit('realtime', { type: 'LEAVE_PROJECT', projectId });
  }

  joinModule(module: 'execution' | 'finance'): void {
    this.socket?.emit('realtime', { type: 'JOIN_MODULE', module });
  }

  leaveModule(module: 'execution' | 'finance'): void {
    this.socket?.emit('realtime', { type: 'LEAVE_MODULE', module });
  }

  joinBoRooms(rooms: string[]): void {
    const withPresence = rooms.includes('presence:global') ? rooms : [...rooms, 'presence:global'];
    this.socket?.emit('bo:join', { rooms: withPresence });
  }

  leaveBoRooms(rooms: string[]): void {
    this.socket?.emit('bo:leave', { rooms });
  }

  get connected(): boolean {
    return !!this.socket?.connected;
  }
}
