import { IsOptional, IsString, MaxLength } from 'class-validator';

export class TaskCommentDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  comment?: string;
}
