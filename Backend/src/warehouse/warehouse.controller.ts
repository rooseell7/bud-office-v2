// FILE: bud_office-backend/src/warehouse/warehouse.controller.ts

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Param,
  Query,
} from '@nestjs/common';
import type { Request } from 'express';

import { WarehouseService } from './warehouse.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { WarehouseInDto } from './dto/warehouse-in.dto';
import { WarehouseOutDto } from './dto/warehouse-out.dto';
import { WarehouseTransferDto } from './dto/warehouse-transfer.dto';
import { SaveWarehouseMovementDraftDto } from './dto/save-warehouse-movement-draft.dto';
import { WarehouseMovementsQueryDto } from './dto/warehouse-movements-query.dto';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('warehouse')
export class WarehouseController {
  constructor(private readonly service: WarehouseService) {}

  // =========================
  // WRITE ENDPOINTS
  // =========================

  /**
   * Оприбуткування (IN)
   * Було: admin + supply_head + supply_manager
   * Тепер: warehouse:write
   */
  @Permissions('warehouse:write')
  @Post('in')
  in(@Req() req: Request, @Body() dto: WarehouseInDto) {
    const userId = Number((req as any).user?.id);
    return this.service.in(userId, dto);
  }

  /**
   * Списання / видача (OUT)
   * Було: admin + supply_head
   * Тепер: warehouse:write
   */
  @Permissions('warehouse:write')
  @Post('out')
  out(@Req() req: Request, @Body() dto: WarehouseOutDto) {
    const userId = Number((req as any).user?.id);
    return this.service.out(userId, dto);
  }

  /**
   * Переміщення (TRANSFER)
   * Було: admin + supply_head
   * Тепер: warehouse:write + warehouse:transfer
   */
  @Permissions('warehouse:write', 'warehouse:transfer')
  @Post('transfer')
  transfer(@Req() req: Request, @Body() dto: WarehouseTransferDto) {
    const userId = Number((req as any).user?.id);
    return this.service.transfer(userId, dto);
  }

  // =========================
  // READ ENDPOINTS
  // =========================

  /**
   * Загальні залишки (всі склади)
   * Було: admin, supply_head, sales_head, sales_manager_head, supply_manager, estimator
   * Тепер: warehouse:read
   */
  @Permissions('warehouse:read')
  @Get('balance')
  balance() {
    return this.service.balance();
  }

  /**
   * Залишки по конкретному складу
   */
  @Permissions('warehouse:read')
  @Get('balance/:warehouseId')
  balanceByWarehouse(@Param('warehouseId') warehouseId: string) {
    return this.service.balanceByWarehouse(Number(warehouseId));
  }

  /**
   * Журнал операцій по складу (IN / OUT / TRANSFER)
   * + фільтри: type, materialId, dateFrom/dateTo, offset/limit, q, (опційно projectId/fromWarehouseId/toWarehouseId)
   */
  @Permissions('warehouse:read')
  @Get('movements/:warehouseId')
  movementsByWarehouse(
    @Param('warehouseId') warehouseId: string,
    @Query() query: WarehouseMovementsQueryDto,
  ) {
    return this.service.movementsByWarehouse(Number(warehouseId), query);
  }

  /**
   * Чернетка операції по складу (для поточного користувача)
   * GET /warehouse/movements/draft/:warehouseId
   */
  @Permissions('warehouse:read')
  @Get('movements/draft/:warehouseId')
  getMovementDraft(@Req() req: Request, @Param('warehouseId') warehouseId: string) {
    const userId = Number((req as any).user?.id);
    return this.service.getMovementDraft(userId, Number(warehouseId));
  }

  /**
   * Зберегти/оновити чернетку операції (для поточного користувача)
   * POST /warehouse/movements/draft
   */
  @Permissions('warehouse:read')
  @Post('movements/draft')
  saveMovementDraft(@Req() req: Request, @Body() dto: SaveWarehouseMovementDraftDto) {
    const userId = Number((req as any).user?.id);
    return this.service.saveMovementDraft(userId, dto);
  }

  /**
   * Видалити чернетку операції (для поточного користувача)
   * DELETE /warehouse/movements/draft/:warehouseId
   */
  @Permissions('warehouse:read')
  @Post('movements/draft/:warehouseId/delete')
  deleteMovementDraft(@Req() req: Request, @Param('warehouseId') warehouseId: string) {
    const userId = Number((req as any).user?.id);
    return this.service.deleteMovementDraft(userId, Number(warehouseId));
  }
}