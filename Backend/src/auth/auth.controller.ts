// FILE: bud_office-backend/src/auth/auth.controller.ts

import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

import { resolvePermissionsFromRoles } from './permissions/permissions';

type AuthedRequest = Request & {
  user: {
    id: number;
    email?: string;
    fullName?: string;
    roles?: any[]; // може бути string[] або Role[]
  };
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * Поточний користувач + permissions (для фронту).
   * Джерело: DB (щоб отримати bio та актуальне ім'я).
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: AuthedRequest) {
    const u = req.user;
    const user = await this.usersService.findById(u.id);

    const roleCodes: string[] = (user.roles ?? []).map((r: any) => r.code ?? r).filter(Boolean);
    const permissions = Array.from(resolvePermissionsFromRoles(roleCodes)).sort();

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      bio: user.bio ?? null,
      roles: roleCodes,
      permissions,
      updatedAt: user.updatedAt ? user.updatedAt.toISOString() : null,
    };
  }
}
