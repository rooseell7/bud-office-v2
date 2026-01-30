// FILE: bud_office-backend/src/clients/clients.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { ClientService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

type AuthedRequest = Request & { user: { id: string; roles?: string[] } };

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Permissions('sales:write')
  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateClientDto) {
    return this.clientService.create(req.user.id, dto);
  }

  @Permissions('sales:read')
  @Get()
  findAll(@Req() req: AuthedRequest) {
    return this.clientService.findAll(req.user.id);
  }

  @Permissions('sales:read')
  @Get(':id')
  findOne(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.clientService.findOne(id, req.user.id);
  }

  @Permissions('sales:write')
  @Patch(':id')
  update(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientService.update(id, req.user.id, dto);
  }

  @Permissions('sales:approve')
  @Delete(':id')
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.clientService.remove(id, req.user.id);
  }
}
