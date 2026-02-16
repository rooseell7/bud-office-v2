import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      clientOpId?: string | null;
    }
  }
}

/**
 * Reads x-client-op-id header (UUID) for idempotency and audit/outbox.
 * Set by frontend on mutations; store in audit_log.meta and outbox_events.clientOpId.
 */
@Injectable()
export class ClientOpIdMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const raw =
      (req.headers['x-client-op-id'] as string) ??
      (req.body && typeof req.body === 'object' && (req.body as any).clientOpId);
    req.clientOpId =
      typeof raw === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw.trim())
        ? raw.trim()
        : undefined;
    next();
  }
}
