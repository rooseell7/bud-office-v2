import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

type JwtPayload = {
  sub: number;
  email?: string;
  fullName?: string;
  roles?: string[];
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET не задано в .env');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    const userId = payload?.sub;
    if (!userId) throw new UnauthorizedException('Некоректний токен');

    return {
      id: userId,
      email: payload.email,
      fullName: payload.fullName,
      roles: Array.isArray(payload.roles) ? payload.roles : [],
    };
  }
}
