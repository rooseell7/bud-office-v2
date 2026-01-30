import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deal } from './deal.entity';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';

@Injectable()
export class DealsService {
  constructor(
    @InjectRepository(Deal)
    private readonly dealRepo: Repository<Deal>,
  ) {}

  findAll(): Promise<Deal[]> {
    return this.dealRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<Deal> {
    const deal = await this.dealRepo.findOne({ where: { id } });
    if (!deal) throw new NotFoundException('Угоду не знайдено');
    return deal;
  }

  async create(dto: CreateDealDto): Promise<Deal> {
    const deal = this.dealRepo.create({
      title: dto.title,
      amount: dto.amount ?? '0',
      stage: dto.stage ?? 'lead',
      status: dto.status ?? 'open',
      clientId: dto.clientId ?? null,
      projectId: dto.projectId ?? null,
    });
    return this.dealRepo.save(deal);
  }

  async update(id: number, dto: UpdateDealDto): Promise<Deal> {
    const deal = await this.findOne(id);
    Object.assign(deal, dto);
    return this.dealRepo.save(deal);
  }

  async remove(id: number): Promise<void> {
    const deal = await this.findOne(id);
    await this.dealRepo.remove(deal);
  }
}
