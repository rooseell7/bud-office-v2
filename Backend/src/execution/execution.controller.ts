import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { ExecutionService } from './execution.service';
import { CreateExecutionTaskDto } from './dto/create-execution-task.dto';
import { UpdateExecutionTaskDto } from './dto/update-execution-task.dto';
import { TaskCommentDto } from './dto/task-comment.dto';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('execution')
export class ExecutionController {
  constructor(private readonly executionService: ExecutionService) {}

  private getUserId(req: any): number {
    return Number(req?.user?.id ?? 0);
  }

  @Permissions('execution:read')
  @Get('projects')
  getProjects(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('foremanId') foremanId?: string,
    @Query('overdue') overdue?: string,
  ) {
    const userId = this.getUserId(req);
    const filters: { status?: string; foremanId?: number; overdueOnly?: boolean } = {};
    if (status) filters.status = status;
    if (foremanId) {
      const n = parseInt(foremanId, 10);
      if (!isNaN(n)) filters.foremanId = n;
    }
    if (overdue === 'true' || overdue === '1') filters.overdueOnly = true;
    return this.executionService.getProjects(userId, filters);
  }

  @Permissions('execution:read')
  @Get('projects/:id')
  getProjectById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const userId = this.getUserId(req);
    return this.executionService.getProjectById(id, userId);
  }

  @Permissions('execution:write')
  @Post('projects/:id/tasks')
  createTask(
    @Req() req: any,
    @Param('id', ParseIntPipe) projectId: number,
    @Body() dto: CreateExecutionTaskDto,
  ) {
    const userId = this.getUserId(req);
    return this.executionService.createTask(projectId, userId, dto);
  }

  @Permissions('execution:write')
  @Patch('tasks/:taskId')
  updateTask(
    @Req() req: any,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: UpdateExecutionTaskDto,
  ) {
    const userId = this.getUserId(req);
    return this.executionService.updateTask(taskId, userId, dto);
  }

  @Permissions('execution:write')
  @Post('tasks/:taskId/comments')
  addTaskComment(
    @Req() req: any,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: TaskCommentDto,
  ) {
    const userId = this.getUserId(req);
    return this.executionService.addTaskComment(taskId, userId, dto);
  }

  @Permissions('execution:read')
  @Get('tasks/:taskId/events')
  getTaskEvents(@Req() req: any, @Param('taskId', ParseIntPipe) taskId: number) {
    const userId = this.getUserId(req);
    return this.executionService.getTaskEvents(taskId, userId);
  }
}
