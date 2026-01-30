import { IsInt, IsNumberString, IsOptional, IsString } from 'class-validator';

export class CreateDealDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsNumberString()
  amount?: string;

  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  clientId?: number;

  @IsOptional()
  @IsInt()
  projectId?: number;
}
