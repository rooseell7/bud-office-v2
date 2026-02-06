// FILE: bud_office-backend/src/attachments/attachments.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import * as fs from 'fs';

import { Attachment } from './attachment.entity';

@Injectable()
export class AttachmentsService {
  constructor(
    @InjectRepository(Attachment)
    private readonly repo: Repository<Attachment>,
  ) {}

  private toInt(value: unknown, field: string): number {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return n;
  }

  async create(params: {
    entityType: string;
    entityId: unknown;
    file: Express.Multer.File;
    tag?: string | null;
    uploadedByUserId?: number | null;
  }) {
    const entityType = String(params.entityType || '').trim();
    if (!entityType) throw new BadRequestException('entityType is required');
    const entityId = this.toInt(params.entityId, 'entityId');
    const f = params.file;
    if (!f) throw new BadRequestException('file is required');

    const tag = params.tag?.trim().slice(0, 32) || null;
    const item = this.repo.create({
      entityType,
      entityId,
      tag,
      originalName: f.originalname,
      fileName: f.filename,
      mimeType: f.mimetype,
      size: String(f.size),
      path: f.path.replace(/\\/g, '/'),
      uploadedByUserId: (typeof params.uploadedByUserId === 'number' ? params.uploadedByUserId : (params.uploadedByUserId != null ? Number(params.uploadedByUserId) : null)),
    });

    return this.repo.save(item);
  }

  async findAll(filter: {
    entityType?: string;
    entityId?: unknown;
  }) {
    // TypeORM FindOptionsWhere не допускає `null` для varchar-полів,
    // тому тримаємо where строго типізованим під допустимі значення.
    const where: FindOptionsWhere<Attachment> = {};
    if (filter.entityType) where.entityType = String(filter.entityType);
    if (filter.entityId !== undefined) {
      where.entityId = this.toInt(filter.entityId, 'entityId');
    }
    return this.repo.find({
      where,
      order: { id: 'DESC' },
    });
  }

  async findOne(id: unknown) {
    const n = this.toInt(id, 'id');
    const item = await this.repo.findOne({ where: { id: n } });
    if (!item) throw new NotFoundException('Attachment not found');
    return item;
  }

  async remove(id: unknown) {
    const item = await this.findOne(id);
    // best-effort fs cleanup
    try {
      if (item.path && fs.existsSync(item.path)) {
        fs.unlinkSync(item.path);
      }
    } catch {
      // ignore
    }
    await this.repo.delete({ id: item.id });
    return { ok: true };
  }
}
