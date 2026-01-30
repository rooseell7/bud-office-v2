import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  IsNumber,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateActItemDto {
  // safe-save: дозволяємо порожні рядки з UI
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  qty?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  price?: number;
}

export class CreateActDto {
  @IsInt()
  @Min(1)
  projectId: number;

  // stages.id = UUID
  @IsOptional()
  @IsUUID('4')
  stageId?: string;

  @IsString()
  @IsNotEmpty()
  number: string;

  @IsString()
  @IsNotEmpty()
  date: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsIn(['draft', 'done'])
  status?: 'draft' | 'done';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateActItemDto)
  items?: CreateActItemDto[];
}
