import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SupplyPurchaseService } from './supply-purchase.service';
import { LastPurchasesBatchDto, RecentSuppliersBatchDto } from './dto/supply-purchase.dto';

type AuthReq = Request & { user: { id: number } };

@UseGuards(JwtAuthGuard)
@Controller('supply')
export class SupplyPurchaseController {
  constructor(private readonly purchaseService: SupplyPurchaseService) {}

  @Get('materials/:materialId/last-purchase')
  getLastPurchase(
    @Req() _req: AuthReq,
    @Param('materialId') materialId: string,
    @Query('projectId') projectId?: string,
  ) {
    const pid = projectId ? Number(projectId) : undefined;
    return this.purchaseService.getLastPurchase(Number(materialId), pid);
  }

  @Get('materials/:materialId/recent-suppliers')
  getRecentSuppliers(
    @Req() _req: AuthReq,
    @Param('materialId') materialId: string,
    @Query('limit') limit?: string,
    @Query('projectId') projectId?: string,
  ) {
    const lim = limit ? Math.min(10, Math.max(1, Number(limit))) : 3;
    const pid = projectId ? Number(projectId) : undefined;
    return this.purchaseService.getRecentSuppliers(Number(materialId), lim, pid);
  }

  @Post('materials/last-purchases')
  getLastPurchasesBatch(@Req() _req: AuthReq, @Body() dto: LastPurchasesBatchDto) {
    return this.purchaseService.getLastPurchasesBatch(dto.materialIds ?? [], dto.projectId);
  }

  @Post('materials/recent-suppliers')
  getRecentSuppliersBatch(@Req() _req: AuthReq, @Body() dto: RecentSuppliersBatchDto) {
    return this.purchaseService.getRecentSuppliersBatch(
      dto.materialIds ?? [],
      dto.projectId,
      dto.limit ?? 3,
    );
  }
}
