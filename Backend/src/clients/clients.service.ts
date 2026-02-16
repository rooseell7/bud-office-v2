import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Client } from './client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { AuditService } from '../audit/audit.service';
import { RealtimeEmitterService } from '../realtime/realtime-emitter.service';

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly realtimeEmitter: RealtimeEmitterService,
  ) {}

  private toUserId(userId: number | string): number {
    const n = Number(userId);
    return Number.isFinite(n) ? n : 0;
  }

  async create(
    userId: number | string,
    dto: CreateClientDto,
    meta?: { clientOpId?: string | null },
  ): Promise<Client> {
    const userIdNum = this.toUserId(userId);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const client = this.clientRepo.create({ ...dto, userId: userIdNum });
      const saved = await qr.manager.save(Client, client);

      await this.auditService.logTx(qr.manager, {
        actorUserId: userIdNum,
        action: 'client.create',
        entityType: 'client',
        entityId: saved.id,
        after: { name: saved.name },
        meta: meta?.clientOpId ? { clientOpId: meta.clientOpId } : null,
      });
      await this.realtimeEmitter.emitEntityChangedTx(qr.manager, {
        eventType: 'entity.created',
        entityType: 'client',
        entityId: saved.id,
        // No projectId → auto scopeType='global'
        actorUserId: userIdNum,
        clientOpId: meta?.clientOpId ?? null,
      });

      await qr.commitTransaction();
      return saved;
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  /**
   * Важливо:
   * У БД може не бути колонки "note" (історично/міграції не прогнані).
   * Якщо entity містить поле note, TypeORM за замовчуванням включає його в SELECT і падає.
   * Тому тут використовуємо select, щоб НЕ читати "note" та не ловити 500.
   */
  async findAll(userId: number | string, search?: string): Promise<Client[]> {
    const userIdNum = this.toUserId(userId);

    if (search) {
      const qb = this.clientRepo
        .createQueryBuilder('c')
        .where('c.userId = :userId', { userId: userIdNum })
        .andWhere('(c.name ILIKE :q OR c.phone ILIKE :q OR c.email ILIKE :q)', { q: `%${search}%` })
        .orderBy('c.createdAt', 'DESC')
        .select(['c.id', 'c.name', 'c.phone', 'c.email', 'c.userId', 'c.objectId', 'c.createdAt', 'c.updatedAt']);
      return qb.getMany();
    }

    return this.clientRepo.find({
      where: { userId: userIdNum },
      order: { createdAt: 'DESC' },
      select: [
        'id',
        'name',
        'phone',
        'email',
        'userId',
        'objectId',
        'createdAt',
        'updatedAt',
      ] as (keyof Client)[],
    });
  }

  async findOne(id: string, userId: number | string): Promise<Client> {
    const userIdNum = this.toUserId(userId);

    // Тут теж краще захистити від відсутньої колонки note
    const client = await this.clientRepo.findOne({
      where: { id, userId: userIdNum },
      select: [
        'id',
        'name',
        'phone',
        'email',
        'userId',
        'objectId',
        'createdAt',
        'updatedAt',
      ] as (keyof Client)[],
    });

    if (!client) {
      throw new NotFoundException('Клієнта не знайдено');
    }

    return client;
  }

  async update(
    id: string,
    userId: number | string,
    dto: UpdateClientDto,
    meta?: { clientOpId?: string | null },
  ): Promise<Client> {
    const userIdNum = this.toUserId(userId);
    const client = await this.findOne(id, userIdNum);
    Object.assign(client, dto);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const saved = await qr.manager.save(Client, client);
      await this.auditService.logTx(qr.manager, {
        actorUserId: userIdNum,
        action: 'client.update',
        entityType: 'client',
        entityId: saved.id,
        after: { name: saved.name },
        meta: meta?.clientOpId ? { clientOpId: meta.clientOpId } : null,
      });
      await this.realtimeEmitter.emitEntityChangedTx(qr.manager, {
        eventType: 'entity.changed',
        entityType: 'client',
        entityId: saved.id,
        // No projectId → auto scopeType='global'
        actorUserId: userIdNum,
        clientOpId: meta?.clientOpId ?? null,
      });
      await qr.commitTransaction();
      return saved;
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  async remove(
    id: string,
    userId: number | string,
    meta?: { clientOpId?: string | null },
  ): Promise<void> {
    const userIdNum = this.toUserId(userId);
    const client = await this.findOne(id, userIdNum);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      await qr.manager.remove(Client, client);
      await this.auditService.logTx(qr.manager, {
        actorUserId: userIdNum,
        action: 'client.delete',
        entityType: 'client',
        entityId: id,
        meta: meta?.clientOpId ? { clientOpId: meta.clientOpId } : null,
      });
      await this.realtimeEmitter.emitEntityChangedTx(qr.manager, {
        eventType: 'entity.deleted',
        entityType: 'client',
        entityId: id,
        // No projectId → auto scopeType='global'
        actorUserId: userIdNum,
        clientOpId: meta?.clientOpId ?? null,
      });
      await qr.commitTransaction();
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }
}
