// FILE: bud_office-backend/src/supply/materials.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { MaterialsService } from './materials.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('supply/materials')
export class MaterialsController {
  constructor(private readonly service: MaterialsService) {}

  @Permissions('supply:read')
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Permissions('supply:read')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Permissions('supply:write')
  @Post()
  create(@Body() dto: CreateMaterialDto) {
    return this.service.create(dto);
  }

  @Permissions('supply:write')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMaterialDto,
  ) {
    return this.service.update(id, dto);
  }

  @Permissions('supply:approve')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
