import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { AnalyticsService } from './analytics.service';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Permissions('analytics:read')
  @Get('owner/overview')
  getOwnerOverview(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('groupBy') groupBy?: string,
  ) {
    return this.analyticsService.getOwnerOverview(from, to, groupBy);
  }

  @Permissions('analytics:read')
  @Get('projects/performance')
  getProjectsPerformance(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('foremanId') foremanId?: string,
    @Query('sort') sort?: string,
  ) {
    return this.analyticsService.getProjectsPerformance(from, to, status, foremanId, sort);
  }

  @Permissions('analytics:read')
  @Get('finance/breakdown')
  getFinanceBreakdown(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('walletId') walletId?: string,
    @Query('projectId') projectId?: string,
  ) {
    const w = walletId ? parseInt(walletId, 10) : undefined;
    const p = projectId ? parseInt(projectId, 10) : undefined;
    return this.analyticsService.getFinanceBreakdown(from, to, Number.isNaN(w!) ? undefined : w, Number.isNaN(p!) ? undefined : p);
  }

  @Permissions('analytics:read')
  @Get('execution/health')
  getExecutionHealth(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('foremanId') foremanId?: string,
  ) {
    return this.analyticsService.getExecutionHealth(from, to, foremanId);
  }
}
