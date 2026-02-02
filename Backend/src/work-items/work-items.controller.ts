// FILE: bud_office-backend/src/work-items/work-items.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Patch,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';

import { WorkItemsService } from './work-items.service';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('work-items')
export class WorkItemsController {
  constructor(private readonly workItemsService: WorkItemsService) {}

  @Permissions('delivery:read', 'estimates:read')
  @Get()
  findAll(@Query('q') q?: string) {
    return this.workItemsService.findAll(q);
  }

  @Permissions('delivery:read')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.workItemsService.findOne(id);
  }

  @Permissions('delivery:write')
  @Post()
  create(@Body() dto: CreateWorkItemDto) {
    return this.workItemsService.create(dto);
  }

  @Permissions('delivery:write')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkItemDto,
  ) {
    return this.workItemsService.update(id, dto);
  }

  @Permissions('delivery:approve')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.workItemsService.remove(id);
  }
}
