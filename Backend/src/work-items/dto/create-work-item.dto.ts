import { IsBoolean, IsNumberString, IsOptional, IsString } from 'class-validator';

export class CreateWorkItemDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumberString()
  defaultRateMaster?: string;

  @IsOptional()
  @IsNumberString()
  defaultRateClient?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
