import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SupplyTemplatesService } from './supply-templates.service';
import {
  CreateSupplyRequestTemplateDto,
  UpdateSupplyRequestTemplateDto,
  CreateRequestFromTemplateDto,
} from './dto/supply-template.dto';

type AuthReq = Request & { user: { id: number } };

@UseGuards(JwtAuthGuard)
@Controller('supply/templates')
export class SupplyTemplatesController {
  constructor(private readonly service: SupplyTemplatesService) {}

  @Get()
  findAll(@Req() req: AuthReq, @Query('projectId') projectId?: string) {
    const pid = projectId ? Number(projectId) : undefined;
    return this.service.findAll(req.user.id, pid);
  }

  @Post()
  create(@Req() req: AuthReq, @Body() dto: CreateSupplyRequestTemplateDto) {
    return this.service.create(req.user.id, dto);
  }

  @Get(':id')
  findOne(@Req() req: AuthReq, @Param('id') id: string) {
    return this.service.findOne(req.user.id, Number(id));
  }

  @Patch(':id')
  update(@Req() req: AuthReq, @Param('id') id: string, @Body() dto: UpdateSupplyRequestTemplateDto) {
    return this.service.update(req.user.id, Number(id), dto);
  }

  @Post(':id/create-request')
  createRequestFromTemplate(
    @Req() req: AuthReq,
    @Param('id') id: string,
    @Body() dto: CreateRequestFromTemplateDto,
  ) {
    return this.service.createRequestFromTemplate(req.user.id, Number(id), dto);
  }
}
