import { IsIn } from 'class-validator';
import type { DocumentStatus } from '../document.entity';

const STATUSES: DocumentStatus[] = ['draft', 'final', 'void'];

export class SetDocumentStatusDto {
  @IsIn(STATUSES)
  status: DocumentStatus;
}
