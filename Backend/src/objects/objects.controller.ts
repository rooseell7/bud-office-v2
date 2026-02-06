// FILE: bud_office-backend/src/objects/objects.controller.ts

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

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { ObjectsService } from './object.service';
import { CreateObjectDto } from './dto/create-object.dto';
import { UpdateObjectDto } from './dto/update-object.dto';
import { UsersService } from '../users/users.service';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('objects')
export class ObjectsController {
  constructor(
    private readonly objectsService: ObjectsService,
    private readonly usersService: UsersService,
  ) {}

  private getUserId(req: any): any {
    return req?.user?.id;
  }

  /** Створювати об'єкт може тільки відділ продажів (objects:create). */
  @Permissions('objects:create')
  @Post()
  create(@Req() req: any, @Body() dto: CreateObjectDto) {
    const userId = this.getUserId(req);
    return this.objectsService.create(userId, dto);
  }

  @Permissions('objects:read')
  @Get('foreman-candidates')
  async getForemanCandidates() {
    const users = await this.usersService.findAll();
    const candidates = users
      .filter((u) => u.isActive !== false)
      .filter((u) => {
        const codes = (u.roles ?? []).map((r) => (r as any).code?.toLowerCase?.());
        return codes.includes('foreman') || codes.includes('admin');
      })
      .map((u) => ({ id: u.id, fullName: u.fullName || u.email || `#${u.id}` }));
    return candidates;
  }

  @Permissions('objects:read')
  @Get()
  findAll(@Req() req: any, @Query('clientId') clientId?: string) {
    const userId = this.getUserId(req);
    return this.objectsService.findAll(userId, clientId);
  }

  @Permissions('objects:read')
  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    const userId = this.getUserId(req);
    return this.objectsService.findOne(id, userId);
  }

  @Permissions('objects:write')
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateObjectDto) {
    const userId = this.getUserId(req);
    return this.objectsService.update(id, userId, dto);
  }

  /** Видалення об'єкта — тільки адмін (system:manage). */
  @Permissions('system:manage')
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    const userId = this.getUserId(req);
    return this.objectsService.remove(id, userId);
  }
}
