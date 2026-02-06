// FILE: bud_office-backend/src/attachments/attachments.controller.ts

import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { AttachmentsService } from './attachments.service';

type AuthedRequest = Request & { user: { id: string; roles?: string[] } };

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'attachments');

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  /**
   * Backward-compatible endpoint for existing frontend.
   * Expects multipart/form-data:
   * - file: binary
   * - entityType: string (e.g. 'invoice')
   * - entityId: number (e.g. 44)
   */
  @Permissions('supply:write')
  @Post('upload')
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
      limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
    }),
  )
  upload(
    @Req() req: AuthedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const body: any = (req as any).body || {};
    return this.service.create({
      entityType: body.entityType,
      entityId: body.entityId,
      file,
      tag: body.tag ?? null,
      uploadedByUserId: typeof (req as any).user?.id === 'number' ? (req as any).user.id : ((req as any).user?.id ? Number((req as any).user.id) : null),
    });
  }

  /**
   * List attachments for entity.
   * Example: GET /attachments?entityType=invoice&entityId=44
   */
  @Permissions('supply:read')
  @Get()
  findAll(@Query('entityType') entityType?: string, @Query('entityId') entityId?: string) {
    return this.service.findAll({ entityType, entityId });
  }

  /**
   * Download (file stream)
   */
  @Permissions('supply:read')
  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const item = await this.service.findOne(id);
    const abs = path.isAbsolute(item.path)
      ? item.path
      : path.join(process.cwd(), item.path);

    if (!fs.existsSync(abs)) {
      // file missing on disk
      res.status(404).json({ message: 'File not found' });
      return;
    }

    res.setHeader('Content-Type', item.mimeType || 'application/octet-stream');
    // RFC5987 filename
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(item.originalName || 'file')}`,
    );

    fs.createReadStream(abs).pipe(res);
  }

  @Permissions('supply:write')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
