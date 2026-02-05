import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QuoteReadService } from './quote-read.service';
import { QuoteNeedService } from './quote-need.service';

type AuthReq = Request & { user: { id: number } };

@UseGuards(JwtAuthGuard)
@Controller('supply/quotes')
export class SupplyQuotesController {
  constructor(
    private readonly quoteRead: QuoteReadService,
    private readonly quoteNeed: QuoteNeedService,
  ) {}

  @Get(':projectId/stages')
  getStages(@Req() req: AuthReq, @Param('projectId') projectId: string) {
    return this.quoteRead.getStages(Number(projectId));
  }

  @Get(':projectId/stage-materials')
  getStageMaterials(
    @Req() req: AuthReq,
    @Param('projectId') projectId: string,
    @Query('quoteId') quoteId: string,
    @Query('stageIds') stageIds: string,
  ) {
    const qid = Number(quoteId);
    const ids = stageIds ? stageIds.split(',').map((s) => s.trim()).filter(Boolean) : [];
    return this.quoteRead.getStageMaterials(qid, ids);
  }

  @Get(':projectId/stage-materials-need')
  getStageMaterialsNeed(
    @Req() req: AuthReq,
    @Param('projectId') projectId: string,
    @Query('quoteId') quoteId: string,
    @Query('stageIds') stageIds: string,
    @Query('mode') mode?: string,
  ) {
    const qid = Number(quoteId);
    const ids = stageIds ? stageIds.split(',').map((s) => s.trim()).filter(Boolean) : [];
    return this.quoteNeed.getStageMaterialsNeed(Number(projectId), qid, ids, mode);
  }
}
