import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class SetSubstitutionDto {
  @IsBoolean()
  isSubstitution: boolean;

  @IsOptional()
  @IsInt()
  substituteMaterialId?: number | null;

  @IsOptional()
  @IsString()
  substituteCustomName?: string | null;

  @IsOptional()
  @IsString()
  substitutionReason?: string | null;
}
