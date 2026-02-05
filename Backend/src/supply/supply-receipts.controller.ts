import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SupplyReceiptService } from './supply-receipt.service';
import { UpdateSupplyReceiptDto } from './dto/supply-receipt.dto';
import { SetSubstitutionDto } from './dto/set-substitution.dto';

type AuthReq = Request & { user: { id: number } };

@UseGuards(JwtAuthGuard)
@Controller('supply/receipts')
export class SupplyReceiptsController {
  constructor(private readonly service: SupplyReceiptService) {}

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

  @Patch(':id')
  update(@Req() req: AuthReq, @Param('id') id: string, @Body() dto: UpdateSupplyReceiptDto) {
    return this.service.update(req.user.id, Number(id), dto);
  }

  @Post(':id/receive')
  receive(@Req() req: AuthReq, @Param('id') id: string) {
    return this.service.receive(req.user.id, Number(id));
  }

  @Post(':id/verify')
  verify(@Req() req: AuthReq, @Param('id') id: string) {
    return this.service.verify(req.user.id, Number(id));
  }

  @Post(':id/send-to-pay')
  sendToPay(@Req() req: AuthReq, @Param('id') id: string) {
    return this.service.sendToPay(req.user.id, Number(id));
  }

  @Post(':id/fill-prices-from-last')
  fillPricesFromLast(@Req() req: AuthReq, @Param('id') id: string) {
    return this.service.fillPricesFromLast(req.user.id, Number(id));
  }

  @Post(':id/refill-from-remaining')
  refillFromRemaining(@Req() req: AuthReq, @Param('id') id: string) {
    return this.service.refillFromRemaining(req.user.id, Number(id));
  }

  @Post(':receiptId/items/:itemId/set-substitution')
  setSubstitution(@Req() req: AuthReq, @Param('receiptId') receiptId: string, @Param('itemId') itemId: string, @Body() dto: SetSubstitutionDto) {
    return this.service.setSubstitution(req.user.id, Number(receiptId), Number(itemId), dto);
  }

  @Post(':receiptId/items/:itemId/clear-substitution')
  clearSubstitution(@Req() req: AuthReq, @Param('receiptId') receiptId: string, @Param('itemId') itemId: string) {
    return this.service.clearSubstitution(req.user.id, Number(receiptId), Number(itemId));
  }
}
