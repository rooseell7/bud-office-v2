import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { FinanceService } from './finance.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { CreateTransactionInDto } from './dto/create-transaction-in.dto';
import { CreateTransactionOutDto } from './dto/create-transaction-out.dto';
import { CreateTransactionTransferDto } from './dto/create-transaction-transfer.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  private getUserId(req: any): number {
    return Number(req?.user?.id ?? 0);
  }

  @Permissions('finance:read')
  @Get('wallets')
  getWallets(@Query('all') all?: string) {
    return this.financeService.getWallets(all !== 'true' && all !== '1');
  }

  @Permissions('finance:write', 'finance:admin')
  @Post('wallets')
  createWallet(@Body() dto: CreateWalletDto) {
    return this.financeService.createWallet(dto);
  }

  @Permissions('finance:write', 'finance:admin')
  @Patch('wallets/:id')
  updateWallet(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateWalletDto) {
    return this.financeService.updateWallet(id, dto);
  }

  @Permissions('finance:read')
  @Get('categories')
  getCategories(@Query('direction') direction?: 'in' | 'out') {
    return this.financeService.getCategories(direction);
  }

  @Permissions('finance:read')
  @Get('balances')
  getBalances() {
    return this.financeService.getBalances();
  }

  @Permissions('finance:read')
  @Get('transactions')
  getTransactions(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('walletId') walletId?: string,
    @Query('projectId') projectId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters: any = {};
    if (fromDate) filters.fromDate = fromDate;
    if (toDate) filters.toDate = toDate;
    if (walletId) filters.walletId = parseInt(walletId, 10);
    if (projectId) filters.projectId = parseInt(projectId, 10);
    if (categoryId) filters.categoryId = parseInt(categoryId, 10);
    if (type) filters.type = type;
    if (limit) filters.limit = parseInt(limit, 10);
    if (offset) filters.offset = parseInt(offset, 10);
    return this.financeService.getTransactions(filters);
  }

  @Permissions('finance:write')
  @Post('transactions/in')
  createIn(@Req() req: any, @Body() dto: CreateTransactionInDto) {
    return this.financeService.createIn(this.getUserId(req), dto);
  }

  @Permissions('finance:write')
  @Post('transactions/out')
  createOut(@Req() req: any, @Body() dto: CreateTransactionOutDto) {
    return this.financeService.createOut(this.getUserId(req), dto);
  }

  @Permissions('finance:write')
  @Post('transactions/transfer')
  createTransfer(@Req() req: any, @Body() dto: CreateTransactionTransferDto) {
    return this.financeService.createTransfer(this.getUserId(req), dto);
  }

  @Permissions('finance:write')
  @Patch('transactions/:id')
  updateTransaction(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.financeService.updateTransaction(id, this.getUserId(req), dto);
  }

  @Permissions('finance:read')
  @Get('projects/:id/summary')
  getProjectSummary(@Param('id', ParseIntPipe) id: number) {
    return this.financeService.getProjectSummary(id);
  }
}
