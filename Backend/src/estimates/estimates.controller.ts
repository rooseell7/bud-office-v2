import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { EstimatesService } from './estimates.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { EstimatesProjectsQueryDto } from './dto/estimates-projects-query.dto';

function getUserId(req: Request): number | null {
  const anyReq = req as any;
  const id = anyReq?.user?.id;
  const n = typeof id === 'number' ? id : Number(id);
  return Number.isFinite(n) ? n : null;
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('estimates')
export class EstimatesController {
  constructor(private readonly service: EstimatesService) {}

  @Permissions('documents:read', 'sheet:read', 'estimates:read')
  @Get('recent')
  findRecent(@Query('limit') limit?: string) {
    const lim = limit ? Math.min(parseInt(limit, 10) || 10, 50) : 10;
    return this.service.findRecent(lim);
  }

  @Permissions('documents:read', 'sheet:read', 'estimates:read')
  @Get('projects')
  getProjectsList(@Query() q: EstimatesProjectsQueryDto) {
    return this.service.getProjectsList(q);
  }

  @Permissions('documents:read', 'sheet:read', 'estimates:read')
  @Get('projects/:id/dashboard')
  getProjectDashboard(@Param('id', ParseIntPipe) id: number) {
    return this.service.getProjectDashboard(id);
  }

  @Permissions('documents:read', 'sheet:read', 'estimates:read')
  @Get()
  findByProject(
    @Query('projectId') projectId: string,
    @Query('limit') limit?: string,
  ) {
    const pid = parseInt(projectId, 10);
    if (!Number.isFinite(pid)) return [];
    const lim = limit ? Math.min(parseInt(limit, 10) || 50, 100) : 50;
    return this.service.findByProject(pid, lim);
  }

  @Permissions('documents:write', 'sheet:write', 'estimates:write')
  @Post()
  create(
    @Body() body: { projectId: number; title?: string },
    @Req() req: Request,
  ) {
    return this.service.create(body, getUserId(req));
  }

  @Permissions('estimates:delete')
  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }

  @Permissions('sheet:export', 'estimates:read')
  @Get(':id/export/xlsx')
  async exportXlsx(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: any,
  ) {
    const buf = await this.service.exportXlsx(id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="KP-${id}.xlsx"`);
    res.send(buf);
  }

  @Permissions('documents:read', 'sheet:read', 'estimates:read')
  @Get(':id/document')
  getDocumentWithStages(@Param('id', ParseIntPipe) id: number) {
    return this.service.getDocumentWithStages(id);
  }

  @Permissions('documents:read', 'sheet:read', 'estimates:read')
  @Get(':id/stages')
  async getStages(@Param('id', ParseIntPipe) id: number) {
    const doc = await this.service.getDocumentWithStages(id);
    return { stages: doc.stages };
  }

  @Permissions('documents:write', 'sheet:write', 'estimates:write')
  @Post(':id/stages')
  createStage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateStageDto,
  ) {
    return this.service.createStage(id, dto);
  }

  @Permissions('documents:write', 'sheet:write', 'estimates:write')
  @Patch(':id/stages/:stageId')
  updateStage(
    @Param('id', ParseIntPipe) id: number,
    @Param('stageId') stageId: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.service.updateStage(id, stageId, dto);
  }

  @Permissions('documents:write', 'sheet:write', 'estimates:write')
  @Post(':id/stages/:stageId/duplicate')
  duplicateStage(
    @Param('id', ParseIntPipe) id: number,
    @Param('stageId') stageId: string,
  ) {
    return this.service.duplicateStage(id, stageId);
  }

  @Permissions('documents:write', 'sheet:write', 'estimates:write')
  @Delete(':id/stages/:stageId')
  deleteStage(
    @Param('id', ParseIntPipe) id: number,
    @Param('stageId') stageId: string,
  ) {
    return this.service.deleteStage(id, stageId);
  }

  @Permissions('documents:read', 'sheet:read', 'estimates:read')
  @Get(':id/sheet')
  async getSheet(
    @Param('id', ParseIntPipe) id: number,
    @Query('docKey') docKey: string,
  ) {
    if (!docKey?.trim()) throw new BadRequestException('docKey required');
    const result = await this.service.getSheetByDocKey(docKey.trim());
    if (!result) throw new NotFoundException('Sheet not found');
    return result;
  }

  @Permissions('documents:write', 'sheet:write', 'estimates:write')
  @Patch(':id/sheet')
  async saveSheet(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { docKey: string; snapshot: Record<string, any>; expectedRevision?: number },
  ) {
    if (!body.docKey?.trim()) throw new BadRequestException('docKey required');
    return this.service.saveSheetByDocKey(
      body.docKey.trim(),
      body.snapshot,
      body.expectedRevision,
    );
  }
}
