// FILE: bud_office-backend/src/attachments/dto/create-attachment.dto.ts

/**
 * DTO для multipart upload.
 *
 * Фронт може передавати ці поля як part fields:
 * - entityType (наприклад 'invoice')
 * - entityId (наприклад 44)
 */
export class CreateAttachmentDto {
  entityType!: string;
  entityId!: number;
}
