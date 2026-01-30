import {
  Body,
  Controller,
  Delete,
  Get,
  Req,
  ForbiddenException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { WarehousesService } from './warehouses.service';
import { CreateWarehouseMovementDto } from './dto/create-warehouse-movement.dto';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly service: WarehousesService) {}

  /**
   * Список складів (довідник)
   * Було: admin + supply_head + sales_head + ... + estimator
   * Тепер: warehouse:read
   */
  @Permissions('warehouse:read')
  @Get()
  findAll() {
    return this.service.findAll();
  }

  /**
   * Деталі складу (для фронту /warehouses/:id — header)
   * Тепер: warehouse:read
   */
  @Permissions('warehouse:read')
  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.getWarehouse(id);
  }

  /**
   * Створити склад
   * Було: admin + supply_head
   * Тепер: warehouse:approve (керівний рівень)
   */
  @Permissions('warehouse:approve')
  @Post()
  create(@Body() body: { name: string }) {
    return this.service.create(body?.name);
  }

  /**
   * Деактивувати склад
   * Було: admin + supply_head
   * Тепер: warehouse:approve
   */
  @Permissions('warehouse:approve')
  @Delete(':id')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.deactivate(id);
  }

  // ========= ДЛЯ ФРОНТУ =========

  /**
   * Залишки по складу (для /warehouses/:id → вкладка "Залишки")
   * Було: admin + supply_head + sales_head + ... + estimator
   * Тепер: warehouse:read
   */
  @Permissions('warehouse:read')
  @Get(':id/balances')
  getBalances(@Param('id', ParseIntPipe) id: number) {
    return this.service.getWarehouseBalances(id);
  }

  /**
   * Операції (movements) по складу (для /warehouses/:id → вкладка "Операції")
   * Було: admin + supply_head + sales_head + ... + estimator
   * Тепер: warehouse:read
   *
   * ПІДТРИМКА ФІЛЬТРУ ДАТ:
   *  - dateFrom=YYYY-MM-DD
   *  - dateTo=YYYY-MM-DD
   */
  @Permissions('warehouse:read')
  @Get(':id/movements')
  getMovements(
    @Param('id', ParseIntPipe) id: number,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.getWarehouseMovements(id, { dateFrom, dateTo });
  }

  /**
   * Створити операцію складу (IN/OUT/TRANSFER)
   * Використовується фронтом: POST /warehouses/:id/movements
   */
  @Permissions('warehouse:write')
  @Post(':id/movements')
  createMovement(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateWarehouseMovementDto,
  ) {
    const userId = Number((req as any).user?.id);
    const perms: string[] = Array.isArray((req as any).user?.permissions)
      ? (req as any).user.permissions
      : [];

    if ((body as any)?.type === 'TRANSFER' && !perms.includes('warehouse:transfer')) {
      // Додатковий дозвіл для TRANSFER
      throw new ForbiddenException('Для TRANSFER потрібен дозвіл warehouse:transfer');
    }
    return this.service.createWarehouseMovement(userId, id, body);
  }

  /**
   * Деталі операції
   */
  @Permissions('warehouse:read')
  @Get(':warehouseId/movements/:movementId')
  getMovementById(
    @Param('warehouseId', ParseIntPipe) warehouseId: number,
    @Param('movementId', ParseIntPipe) movementId: number,
  ) {
    return this.service.getWarehouseMovementById(warehouseId, movementId);
  }
}