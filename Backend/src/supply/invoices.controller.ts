import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoicesQueryDto } from './dto/invoices-query.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Permissions('supply:read')
  @Get()
  findAll(@Query() q: InvoicesQueryDto) {
    return this.service.findAll(q);
  }

  @Permissions('supply:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
  }

  @Permissions('supply:write')
  @Post()
  create(@Body() dto: CreateInvoiceDto, @Req() req: any) {
    return this.service.create(dto, req?.user?.id);
  }

  @Permissions('supply:write')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.service.update(Number(id), dto);
  }

  @Permissions('supply:write')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }

  @Permissions('supply:read')
  @Get(':id/pdf')
  async pdf(@Param('id') id: string, @Res() res: Response) {
    const buf = await this.service.generatePdf(Number(id));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice_${id}.pdf"`);
    res.send(buf);
  }
}
