import { IsNotEmpty, IsOptional, IsString, IsEmail, IsInt, Min, ValidateIf } from 'class-validator';

export class CreateClientDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsInt()
  @Min(1)
  objectId?: number | null;
}
