import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { OutboxService } from './outbox.service';

const RETENTION_DAYS = 7;
const RETENTION_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class OutboxHygieneService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxHygieneService.name);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly outboxService: OutboxService) {}

  onModuleInit(): void {
    this.intervalId = setInterval(() => this.runRetention(), RETENTION_INTERVAL_MS);
    this.logger.log(`Outbox retention job started (every ${RETENTION_INTERVAL_MS / 60000}min, keep ${RETENTION_DAYS} days)`);
  }

  onModuleDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async runRetention(): Promise<void> {
    try {
      const deleted = await this.outboxService.deletePublishedOlderThan(RETENTION_DAYS);
      if (deleted > 0) {
        this.logger.log(`Outbox retention: deleted ${deleted} published events older than ${RETENTION_DAYS} days`);
      }
    } catch (e) {
      this.logger.warn(`Outbox retention failed: ${(e as Error).message}`);
    }
  }
}
