import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  findAll(): Promise<Project[]> {
    return this.projectRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<Project> {
    const project = await this.projectRepo.findOne({ where: { id } });
    if (!project) throw new NotFoundException('Проєкт не знайдено');
    return project;
  }

  async create(dto: CreateProjectDto): Promise<Project> {
    const project = new Project();

    project.name = dto.name;
    project.type = dto.type ?? '';
    project.address = dto.address ?? '';
    project.status = dto.status ?? 'planned';
    project.clientId = dto.clientId ?? null;
    project.foremanId = dto.foremanId ?? null;
    project.estimatorId = dto.estimatorId ?? null;
    project.supplyManagerId = dto.supplyManagerId ?? null;

    return this.projectRepo.save(project);
  }

  async update(id: number, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(id);

    if (dto.name !== undefined) project.name = dto.name;
    if (dto.type !== undefined) project.type = dto.type;
    if (dto.address !== undefined) project.address = dto.address;
    if (dto.status !== undefined) project.status = dto.status;
    if (dto.clientId !== undefined) project.clientId = dto.clientId;
    if (dto.foremanId !== undefined) project.foremanId = dto.foremanId;
    if (dto.estimatorId !== undefined) project.estimatorId = dto.estimatorId;
    if (dto.supplyManagerId !== undefined) {
      project.supplyManagerId = dto.supplyManagerId;
    }

    return this.projectRepo.save(project);
  }

  async remove(id: number): Promise<void> {
    const project = await this.findOne(id);
    await this.projectRepo.remove(project);
  }
}
