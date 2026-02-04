import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SupplyPayableService } from './supply-payable.service';
import { AddPaymentDto } from './dto/payment.dto';

type AuthReq = Request & { user: { id: number } };

@UseGuards(JwtAuthGuard)
@Controller('supply/payables')
export class SupplyPayablesController {
  constructor(private readonly service: SupplyPayableService) {}

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

  @Get(':id')
  findOne(@Req() req: AuthReq, @Param('id') id: string) {
    return this.service.findOne(req.user.id, Number(id));
  }

  @Post(':id/payments')
  addPayment(@Req() req: AuthReq, @Param('id') id: string, @Body() dto: AddPaymentDto) {
    return this.service.addPayment(req.user.id, Number(id), dto);
  }
}
