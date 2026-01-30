import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Role } from './role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  async findAll() {
    return this.roleRepo.find({ order: { id: 'ASC' } });
  }

  async findByCodes(codes: string[]) {
    const roles = await this.roleRepo.find({
      where: codes.map((code) => ({ code })),
    });

    if (roles.length !== codes.length) {
      const found = roles.map((r) => r.code);
      const missing = codes.filter((c) => !found.includes(c));
      throw new NotFoundException(`Roles not found: ${missing.join(', ')}`);
    }

    return roles;
  }
}