import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { DocumentsService } from './documents.service';
import { SheetOpsService } from './sheet-ops.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentsQueryDto } from './dto/documents-query.dto';
import { SetDocumentStatusDto } from './dto/set-document-status.dto';

function getUserId(req: Request): number | null {
  const anyReq = req as any;
  const id = anyReq?.user?.id;
  const n = typeof id === 'number' ? id : Number(id);
  return Number.isFinite(n) ? n : null;
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly service: DocumentsService,
    private readonly sheetOpsService: SheetOpsService,
  ) {}

  @Permissions('documents:read')
  @Get()
  findAll(@Query() q: DocumentsQueryDto) {
    return this.service.findAll(q);
  }

  @Permissions('documents:write')
  @Post(':id/edit-session/acquire')
  acquireEditSession(@Param('id') id: string, @Req() req: Request) {
    return this.service.acquireEditSession(Number(id), getUserId(req));
  }

  @Permissions('documents:write')
  @Post(':id/edit-session/heartbeat')
  heartbeatEditSession(@Param('id') id: string, @Body('editSessionToken') token: string, @Req() req: Request) {
    return this.service.heartbeatEditSession(Number(id), token, getUserId(req));
  }

  @Permissions('documents:write')
  @Post(':id/edit-session/release')
  releaseEditSession(@Param('id') id: string, @Body('editSessionToken') token: string, @Req() req: Request) {
    return this.service.releaseEditSession(Number(id), token, getUserId(req));
  }

  @Permissions('documents:read')
  @Get(':id/versions')
  listVersions(@Param('id') id: string) {
    return this.service.listVersions(Number(id));
  }

  @Permissions('documents:write')
  @Post(':id/versions')
  createVersion(
    @Param('id') id: string,
    @Body() body: { type?: 'auto' | 'manual'; snapshot: Record<string, any>; note?: string },
    @Req() req: Request,
  ) {
    return this.service.createVersion(
      Number(id),
      body.type ?? 'manual',
      body.snapshot,
      body.note,
      getUserId(req),
    );
  }

  @Permissions('documents:write')
  @Post(':id/versions/:versionId/restore')
  restoreVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Req() req: Request,
  ) {
    return this.service.restoreVersion(Number(id), Number(versionId), getUserId(req));
  }

  @Permissions('documents:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
  }

  @Permissions('documents:read')
  @Get(':id/events')
  events(@Param('id') id: string) {
    return this.service.events(Number(id));
  }

  @Permissions('documents:write')
  @Post()
  create(@Body() dto: CreateDocumentDto, @Req() req: Request) {
    return this.service.create(dto, getUserId(req));
  }

  @Permissions('documents:write')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDocumentDto, @Req() req: Request) {
    return this.service.update(Number(id), dto, getUserId(req));
  }

  @Permissions('documents:write')
  @Post(':id/sheet/undo')
  async requestSheetUndo(@Param('id') id: string, @Req() req: Request) {
    return this.sheetOpsService.requestUndo(Number(id), getUserId(req));
  }

  @Permissions('documents:write')
  @Post(':id/sheet/redo')
  async requestSheetRedo(@Param('id') id: string, @Req() req: Request) {
    return this.sheetOpsService.requestRedo(Number(id), getUserId(req));
  }

  /**
   * Перехід статусів (foundation). За замовчуванням вимагаємо approve,
   * бо це часто фінальна/юридична дія.
   */
  @Permissions('documents:approve')
  @Post(':id/status')
  setStatus(@Param('id') id: string, @Body() dto: SetDocumentStatusDto, @Req() req: Request) {
    return this.service.setStatus(Number(id), dto.status, getUserId(req));
  }

  @Permissions('documents:write')
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.service.remove(Number(id), getUserId(req));
  }
}
