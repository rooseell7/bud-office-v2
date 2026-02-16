import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import type { DomainEvent } from './domain-event.types';
import { ActivityService } from '../activity/activity.service';

const EVENT_NAME = 'domain:event';

@Injectable()
export class RealtimeService {
  private server: Server | null = null;
  private readonly logger = new Logger(RealtimeService.name);

  constructor(private readonly activityService: ActivityService) {}

  private _publisherRunning = true;

  setServer(server: Server): void {
    this.server = server;
  }

  getServer(): Server | null {
    return this.server;
  }

  setPublisherRunning(running: boolean): void {
    this._publisherRunning = running;
  }

  getPublisherRunning(): boolean {
    return this._publisherRunning;
  }

  /** Approximate count of connected WS clients (for health). */
  getWsClientsCount(): number {
    if (!this.server?.sockets?.sockets) return 0;
    return this.server.sockets.sockets.size;
  }

  /** Approximate count of rooms (for health). */
  getWsRoomsCount(): number {
    if (!this.server?.sockets?.adapter?.rooms) return 0;
    return this.server.sockets.adapter.rooms.size;
  }

  /**
   * Log event to activity_log and broadcast to given rooms. Call after successful DB commit.
   */
  broadcast(event: DomainEvent, rooms: string[]): void {
    this.broadcastToRooms(event, rooms);
  }

  broadcastToRooms(event: DomainEvent, rooms: string[]): void {
    this.activityService.log(event).catch((err) => this.logger.warn(`[realtime] activity log failed: ${err?.message}`));
    if (!this.server) return;
    const roomSet = new Set(rooms.filter(Boolean));
    for (const room of roomSet) {
      this.server.to(room).emit(EVENT_NAME, event);
    }
    if (roomSet.size > 0) {
      this.logger.log(
        `[realtime] domain event eventId=${event.eventId} entity=${event.entity} action=${event.action} actorId=${event.actorId} rooms=${[...roomSet].join(',')} ts=${event.ts}`,
      );
    }
  }

  broadcastModule(event: DomainEvent, moduleRoom: 'execution' | 'finance'): void {
    this.broadcastToRooms(event, [`module:${moduleRoom}`]);
  }

  broadcastProject(event: DomainEvent, projectId: number): void {
    this.broadcastToRooms(event, [`project:${projectId}`]);
  }
}
