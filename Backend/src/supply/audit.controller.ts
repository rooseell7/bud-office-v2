import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SupplyAuditService } from './audit.service';

@UseGuards(JwtAuthGuard)
@Controller('audit')
export class SupplyAuditController {
  constructor(private readonly audit: SupplyAuditService) {}

  @Get()
  getAudit(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('limit') limit?: string,
  ) {
    const id = entityId != null ? Number(entityId) : undefined;
    const lim = limit != null ? Number(limit) : 50;
    return this.audit.getByQuery({ entityType, entityId: id, limit: lim });
  }
}
