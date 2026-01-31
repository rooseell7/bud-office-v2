import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { EstimatesService } from './estimates.service';

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

  @Permissions('documents:read', 'sheet:read')
  @Get('recent')
  findRecent(@Query('limit') limit?: string) {
    const lim = limit ? Math.min(parseInt(limit, 10) || 10, 50) : 10;
    return this.service.findRecent(lim);
  }

  @Permissions('documents:read', 'sheet:read')
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

  @Permissions('documents:write', 'sheet:write')
  @Post()
  create(
    @Body() body: { projectId: number; title?: string },
    @Req() req: Request,
  ) {
    return this.service.create(body, getUserId(req));
  }
}
