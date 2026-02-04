import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEvent } from './entities/audit-event.entity';

export type AuditEntityType =
  | 'supply_request'
  | 'supply_order'
  | 'supply_receipt'
  | 'payable'
  | 'payment';

export type AuditAction =
  | 'create'
  | 'update'
  | 'status_change'
  | 'create_from'
  | 'add_item'
  | 'remove_item'
  | 'add_attachment'
  | 'add_payment';

@Injectable()
export class SupplyAuditService {
  constructor(
    @InjectRepository(AuditEvent)
    private readonly repo: Repository<AuditEvent>,
  ) {}

  async log(params: {
    entityType: AuditEntityType;
    entityId: number;
    action: AuditAction;
    message: string;
    meta?: Record<string, unknown>;
    actorId: number;
  }): Promise<void> {
    const e = this.repo.create({
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      message: params.message,
      meta: params.meta ?? undefined,
      actorId: params.actorId,
    });
    await this.repo.save(e);
  }

  async getByEntity(
    entityType: string,
    entityId: number,
    limit = 100,
  ): Promise<AuditEvent[]> {
    return this.repo.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getByQuery(params: {
    entityType?: string;
    entityId?: number;
    limit?: number;
  }): Promise<AuditEvent[]> {
    const qb = this.repo.createQueryBuilder('a');
    if (params.entityType) qb.andWhere('a.entityType = :entityType', { entityType: params.entityType });
    if (params.entityId != null) qb.andWhere('a.entityId = :entityId', { entityId: params.entityId });
    qb.orderBy('a.createdAt', 'DESC');
    qb.take(params.limit ?? 50);
    return qb.getMany();
  }
}
