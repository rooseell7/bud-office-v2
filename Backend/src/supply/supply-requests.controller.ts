import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SupplyRequestService } from './supply-request.service';
import { CreateSupplyRequestDto, UpdateSupplyRequestDto } from './dto/supply-request.dto';
import { SaveRequestAsTemplateDto } from './dto/supply-template.dto';
import { CreateOrdersByPlanDto } from './dto/create-orders-by-plan.dto';

type AuthReq = Request & { user: { id: number } };

@UseGuards(JwtAuthGuard)
@Controller('supply/requests')
export class SupplyRequestsController {
  constructor(private readonly service: SupplyRequestService) {}

  @Get()
  findAll(@Req() req: AuthReq, @Query('projectId') projectId?: string, @Query('status') status?: string) {
    const pid = projectId ? Number(projectId) : undefined;
    return this.service.findAll(req.user.id, pid, status);
  }

  @Post()
  create(@Req() req: AuthReq, @Body() dto: CreateSupplyRequestDto) {
    return this.service.create(req.user.id, dto);
  }

  @Get(':id/purchase-plan')
  getPurchasePlan(@Req() req: AuthReq, @Param('id') id: string, @Query('projectId') projectId?: string) {
    const pid = projectId ? Number(projectId) : undefined;
    return this.service.getPurchasePlan(req.user.id, Number(id), pid);
  }

  @Get(':id')
  findOne(@Req() req: AuthReq, @Param('id') id: string) {
    return this.service.findOne(req.user.id, Number(id));
  }

  @Patch(':id')
  update(@Req() req: AuthReq, @Param('id') id: string, @Body() dto: UpdateSupplyRequestDto) {
    return this.service.update(req.user.id, Number(id), dto);
  }

  @Post(':id/submit')
  submit(@Req() req: AuthReq, @Param('id') id: string) {
    return this.service.submit(req.user.id, Number(id));
  }

  @Post(':id/close')
  close(@Req() req: AuthReq, @Param('id') id: string) {
    return this.service.close(req.user.id, Number(id));
  }

  @Post(':id/create-order')
  createOrder(@Req() req: AuthReq, @Param('id') id: string) {
    return this.service.createOrder(req.user.id, Number(id));
  }

  @Post(':id/create-orders-by-plan')
  createOrdersByPlan(@Req() req: AuthReq, @Param('id') id: string, @Body() dto: CreateOrdersByPlanDto) {
    return this.service.createOrdersByPlan(req.user.id, Number(id), dto);
  }

  @Post(':id/save-as-template')
  saveAsTemplate(@Req() req: AuthReq, @Param('id') id: string, @Body() dto: SaveRequestAsTemplateDto) {
    return this.service.saveAsTemplate(req.user.id, Number(id), dto);
  }
}
