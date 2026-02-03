import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { ForemanService } from './foreman.service';
import { CreateForemanEventDto } from './dto/create-foreman-event.dto';
import { ForemanTaskStatusDto } from '../execution/dto/foreman-task-status.dto';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('foreman')
export class ForemanController {
  constructor(private readonly foremanService: ForemanService) {}

  private getUserId(req: any): number {
    return Number(req?.user?.id ?? 0);
  }

  @Permissions('foreman:read')
  @Get('objects')
  findMyObjects(@Req() req: any) {
    const userId = this.getUserId(req);
    return this.foremanService.findMyObjects(userId);
  }

  @Permissions('foreman:read')
  @Get('objects/:id')
  findOneObject(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const userId = this.getUserId(req);
    return this.foremanService.findOneObject(id, userId);
  }

  @Permissions('foreman:read')
  @Get('objects/:id/events')
  findEvents(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    const userId = this.getUserId(req);
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10) || 50)) : 50;
    return this.foremanService.findEvents(id, userId, limitNum, before);
  }

  @Permissions('foreman:write')
  @Post('objects/:id/events')
  createEvent(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateForemanEventDto,
  ) {
    const userId = this.getUserId(req);
    return this.foremanService.createEvent(id, userId, dto);
  }

  @Permissions('foreman:read')
  @Get('objects/:id/tasks')
  getObjectTasks(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Query('includeDone') includeDone?: string,
  ) {
    const userId = this.getUserId(req);
    return this.foremanService.findObjectTasks(id, userId, {
      includeDone: includeDone === 'true' || includeDone === '1',
    });
  }

  @Permissions('foreman:write')
  @Patch('tasks/:taskId/status')
  updateTaskStatus(
    @Req() req: any,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: ForemanTaskStatusDto,
  ) {
    const userId = this.getUserId(req);
    return this.foremanService.updateTaskStatus(
      taskId,
      userId,
      dto.status,
      dto.comment,
      dto.blockedReason,
    );
  }
}
