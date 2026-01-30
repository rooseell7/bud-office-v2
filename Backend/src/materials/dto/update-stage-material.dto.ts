import { PartialType } from '@nestjs/mapped-types';
import { CreateStageMaterialDto } from './create-stage-material.dto';

export class UpdateStageMaterialDto extends PartialType(CreateStageMaterialDto) {}
