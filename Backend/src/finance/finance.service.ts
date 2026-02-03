import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './wallet.entity';
import { Transaction, TransactionType } from './transaction.entity';
import { Category } from './category.entity';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { CreateTransactionInDto } from './dto/create-transaction-in.dto';
import { CreateTransactionOutDto } from './dto/create-transaction-out.dto';
import { CreateTransactionTransferDto } from './dto/create-transaction-transfer.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

export type WalletDto = {
  id: number;
  name: string;
  type: string;
  currency: string;
  isActive: boolean;
  details: string | null;
  balance?: number;
  balanceUAH?: number;
};

export type BalanceDto = {
  walletId: number;
  walletName: string;
  currency: string;
  balance: number;
  balanceUAH: number;
};

export type TransactionDto = {
  id: number;
  type: string;
  date: string;
  walletId: number | null;
  fromWalletId: number | null;
  toWalletId: number | null;
  amount: number;
  currency: string;
  fxRate: number | null;
  amountUAH: number | null;
  projectId: number | null;
  categoryId: number | null;
  counterparty: string | null;
  comment: string | null;
  createdAt: string;
};

export type CategoryDto = { id: number; name: string; direction: string; isActive: boolean };

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  private num(n: unknown): number {
    if (typeof n === 'number' && !Number.isNaN(n)) return n;
    const x = Number(n);
    return Number.isFinite(x) ? x : 0;
  }

  async getWallets(activeOnly = true): Promise<WalletDto[]> {
    const wallets = await this.walletRepo.find({
      where: activeOnly ? { isActive: true } : undefined,
      order: { type: 'ASC', name: 'ASC' },
    });
    const balances = await this.getBalances();
    const balanceMap = new Map(balances.map((b) => [b.walletId, b]));
    return wallets.map((w) => ({
      id: w.id,
      name: w.name,
      type: w.type,
      currency: w.currency,
      isActive: w.isActive,
      details: w.details ?? null,
      balance: balanceMap.get(w.id)?.balance ?? 0,
      balanceUAH: balanceMap.get(w.id)?.balanceUAH ?? 0,
    }));
  }

  async createWallet(dto: CreateWalletDto): Promise<WalletDto> {
    const w = this.walletRepo.create({
      name: dto.name,
      type: (dto.type as any) ?? 'cash',
      currency: dto.currency,
      isActive: dto.isActive ?? true,
      details: dto.details ?? null,
    });
    const saved = await this.walletRepo.save(w);
    return {
      id: saved.id,
      name: saved.name,
      type: saved.type,
      currency: saved.currency,
      isActive: saved.isActive,
      details: saved.details ?? null,
      balance: 0,
      balanceUAH: 0,
    };
  }

  async updateWallet(id: number, dto: UpdateWalletDto): Promise<WalletDto> {
    const w = await this.walletRepo.findOne({ where: { id } });
    if (!w) throw new NotFoundException('Гаманець не знайдено');
    if (dto.name !== undefined) w.name = dto.name;
    if (dto.type !== undefined) w.type = dto.type as any;
    if (dto.currency !== undefined) w.currency = dto.currency;
    if (dto.isActive !== undefined) w.isActive = dto.isActive;
    if (dto.details !== undefined) w.details = dto.details ?? null;
    await this.walletRepo.save(w);
    const list = await this.getWallets(false);
    return list.find((x) => x.id === id)!;
  }

  async getCategories(direction?: 'in' | 'out'): Promise<CategoryDto[]> {
    const where: any = { isActive: true };
    if (direction) where.direction = direction;
    const list = await this.categoryRepo.find({ where, order: { name: 'ASC' } });
    return list.map((c) => ({
      id: c.id,
      name: c.name,
      direction: c.direction,
      isActive: c.isActive,
    }));
  }

  async getBalances(): Promise<BalanceDto[]> {
    const wallets = await this.walletRepo.find({ where: { isActive: true }, order: { id: 'ASC' } });
    const result: BalanceDto[] = [];
    for (const w of wallets) {
      const { balance, balanceUAH } = await this.computeWalletBalance(w.id);
      result.push({
        walletId: w.id,
        walletName: w.name,
        currency: w.currency,
        balance,
        balanceUAH,
      });
    }
    return result;
  }

  private async computeWalletBalance(walletId: number): Promise<{ balance: number; balanceUAH: number }> {
    const qb = this.txRepo
      .createQueryBuilder('t')
      .select(
        `COALESCE(SUM(CASE WHEN t.walletId = :wid AND t.type = 'in' THEN t.amount ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN t.walletId = :wid AND t.type = 'out' THEN t.amount ELSE 0 END), 0) + COALESCE(SUM(CASE WHEN t.toWalletId = :wid AND t.type = 'transfer' THEN t.amount ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN t.fromWalletId = :wid AND t.type = 'transfer' THEN t.amount ELSE 0 END), 0)`,
        'balance',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN t.walletId = :wid AND t.type = 'in' THEN COALESCE(t.amountUAH, t.amount) ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN t.walletId = :wid AND t.type = 'out' THEN COALESCE(t.amountUAH, t.amount) ELSE 0 END), 0) + COALESCE(SUM(CASE WHEN t.toWalletId = :wid AND t.type = 'transfer' THEN COALESCE(t.amountUAH, t.amount) ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN t.fromWalletId = :wid AND t.type = 'transfer' THEN COALESCE(t.amountUAH, t.amount) ELSE 0 END), 0)`,
        'balanceUAH',
      )
      .where(
        '(t.walletId = :wid OR t.fromWalletId = :wid OR t.toWalletId = :wid)',
        { wid: walletId },
      );
    const raw = await qb.getRawOne<{ balance: string; balanceUAH: string }>();
    return {
      balance: this.num(raw?.balance ?? 0),
      balanceUAH: this.num(raw?.balanceUAH ?? 0),
    };
  }

  async getTransactions(filters: {
    fromDate?: string;
    toDate?: string;
    walletId?: number;
    projectId?: number;
    categoryId?: number;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: TransactionDto[]; total: number }> {
    const qb = this.txRepo
      .createQueryBuilder('t')
      .orderBy('t.date', 'DESC')
      .addOrderBy('t.id', 'DESC');

    if (filters.fromDate) {
      qb.andWhere('t.date >= :fromDate', { fromDate: filters.fromDate });
    }
    if (filters.toDate) {
      qb.andWhere('t.date <= :toDate', { toDate: filters.toDate });
    }
    if (filters.walletId) {
      qb.andWhere('(t.walletId = :walletId OR t.fromWalletId = :walletId OR t.toWalletId = :walletId)', {
        walletId: filters.walletId,
      });
    }
    if (filters.projectId) {
      qb.andWhere('t.projectId = :projectId', { projectId: filters.projectId });
    }
    if (filters.categoryId) {
      qb.andWhere('t.categoryId = :categoryId', { categoryId: filters.categoryId });
    }
    if (filters.type) {
      qb.andWhere('t.type = :type', { type: filters.type });
    }

    const total = await qb.getCount();
    const limit = Math.min(100, Math.max(1, filters.limit ?? 50));
    const offset = Math.max(0, filters.offset ?? 0);
    qb.take(limit).skip(offset);

    const list = await qb.getMany();
    const items: TransactionDto[] = list.map((t) => ({
      id: t.id,
      type: t.type,
      date: typeof t.date === 'string' ? t.date : (t.date as Date).toISOString().slice(0, 10),
      walletId: t.walletId,
      fromWalletId: t.fromWalletId,
      toWalletId: t.toWalletId,
      amount: this.num(t.amount),
      currency: t.currency,
      fxRate: t.fxRate != null ? this.num(t.fxRate) : null,
      amountUAH: t.amountUAH != null ? this.num(t.amountUAH) : null,
      projectId: t.projectId,
      categoryId: t.categoryId,
      counterparty: t.counterparty ?? null,
      comment: t.comment ?? null,
      createdAt: t.createdAt?.toISOString?.() ?? '',
    }));
    return { items, total };
  }

  async createIn(userId: number, dto: CreateTransactionInDto): Promise<TransactionDto> {
    const wallet = await this.walletRepo.findOne({ where: { id: dto.walletId } });
    if (!wallet) throw new NotFoundException('Гаманець не знайдено');
    const amount = this.num(dto.amount);
    const isUAH = dto.currency.toUpperCase() === 'UAH';
    const amountUAH = isUAH ? amount : (dto.amountUAH != null ? this.num(dto.amountUAH) : dto.fxRate != null ? amount * this.num(dto.fxRate) : null);
    const tx = this.txRepo.create({
      type: TransactionType.IN,
      date: new Date(dto.date),
      walletId: dto.walletId,
      fromWalletId: null,
      toWalletId: null,
      amount,
      currency: dto.currency,
      fxRate: dto.fxRate ?? null,
      amountUAH: amountUAH ?? null,
      projectId: dto.projectId ?? null,
      categoryId: dto.categoryId ?? null,
      counterparty: dto.counterparty ?? null,
      comment: dto.comment ?? null,
      createdById: userId,
    });
    const saved = await this.txRepo.save(tx);
    return this.toDto(saved);
  }

  async createOut(userId: number, dto: CreateTransactionOutDto): Promise<TransactionDto> {
    const wallet = await this.walletRepo.findOne({ where: { id: dto.walletId } });
    if (!wallet) throw new NotFoundException('Гаманець не знайдено');
    const amount = this.num(dto.amount);
    const isUAH = dto.currency.toUpperCase() === 'UAH';
    const amountUAH = isUAH ? amount : (dto.amountUAH != null ? this.num(dto.amountUAH) : dto.fxRate != null ? amount * this.num(dto.fxRate) : null);
    const tx = this.txRepo.create({
      type: TransactionType.OUT,
      date: new Date(dto.date),
      walletId: dto.walletId,
      fromWalletId: null,
      toWalletId: null,
      amount,
      currency: dto.currency,
      fxRate: dto.fxRate ?? null,
      amountUAH: amountUAH ?? null,
      projectId: dto.projectId ?? null,
      categoryId: dto.categoryId ?? null,
      counterparty: dto.counterparty ?? null,
      comment: dto.comment ?? null,
      createdById: userId,
    });
    const saved = await this.txRepo.save(tx);
    return this.toDto(saved);
  }

  async createTransfer(userId: number, dto: CreateTransactionTransferDto): Promise<TransactionDto> {
    const fromW = await this.walletRepo.findOne({ where: { id: dto.fromWalletId } });
    const toW = await this.walletRepo.findOne({ where: { id: dto.toWalletId } });
    if (!fromW || !toW) throw new NotFoundException('Гаманець не знайдено');
    if (dto.fromWalletId === dto.toWalletId) throw new BadRequestException('Один і той самий гаманець');
    const amount = this.num(dto.amount);
    const isUAH = dto.currency.toUpperCase() === 'UAH';
    const amountUAH = isUAH ? amount : (dto.amountUAH != null ? this.num(dto.amountUAH) : dto.fxRate != null ? amount * this.num(dto.fxRate) : null);
    const tx = this.txRepo.create({
      type: TransactionType.TRANSFER,
      date: new Date(dto.date),
      walletId: null,
      fromWalletId: dto.fromWalletId,
      toWalletId: dto.toWalletId,
      amount,
      currency: dto.currency,
      fxRate: dto.fxRate ?? null,
      amountUAH: amountUAH ?? null,
      projectId: null,
      categoryId: null,
      counterparty: null,
      comment: dto.comment ?? null,
      createdById: userId,
    });
    const saved = await this.txRepo.save(tx);
    return this.toDto(saved);
  }

  async updateTransaction(id: number, userId: number, dto: UpdateTransactionDto): Promise<TransactionDto> {
    const tx = await this.txRepo.findOne({ where: { id } });
    if (!tx) throw new NotFoundException('Транзакцію не знайдено');
    if (dto.date !== undefined) tx.date = new Date(dto.date);
    if (dto.walletId !== undefined) tx.walletId = dto.walletId;
    if (dto.amount !== undefined) tx.amount = dto.amount as any;
    if (dto.currency !== undefined) tx.currency = dto.currency;
    if (dto.fxRate !== undefined) tx.fxRate = dto.fxRate;
    if (dto.amountUAH !== undefined) tx.amountUAH = dto.amountUAH as any;
    if (dto.projectId !== undefined) tx.projectId = dto.projectId;
    if (dto.categoryId !== undefined) tx.categoryId = dto.categoryId;
    if (dto.counterparty !== undefined) tx.counterparty = dto.counterparty;
    if (dto.comment !== undefined) tx.comment = dto.comment;
    const saved = await this.txRepo.save(tx);
    return this.toDto(saved);
  }

  async getProjectSummary(projectId: number): Promise<{ inUAH: number; outUAH: number; balanceUAH: number }> {
    const inSum = await this.txRepo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(COALESCE(t.amountUAH, t.amount)), 0)', 's')
      .where('t.projectId = :projectId', { projectId })
      .andWhere('t.type = :type', { type: TransactionType.IN })
      .getRawOne<{ s: string }>();
    const outSum = await this.txRepo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(COALESCE(t.amountUAH, t.amount)), 0)', 's')
      .where('t.projectId = :projectId', { projectId })
      .andWhere('t.type = :type', { type: TransactionType.OUT })
      .getRawOne<{ s: string }>();
    const inUAH = this.num(inSum?.s ?? 0);
    const outUAH = this.num(outSum?.s ?? 0);
    return { inUAH, outUAH, balanceUAH: inUAH - outUAH };
  }

  private toDto(t: Transaction): TransactionDto {
    return {
      id: t.id,
      type: t.type,
      date: typeof t.date === 'string' ? t.date : (t.date as Date).toISOString().slice(0, 10),
      walletId: t.walletId,
      fromWalletId: t.fromWalletId,
      toWalletId: t.toWalletId,
      amount: this.num(t.amount),
      currency: t.currency,
      fxRate: t.fxRate != null ? this.num(t.fxRate) : null,
      amountUAH: t.amountUAH != null ? this.num(t.amountUAH) : null,
      projectId: t.projectId,
      categoryId: t.categoryId,
      counterparty: t.counterparty ?? null,
      comment: t.comment ?? null,
      createdAt: t.createdAt?.toISOString?.() ?? '',
    };
  }
}
