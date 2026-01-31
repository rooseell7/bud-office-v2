import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const normEmail = (email ?? '').trim().toLowerCase();
    const normPass = (password ?? '').trim();

    const user = await this.usersService.findByEmail(normEmail);
    if (!user) {
      throw new UnauthorizedException('Невірний email або пароль');
    }

    const isMatch = await bcrypt.compare(normPass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Невірний email або пароль');
    }

    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);

    const payload = {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: (user.roles ?? []).map((r) => r.code),
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        roles: user.roles,
      },
    };
  }
}
