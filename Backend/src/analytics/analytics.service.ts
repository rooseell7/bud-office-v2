import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionType } from '../finance/transaction.entity';
import { Wallet } from '../finance/wallet.entity';
import { Category } from '../finance/category.entity';
import { Project } from '../projects/project.entity';
import { ExecutionTask, ExecutionTaskStatus } from '../execution/execution-task.entity';
import { parseDateRange, parseGroupBy, getDateTruncSql, type GroupBy } from './analytics-date.helper';

function num(n: unknown): number {
  if (typeof n === 'number' && !Number.isNaN(n)) return n;
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

export type OwnerOverviewDto = {
  kpi: {
    incomeUAH: number;
    expenseUAH: number;
    netUAH: number;
    cashOnHandUAH: number;
    activeProjectsCount: number;
    overdueTasksCount: number;
    blockedTasksCount: number;
  };
  cashflowSeries: Array<{ dateBucket: string; incomeUAH: number; expenseUAH: number }>;
  expenseByCategory: Array<{ categoryId: number; categoryName: string; amountUAH: number }>;
  revenueByProject: Array<{ projectId: number; projectName: string; incomeUAH: number }>;
  projectStatusDistribution: Array<{ status: string; count: number }>;
  taskStatusDistribution: Array<{ status: string; count: number }>;
  dataQuality: {
    transactionsWithoutProjectPct: number;
    transactionsWithoutCategoryPct: number;
    tasksWithoutDueDatePct: number;
    projectsWithoutForemanPct: number;
    stagesWithoutDatesPct: number;
  };
};

export type ProjectPerformanceDto = {
  projectId: number;
  projectName: string;
  status: string;
  foremanName: string | null;
  incomeUAH: number;
  expenseUAH: number;
  netUAH: number;
  openTasksCount: number;
  blockedTasksCount: number;
  overdueTasksCount: number;
  isOverdue: boolean;
};

export type FinanceBreakdownDto = {
  byWallet: Array<{ walletId: number; walletName: string; inUAH: number; outUAH: number; netUAH: number }>;
  byCategory: Array<{ categoryId: number; categoryName: string; amountUAH: number }>;
  topCounterparties: Array<{ counterparty: string; amountUAH: number; count: number }>;
  balances: Array<{ walletId: number; walletName: string; balanceUAH: number }>;
};

export type ExecutionHealthDto = {
  activeProjectsCount: number;
  pausedProjectsCount: number;
  overdueTasksCount: number;
  blockedTasksCount: number;
  tasksByStatus: Array<{ status: string; count: number }>;
  topBlockedReasons: Array<{ reason: string; count: number }>;
};

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ExecutionTask)
    private readonly taskRepo: Repository<ExecutionTask>,
  ) {}

  async getOwnerOverview(
    from?: string,
    to?: string,
    groupBy?: string,
  ): Promise<OwnerOverviewDto> {
    const { fromDate, toDate } = parseDateRange(from, to);
    const gb = parseGroupBy(groupBy);
    const fromStr = fromDate.toISOString().slice(0, 10);
    const toStr = toDate.toISOString().slice(0, 10);

    const dateTrunc = getDateTruncSql(gb, 't.date');

    const [incomeSum, expenseSum, cashflowRows, expenseByCat, revenueByProj, projectStatus, taskStatus, cashOnHand, activeProjects, overdueTasks, blockedTasks, dataQuality] = await Promise.all([
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(COALESCE(t.amountUAH, t.amount)), 0)', 's').where('t.type = :in', { in: TransactionType.IN }).andWhere('t.date >= :from', { from: fromStr }).andWhere('t.date <= :to', { to: toStr }).getRawOne<{ s: string }>(),
      this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(COALESCE(t.amountUAH, t.amount)), 0)', 's').where('t.type = :out', { out: TransactionType.OUT }).andWhere('t.date >= :from', { from: fromStr }).andWhere('t.date <= :to', { to: toStr }).getRawOne<{ s: string }>(),
      this.txRepo.createQueryBuilder('t').select(`${dateTrunc}`, 'dateBucket').addSelect("COALESCE(SUM(CASE WHEN t.type = 'in' THEN COALESCE(t.amountUAH, t.amount) ELSE 0 END), 0)", 'incomeUAH').addSelect("COALESCE(SUM(CASE WHEN t.type = 'out' THEN COALESCE(t.amountUAH, t.amount) ELSE 0 END), 0)", 'expenseUAH').where('t.date >= :from', { from: fromStr }).andWhere('t.date <= :to', { to: toStr }).andWhere('t.type IN (:...types)', { types: [TransactionType.IN, TransactionType.OUT] }).groupBy('"dateBucket"').orderBy('"dateBucket"', 'ASC').getRawMany<{ dateBucket: string; incomeUAH: string; expenseUAH: string }>(),
      this.txRepo.createQueryBuilder('t').innerJoin(Category, 'c', 'c.id = t.categoryId').select('t.categoryId', 'categoryId').addSelect('c.name', 'categoryName').addSelect('COALESCE(SUM(COALESCE(t.amountUAH, t.amount)), 0)', 'amountUAH').where('t.type = :out', { out: TransactionType.OUT }).andWhere('t.date >= :from', { from: fromStr }).andWhere('t.date <= :to', { to: toStr }).groupBy('t.categoryId').addGroupBy('c.name').getRawMany<{ categoryId: number; categoryName: string; amountUAH: string }>(),
      this.txRepo.createQueryBuilder('t').innerJoin(Project, 'p', 'p.id = t.projectId').select('t.projectId', 'projectId').addSelect('p.name', 'projectName').addSelect('COALESCE(SUM(COALESCE(t.amountUAH, t.amount)), 0)', 'incomeUAH').where('t.type = :in', { in: TransactionType.IN }).andWhere('t.date >= :from', { from: fromStr }).andWhere('t.date <= :to', { to: toStr }).andWhere('t.projectId IS NOT NULL').groupBy('t.projectId').addGroupBy('p.name').orderBy('"incomeUAH"', 'DESC').limit(10).getRawMany<{ projectId: number; projectName: string; incomeUAH: string }>(),
      this.projectRepo.createQueryBuilder('p').select('p.status', 'status').addSelect('COUNT(*)', 'count').groupBy('p.status').getRawMany<{ status: string; count: string }>(),
      this.taskRepo.createQueryBuilder('t').select('t.status', 'status').addSelect('COUNT(*)', 'count').where('t.status NOT IN (:...done)', { done: [ExecutionTaskStatus.DONE, ExecutionTaskStatus.CANCELED] }).groupBy('t.status').getRawMany<{ status: string; count: string }>().then((rows) => this.taskRepo.createQueryBuilder('t').select('t.status', 'status').addSelect('COUNT(*)', 'count').groupBy('t.status').getRawMany<{ status: string; count: string }>()),
      this.getCashOnHandUAH(),
      this.projectRepo.count({ where: { status: 'in_progress' as any } }).catch(() => 0),
      this.taskRepo.createQueryBuilder('t').where('t.status IN (:...open)', { open: [ExecutionTaskStatus.NEW, ExecutionTaskStatus.IN_PROGRESS, ExecutionTaskStatus.BLOCKED] }).andWhere('t.dueDate IS NOT NULL').andWhere('t.dueDate < CURRENT_DATE').getCount(),
      this.taskRepo.count({ where: { status: ExecutionTaskStatus.BLOCKED } }).catch(() => 0),
      this.getDataQuality(),
    ]);

    const incomeUAH = num(incomeSum?.s ?? 0);
    const expenseUAH = num(expenseSum?.s ?? 0);
    const taskStatusAll = await this.taskRepo.createQueryBuilder('t').select('t.status', 'status').addSelect('COUNT(*)', 'count').groupBy('t.status').getRawMany<{ status: string; count: string }>();

    return {
      kpi: {
        incomeUAH,
        expenseUAH,
        netUAH: incomeUAH - expenseUAH,
        cashOnHandUAH: cashOnHand,
        activeProjectsCount: activeProjects ?? 0,
        overdueTasksCount: overdueTasks ?? 0,
        blockedTasksCount: blockedTasks ?? 0,
      },
      cashflowSeries: (cashflowRows ?? []).map((r) => ({
        dateBucket: r.dateBucket ? (typeof r.dateBucket === 'string' ? r.dateBucket : (r.dateBucket as Date).toISOString?.()?.slice(0, 10) ?? '') : '',
        incomeUAH: num(r.incomeUAH),
        expenseUAH: num(r.expenseUAH),
      })),
      expenseByCategory: (expenseByCat ?? []).map((r) => ({
        categoryId: r.categoryId,
        categoryName: r.categoryName ?? 'Невідомо',
        amountUAH: num(r.amountUAH),
      })),
      revenueByProject: (revenueByProj ?? []).map((r) => ({
        projectId: r.projectId,
        projectName: r.projectName ?? 'Невідомо',
        incomeUAH: num(r.incomeUAH),
      })),
      projectStatusDistribution: (projectStatus ?? []).map((r) => ({ status: r.status ?? 'Невідомо', count: num(r.count) })),
      taskStatusDistribution: (taskStatusAll ?? []).map((r) => ({ status: r.status ?? 'Невідомо', count: num(r.count) })),
      dataQuality: dataQuality ?? {
        transactionsWithoutProjectPct: 0,
        transactionsWithoutCategoryPct: 0,
        tasksWithoutDueDatePct: 0,
        projectsWithoutForemanPct: 0,
        stagesWithoutDatesPct: 0,
      },
    };
  }

  private async getCashOnHandUAH(): Promise<number> {
    const wallets = await this.walletRepo.find({ where: { isActive: true } });
    let total = 0;
    for (const w of wallets) {
      const raw = await this.txRepo
        .createQueryBuilder('t')
        .select(
          `COALESCE(SUM(CASE WHEN t.walletId = :wid AND t.type = 'in' THEN COALESCE(t.amountUAH, t.amount) ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN t.walletId = :wid AND t.type = 'out' THEN COALESCE(t.amountUAH, t.amount) ELSE 0 END), 0) + COALESCE(SUM(CASE WHEN t.toWalletId = :wid AND t.type = 'transfer' THEN COALESCE(t.amountUAH, t.amount) ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN t.fromWalletId = :wid AND t.type = 'transfer' THEN COALESCE(t.amountUAH, t.amount) ELSE 0 END), 0)`,
          's',
        )
        .where('(t.walletId = :wid OR t.fromWalletId = :wid OR t.toWalletId = :wid)', { wid: w.id })
        .getRawOne<{ s: string }>();
      total += num(raw?.s ?? 0);
    }
    return total;
  }

  private async getDataQuality(): Promise<OwnerOverviewDto['dataQuality']> {
    const [txTotal, txNoProject, txNoCategory, txOutTotal, tasksTotal, tasksNoDue, projectsTotal, projectsNoForeman] = await Promise.all([
      this.txRepo.count({ where: [{ type: TransactionType.IN }, { type: TransactionType.OUT }] }),
      this.txRepo.count({ where: [{ type: TransactionType.IN, projectId: null as any }, { type: TransactionType.OUT, projectId: null as any }] }),
      this.txRepo.createQueryBuilder('t').where('t.type = :out', { out: TransactionType.OUT }).andWhere('(t.categoryId IS NULL OR t.categoryId = 0)').getCount(),
      this.txRepo.count({ where: { type: TransactionType.OUT } }),
      this.taskRepo.count(),
      this.taskRepo.count({ where: { dueDate: null as any } }),
      this.projectRepo.count(),
      this.projectRepo.count({ where: { foremanId: null as any } }),
    ]);
    const transactionsWithoutProjectPct = txTotal > 0 ? Math.round((txNoProject / txTotal) * 100) : 0;
    const transactionsWithoutCategoryPct = txOutTotal > 0 ? Math.round((txNoCategory / txOutTotal) * 100) : 0;
    const tasksWithoutDueDatePct = tasksTotal > 0 ? Math.round((tasksNoDue / tasksTotal) * 100) : 0;
    const projectsWithoutForemanPct = projectsTotal > 0 ? Math.round((projectsNoForeman / projectsTotal) * 100) : 0;
    return {
      transactionsWithoutProjectPct,
      transactionsWithoutCategoryPct,
      tasksWithoutDueDatePct,
      projectsWithoutForemanPct,
      stagesWithoutDatesPct: 0,
    };
  }

  async getProjectsPerformance(
    from?: string,
    to?: string,
    status?: string,
    foremanId?: string,
    sort?: string,
  ): Promise<ProjectPerformanceDto[]> {
    const { fromDate, toDate } = parseDateRange(from, to);
    const fromStr = fromDate.toISOString().slice(0, 10);
    const toStr = toDate.toISOString().slice(0, 10);

    const qb = this.projectRepo
      .createQueryBuilder('p')
      .select('p.id', 'projectId')
      .addSelect('p.name', 'projectName')
      .addSelect('p.status', 'status')
      .addSelect('p.foremanId', 'foremanId');
    if (status) qb.andWhere('p.status = :status', { status });
    if (foremanId) {
      const fid = parseInt(foremanId, 10);
      if (!isNaN(fid)) qb.andWhere('p.foremanId = :foremanId', { foremanId: fid });
    }
    const projects = await qb.getRawMany<{ projectId: number; projectName: string; status: string; foremanId: number | null }>();
    const userIds = [...new Set((projects ?? []).map((p) => p.foremanId).filter(Boolean))] as number[];
    const userNames = userIds.length > 0
      ? await this.projectRepo.manager.query('SELECT id, "fullName" FROM users WHERE id = ANY($1)', [userIds])
      : [];
    const userMap = new Map((userNames as any[]).map((u: any) => [u.id, u.fullName]));

    const result: ProjectPerformanceDto[] = [];
    for (const p of projects ?? []) {
      const [inSum, outSum, openTasks, blocked, overdue] = await Promise.all([
        this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(COALESCE(t.amountUAH, t.amount)), 0)', 's').where('t.projectId = :pid', { pid: p.projectId }).andWhere('t.type = :in', { in: TransactionType.IN }).andWhere('t.date >= :from', { from: fromStr }).andWhere('t.date <= :to', { to: toStr }).getRawOne<{ s: string }>(),
        this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(COALESCE(t.amountUAH, t.amount)), 0)', 's').where('t.projectId = :pid', { pid: p.projectId }).andWhere('t.type = :out', { out: TransactionType.OUT }).andWhere('t.date >= :from', { from: fromStr }).andWhere('t.date <= :to', { to: toStr }).getRawOne<{ s: string }>(),
        (await this.taskRepo.count({ where: { projectId: p.projectId, status: ExecutionTaskStatus.NEW as any } })) + (await this.taskRepo.count({ where: { projectId: p.projectId, status: ExecutionTaskStatus.IN_PROGRESS as any } })),
        this.taskRepo.count({ where: { projectId: p.projectId, status: ExecutionTaskStatus.BLOCKED } }),
        this.taskRepo.createQueryBuilder('t').where('t.projectId = :pid', { pid: p.projectId }).andWhere('t.status IN (:...open)', { open: [ExecutionTaskStatus.NEW, ExecutionTaskStatus.IN_PROGRESS, ExecutionTaskStatus.BLOCKED] }).andWhere('t.dueDate IS NOT NULL').andWhere('t.dueDate < CURRENT_DATE').getCount(),
      ]);
      const incomeUAH = num(inSum?.s ?? 0);
      const expenseUAH = num(outSum?.s ?? 0);
      const netUAH = incomeUAH - expenseUAH;
      result.push({
        projectId: p.projectId,
        projectName: p.projectName ?? 'Невідомо',
        status: p.status ?? 'Невідомо',
        foremanName: p.foremanId ? (userMap.get(p.foremanId) ?? null) : null,
        incomeUAH,
        expenseUAH,
        netUAH,
        openTasksCount: openTasks,
        blockedTasksCount: blocked,
        overdueTasksCount: overdue,
        isOverdue: overdue > 0,
      });
    }

    const sortKey = sort || 'netUAH';
    const desc = sortKey === 'netUAH' || sortKey === 'overdue' || sortKey === 'expense' || sortKey === 'income';
    result.sort((a, b) => {
      if (sortKey === 'overdue') return (b.overdueTasksCount - a.overdueTasksCount) || (b.netUAH - a.netUAH);
      if (sortKey === 'expense') return (desc ? b.expenseUAH - a.expenseUAH : a.expenseUAH - b.expenseUAH);
      if (sortKey === 'income') return (desc ? b.incomeUAH - a.incomeUAH : a.incomeUAH - b.incomeUAH);
      return desc ? b.netUAH - a.netUAH : a.netUAH - b.netUAH;
    });
    return result;
  }

  async getFinanceBreakdown(from?: string, to?: string, walletId?: number, projectId?: number): Promise<FinanceBreakdownDto> {
    const { fromDate, toDate } = parseDateRange(from, to);
    const fromStr = fromDate.toISOString().slice(0, 10);
    const toStr = toDate.toISOString().slice(0, 10);

    const wallets = await this.walletRepo.find({ where: { isActive: true }, order: { name: 'ASC' } });
    const byWallet: FinanceBreakdownDto['byWallet'] = [];
    const balances: FinanceBreakdownDto['balances'] = [];

    for (const w of wallets) {
      if (walletId != null && w.id !== walletId) continue;
      const [inSum, outSum, balanceRaw] = await Promise.all([
        this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(COALESCE(t.amountUAH, t.amount)), 0)', 's').where('t.walletId = :wid', { wid: w.id }).andWhere('t.type = :in', { in: TransactionType.IN }).andWhere('t.date >= :from', { from: fromStr }).andWhere('t.date <= :to', { to: toStr }).getRawOne<{ s: string }>(),
        this.txRepo.createQueryBuilder('t').select('COALESCE(SUM(COALESCE(t.amountUAH, t.amount)), 0)', 's').where('t.walletId = :wid', { wid: w.id }).andWhere('t.type = :out', { out: TransactionType.OUT }).andWhere('t.date >= :from', { from: fromStr }).andWhere('t.date <= :to', { to: toStr }).getRawOne<{ s: string }>(),
        this.txRepo.createQueryBuilder('t').select(
          `COALESCE(SUM(CASE WHEN t.walletId = :wid AND t.type = 'in' THEN COALESCE(t.amountUAH, t.amount) ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN t.walletId = :wid AND t.type = 'out' THEN COALESCE(t.amountUAH, t.amount) ELSE 0 END), 0) + COALESCE(SUM(CASE WHEN t.toWalletId = :wid AND t.type = 'transfer' THEN COALESCE(t.amountUAH, t.amount) ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN t.fromWalletId = :wid AND t.type = 'transfer' THEN COALESCE(t.amountUAH, t.amount) ELSE 0 END), 0)`,
          's',
        ).where('(t.walletId = :wid OR t.fromWalletId = :wid OR t.toWalletId = :wid)', { wid: w.id }).getRawOne<{ s: string }>(),
      ]);
      const inUAH = num(inSum?.s ?? 0);
      const outUAH = num(outSum?.s ?? 0);
      byWallet.push({ walletId: w.id, walletName: w.name, inUAH, outUAH, netUAH: inUAH - outUAH });
      balances.push({ walletId: w.id, walletName: w.name, balanceUAH: num(balanceRaw?.s ?? 0) });
    }

    const catQb = this.txRepo.createQueryBuilder('t').innerJoin(Category, 'c', 'c.id = t.categoryId').select('t.categoryId', 'categoryId').addSelect('c.name', 'categoryName').addSelect('COALESCE(SUM(COALESCE(t.amountUAH, t.amount)), 0)', 'amountUAH').where('t.type = :out', { out: TransactionType.OUT }).andWhere('t.date >= :from', { from: fromStr }).andWhere('t.date <= :to', { to: toStr });
    if (walletId != null) catQb.andWhere('t.walletId = :walletId', { walletId });
    if (projectId != null) catQb.andWhere('t.projectId = :projectId', { projectId });
    const byCategory = await catQb.groupBy('t.categoryId').addGroupBy('c.name').getRawMany<{ categoryId: number; categoryName: string; amountUAH: string }>();

    const cpQb = this.txRepo.createQueryBuilder('t').select('t.counterparty', 'counterparty').addSelect('COALESCE(SUM(COALESCE(t.amountUAH, t.amount)), 0)', 'amountUAH').addSelect('COUNT(*)', 'count').where('t.counterparty IS NOT NULL').andWhere('t.counterparty != :empty', { empty: '' }).andWhere('t.date >= :from', { from: fromStr }).andWhere('t.date <= :to', { to: toStr });
    if (walletId != null) cpQb.andWhere('t.walletId = :walletId', { walletId });
    if (projectId != null) cpQb.andWhere('t.projectId = :projectId', { projectId });
    const topCounterparties = await cpQb.groupBy('t.counterparty').orderBy('"amountUAH"', 'DESC').limit(15).getRawMany<{ counterparty: string; amountUAH: string; count: string }>();

    return {
      byWallet,
      byCategory: (byCategory ?? []).map((r) => ({ categoryId: r.categoryId, categoryName: r.categoryName ?? 'Невідомо', amountUAH: num(r.amountUAH) })),
      topCounterparties: (topCounterparties ?? []).map((r) => ({ counterparty: r.counterparty ?? 'Невідомо', amountUAH: num(r.amountUAH), count: num(r.count) })),
      balances,
    };
  }

  async getExecutionHealth(from?: string, to?: string, foremanId?: string): Promise<ExecutionHealthDto> {
    const overdueTasks = await this.taskRepo.createQueryBuilder('t').where('t.status IN (:...open)', { open: [ExecutionTaskStatus.NEW, ExecutionTaskStatus.IN_PROGRESS, ExecutionTaskStatus.BLOCKED] }).andWhere('t.dueDate IS NOT NULL').andWhere('t.dueDate < CURRENT_DATE').getCount();
    const blockedTasks = await this.taskRepo.count({ where: { status: ExecutionTaskStatus.BLOCKED } });
    const activeProjects = await this.projectRepo.count({ where: { status: 'in_progress' as any } });
    const pausedProjects = await this.projectRepo.count({ where: { status: 'paused' as any } });
    const tasksByStatus = await this.taskRepo.createQueryBuilder('t').select('t.status', 'status').addSelect('COUNT(*)', 'count').groupBy('t.status').getRawMany<{ status: string; count: string }>();

    return {
      activeProjectsCount: activeProjects,
      pausedProjectsCount: pausedProjects,
      overdueTasksCount: overdueTasks,
      blockedTasksCount: blockedTasks,
      tasksByStatus: (tasksByStatus ?? []).map((r) => ({ status: r.status ?? 'Невідомо', count: num(r.count) })),
      topBlockedReasons: [],
    };
  }
}
