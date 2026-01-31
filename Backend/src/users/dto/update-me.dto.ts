import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Ім\'я має бути щонайменше 2 символи' })
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Про себе — максимум 500 символів' })
  bio?: string | null;
}
