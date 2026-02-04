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

  setServer(server: Server): void {
    this.server = server;
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
