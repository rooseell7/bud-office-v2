/**
 * Realtime (domain events) WebSocket client. Separate from sheet collab.
 * Connects with JWT, subscribes to domain:event, join/leave project and module rooms.
 */

import { io, Socket } from 'socket.io-client';
import { wsBaseUrl } from '../shared/config/env';
import type { DomainEvent } from './types';

const DEDUP = new Set<string>();

export type RealtimeClientOptions = {
  url?: string;
  token: string | null;
  onEvent?: (ev: DomainEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
};

const PRESENCE_PING_INTERVAL_MS = 45_000;

export class RealtimeClient {
  private socket: Socket | null = null;
  private options: RealtimeClientOptions;
  private seenIds = new Set<string>();
  private presencePingTimer: ReturnType<typeof setInterval> | null = null;

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
    this.socket.on('connect', () => {
      this.startPresencePing();
      this.options.onConnect?.();
    });
    this.socket.on('disconnect', () => {
      this.stopPresencePing();
      this.options.onDisconnect?.();
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
    this.stopPresencePing();
    this.socket?.disconnect();
    this.socket = null;
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

  get connected(): boolean {
    return !!this.socket?.connected;
  }
}
