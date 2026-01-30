import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StageService } from './stage.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';

type AuthedRequest = Request & { user: { id: string } };

@UseGuards(JwtAuthGuard)
@Controller('stages')
export class StageController {
  constructor(private readonly stageService: StageService) {}

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateStageDto) {
    return this.stageService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Req() req: AuthedRequest, @Query('objectId') objectId?: string) {
    return this.stageService.findAll(req.user.id, objectId);
  }

  @Patch(':id')
  update(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: UpdateStageDto) {
    return this.stageService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.stageService.remove(id, req.user.id);
  }
}
