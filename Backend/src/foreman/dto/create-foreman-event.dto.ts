import { IsEnum, IsObject, IsOptional } from 'class-validator';
import { ForemanEventType } from '../foreman-event.entity';

export class CreateForemanEventDto {
  @IsEnum(ForemanEventType)
  type: ForemanEventType;

  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;
}
