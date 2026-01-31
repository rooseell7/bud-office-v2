import {
  Controller,
  Patch,
  Post,
  Param,
  Body,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { UsersService } from './users.service';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

function getUserId(req: Request): number {
  const id = (req as any)?.user?.id;
  const n = typeof id === 'number' ? id : Number(id);
  if (!Number.isFinite(n)) throw new Error('User id not found');
  return n;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  updateMe(@Req() req: Request, @Body() dto: UpdateMeDto) {
    return this.usersService.updateMyProfile(getUserId(req), dto);
  }

  @Post('me/change-password')
  changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(getUserId(req), dto);
  }

  @Roles('admin')
  @Post(':id/roles')
  updateRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRolesDto,
  ) {
    return this.usersService.updateUserRoles(id, dto.roles);
  }
}