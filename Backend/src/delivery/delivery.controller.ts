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
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { DeliveryService } from './delivery.service';
import { CreateWorkLogDto } from './dto/create-work-log.dto';
import { CreateActDto } from './dto/create-act.dto';
import { UpdateActDto } from './dto/update-act.dto';

type AuthUser = { id: number; roles?: string[] };
type AuthRequest = Request & { user: AuthUser };

/**
 * ПОЛІТИКА ДОСТУПУ (КРОК 3):
 * - delivery:read  -> перегляд (work-logs/acts/analytics)
 * - delivery:write -> створення/редагування (create + зміни статусів)
 *
 * За потреби "approve" (наприклад, затвердження актів) додамо, коли з'явиться endpoint.
 */
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly service: DeliveryService) {}

  // work logs
  @Permissions('delivery:read')
  @Get('work-logs')
  getWorkLogs(
    @Req() req: AuthRequest,
    @Query('projectId') projectIdRaw: string,
  ) {
    const projectId = Number(projectIdRaw);
    return this.service.getWorkLogs(req.user.id, projectId);
  }

  @Permissions('delivery:write')
  @Post('work-logs')
  createWorkLog(@Req() req: AuthRequest, @Body() dto: CreateWorkLogDto) {
    return this.service.createWorkLog(req.user.id, dto);
  }

  @Permissions('delivery:write')
  @Patch('work-logs/:id/status')
  setWorkStatus(
    @Req() req: AuthRequest,
    @Param('id') idRaw: string,
    @Body() body: { status: 'draft' | 'done' },
  ) {
    const id = Number(idRaw);
    return this.service.setWorkStatus(req.user.id, id, body.status);
  }

  // acts
  @Permissions('delivery:read')
  @Get('acts')
  getActs(@Req() req: AuthRequest, @Query('projectId') projectIdRaw: string) {
    const projectId = Number(projectIdRaw);
    return this.service.getActs(req.user.id, projectId);
  }

  @Permissions('delivery:write')
  @Post('acts')
  createAct(@Req() req: AuthRequest, @Body() dto: CreateActDto) {
    return this.service.createAct(req.user.id, dto);
  }

  @Permissions('delivery:read')
  @Get('acts/:id')
  getAct(@Req() req: AuthRequest, @Param('id') idRaw: string) {
    const id = Number(idRaw);
    return this.service.getAct(req.user.id, id);
  }

  /**
   * Safe-save: допускаємо порожні рядки, items можна оновлювати повністю.
   */
  @Permissions('delivery:write')
  @Patch('acts/:id')
  updateAct(
    @Req() req: AuthRequest,
    @Param('id') idRaw: string,
    @Body() dto: UpdateActDto,
  ) {
    const id = Number(idRaw);
    return this.service.updateAct(req.user.id, id, dto);
  }

  @Permissions('delivery:write')
  @Delete('acts/:id')
  deleteAct(@Req() req: AuthRequest, @Param('id') idRaw: string) {
    const id = Number(idRaw);
    return this.service.deleteAct(req.user.id, id);
  }

  // analytics
  @Permissions('delivery:read')
  @Get('analytics')
  analytics(@Req() req: AuthRequest, @Query('projectId') projectIdRaw: string) {
    const projectId = Number(projectIdRaw);
    return this.service.analytics(req.user.id, projectId);
  }
}