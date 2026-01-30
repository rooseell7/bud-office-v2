import { IsInt, IsNotEmpty, IsOptional, IsString, Min, IsNumber, IsUUID } from 'class-validator';

export class CreateWorkLogDto {
  @IsInt()
  @Min(1)
  projectId: number;

  // stages.id = UUID => stageId має бути UUID string
  @IsOptional()
  @IsUUID('4')
  stageId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  qty: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  status?: 'draft' | 'done';
}
