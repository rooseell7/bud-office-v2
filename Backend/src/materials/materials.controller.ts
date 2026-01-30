// FILE: bud_office-backend/src/materials/materials.controller.ts

import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { MaterialsService } from './materials.service';
import { MaterialsQueryDto } from './dto/materials-query.dto';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('materials')
export class MaterialsController {
  constructor(private readonly service: MaterialsService) {}

  @Permissions('supply:read', 'sales:read')
  @Get()
  findAll(@Query() query: MaterialsQueryDto) {
    return this.service.findAll(query);
  }

  @Permissions('supply:write')
  @Post()
  create(@Body() dto: CreateMaterialDto) {
    return this.service.create(dto);
  }

  @Permissions('supply:write')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMaterialDto) {
    return this.service.update(id, dto);
  }

  // архівація = керівна дія
  @Permissions('supply:approve')
  @Post(':id/archive')
  archive(@Param('id') id: string) {
    return this.service.archive(Number(id));
  }
}
