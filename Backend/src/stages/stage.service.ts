import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';

import { Stage } from './stage.entity';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { Project } from '../projects/project.entity';

@Injectable()
export class StageService {
  constructor(
    @InjectRepository(Stage)
    private readonly stageRepo: Repository<Stage>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  private toInt(value: unknown, field: string): number {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
      throw new BadRequestException(`${field} має бути цілим числом > 0`);
    }
    return n;
  }

  private async assertProjectOwnedByUser(projectId: number, userId: number) {
    const proj = await this.projectRepo.findOne({ where: { id: projectId, userId } as any });
    if (!proj) {
      throw new BadRequestException('Некоректний objectId або обʼєкт не належить користувачу');
    }
  }

  async create(userIdRaw: unknown, dto: CreateStageDto): Promise<Stage> {
    const userId = this.toInt(userIdRaw, 'userId');
    const objectId = this.toInt(dto.objectId, 'objectId');

    await this.assertProjectOwnedByUser(objectId, userId);

    const payload: DeepPartial<Stage> = {
      name: dto.name,
      description: dto.description ?? null,
      status: dto.status as any,
      order: dto.order ?? 0,
      objectId,
      userId,
    };

    const stage = this.stageRepo.create(payload);
    return this.stageRepo.save(stage);
  }

  async findAll(userIdRaw: unknown, objectIdRaw?: unknown): Promise<Stage[]> {
    const userId = this.toInt(userIdRaw, 'userId');

    let objectId: number | undefined;
    if (objectIdRaw !== undefined && objectIdRaw !== null) {
      objectId = this.toInt(objectIdRaw, 'objectId');
      await this.assertProjectOwnedByUser(objectId, userId);
    }

    return this.stageRepo.find({
      where: {
        userId,
        ...(objectId !== undefined ? { objectId } : {}),
      } as any,
      order: { order: 'ASC', createdAt: 'ASC' } as any,
    });
  }

  async findOne(idRaw: unknown, userIdRaw: unknown): Promise<Stage> {
    const id = this.toInt(idRaw, 'id');
    const userId = this.toInt(userIdRaw, 'userId');

    const stage = await this.stageRepo.findOne({ where: { id, userId } as any });
    if (!stage) throw new NotFoundException('Етап не знайдено');

    return stage;
  }

  async update(idRaw: unknown, userIdRaw: unknown, dto: UpdateStageDto): Promise<Stage> {
    const stage = await this.findOne(idRaw, userIdRaw);
    const userId = this.toInt(userIdRaw, 'userId');

    // ✅ ФІКС: без порівняння з '' — objectId у нас number
    if (dto.objectId !== undefined && dto.objectId !== null) {
      const nextObjectId = this.toInt(dto.objectId, 'objectId');
      if (nextObjectId !== stage.objectId) {
        await this.assertProjectOwnedByUser(nextObjectId, userId);
        stage.objectId = nextObjectId;
      }
    }

    if (dto.name !== undefined) stage.name = dto.name;
    if (dto.description !== undefined) stage.description = dto.description ?? null;
    if (dto.status !== undefined) stage.status = dto.status as any;
    if (dto.order !== undefined) stage.order = dto.order;

    return this.stageRepo.save(stage);
  }

  async remove(idRaw: unknown, userIdRaw: unknown): Promise<void> {
    const stage = await this.findOne(idRaw, userIdRaw);
    await this.stageRepo.remove(stage);
  }
}
