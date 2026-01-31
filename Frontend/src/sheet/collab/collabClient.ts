/**
 * Collab WebSocket client. Connects to sheet room, sends APPLY_OP, receives OP_APPLIED.
 * Uses wsBaseUrl from canonical env resolver (never localhost:5173).
 */

import { io, Socket } from 'socket.io-client';
import { wsBaseUrl, apiBaseUrl } from './env';

const DEV = import.meta.env?.DEV ?? false;

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
};

export class CollabClient {
  private socket: Socket | null = null;
  private options: CollabClientOptions;
  private pendingOps = new Map<string, { resolve: () => void; reject: (e: any) => void }>();

  constructor(options: CollabClientOptions) {
    this.options = options;
  }

  connect(): void {
    if (this.socket?.connected) return;
    const url = this.options.url ?? wsBaseUrl;
    if (DEV) {
      console.log('[collab] wsBaseUrl=', url, 'apiBaseUrl=', apiBaseUrl);
    }
    this.socket = io(url, {
      auth: { token: this.options.token },
      transports: ['websocket', 'polling'],
    });
    this.socket.on('connect', () => {
      if (DEV) console.log('[collab] connect');
    });
    this.socket.on('disconnect', (reason) => {
      if (DEV) console.log('[collab] disconnect reason=', reason);
      if (reason === 'io server disconnect' || /unauthorized|invalid|token/i.test(reason)) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'ws_unauthorized' } }));
      }
    });
    this.socket.on('auth_error', () => {
      if (DEV) console.log('[collab] auth_error from server');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'ws_unauthorized' } }));
    });
    this.socket.on('connect_error', (err: Error) => {
      if (DEV) console.log('[collab] connect_error:', err?.message);
      if (/401|unauthorized|invalid|token|auth/i.test(err?.message ?? '')) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'ws_auth_error' } }));
      }
    });
    this.socket.on('collab', (ev: CollabEvent) => {
      if (ev.type === 'OP_APPLIED' && ev.clientOpId) {
        this.pendingOps.get(`${ev.docId}:${ev.clientOpId}`)?.resolve();
        this.pendingOps.delete(`${ev.docId}:${ev.clientOpId}`);
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
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const key = `${docId}:${clientOpId}`;
      this.pendingOps.set(key, { resolve, reject });
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
}
