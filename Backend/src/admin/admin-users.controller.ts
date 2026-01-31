import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { UsersService } from '../users/users.service';
import { PERMISSIONS } from '../auth/permissions/permissions';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users')
  @Permissions('users:read')
  async listUsers() {
    const users = await this.usersService.findAll();
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      isActive: u.isActive,
      createdAt: u.createdAt,
      roles: (u.roles ?? []).map((r) => ({ id: r.id, code: r.code, name: r.name })),
    }));
  }

  @Post('users')
  @Permissions('users:write')
  async createUser(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      createdAt: user.createdAt,
      roles: (user.roles ?? []).map((r) => ({ id: r.id, code: r.code, name: r.name })),
    };
  }

  @Patch('users/:id')
  @Permissions('users:write')
  async updateUser(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserAdminDto) {
    const user = await this.usersService.updateAdmin(id, dto);
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      createdAt: user.createdAt,
      roles: (user.roles ?? []).map((r) => ({ id: r.id, code: r.code, name: r.name })),
    };
  }

  @Get('permissions')
  @Permissions('users:read', 'roles:read')
  async listPermissions() {
    return [...PERMISSIONS];
  }
}
