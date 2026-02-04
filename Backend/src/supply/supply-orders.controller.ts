import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SupplyOrderService } from './supply-order.service';
import { CreateSupplyOrderDto, UpdateSupplyOrderDto, SetOrderStatusDto } from './dto/supply-order.dto';

type AuthReq = Request & { user: { id: number } };

@UseGuards(JwtAuthGuard)
@Controller('supply/orders')
export class SupplyOrdersController {
  constructor(private readonly service: SupplyOrderService) {}

  @Get()
  findAll(
    @Req() req: AuthReq,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
  ) {
    const pid = projectId ? Number(projectId) : undefined;
    const sid = supplierId ? Number(supplierId) : undefined;
    return this.service.findAll(req.user.id, pid, status, sid);
  }

  @Post()
  create(@Req() req: AuthReq, @Body() dto: CreateSupplyOrderDto) {
    return this.service.create(req.user.id, dto);
  }

  @Get(':id')
  findOne(@Req() req: AuthReq, @Param('id') id: string) {
    return this.service.findOne(req.user.id, Number(id));
  }

  @Patch(':id')
  update(@Req() req: AuthReq, @Param('id') id: string, @Body() dto: UpdateSupplyOrderDto) {
    return this.service.update(req.user.id, Number(id), dto);
  }

  @Post(':id/set-status')
  setStatus(@Req() req: AuthReq, @Param('id') id: string, @Body() body: SetOrderStatusDto) {
    return this.service.setStatus(req.user.id, Number(id), body.status);
  }

  @Post(':id/create-receipt')
  createReceipt(@Req() req: AuthReq, @Param('id') id: string) {
    return this.service.createReceipt(req.user.id, Number(id));
  }
}
