// FILE: bud_office-backend/src/users/users.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { RolesService } from '../roles/roles.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly rolesService: RolesService,
  ) {}

  private normalizeEmail(email: string): string {
    return (email ?? '').trim().toLowerCase();
  }

  async ensureAdminExists() {
    const adminEmail = this.normalizeEmail('admin@buduy.local');

    // DEV: щоб гарантовано зайти, можна примусово скинути пароль на старті
    // У .env бекенду:
    // ADMIN_FORCE_RESET=true
    // ADMIN_PASSWORD=Buduy7777!
    const forceReset = String(process.env.ADMIN_FORCE_RESET ?? '').toLowerCase() === 'true';
    const adminPassword = (process.env.ADMIN_PASSWORD ?? 'admin123').trim();

    let admin = await this.findByEmail(adminEmail);

    if (!admin) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const allRoles = await this.rolesService.findAll();
      const adminRole = allRoles.find((r) => r.code === 'admin');

      admin = this.userRepo.create({
        email: adminEmail,
        fullName: 'Головний адмін',
        passwordHash,
        roles: adminRole ? [adminRole] : [],
        isActive: true,
      });

      await this.userRepo.save(admin);
      // eslint-disable-next-line no-console
      console.log(`Created default admin user: ${adminEmail} / ${adminPassword}`);
      return;
    }

    if (forceReset) {
      admin.passwordHash = await bcrypt.hash(adminPassword, 10);
      admin.isActive = true;
      await this.userRepo.save(admin);
      // eslint-disable-next-line no-console
      console.log(`Admin password reset: ${adminEmail} / ${adminPassword}`);
    }
  }

  // РЕКОМЕНДОВАНО: підтягувати roles одразу (зручно для адмінки)
  findAll(): Promise<User[]> {
    return this.userRepo.find({ relations: ['roles'] });
  }

  // РЕКОМЕНДОВАНО: з roles (щоб одразу бачити рольовий склад)
  async findById(id: number): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id }, relations: ['roles'] });
    if (!user) throw new NotFoundException('Користувача не знайдено');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normEmail = this.normalizeEmail(email);

    // Важливо: пошук через LOWER, щоб не ламалось через регістр/пробіли
    const user = await this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.roles', 'r')
      .where('LOWER(u.email) = :email', { email: normEmail })
      .getOne();

    return user ?? null;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const email = this.normalizeEmail(dto.email);

    const existing = await this.findByEmail(email);
    if (existing) {
      throw new BadRequestException('Користувач з таким email вже існує');
    }

    const passwordHash = await bcrypt.hash((dto.password ?? '').trim(), 10);

    const roles = [];
    if (dto.rolesCodes && dto.rolesCodes.length > 0) {
      const allRoles = await this.rolesService.findAll();
      for (const code of dto.rolesCodes) {
        const role = allRoles.find((r) => r.code === code);
        if (role) roles.push(role);
      }
    }

    const user = this.userRepo.create({
      email,
      fullName: dto.fullName,
      passwordHash,
      roles,
      isActive: true,
    });

    return this.userRepo.save(user);
  }

  /**
   * КРОК 2: Призначення ролей користувачу по role.code
   * Використання з контролера:
   *   POST /users/:id/roles  body: { roles: ['admin','supply_manager'] }
   */
  async updateUserRoles(userId: number, roleCodes: string[]) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const codes = (roleCodes ?? [])
      .map((c) => String(c).trim())
      .filter(Boolean);

    if (!codes.length) {
      throw new BadRequestException('roles must be a non-empty array of role codes');
    }

    // Якщо в твоєму RolesService вже є findByCodes() — краще викликати його.
    // Щоб не залежати від цього, робимо надійно через findAll() + валідацію.
    const allRoles = await this.rolesService.findAll();
    const roles = allRoles.filter((r) => codes.includes(r.code));

    if (roles.length !== codes.length) {
      const found = roles.map((r) => r.code);
      const missing = codes.filter((c) => !found.includes(c));
      throw new NotFoundException(`Roles not found: ${missing.join(', ')}`);
    }

    user.roles = roles;
    await this.userRepo.save(user);

    return {
      id: user.id,
      email: user.email,
      roles: roles.map((r) => r.code),
    };
  }
}
