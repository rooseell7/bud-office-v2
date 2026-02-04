import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ActivityService } from './activity.service';

@Controller('activity')
@UseGuards(AuthGuard('jwt'))
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  async getActivity(
    @Query('limit') limit?: string,
    @Query('projectId') projectId?: string,
  ) {
    const limitNum = Math.min(50, Math.max(1, parseInt(limit || '20', 10) || 20));
    const projectIdNum = projectId ? parseInt(projectId, 10) : undefined;
    return this.activityService.findRecent(limitNum, projectIdNum);
  }
}
