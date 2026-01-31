import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { SheetsService } from './sheets.service';

function getUserId(req: Request): number | null {
  const anyReq = req as any;
  const id = anyReq?.user?.id;
  const n = typeof id === 'number' ? id : Number(id);
  return Number.isFinite(n) ? n : null;
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sheets')
export class SheetsController {
  constructor(private readonly service: SheetsService) {}

  @Permissions('sheet:read')
  @Get('templates')
  getTemplates() {
    return this.service.getTemplates();
  }

  @Permissions('sheet:write')
  @Post()
  createFromTemplate(
    @Req() req: Request,
    @Body() body: { templateId: string; entityType?: string; entityId?: number; title?: string; projectId?: number },
  ) {
    return this.service.createFromTemplate(body, getUserId(req));
  }

  @Permissions('sheet:read')
  @Get(':docId/history')
  getHistory(
    @Param('docId') docId: string,
    @Query('limit') limit?: string,
  ) {
    const l = limit ? Math.min(parseInt(limit, 10) || 50, 100) : 50;
    return this.service.getHistory(Number(docId), l);
  }

  @Permissions('sheet:read')
  @Get(':docId/version/:versionId')
  getVersionSnapshot(
    @Param('docId') docId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.service.getVersionSnapshot(Number(docId), Number(versionId));
  }

  @Permissions('sheet:read')
  @Get(':docId/preview/:kind/:id')
  getPreviewSnapshot(
    @Param('docId') docId: string,
    @Param('kind') kind: string,
    @Param('id') id: string,
  ) {
    if (kind === 'version') return this.service.getVersionSnapshot(Number(docId), Number(id));
    if (kind === 'op') return this.service.getOpSnapshot(Number(docId), Number(id));
    throw new Error('kind must be version or op');
  }

  @Permissions('sheet:approve')
  @Post(':docId/restore')
  async restoreVersion(
    @Param('docId') docId: string,
    @Req() req: Request,
  ) {
    const body = req.body as { versionId?: number; versionNumber?: number };
    const v = body?.versionId ?? body?.versionNumber;
    if (v == null) throw new Error('versionId or versionNumber required');
    const snapshot = await this.service.restoreVersion(Number(docId), Number(v), getUserId(req));
    return { ok: true, snapshot };
  }

  @Permissions('sheet:export')
  @Get(':docId/export/xlsx')
  async exportXlsx(
    @Param('docId') docId: string,
    @Res() res: Response,
  ) {
    const buf = await this.service.exportXlsx(Number(docId));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="sheet-${docId}.xlsx"`);
    res.send(buf);
  }

  @Permissions('sheet:export')
  @Get(':docId/export/pdf')
  async exportPdf(
    @Param('docId') docId: string,
    @Res() res: Response,
  ) {
    const buf = await this.service.exportPdf(Number(docId));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="sheet-${docId}.pdf"`);
    res.send(buf);
  }
}
