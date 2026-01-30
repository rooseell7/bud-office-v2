import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from './material.entity';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';

@Injectable()
export class MaterialsService {
  constructor(@InjectRepository(Material) private readonly repo: Repository<Material>) {}

  findAll() {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number) {
    const m = await this.repo.findOne({ where: { id } });
    if (!m) throw new NotFoundException('Material not found');
    return m;
  }

  async create(dto: CreateMaterialDto) {
    const m = this.repo.create({
      name: dto.name,
      unit: dto.unit ?? null,
      category: dto.category ?? null,
      isActive: dto.isActive ?? true,
    });
    return this.repo.save(m);
  }

  async update(id: number, dto: UpdateMaterialDto) {
    const m = await this.findOne(id);
    Object.assign(m, dto);
    return this.repo.save(m);
  }

  async remove(id: number) {
    const m = await this.findOne(id);
    await this.repo.remove(m);
  }
}
