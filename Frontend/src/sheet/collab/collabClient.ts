/**
 * Collab WebSocket client. Connects to sheet room, sends APPLY_OP, receives OP_APPLIED.
 * Uses wsBaseUrl from canonical env resolver (never localhost:5173).
 * Logs connect/disconnect/upgrade only (verbose via localStorage.DEBUG_COLLAB=1).
 */

import { io, Socket } from 'socket.io-client';
import { wsBaseUrl } from './env';

const DEV = import.meta.env?.DEV ?? false;
const DEBUG = typeof localStorage !== 'undefined' && localStorage.getItem('DEBUG_COLLAB') === '1';

export type CollabEvent =
  | { type: 'DOC_STATE'; docId: number; snapshot: any; version: number; locks: any; presence: any[] }
  | { type: 'OP_APPLIED'; docId: number; version: number; op: any; opId: number; clientOpId?: string }
  | { type: 'OP_REJECTED'; docId: number; clientOpId?: string; reason: string; details?: string }
  | { type: 'PRESENCE_BROADCAST'; docId: number; presence: any[] }
  | { type: 'LOCKS_UPDATED'; docId: number; locks: any };

export type CollabClientOptions = {
  url?: string;
  token: string | null;
  onEvent?: (ev: CollabEvent) => void;
  /** Якщо задано, після connect автоматично викликається joinDoc(docId, mode), щоб JOIN_DOC не втрачався до встановлення WS. */
  joinDocOnConnect?: { docId: number; mode?: 'edit' | 'readonly' };
};

export class CollabClient {
  private socket: Socket | null = null;
  private options: CollabClientOptions;
  private pendingOps = new Map<string, { resolve: (v: number) => void; reject: (e: any) => void }>();

  constructor(options: CollabClientOptions) {
    this.options = options;
  }

  connect(): void {
    if (this.socket?.connected) return;
    const url = this.options.url ?? wsBaseUrl;
    if (DEV || DEBUG) {
      console.log('[collab] connect url=', url || '(current origin)', 'path=/socket.io');
    }
    this.socket = io(url, {
      auth: { token: this.options.token },
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });
    this.socket.on('connect', () => {
      const transport = (this.socket as any)?.io?.engine?.transport?.name ?? 'unknown';
      if (DEV || DEBUG) console.log('[collab] connected', { transport, socketId: this.socket?.id });
      const join = this.options.joinDocOnConnect;
      if (join) this.joinDoc(join.docId, join.mode ?? 'edit');
    });
    const engine = this.socket.io?.engine;
    if (engine) {
      engine.on('upgrade', (t: { name?: string }) => {
        console.debug('[collab] upgraded', { transport: t?.name ?? 'websocket' });
      });
    }
    this.socket.on('disconnect', (reason) => {
      if (DEV || DEBUG) console.log('[collab] disconnect', { reason });
      if (reason === 'io server disconnect' || /unauthorized|invalid|token/i.test(reason)) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'ws_unauthorized' } }));
      }
    });
    this.socket.on('auth_error', () => {
      if (DEV || DEBUG) console.log('[collab] auth_error from server');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'ws_unauthorized' } }));
    });
    this.socket.on('connect_error', (err: Error) => {
      if (DEV || DEBUG) console.log('[collab] connect_error:', err?.message);
      if (/401|unauthorized|invalid|token|auth/i.test(err?.message ?? '')) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'ws_auth_error' } }));
      }
    });
    this.socket.on('collab', (ev: CollabEvent) => {
      if ((DEV || DEBUG) && (ev.type === 'OP_APPLIED' || ev.type === 'DOC_STATE')) {
        const summary = ev.type === 'OP_APPLIED' ? { docId: ev.docId, version: ev.version, opType: ev.op?.type } : { docId: ev.docId, version: (ev as any).version };
        console.log('[collab] event', ev.type, summary);
      }
      if (ev.type === 'OP_APPLIED' && ev.clientOpId) {
        const key = `${ev.docId}:${ev.clientOpId}`;
        const pending = this.pendingOps.get(key);
        if (pending) {
          pending.resolve(ev.version ?? 0);
          this.pendingOps.delete(key);
        }
      }
      if (ev.type === 'OP_REJECTED') {
        if (ev.clientOpId) {
          this.pendingOps.get(`${ev.docId}:${ev.clientOpId}`)?.reject(new Error(ev.reason));
          this.pendingOps.delete(`${ev.docId}:${ev.clientOpId}`);
        } else {
          for (const [k, p] of this.pendingOps) {
            if (k.startsWith(`${ev.docId}:`)) p.reject(new Error(ev.reason));
          }
        }
      }
      this.options.onEvent?.(ev);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinDoc(docId: number, mode: 'edit' | 'readonly' = 'edit'): void {
    const room = `sheet:${docId}`;
    if (DEV || DEBUG) console.log('[collab] joinDoc', { docId, room, mode });
    this.socket?.emit('collab', { type: 'JOIN_DOC', docId, mode });
  }

  leaveDoc(docId: number): void {
    this.socket?.emit('collab', { type: 'LEAVE_DOC', docId });
  }

  presence(docId: number, cursor?: { row: number; col: number }): void {
    this.socket?.emit('collab', { type: 'PRESENCE', docId, cursor });
  }

  lockCell(docId: number, row: number, col: number): void {
    this.socket?.emit('collab', { type: 'LOCK_CELL', docId, row, col });
  }

  unlockCell(docId: number, row: number, col: number): void {
    this.socket?.emit('collab', { type: 'UNLOCK_CELL', docId, row, col });
  }

  applyOp(
    docId: number,
    baseVersion: number,
    clientOpId: string,
    op: { type: string; payload: Record<string, any> },
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      const key = `${docId}:${clientOpId}`;
      this.pendingOps.set(key, {
        resolve: (version: number) => resolve(version),
        reject,
      });
      this.socket?.emit('collab', {
        type: 'APPLY_OP',
        docId,
        baseVersion,
        clientOpId,
        op,
      });
    });
  }

  get connected(): boolean {
    return !!this.socket?.connected;
  }

  get socketId(): string | undefined {
    return this.socket?.id;
  }
}
