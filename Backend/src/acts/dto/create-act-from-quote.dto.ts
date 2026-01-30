import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * Створення акту виконаних робіт на базі кошторису (КП),
 * який збережений як Document(type='quote').
 */
export class CreateActFromQuoteDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quoteId!: number;

  /**
   * projectId (об'єкт). Має співпасти з document.projectId.
   */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  projectId!: number;

  /**
   * Опційно: дата акту (YYYY-MM-DD). Якщо не передано — сьогодні.
   */
  @IsOptional()
  @IsString()
  @MaxLength(16)
  actDate?: string;
}
