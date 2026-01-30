// FILE: bud_office-backend/src/materials/materials-dicts.controller.ts

import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { MaterialCategory } from './entities/material-category.entity';
import { Unit } from './entities/unit.entity';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('materials-dicts')
export class MaterialsDictsController {
  constructor(
    @InjectRepository(MaterialCategory)
    private readonly catRepo: Repository<MaterialCategory>,
    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
  ) {}

  // Довідник категорій потрібен для supply/sales/estimator → read
  @Permissions('supply:read', 'sales:read')
  @Get('categories')
  async categories() {
    return this.catRepo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  // Довідник одиниць потрібен для supply/sales/estimator → read
  @Permissions('supply:read', 'sales:read')
  @Get('units')
  async units() {
    return this.unitRepo.find({
      where: { isActive: true },
      order: { code: 'ASC' },
    });
  }
}
