import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { CollabService } from './collab.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export type CollabPayload =
  | { type: 'JOIN_DOC'; docId: number; mode?: 'edit' | 'readonly' }
  | { type: 'LEAVE_DOC'; docId: number }
  | { type: 'PRESENCE'; docId: number; cursor?: { row: number; col: number } }
  | { type: 'LOCK_CELL'; docId: number; row: number; col: number }
  | { type: 'UNLOCK_CELL'; docId: number; row: number; col: number }
  | { type: 'LOCK_DOC'; docId: number }
  | { type: 'UNLOCK_DOC'; docId: number }
  | {
      type: 'APPLY_OP';
      docId: number;
      baseVersion: number;
      clientOpId: string;
      op: { type: string; payload: Record<string, any> };
    };

function getUserIdFromHandshake(handshake: any, jwtService: JwtService, secret: string): number | null {
  const token =
    handshake?.auth?.token ??
    handshake?.query?.token ??
    (handshake?.headers?.authorization && handshake.headers.authorization.startsWith('Bearer ')
      ? handshake.headers.authorization.slice(7)
      : null);
  if (!token) return null;
  try {
    const payload = jwtService.verify(token, { secret });
    const id = payload?.sub ?? payload?.id;
    return typeof id === 'number' ? id : Number(id);
  } catch {
    return null;
  }
}

@WebSocketGateway({
  cors: { origin: '*' },
})
export class CollabGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(CollabGateway.name);

  constructor(
    private readonly collabService: CollabService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: any) {
    const secret = this.config.get<string>('JWT_SECRET') || '';
    const token =
      client.handshake?.auth?.token ??
      client.handshake?.query?.token ??
      (client.handshake?.headers?.authorization?.startsWith('Bearer ')
        ? client.handshake.headers.authorization.slice(7)
        : null);
    const userId = getUserIdFromHandshake(client.handshake, this.jwtService, secret);
    (client as any).userId = userId;
    if (token && userId == null) {
      this.logger.warn(`Collab connect rejected: invalid token`);
      client.emit('auth_error', { reason: 'Invalid token' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: any) {
    const userId = (client as any).userId;
    this.collabService.leaveAll(client.id, userId);
  }

  @SubscribeMessage('collab')
  async handleCollab(client: any, payload: CollabPayload) {
    const userId = (client as any).userId ?? null;

    switch (payload.type) {
      case 'JOIN_DOC':
        await this.handleJoin(client, payload.docId, payload.mode ?? 'edit', userId);
        break;
      case 'LEAVE_DOC':
        this.collabService.leaveDoc(client.id, payload.docId);
        break;
      case 'PRESENCE':
        this.collabService.updatePresence(client.id, payload.docId, userId, payload.cursor);
        this.broadcastPresence(payload.docId);
        break;
      case 'LOCK_CELL':
        if (this.collabService.canLock(client.id, payload.docId)) {
          this.collabService.lockCell(payload.docId, payload.row, payload.col, userId);
          this.broadcastLocks(payload.docId);
        }
        break;
      case 'UNLOCK_CELL':
        this.collabService.unlockCell(client.id, payload.docId, payload.row, payload.col);
        this.broadcastLocks(payload.docId);
        break;
      case 'LOCK_DOC':
        if (this.collabService.canLock(client.id, payload.docId)) {
          this.collabService.lockDoc(payload.docId, userId);
          this.broadcastLocks(payload.docId);
        }
        break;
      case 'UNLOCK_DOC':
        this.collabService.unlockDoc(client.id, payload.docId);
        this.broadcastLocks(payload.docId);
        break;
      case 'APPLY_OP':
        await this.handleApplyOp(client, payload, userId);
        break;
      default:
        break;
    }
  }

  private async handleJoin(
    client: any,
    docId: number,
    mode: 'edit' | 'readonly',
    userId: number | null,
  ) {
    const room = `sheet:${docId}`;
    await client.join(room);
    this.collabService.joinDoc(client.id, docId, userId, mode);

    const state = await this.collabService.getDocState(docId);
    client.emit('collab', {
      type: 'DOC_STATE',
      docId,
      snapshot: state?.snapshot ?? null,
      version: state?.version ?? 0,
      locks: this.collabService.getLocks(docId),
      presence: this.collabService.getPresence(docId),
    });
    this.broadcastPresence(docId);
  }

  private async handleApplyOp(
    client: any,
    payload: Extract<CollabPayload, { type: 'APPLY_OP' }>,
    userId: number | null,
  ) {
    const docState = await this.collabService.getDocState(payload.docId);
    const currentVersion = docState?.version ?? -1;
    this.logger.log(
      `[collab] applyOp received { docId=${payload.docId} baseVersion=${payload.baseVersion} currentVersion=${currentVersion} clientOpId=${payload.clientOpId?.slice(0, 8)} userId=${userId} }`,
    );
    try {
      const result = await this.collabService.applyOp(
        payload.docId,
        payload.baseVersion,
        payload.clientOpId,
        payload.op,
        userId,
      );
      if (result.ok) {
        this.logger.log(`[collab] applyOp accepted { newVersion=${result.version} }`);
        const room = `sheet:${payload.docId}`;
        let count = 0;
        try {
          const roomSockets = await this.server.in(room).fetchSockets();
          count = roomSockets?.length ?? 0;
        } catch {
          /* ignore */
        }
        this.logger.debug(
          `OP_APPLIED doc=${payload.docId} v=${result.version} type=${payload.op.type} broadcast room=${room} socketsCount=${count}`,
        );
        this.server.to(room).emit('collab', {
          type: 'OP_APPLIED',
          docId: payload.docId,
          version: result.version,
          op: payload.op,
          opId: result.opId,
          clientOpId: payload.clientOpId,
        });
      } else {
        this.logger.log(
          `[collab] applyOp rejected { reason=${result.reason} expected=${payload.baseVersion} got=${currentVersion} details=${result.details ?? '-'} }`,
        );
        this.logger.warn(
          `OP_REJECTED doc=${payload.docId} reason=${result.reason} details=${result.details} baseVersion=${payload.baseVersion} socketId=${client.id} userId=${userId}`,
        );
        client.emit('collab', {
          type: 'OP_REJECTED',
          docId: payload.docId,
          clientOpId: payload.clientOpId,
          reason: result.reason,
          details: result.details,
        });
      }
    } catch (e: any) {
      client.emit('collab', {
        type: 'OP_REJECTED',
        docId: payload.docId,
        clientOpId: payload.clientOpId,
        reason: 'ERROR',
        details: e?.message ?? String(e),
      });
    }
  }

  private broadcastPresence(docId: number) {
    const presence = this.collabService.getPresence(docId);
    this.server.to(`sheet:${docId}`).emit('collab', {
      type: 'PRESENCE_BROADCAST',
      docId,
      presence,
    });
  }

  private broadcastLocks(docId: number) {
    const locks = this.collabService.getLocks(docId);
    this.server.to(`sheet:${docId}`).emit('collab', {
      type: 'LOCKS_UPDATED',
      docId,
      locks,
    });
  }
}
