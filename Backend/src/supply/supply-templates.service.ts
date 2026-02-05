import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupplyRequestTemplate } from './entities/supply-request-template.entity';
import { SupplyRequestTemplateItem } from './entities/supply-request-template-item.entity';
import { SupplyRequest } from './entities/supply-request.entity';
import { SupplyRequestItem } from './entities/supply-request-item.entity';
import { SupplyAuditService } from './audit.service';
import {
  CreateSupplyRequestTemplateDto,
  UpdateSupplyRequestTemplateDto,
  CreateRequestFromTemplateDto,
} from './dto/supply-template.dto';

@Injectable()
export class SupplyTemplatesService {
  constructor(
    @InjectRepository(SupplyRequestTemplate) private readonly templateRepo: Repository<SupplyRequestTemplate>,
    @InjectRepository(SupplyRequestTemplateItem) private readonly itemRepo: Repository<SupplyRequestTemplateItem>,
    @InjectRepository(SupplyRequest) private readonly requestRepo: Repository<SupplyRequest>,
    @InjectRepository(SupplyRequestItem) private readonly requestItemRepo: Repository<SupplyRequestItem>,
    private readonly audit: SupplyAuditService,
  ) {}

  async findAll(userId: number, projectId?: number) {
    const qb = this.templateRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.items', 'items')
      .where('t.isActive = :active', { active: true })
      .orderBy('t.name', 'ASC')
      .addOrderBy('items.id', 'ASC');
    if (projectId != null) {
      qb.andWhere('(t.projectId IS NULL OR t.projectId = :projectId)', { projectId });
    }
    return qb.getMany();
  }

  async findOne(userId: number, id: number) {
    const t = await this.templateRepo.findOne({
      where: { id },
      relations: ['items'],
      order: { items: { id: 'ASC' } },
    });
    if (!t) throw new NotFoundException('Template not found');
    return t;
  }

  async create(userId: number, dto: CreateSupplyRequestTemplateDto) {
    const t = this.templateRepo.create({
      name: dto.name.trim(),
      projectId: dto.projectId ?? null,
      createdById: userId,
      isActive: true,
    });
    const saved = await this.templateRepo.save(t);
    if (dto.items?.length) {
      for (const row of dto.items) {
        const hasMaterial = row.materialId != null;
        const hasName = row.customName != null && String(row.customName).trim() !== '';
        if (!hasMaterial && !hasName) continue;
        await this.itemRepo.save(
          this.itemRepo.create({
            templateId: saved.id,
            materialId: row.materialId ?? null,
            customName: row.customName != null && String(row.customName).trim() !== '' ? String(row.customName).trim() : null,
            unit: row.unit,
            qtyDefault: String(row.qtyDefault ?? 0),
            note: row.note ?? null,
            priority: row.priority ?? 'normal',
          }),
        );
      }
    }
    await this.audit.log({
      entityType: 'supply_request_template',
      entityId: saved.id,
      action: 'create',
      message: `Шаблон створено: "${saved.name}"`,
      meta: { templateId: saved.id },
      actorId: userId,
    });
    return this.findOne(userId, saved.id);
  }

  async update(userId: number, id: number, dto: UpdateSupplyRequestTemplateDto) {
    const t = await this.templateRepo.findOne({ where: { id }, relations: ['items'] });
    if (!t) throw new NotFoundException('Template not found');
    if (dto.name !== undefined) t.name = dto.name.trim();
    if (dto.isActive !== undefined) t.isActive = dto.isActive;
    await this.templateRepo.save(t);
    if (dto.items !== undefined) {
      await this.itemRepo.delete({ templateId: id });
      for (const row of dto.items) {
        const hasMaterial = row.materialId != null;
        const hasName = row.customName != null && String(row.customName).trim() !== '';
        if (!hasMaterial && !hasName) continue;
        await this.itemRepo.save(
          this.itemRepo.create({
            templateId: id,
            materialId: row.materialId ?? null,
            customName: row.customName != null && String(row.customName).trim() !== '' ? String(row.customName).trim() : null,
            unit: row.unit,
            qtyDefault: String(row.qtyDefault ?? 0),
            note: row.note ?? null,
            priority: row.priority ?? 'normal',
          }),
        );
      }
    }
    await this.audit.log({
      entityType: 'supply_request_template',
      entityId: id,
      action: 'update',
      message: `Шаблон оновлено: "${t.name}"`,
      actorId: userId,
    });
    return this.findOne(userId, id);
  }

  async createRequestFromTemplate(userId: number, templateId: number, dto: CreateRequestFromTemplateDto) {
    const t = await this.templateRepo.findOne({ where: { id: templateId }, relations: ['items'] });
    if (!t) throw new NotFoundException('Template not found');
    if (!t.isActive) throw new BadRequestException('Шаблон неактивний');
    const items = (t.items ?? []).filter((i) => i.materialId != null || (i.customName != null && i.customName.trim() !== ''));
    if (items.length === 0) throw new BadRequestException('У шаблоні немає позицій');
    const r = this.requestRepo.create({
      projectId: dto.projectId,
      status: 'draft',
      neededAt: dto.neededAt ?? null,
      comment: dto.comment ?? null,
      createdById: userId,
    });
    const saved = await this.requestRepo.save(r);
    for (const item of items) {
      await this.requestItemRepo.save(
        this.requestItemRepo.create({
          requestId: saved.id,
          materialId: item.materialId,
          customName: item.customName,
          unit: item.unit,
          qty: item.qtyDefault,
          note: item.note,
          priority: item.priority ?? 'normal',
        }),
      );
    }
    const templateName = t.name;
    await this.audit.log({
      entityType: 'supply_request',
      entityId: saved.id,
      action: 'create_from',
      message: `Створено заявку із шаблону "${templateName}"`,
      meta: { templateId: t.id, templateName },
      actorId: userId,
    });
    return { requestId: saved.id };
  }
}
