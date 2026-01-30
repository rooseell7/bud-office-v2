import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
import { MaterialsDictsController } from './materials-dicts.controller';
import { Material } from './entities/material.entity';
import { MaterialCategory } from './entities/material-category.entity';
import { Unit } from './entities/unit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Material, MaterialCategory, Unit])],
  controllers: [MaterialsController, MaterialsDictsController],
  providers: [MaterialsService],
  exports: [MaterialsService],
})
export class MaterialsModule {}
