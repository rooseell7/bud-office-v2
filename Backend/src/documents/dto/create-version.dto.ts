import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateVersionDto {
  @IsIn(['auto', 'manual'])
  type: 'auto' | 'manual';

  @IsObject()
  snapshot: Record<string, any>;

  @IsOptional()
  @IsString()
  note?: string;
}
