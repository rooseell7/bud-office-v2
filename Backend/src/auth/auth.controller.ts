// FILE: bud_office-backend/src/auth/auth.controller.ts

import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { AuthService } from './auth.service';
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
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * Поточний користувач + permissions (для фронту).
   * Використання: GET /auth/me з Bearer token
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: AuthedRequest) {
    const u = req.user;

    const roleCodes: string[] = Array.isArray(u?.roles)
      ? u.roles.map((x: any) => String(x?.code ?? x)).filter(Boolean)
      : [];

    const permissions = Array.from(resolvePermissionsFromRoles(roleCodes)).sort();

    return {
      id: u?.id,
      email: u?.email,
      fullName: u?.fullName,
      roles: roleCodes,
      permissions,
    };
  }
}
