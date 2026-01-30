// FILE: bud_office-backend/src/auth/guards/permissions.guard.ts

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import type { PermissionCode } from '../permissions/permissions';
import { resolvePermissionsFromRoles } from '../permissions/permissions';

function asArray<T>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req?.user ?? {};

    // У різних місцях можуть бути:
    // - user.permissions: PermissionCode[] (готовий список)
    // - user.roles: string[] або [{code:string}]
    const directPerms = asArray<PermissionCode>((user as any).permissions);

    const rolePerms = resolvePermissionsFromRoles(
      asArray<any>((user as any).roles),
    ) as PermissionCode[];

    const userPerms = new Set<PermissionCode>([...directPerms, ...rolePerms]);

    const ok = required.some((p) => userPerms.has(p));
    if (!ok) throw new ForbiddenException('Недостатньо прав доступу');

    return true;
  }
}