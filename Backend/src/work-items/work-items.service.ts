import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkItem } from './work-item.entity';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';

@Injectable()
export class WorkItemsService {
  constructor(
    @InjectRepository(WorkItem)
    private readonly workItemRepo: Repository<WorkItem>,
  ) {}

  findAll(q?: string): Promise<WorkItem[]> {
    const qb = this.workItemRepo.createQueryBuilder('w').where('w.isActive = :active', { active: true });
    if (q?.trim()) {
      qb.andWhere('w.name ILIKE :q', { q: `%${q.trim()}%` });
    }
    return qb.orderBy('w.name', 'ASC').getMany();
  }

  async findOne(id: number): Promise<WorkItem> {
    const item = await this.workItemRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Роботу не знайдено');
    return item;
  }

  async create(dto: CreateWorkItemDto): Promise<WorkItem> {
    const item = new WorkItem();

    item.name = dto.name;
    item.unit = dto.unit ?? '';
    item.category = dto.category ?? '';
    item.defaultRateMaster = dto.defaultRateMaster ?? '0';
    item.defaultRateClient = dto.defaultRateClient ?? '0';
    item.isActive = dto.isActive ?? true;

    return this.workItemRepo.save(item);
  }

  async update(id: number, dto: UpdateWorkItemDto): Promise<WorkItem> {
    const item = await this.findOne(id);

    if (dto.name !== undefined) item.name = dto.name;
    if (dto.unit !== undefined) item.unit = dto.unit;
    if (dto.category !== undefined) item.category = dto.category;
    if (dto.defaultRateMaster !== undefined) {
      item.defaultRateMaster = dto.defaultRateMaster;
    }
    if (dto.defaultRateClient !== undefined) {
      item.defaultRateClient = dto.defaultRateClient;
    }
    if (dto.isActive !== undefined) item.isActive = dto.isActive;

    return this.workItemRepo.save(item);
  }

  async remove(id: number): Promise<void> {
    const item = await this.findOne(id);
    await this.workItemRepo.remove(item);
  }
}
