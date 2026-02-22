import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server } from 'socket.io';
import { Project } from '../projects/project.entity';
import { Act } from '../acts/act.entity';
import { Invoice } from '../supply/invoice.entity';
import { SupplyOrder } from '../supply/entities/supply-order.entity';
import { User } from '../users/user.entity';
import { PresenceService } from '../presence/presence.service';
import { PresenceStoreService, type PresenceContext, type PresenceRecord } from '../presence/presence-store.service';
import { EditingStoreService } from '../presence/editing-store.service';
import { CollabService } from './collab.service';
import { RealtimeService } from '../realtime/realtime.service';
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

export type RealtimePayload =
  | { type: 'JOIN_PROJECT'; projectId: number }
  | { type: 'LEAVE_PROJECT'; projectId: number }
  | { type: 'JOIN_MODULE'; module: 'execution' | 'finance' }
  | { type: 'LEAVE_MODULE'; module: 'execution' | 'finance' }
  | { type: 'PRESENCE_PING' };

@WebSocketGateway({
  cors: { origin: '*' },
})
export class CollabGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(CollabGateway.name);

  private readonly presenceThrottle = new Map<string, number>();
  private static readonly PRESENCE_THROTTLE_MS = 1000;

  constructor(
    private readonly collabService: CollabService,
    private readonly realtimeService: RealtimeService,
    private readonly presenceService: PresenceService,
    private readonly presenceStore: PresenceStoreService,
    private readonly editingStore: EditingStoreService,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Act)
    private readonly actRepo: Repository<Act>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(SupplyOrder)
    private readonly orderRepo: Repository<SupplyOrder>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  afterInit(): void {
    this.realtimeService.setServer(this.server);
  }

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
      this.logger.warn('WS connect rejected: auth failure (invalid token)');
      client.emit('auth_error', { reason: 'Invalid token' });
      client.disconnect(true);
      return;
    }
    if (userId != null) {
      const origin = client.handshake?.headers?.origin ?? '';
      const transport = client.conn?.protocol ?? '';
      this.logger.log(`[WS] connect socketId=${client.id} userId=${userId} origin=${origin || '-'} transport=${transport || '-'} path=/socket.io`);
      this.presenceService.seen(userId);
    }
  }

  async handleDisconnect(client: any) {
    const userId = (client as any).userId as number | undefined;
    const reason = (client as any).disconnectReason ?? 'unknown';
    this.logger.log(`[WS] disconnect socketId=${client.id} userId=${userId ?? 'anonymous'} reason=${reason}`);
    this.collabService.leaveAll(client.id, userId ?? null);
    const prev = await this.presenceStore.removeAsync(client.id);
    if (prev) {
      await this.broadcastPresenceStateThrottled('global', undefined);
      if (prev.context.projectId != null) await this.broadcastPresenceStateThrottled('project', String(prev.context.projectId));
      if (prev.context.entityType && prev.context.entityId)
        await this.broadcastPresenceStateThrottled('entity', `${prev.context.entityType}:${prev.context.entityId}`);
    }
  }

  @SubscribeMessage('ping')
  handlePing(client: any): void {
    const userId = (client as any).userId ?? null;
    this.logger.debug(`[WS] ping socketId=${client.id} userId=${userId} -> pong`);
    client.emit('pong');
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
        // не розсилати список онлайн — broadcastPresence вимкнено
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

  @SubscribeMessage('realtime')
  async handleRealtime(client: any, payload: RealtimePayload): Promise<void> {
    const userId = (client as any).userId ?? null;
    switch (payload.type) {
      case 'JOIN_PROJECT': {
        if (userId == null) break;
        // Allow if user is project owner OR has access to an act in this project (delivery/estimate context)
        const asOwner = await this.projectRepo.findOne({
          where: { id: payload.projectId, userId },
        });
        const hasActAccess =
          !asOwner &&
          (await this.actRepo.findOne({
            where: { projectId: payload.projectId },
            select: ['id'],
          }));
        if (!asOwner && !hasActAccess) {
          this.logger.debug(`[realtime] join project:${payload.projectId} denied for user ${userId}`);
          break;
        }
        const room = `project:${payload.projectId}`;
        await client.join(room);
        this.logger.debug(`[bo:join] room=${room} userId=${userId}`);
        break;
      }
      case 'LEAVE_PROJECT': {
        const room = `project:${payload.projectId}`;
        client.leave(room);
        this.logger.debug(`[realtime] leave room=${room} userId=${userId}`);
        break;
      }
      case 'JOIN_MODULE': {
        const room = `module:${payload.module}`;
        await client.join(room);
        this.logger.debug(`[realtime] join room=${room} userId=${userId}`);
        break;
      }
      case 'LEAVE_MODULE': {
        const room = `module:${payload.module}`;
        client.leave(room);
        this.logger.debug(`[realtime] leave room=${room} userId=${userId}`);
        break;
      }
      case 'PRESENCE_PING':
        if (userId != null) this.presenceService.seen(userId);
        break;
      default:
        break;
    }
  }

  @SubscribeMessage('rooms:join')
  async handleRoomsJoin(client: any, payload: { room?: string }): Promise<void> {
    const room = payload?.room?.trim();
    if (!room) return;
    const userId = (client as any).userId ?? null;
    if (userId == null) return;
    const ok = await this.validateRoomAccess(room, userId);
    if (!ok) {
      this.logger.debug(`[realtime] rooms:join denied room=${room} userId=${userId}`);
      return;
    }
    await client.join(room);
    this.logger.debug(`[realtime] rooms:join room=${room} userId=${userId}`);
  }

  @SubscribeMessage('rooms:leave')
  handleRoomsLeave(client: any, payload: { room?: string }): void {
    const room = payload?.room?.trim();
    if (!room) return;
    client.leave(room);
    this.logger.debug(`[realtime] rooms:leave room=${room} userId=${(client as any).userId ?? null}`);
  }

  @SubscribeMessage('bo:join')
  async handleBoJoin(client: any, payload: { rooms?: string[] }): Promise<void> {
    const userId = (client as any).userId ?? null;
    if (userId == null) {
      client.emit('bo:join:error', { reason: 'Unauthorized' });
      return;
    }
    const rooms = Array.isArray(payload?.rooms) ? payload.rooms : [];
    for (const room of rooms) {
      const r = String(room).trim();
      if (!r) continue;
      const ok = await this.validateRoomAccess(r, userId);
      if (ok) {
        await client.join(r);
        this.logger.debug(`[bo:join] room=${r} userId=${userId}`);
      } else {
        this.logger.debug(`[bo:join] denied room=${r} userId=${userId}`);
      }
    }
  }

  @SubscribeMessage('bo:leave')
  handleBoLeave(client: any, payload: { rooms?: string[] }): void {
    const rooms = Array.isArray(payload?.rooms) ? payload.rooms : [];
    for (const room of rooms) {
      const r = String(room).trim();
      if (r) client.leave(r);
    }
  }

  // --- STEP 4: Presence (bo:presence:hello / state / leave / heartbeat) ---

  @SubscribeMessage('bo:presence:hello')
  async handlePresenceHello(
    client: any,
    payload: {
      module?: string | null;
      projectId?: number | null;
      entityType?: string | null;
      entityId?: string | number | null;
      route?: string | null;
      mode?: 'view' | 'edit';
    },
  ): Promise<void> {
    const userId = (client as any).userId ?? null;
    if (userId == null) return;
    const user = await this.userRepo.findOne({ where: { id: userId }, select: ['id', 'fullName'], relations: ['roles'] });
    const name = user?.fullName ?? `User ${userId}`;
    const initials = (user?.fullName ?? 'U').trim().slice(0, 2).toUpperCase() || 'U';
    const role = (user as any)?.roles?.[0]?.name ?? null;
    const context: PresenceContext = {
      module: payload.module ?? null,
      projectId: payload.projectId ?? null,
      entityType: payload.entityType ?? null,
      entityId: payload.entityId != null ? String(payload.entityId) : null,
      route: payload.route ?? null,
      mode: payload.mode ?? 'view',
    };
    const prev = await this.presenceStore.removeAsync(client.id);
    const prevRooms: string[] = [];
    if (prev?.context.projectId != null) prevRooms.push(`presence:project:${prev.context.projectId}`);
    if (prev?.context.entityType && prev?.context.entityId)
      prevRooms.push(`presence:entity:${prev.context.entityType}:${prev.context.entityId}`);
    for (const r of prevRooms) client.leave(r);
    await this.presenceStore.setAsync(client.id, { userId, name, initials, role, socketId: client.id, context });
    await client.join('presence:global');
    const roomsToJoin: string[] = [];
    if (context.projectId != null) {
      const ok = await this.validateRoomAccess(`presence:project:${context.projectId}`, userId);
      if (ok) roomsToJoin.push(`presence:project:${context.projectId}`);
    }
    if (context.entityType && context.entityId) {
      const ok = await this.validateRoomAccess(`presence:entity:${context.entityType}:${context.entityId}`, userId);
      if (ok) roomsToJoin.push(`presence:entity:${context.entityType}:${context.entityId}`);
    }
    for (const r of roomsToJoin) await client.join(r);
    await this.broadcastPresenceStateThrottled('global', undefined);
    if (context.projectId != null) await this.broadcastPresenceStateThrottled('project', String(context.projectId));
    if (context.entityType && context.entityId)
      await this.broadcastPresenceStateThrottled('entity', `${context.entityType}:${context.entityId}`);
  }

  @SubscribeMessage('bo:presence:leave')
  async handlePresenceLeave(client: any, _payload?: unknown): Promise<void> {
    const prev = await this.presenceStore.removeAsync(client.id);
    if (prev) {
      client.leave('presence:global');
      if (prev.context.projectId != null) client.leave(`presence:project:${prev.context.projectId}`);
      if (prev.context.entityType && prev.context.entityId)
        client.leave(`presence:entity:${prev.context.entityType}:${prev.context.entityId}`);
      await this.broadcastPresenceStateThrottled('global', undefined);
      if (prev.context.projectId != null) await this.broadcastPresenceStateThrottled('project', String(prev.context.projectId));
      if (prev.context.entityType && prev.context.entityId)
        await this.broadcastPresenceStateThrottled('entity', `${prev.context.entityType}:${prev.context.entityId}`);
    }
  }

  @SubscribeMessage('bo:presence:heartbeat')
  handlePresenceHeartbeat(client: any, _payload?: unknown): void {
    this.presenceStore.heartbeat(client.id);
  }

  private async broadcastPresenceStateThrottled(scope: 'global' | 'project' | 'entity', scopeId: string | undefined): Promise<void> {
    const key = scopeId != null ? `${scope}:${scopeId}` : scope;
    const now = Date.now();
    if ((this.presenceThrottle.get(key) ?? 0) + CollabGateway.PRESENCE_THROTTLE_MS > now) return;
    this.presenceThrottle.set(key, now);
    let users: PresenceRecord[];
    let room: string;
    if (scope === 'global') {
      users = await this.presenceStore.getGlobalAsync();
      room = 'presence:global';
    } else if (scope === 'project' && scopeId) {
      users = await this.presenceStore.getByProjectAsync(parseInt(scopeId, 10));
      room = `presence:project:${scopeId}`;
    } else if (scope === 'entity' && scopeId) {
      const [entityType, entityId] = scopeId.includes(':') ? scopeId.split(':') : [scopeId, ''];
      users = entityType && entityId ? await this.presenceStore.getByEntityAsync(entityType, entityId) : [];
      room = entityType && entityId ? `presence:entity:${entityType}:${entityId}` : '';
    } else {
      return;
    }
    const payload = {
      scope: scope === 'global' ? 'global' : scope === 'project' ? 'project' : 'entity',
      scopeId: scope === 'global' ? undefined : scopeId,
      users: users.map((u) => ({
        userId: u.userId,
        name: u.name,
        initials: u.initials,
        role: u.role,
        module: u.context.module,
        projectId: u.context.projectId,
        entityType: u.context.entityType,
        entityId: u.context.entityId,
        mode: u.context.mode,
        lastSeenAt: new Date(u.lastSeenAt).toISOString(),
      })),
    };
    if (room) this.server.to(room).emit('bo:presence:state', payload);
  }

  // --- STEP 4: Soft edit state (bo:edit:begin / end / state) ---

  @SubscribeMessage('bo:edit:begin')
  async handleEditBegin(
    client: any,
    payload: { entityType: string; entityId: string; projectId?: number },
  ): Promise<void> {
    const userId = (client as any).userId ?? null;
    if (userId == null || !payload?.entityType || !payload?.entityId) return;
    const user = await this.userRepo.findOne({ where: { id: userId }, select: ['fullName'] });
    const name = user?.fullName ?? `User ${userId}`;
    const initials = (name ?? 'U').trim().slice(0, 2).toUpperCase() || 'U';
    await this.editingStore.beginAsync(payload.entityType, payload.entityId, userId, name, initials);
    const room = `presence:entity:${payload.entityType}:${payload.entityId}`;
    const state = await this.editingStore.getStateAsync(payload.entityType, payload.entityId);
    this.server.to(room).emit('bo:edit:state', { entityType: payload.entityType, entityId: payload.entityId, editors: state });
  }

  @SubscribeMessage('bo:edit:end')
  async handleEditEnd(client: any, payload: { entityType: string; entityId: string }): Promise<void> {
    const userId = (client as any).userId ?? null;
    if (userId == null || !payload?.entityType || !payload?.entityId) return;
    await this.editingStore.endAsync(payload.entityType, payload.entityId, userId);
    const room = `presence:entity:${payload.entityType}:${payload.entityId}`;
    const state = await this.editingStore.getStateAsync(payload.entityType, payload.entityId);
    this.server.to(room).emit('bo:edit:state', { entityType: payload.entityType, entityId: payload.entityId, editors: state });
  }

  private async validateRoomAccess(room: string, userId: number): Promise<boolean> {
    if (room === 'global') return true;
    if (room === 'presence:global') return true;
    if (room.startsWith('user:')) {
      const id = parseInt(room.slice(5), 10);
      return Number.isFinite(id) && id === userId;
    }
    if (room.startsWith('project:') || room.startsWith('presence:project:')) {
      const prefix = room.startsWith('presence:project:') ? 'presence:project:' : 'project:';
      const id = parseInt(room.slice(prefix.length), 10);
      if (!Number.isFinite(id)) return false;
      const project = await this.projectRepo.findOne({ where: { id, userId } });
      return !!project;
    }
    if (room.startsWith('presence:entity:')) {
      const rest = room.slice('presence:entity:'.length);
      const secondColon = rest.indexOf(':');
      if (secondColon <= 0) return false;
      const entityType = rest.slice(0, secondColon);
      const entityId = rest.slice(secondColon + 1);
      const projectId = await this.getProjectIdForEntity(entityType, entityId);
      if (projectId == null) return false;
      const project = await this.projectRepo.findOne({ where: { id: projectId, userId } });
      return !!project;
    }
    if (room === 'module:execution' || room === 'module:finance') return true;
    if (room.startsWith('module:')) return true;
    return false;
  }

  /** Resolve entity to projectId for access check. */
  private async getProjectIdForEntity(entityType: string, entityId: string): Promise<number | null> {
    const id = parseInt(entityId, 10);
    if (!Number.isFinite(id)) return null;
    switch (entityType) {
      case 'act':
        const act = await this.actRepo.findOne({ where: { id }, select: ['projectId'] });
        return act?.projectId ?? null;
      case 'invoice':
        const inv = await this.invoiceRepo.findOne({ where: { id }, select: ['projectId'] });
        return inv?.projectId ?? null;
      case 'order':
      case 'supply_order':
        const order = await this.orderRepo.findOne({ where: { id }, select: ['projectId'] });
        return order?.projectId ?? null;
      default:
        return null;
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
    this.logger.log(`[WS] join docId=${docId} room=${room} socketId=${client.id} userId=${userId ?? 'anonymous'}`);

    const state = await this.collabService.getDocState(docId);
    client.emit('collab', {
      type: 'DOC_STATE',
      docId,
      snapshot: state?.snapshot ?? null,
      version: state?.version ?? 0,
      locks: this.collabService.getLocks(docId),
      presence: [], // не показувати онлайн інших користувачів
    });
    // this.broadcastPresence(docId); — вимкнено
  }

  private async handleApplyOp(
    client: any,
    payload: Extract<CollabPayload, { type: 'APPLY_OP' }>,
    userId: number | null,
  ) {
    const room = `sheet:${payload.docId}`;
    const docState = await this.collabService.getDocState(payload.docId);
    const currentVersion = docState?.version ?? -1;
    this.logger.log(
      `[WS] op_in docId=${payload.docId} room=${room} socketId=${client.id} userId=${userId ?? 'anon'} opType=${payload.op?.type} clientOpId=${payload.clientOpId?.slice(0, 8)}`,
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
        let recipientsCount = 0;
        try {
          const roomSockets = await this.server.in(room).fetchSockets();
          recipientsCount = roomSockets?.length ?? 0;
        } catch {
          /* ignore */
        }
        const opPayload = {
          type: 'OP_APPLIED' as const,
          docId: payload.docId,
          version: result.version,
          op: payload.op,
          opId: result.opId,
          clientOpId: payload.clientOpId,
        };
        this.logger.log(
          `[WS] op_out broadcast room=${room} fromSocket=${client.id} (exclude sender) opType=${payload.op?.type} clientOpId=${payload.clientOpId?.slice(0, 8)} recipientsInRoom=${recipientsCount}`,
        );
        client.emit('collab', opPayload);
        client.to(room).emit('collab', opPayload);
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
    // Не показувати онлайн інших користувачів — завжди пустий масив
    this.server.to(`sheet:${docId}`).emit('collab', {
      type: 'PRESENCE_BROADCAST',
      docId,
      presence: [],
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
