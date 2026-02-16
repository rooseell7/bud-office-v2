import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Project } from '../projects/project.entity';
import { AuditService } from '../audit/audit.service';
import { RealtimeEmitterService } from '../realtime/realtime-emitter.service';
import { CreateObjectDto } from './dto/create-object.dto';
import { UpdateObjectDto } from './dto/update-object.dto';

@Injectable()
export class ObjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly repo: Repository<Project>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly realtimeEmitter: RealtimeEmitterService,
  ) {}

  private toInt(value: unknown, field: string): number {
    const n =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value)
          : NaN;

    if (!Number.isInteger(n) || n <= 0) {
      throw new BadRequestException(`${field} має бути числом > 0`);
    }
    return n;
  }

  async create(
    userIdRaw: unknown,
    dto: CreateObjectDto,
    meta?: { clientOpId?: string | null },
  ): Promise<Project> {
    const userId = this.toInt(userIdRaw, 'userId');

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const obj = this.repo.create({
        name: dto.name,
        address: dto.address ?? null,
        type: dto.type ?? null,
        status: dto.status ?? 'planned',
        userId,
        clientId: dto.clientId ?? null,
        foremanId: dto.foremanId ?? null,
        estimatorId: dto.estimatorId ?? null,
        supplyManagerId: dto.supplyManagerId ?? null,
      });
      const saved = await qr.manager.save(Project, obj);

      await this.auditService.logTx(qr.manager, {
        actorUserId: userId,
        action: 'object.create',
        entityType: 'object',
        entityId: String(saved.id),
        projectId: saved.id,
        after: { name: saved.name, status: saved.status },
        meta: meta?.clientOpId ? { clientOpId: meta.clientOpId } : null,
      });
      await this.realtimeEmitter.emitEntityChangedTx(qr.manager, {
        eventType: 'entity.created',
        entityType: 'object',
        entityId: String(saved.id),
        projectId: saved.id, // Auto-determines scopeType='project', scopeId=saved.id
        actorUserId: userId,
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

  async findAll(userIdRaw: unknown, clientIdRaw?: unknown): Promise<Project[]> {
    const userId = this.toInt(userIdRaw, 'userId');

    const where: any = { userId };

    if (clientIdRaw !== undefined && clientIdRaw !== null && String(clientIdRaw).trim() !== '') {
      const clientId = this.toInt(clientIdRaw, 'clientId');
      where.clientId = clientId;
    }

    return await this.repo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(idRaw: unknown, userIdRaw: unknown): Promise<Project> {
    const id = this.toInt(idRaw, 'id');
    const userId = this.toInt(userIdRaw, 'userId');

    const obj = await this.repo.findOne({ where: { id, userId } });
    if (!obj) throw new NotFoundException('Обʼєкт не знайдено');
    return obj;
  }

  async update(
    idRaw: unknown,
    userIdRaw: unknown,
    dto: UpdateObjectDto,
    meta?: { clientOpId?: string | null },
  ): Promise<Project> {
    const obj = await this.findOne(idRaw, userIdRaw);
    const userId = this.toInt(userIdRaw, 'userId');

    if (dto.name !== undefined) obj.name = dto.name;
    if (dto.address !== undefined) obj.address = dto.address ?? null;
    if (dto.type !== undefined) obj.type = dto.type ?? null;
    if (dto.status !== undefined) obj.status = dto.status ?? obj.status;
    if (dto.clientId !== undefined) obj.clientId = dto.clientId ?? null;
    if (dto.foremanId !== undefined) obj.foremanId = dto.foremanId ?? null;
    if (dto.estimatorId !== undefined) obj.estimatorId = dto.estimatorId ?? null;
    if (dto.supplyManagerId !== undefined) obj.supplyManagerId = dto.supplyManagerId ?? null;

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const saved = await qr.manager.save(Project, obj);
      await this.auditService.logTx(qr.manager, {
        actorUserId: userId,
        action: dto.status !== undefined ? 'object.status.update' : 'object.update',
        entityType: 'object',
        entityId: String(saved.id),
        projectId: saved.id,
        after: { name: saved.name, status: saved.status },
        meta: meta?.clientOpId ? { clientOpId: meta.clientOpId } : null,
      });
      await this.realtimeEmitter.emitEntityChangedTx(qr.manager, {
        eventType: 'entity.changed',
        entityType: 'object',
        entityId: String(saved.id),
        projectId: saved.id, // Auto-determines scopeType='project', scopeId=saved.id
        actorUserId: userId,
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
    idRaw: unknown,
    userIdRaw: unknown,
    meta?: { clientOpId?: string | null },
  ): Promise<void> {
    const obj = await this.findOne(idRaw, userIdRaw);
    const userId = this.toInt(userIdRaw, 'userId');
    const projectId = obj.id;

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      await qr.manager.remove(Project, obj);
      await this.auditService.logTx(qr.manager, {
        actorUserId: userId,
        action: 'object.delete',
        entityType: 'object',
        entityId: String(projectId),
        projectId,
        meta: meta?.clientOpId ? { clientOpId: meta.clientOpId } : null,
      });
      await this.realtimeEmitter.emitEntityChangedTx(qr.manager, {
        eventType: 'entity.deleted',
        entityType: 'object',
        entityId: String(projectId),
        projectId, // Auto-determines scopeType='project', scopeId=projectId
        actorUserId: userId,
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
