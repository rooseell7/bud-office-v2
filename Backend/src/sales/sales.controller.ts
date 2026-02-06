import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { ProjectsService } from '../projects/projects.service';
import { SalesService } from './sales.service';
import { SalesProjectsQueryDto } from './dto/sales-projects-query.dto';
import { UpdateProjectDto } from '../projects/dto/update-project.dto';
import { ActivityService } from '../activity/activity.service';

const SALES_STAGE_LABELS: Record<string, string> = {
  lead_new: 'Новий',
  contact_made: 'Контакт',
  meeting_scheduled: 'Зустріч запланована',
  meeting_done: 'Зустріч проведена',
  kp_preparing: 'КП готується',
  kp_sent: 'КП відправлено',
  kp_negotiation: 'Узгодження',
  deal_signed: 'Угода підписана',
  handoff_to_exec: 'Передано в реалізацію',
  paused: 'Пауза',
  lost: 'Втрачено',
};

function getActorId(req: Request): number | null {
  const id = (req as any)?.user?.id;
  const n = typeof id === 'number' ? id : Number(id);
  return Number.isFinite(n) ? n : null;
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales')
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly projectsService: ProjectsService,
    private readonly activityService: ActivityService,
  ) {}

  @Permissions('projects:read')
  @Get('owners')
  getOwners() {
    return this.salesService.getOwnerCandidates();
  }

  @Permissions('projects:read')
  @Get('projects')
  getProjectsList(@Query() q: SalesProjectsQueryDto) {
    return this.salesService.getProjectsList(q);
  }

  @Permissions('projects:read')
  @Get('projects/:id/details')
  getProjectDetails(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.getProjectDetails(id);
  }

  @Permissions('projects:write')
  @Patch('projects/:id')
  async updateProject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectDto,
    @Req() req: Request,
  ) {
    const project = await this.projectsService.findOne(id);
    const prevStage = project.salesStage ?? project.status;
    const updated = await this.projectsService.update(id, dto, getActorId(req));
    if (dto.salesStage !== undefined && String(dto.salesStage) !== String(prevStage)) {
      const fromLabel = SALES_STAGE_LABELS[prevStage] ?? prevStage;
      const toLabel = SALES_STAGE_LABELS[String(dto.salesStage)] ?? dto.salesStage;
      await this.activityService.logProjectAudit({
        projectId: id,
        actorId: getActorId(req),
        action: 'sales_stage_changed',
        summary: `Стадія продажу: ${fromLabel} → ${toLabel}`,
        payload: { from: prevStage, to: dto.salesStage },
      });
    }
    return updated;
  }

  @Permissions('projects:write')
  @Post('projects/:id/next-action')
  setNextAction(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { type?: string; dueAt?: string; note?: string },
    @Req() req: Request,
  ) {
    return this.salesService.setNextAction(id, {
      type: body.type ?? 'other',
      dueAt: body.dueAt ?? '',
      note: body.note,
    }, getActorId(req));
  }

  @Permissions('projects:write')
  @Post('projects/:id/complete-action')
  completeAction(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { comment?: string },
    @Req() req: Request,
  ) {
    return this.salesService.completeAction(id, getActorId(req), body.comment);
  }

  @Permissions('projects:read')
  @Get('projects/:id/contacts')
  getContacts(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.getContacts(id);
  }

  @Permissions('projects:write')
  @Post('projects/:id/contacts')
  addContact(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { type?: string; result?: string; at?: string },
    @Req() req: Request,
  ) {
    return this.salesService.addContact(id, body, getActorId(req));
  }
}
