import { Injectable } from '@nestjs/common';

const TTL_MS = 90_000; // 90 sec

@Injectable()
export class PresenceService {
  private readonly byUser = new Map<number, { lastSeenAt: number }>();

  seen(userId: number): void {
    this.byUser.set(userId, { lastSeenAt: Date.now() });
  }

  getOnlineUserIds(): number[] {
    const now = Date.now();
    const result: number[] = [];
    for (const [userId, data] of this.byUser) {
      if (now - data.lastSeenAt < TTL_MS) {
        result.push(userId);
      } else {
        this.byUser.delete(userId);
      }
    }
    return result;
  }
}
