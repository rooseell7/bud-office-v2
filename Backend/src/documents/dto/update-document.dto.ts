import { PartialType } from '@nestjs/mapped-types';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateDocumentDto } from './create-document.dto';

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  expectedRevision?: number;

  @IsOptional()
  @IsString()
  editSessionToken?: string;
}
