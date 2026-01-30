// FILE: bud_office-backend/src/acts/acts.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { ActsService } from './acts.service';
import { CreateActDto } from './dto/create-act.dto';
import { UpdateActDto } from './dto/update-act.dto';
import { CreateActFromQuoteDto } from './dto/create-act-from-quote.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('acts')
export class ActsController {
  constructor(private readonly service: ActsService) {}

  @Permissions('delivery:read')
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Permissions('delivery:read')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Permissions('delivery:write')
  @Post()
  create(@Body() dto: CreateActDto, @Req() req: Request) {
    return this.service.create(dto, req);
  }

  /**
   * Створення акту на базі Кошторису (КП), який збережений як Document(type='quote')
   */
  @Permissions('delivery:write')
  @Post('from-quote')
  createFromQuote(@Body() dto: CreateActFromQuoteDto, @Req() req: Request) {
    return this.service.createFromQuote(dto, req);
  }

  @Permissions('delivery:write')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateActDto, @Req() req: Request) {
    return this.service.update(id, dto, req);
  }

  @Permissions('delivery:approve')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
