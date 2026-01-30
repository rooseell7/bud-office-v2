import { IsOptional, IsString } from 'class-validator';

export class AcquireEditSessionDto {
  @IsOptional()
  @IsString()
  editSessionToken?: string;
}
