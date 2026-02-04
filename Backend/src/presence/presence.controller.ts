import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { PresenceService } from './presence.service';

@Controller('presence')
@UseGuards(AuthGuard('jwt'))
export class PresenceController {
  constructor(
    private readonly presenceService: PresenceService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @Get('online')
  async getOnline() {
    const ids = this.presenceService.getOnlineUserIds();
    if (ids.length === 0) return [];
    const users = await this.userRepo.find({
      where: ids.map((id) => ({ id })),
      select: ['id', 'fullName'],
    });
    return users.map((u) => ({ id: u.id, fullName: u.fullName ?? '' }));
  }

  @Get('projects/:id')
  async getInProject(@Param('id', ParseIntPipe) _projectId: number) {
    // Optional: track who joined project:{id}; for MVP return same as online
    const ids = this.presenceService.getOnlineUserIds();
    if (ids.length === 0) return [];
    const users = await this.userRepo.find({
      where: ids.map((id) => ({ id })),
      select: ['id', 'fullName'],
    });
    return users.map((u) => ({ id: u.id, fullName: u.fullName ?? '' }));
  }
}
