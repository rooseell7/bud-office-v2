import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * RolesGuard очікує, що JwtStrategy кладе в request.user.roles:
 *   - або string[] (наприклад: ['admin', 'supply_head'])
 *   - або Role[] де Role має поле code (наприклад: { id, code, name })
 *
 * Доступ дозволяємо, якщо:
 *   - endpoint не вимагає ролей, або
 *   - у користувача є будь-яка з requiredRoles
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(
        ROLES_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    // Якщо ролі не задані — не обмежуємо доступ
    if (!requiredRoles.length) return true;

    const req = context.switchToHttp().getRequest();
    const user = req?.user;

    // Якщо немає user — значить JwtAuthGuard не спрацював (або не підключений)
    if (!user) return false;

    const codes = this.extractRoleCodes(user?.roles);

    // Наявність хоча б однієї ролі з requiredRoles — дозволяємо
    return requiredRoles.some((r) => codes.has(String(r)));
  }

  private extractRoleCodes(roles: unknown): Set<string> {
    const out = new Set<string>();

    if (!roles) return out;

    // roles як string[]
    if (Array.isArray(roles) && roles.every((x) => typeof x === 'string')) {
      for (const r of roles as string[]) out.add(r);
      return out;
    }

    // roles як об'єкти (Role[])
    if (Array.isArray(roles)) {
      for (const item of roles as any[]) {
        const code = item?.code ?? item?.role?.code ?? item?.name;
        if (typeof code === 'string' && code.trim()) out.add(code.trim());
      }
      return out;
    }

    // roles як одиночний об'єкт або інша структура
    const maybeCode = (roles as any)?.code;
    if (typeof maybeCode === 'string' && maybeCode.trim()) out.add(maybeCode.trim());

    return out;
  }
}