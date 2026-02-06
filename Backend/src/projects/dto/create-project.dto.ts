import {
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

const PROJECT_TYPES = ['apartment', 'house', 'commercial'] as const;
const FINISH_CLASSES = ['econom', 'comfort', 'business'] as const;
const SALES_STAGES = [
  'lead_new', 'contact_made', 'meeting_scheduled', 'meeting_done',
  'kp_preparing', 'kp_sent', 'kp_negotiation', 'deal_signed',
  'handoff_to_exec', 'paused', 'lost',
] as const;
const EXECUTION_STATUSES = ['planned', 'active', 'paused', 'completed', 'cancelled'] as const;

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  @IsIn(PROJECT_TYPES)
  type?: string;

  @IsOptional()
  areaM2?: number;

  @IsOptional()
  @IsString()
  @IsIn(FINISH_CLASSES)
  finishClass?: string;

  @IsOptional()
  @IsString()
  plannedStartAt?: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  plannedEndAt?: string;

  @IsOptional()
  @IsString()
  @IsIn(SALES_STAGES)
  salesStage?: string;

  @IsOptional()
  @IsString()
  @IsIn(EXECUTION_STATUSES)
  executionStatus?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  clientId?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  ownerId?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  foremanId?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatorId?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  supplyManagerId?: number | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[] | null;

  @IsOptional()
  @IsObject()
  accessInfo?: Record<string, unknown> | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  // Legacy / CRM
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  nextAction?: string | null;

  @IsOptional()
  @IsString()
  nextActionDue?: string | null;
}
