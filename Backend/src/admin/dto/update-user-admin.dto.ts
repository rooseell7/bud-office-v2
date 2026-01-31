import { IsArray, IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateUserAdminDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  rolesCodes?: string[];
}
