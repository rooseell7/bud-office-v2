// FILE: bud_office-backend/src/projects/projects.controller.ts

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Delete,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { ProjectsService } from './projects.service';
import { AttachmentsService } from '../attachments/attachments.service';
import { ActivityService } from '../activity/activity.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'attachments');
function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function getUserId(req: Request): number {
  const id = (req as any)?.user?.id;
  const n = typeof id === 'number' ? id : Number(id);
  return Number.isFinite(n) ? n : 0;
}

function getActorId(req: Request): number | null {
  const id = (req as any)?.user?.id;
  const n = typeof id === 'number' ? id : Number(id);
  return Number.isFinite(n) ? n : null;
}

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly attachmentsService: AttachmentsService,
    private readonly activityService: ActivityService,
  ) {}

  @Permissions('projects:read')
  @Get()
  findAll() {
    return this.projectsService.findAll();
  }

  @Permissions('projects:read')
  @Get(':id/summary')
  getSummary(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.getSummary(id);
  }

  @Permissions('projects:read')
  @Get(':id/details')
  getDetails(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.getDetails(id);
  }

  @Permissions('projects:read')
  @Get(':id/health')
  getHealth(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.getHealth(id);
  }

  @Permissions('projects:read')
  @Get(':id/timeline')
  getTimeline(
    @Param('id', ParseIntPipe) id: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('types') types?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10) || 50)) : undefined;
    return this.projectsService.getTimeline(id, { from, to, types, limit: limitNum });
  }

  @Permissions('projects:read')
  @Get(':id/attachments')
  getAttachments(@Param('id', ParseIntPipe) id: number) {
    this.projectsService.findOne(id);
    return this.attachmentsService.findAll({ entityType: 'project', entityId: id });
  }

  @Permissions('projects:write')
  @Post(':id/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureDir(UPLOAD_DIR);
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname || '').slice(0, 16);
          cb(null, `${Date.now()}_${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  async addAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Body('tag') tag?: string,
  ) {
    this.projectsService.findOne(id);
    const file = (req as any).file;
    if (!file) throw new BadRequestException('file is required');
    const attachment = await this.attachmentsService.create({
      entityType: 'project',
      entityId: id,
      file,
      tag: tag ?? null,
      uploadedByUserId: getActorId(req),
    });
    await this.activityService.logProjectAudit({
      projectId: id,
      actorId: getActorId(req),
      action: 'attachment_added',
      summary: `Додано файл: ${file.originalname || attachment.originalName} (${tag || 'other'})`,
      payload: { attachmentId: attachment.id, tag: tag ?? null },
    });
    return attachment;
  }

  @Permissions('projects:write')
  @Delete(':id/attachments/:attachmentId')
  async removeAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @Req() req: Request,
  ) {
    this.projectsService.findOne(id);
    const att = await this.attachmentsService.findOne(attachmentId);
    if (att.entityType !== 'project' || att.entityId !== id) {
      throw new BadRequestException('Attachment does not belong to this project');
    }
    const name = att.originalName;
    await this.attachmentsService.remove(attachmentId);
    await this.activityService.logProjectAudit({
      projectId: id,
      actorId: getActorId(req),
      action: 'attachment_removed',
      summary: `Видалено файл: ${name}`,
      payload: { attachmentId },
    });
    return { ok: true };
  }

  @Permissions('projects:read')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findOne(id);
  }

  /** Створювати об'єкт може тільки відділ продаж (sales:write). */
  @Permissions('sales:write')
  @Post()
  create(@Body() dto: CreateProjectDto, @Req() req: Request) {
    return this.projectsService.create(dto, getUserId(req));
  }

  @Permissions('projects:write')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectDto,
    @Req() req: Request,
  ) {
    return this.projectsService.update(id, dto, getActorId(req));
  }

  // Видалення проєкту — тільки адміну (краще ніж давати керівникам)
  @Permissions('system:manage')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.remove(id);
  }
}
