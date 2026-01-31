// FILE: bud_office-backend/src/users/users.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
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
    private readonly dataSource: DataSource,
  ) {}

  async ensureBioColumn(): Promise<void> {
    try {
      await this.dataSource.query(
        `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" VARCHAR(500)`);
    } catch {
      // column may exist or sync handles it
    }
  }

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
      fullName: (dto.fullName ?? '').trim() || email.split('@')[0],
      passwordHash,
      roles,
      isActive: true,
    });

    return this.userRepo.save(user);
  }

  async updateAdmin(
    id: number,
    dto: { fullName?: string; email?: string; isActive?: boolean; rolesCodes?: string[] },
  ) {
    const user = await this.findById(id);

    if (dto.fullName !== undefined) user.fullName = dto.fullName.trim() || user.fullName;
    if (dto.email !== undefined) {
      const email = this.normalizeEmail(dto.email);
      const existing = await this.findByEmail(email);
      if (existing && existing.id !== id) {
        throw new BadRequestException('Користувач з таким email вже існує');
      }
      user.email = email;
    }
    if (dto.isActive !== undefined) user.isActive = Boolean(dto.isActive);

    if (dto.rolesCodes !== undefined && dto.rolesCodes.length > 0) {
      const allRoles = await this.rolesService.findAll();
      const roles = allRoles.filter((r) => dto.rolesCodes!.includes(r.code));
      if (roles.length !== dto.rolesCodes.length) {
        const found = roles.map((r) => r.code);
        const missing = dto.rolesCodes.filter((c) => !found.includes(c));
        throw new BadRequestException(`Ролі не знайдено: ${missing.join(', ')}`);
      }
      user.roles = roles;
    }

    return this.userRepo.save(user);
  }

  /**
   * КРОК 2: Призначення ролей користувачу по role.code
   * Використання з контролера:
   *   POST /users/:id/roles  body: { roles: ['admin','supply_manager'] }
   */
  async updateMyProfile(
    userId: number,
    dto: { fullName?: string; bio?: string | null },
  ) {
    const user = await this.findById(userId);
    if (dto.fullName !== undefined) {
      const name = (dto.fullName ?? '').trim();
      if (name.length < 2) {
        throw new BadRequestException('Ім\'я має бути щонайменше 2 символи');
      }
      user.fullName = name;
    }
    if (dto.bio !== undefined) {
      user.bio = dto.bio == null || dto.bio === '' ? null : String(dto.bio).trim().slice(0, 500);
    }
    const saved = await this.userRepo.save(user);
    return {
      id: saved.id,
      email: saved.email,
      fullName: saved.fullName,
      bio: saved.bio,
    };
  }

  async changePassword(
    userId: number,
    dto: { currentPassword: string; newPassword: string },
  ) {
    const user = await this.findById(userId);
    const currentOk = await bcrypt.compare(
      (dto.currentPassword ?? '').trim(),
      user.passwordHash,
    );
    if (!currentOk) {
      throw new BadRequestException('Невірний поточний пароль');
    }
    const newPass = (dto.newPassword ?? '').trim();
    if (newPass.length < 8) {
      throw new BadRequestException('Новий пароль має бути щонайменше 8 символів');
    }
    user.passwordHash = await bcrypt.hash(newPass, 10);
    await this.userRepo.save(user);
  }

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
