import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

/**
 * Стандарт payload для проєкту:
 * {
 *   sub: user.id,
 *   email: user.email,
 *   roles: string[]  // САМЕ role.code
 * }
 *
 * validate() повертає об'єкт, який стане request.user
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Нормалізуємо ролі: завжди string[]
    const rolesRaw = payload?.roles ?? payload?.roleCodes ?? [];
    const roles = Array.isArray(rolesRaw)
      ? rolesRaw.map((r) => String(r))
      : [];

    // Важливо: зберігаємо sub як id; fullName для auth/me
    return {
      id: payload?.sub,
      email: payload?.email,
      fullName: payload?.fullName,
      roles,
      // Якщо є інші поля payload — не втрачаємо (але не дублюємо roles)
      ...Object.fromEntries(
        Object.entries(payload ?? {}).filter(([k]) => !['roles', 'roleCodes', 'sub'].includes(k)),
      ),
    };
  }
}