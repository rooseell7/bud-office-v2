import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Ensure DB foundation for Documents exists.
 *
 * У BUD_OFFICE ми часто працюємо з TYPEORM_SYNC=false (і/або без міграцій).
 * Для модулю Documents це критично: відсутність таблиць призводить до 500 і "білого екрану" у КП.
 *
 * Цей сервіс робить ідемпотентний bootstrap (CREATE TABLE IF NOT EXISTS) для:
 *  - documents
 *  - document_events
 */
@Injectable()
export class DocumentsSchemaInitService implements OnModuleInit {
  private readonly logger = new Logger(DocumentsSchemaInitService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    // Якщо DataSource ще не ініціалізований — нічого не робимо.
    if (!this.dataSource?.isInitialized) return;

    try {
      await this.ensureTables();
    } catch (e) {
      // Не валимо запуск аплікації — краще дати можливість працювати іншим модулям.
      this.logger.error('Documents schema bootstrap failed', e as any);
    }
  }

  private async ensureTables(): Promise<void> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();

    try {
      // 1) documents
      await qr.query(`
        CREATE TABLE IF NOT EXISTS "documents" (
          "id" SERIAL PRIMARY KEY,
          "type" VARCHAR(32) NOT NULL,
          "title" VARCHAR(255) NOT NULL DEFAULT '',
          "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
          "number" VARCHAR(64),
          "documentDate" DATE,
          "projectId" INT,
          "sourceType" VARCHAR(32),
          "sourceId" INT,
          "total" NUMERIC(14,2) NOT NULL DEFAULT 0,
          "currency" VARCHAR(8) NOT NULL DEFAULT 'UAH',
          "meta" JSONB,
          "createdById" INT,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      // 2) document_events
      await qr.query(`
        CREATE TABLE IF NOT EXISTS "document_events" (
          "id" SERIAL PRIMARY KEY,
          "documentId" INT NOT NULL,
          "type" VARCHAR(32) NOT NULL,
          "payload" JSONB,
          "createdById" INT,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      // Індекси (IF NOT EXISTS доступне в сучасних Postgres; якщо ні — ці запити безпечні в try/catch).
      try {
        await qr.query(`
          CREATE TABLE IF NOT EXISTS "document_versions" (
            "id" SERIAL PRIMARY KEY,
            "documentId" INT NOT NULL,
            "type" VARCHAR(16) NOT NULL DEFAULT 'auto',
            "snapshot" JSONB,
            "note" VARCHAR(255),
            "createdById" INT,
            "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
          )
        `);
        await qr.query(`CREATE INDEX IF NOT EXISTS "idx_document_versions_doc" ON "document_versions" ("documentId")`);
      } catch {
        // table may exist
      }

      try {
        await qr.query(`ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "editSessionUserId" INT`);
        await qr.query(`ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "editSessionToken" VARCHAR(64)`);
        await qr.query(`ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "editSessionExpiresAt" TIMESTAMP`);
        await qr.query(`ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "revision" INT DEFAULT 0`);
      } catch {
        // columns may exist
      }

      try {
        await qr.query(`CREATE INDEX IF NOT EXISTS "idx_documents_type" ON "documents" ("type");`);
        await qr.query(`CREATE INDEX IF NOT EXISTS "idx_documents_project" ON "documents" ("projectId");`);
        await qr.query(`CREATE INDEX IF NOT EXISTS "idx_documents_type_project" ON "documents" ("type", "projectId");`);
        await qr.query(`CREATE INDEX IF NOT EXISTS "idx_document_events_doc" ON "document_events" ("documentId");`);
      } catch {
        // не критично
      }

      this.logger.log('Documents schema ensured (documents, document_events)');
    } finally {
      await qr.release();
    }
  }
}
