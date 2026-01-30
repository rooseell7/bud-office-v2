import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Project } from '../projects/project.entity';
import { CreateObjectDto } from './dto/create-object.dto';
import { UpdateObjectDto } from './dto/update-object.dto';

@Injectable()
export class ObjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly repo: Repository<Project>,
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

  async create(userIdRaw: unknown, dto: CreateObjectDto): Promise<Project> {
    const userId = this.toInt(userIdRaw, 'userId');

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

    return await this.repo.save(obj);
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

  async update(idRaw: unknown, userIdRaw: unknown, dto: UpdateObjectDto): Promise<Project> {
    const obj = await this.findOne(idRaw, userIdRaw);

    if (dto.name !== undefined) obj.name = dto.name;
    if (dto.address !== undefined) obj.address = dto.address ?? null;
    if (dto.type !== undefined) obj.type = dto.type ?? null;
    if (dto.status !== undefined) obj.status = dto.status ?? obj.status;

    if (dto.clientId !== undefined) obj.clientId = dto.clientId ?? null;
    if (dto.foremanId !== undefined) obj.foremanId = dto.foremanId ?? null;
    if (dto.estimatorId !== undefined) obj.estimatorId = dto.estimatorId ?? null;
    if (dto.supplyManagerId !== undefined) obj.supplyManagerId = dto.supplyManagerId ?? null;

    return await this.repo.save(obj);
  }

  async remove(idRaw: unknown, userIdRaw: unknown): Promise<void> {
    const obj = await this.findOne(idRaw, userIdRaw);
    await this.repo.remove(obj);
  }
}
