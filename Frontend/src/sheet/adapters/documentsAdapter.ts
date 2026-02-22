/**
 * Documents adapter for server persist. Canonical sheet: src/sheet/**
 */

import {
  getDocument,
  updateDocument,
  requestSheetUndo,
  requestSheetRedo,
} from '../../api/documents';
import type { SheetSnapshot } from '../engine/types';
import { draftKey } from './localDraftAdapter';

/** Meta shape for document sheet persistence (doc.meta is unknown in DocumentDto). */
type SheetDocMeta = Record<string, unknown> & { sheetSnapshot?: unknown; sheetRevision?: number };

export type DocumentsAdapterOptions = {
  documentId: number;
  docType?: string;
};

export function createDocumentsAdapter(options: DocumentsAdapterOptions) {
  const { documentId, docType = 'sheet' } = options;

  return {
    getDraftKey: () => draftKey(docType, documentId),

    async loadSnapshot() {
      const doc = await getDocument(documentId);
      const meta = doc?.meta as SheetDocMeta | undefined;
      const snapshot = meta?.sheetSnapshot;
      if (!snapshot || typeof snapshot !== 'object') return null;
      const revision = meta?.sheetRevision;
      return { snapshot: snapshot as SheetSnapshot, revision };
    },

    async saveSnapshot(
      snapshot: SheetSnapshot,
      expectedRevision?: number,
      prevSnapshot?: SheetSnapshot | null,
    ): Promise<{ revision?: number }> {
      const doc = await getDocument(documentId);
      const prevMeta = doc?.meta as SheetDocMeta | undefined;
      const currentRev = prevMeta?.sheetRevision ?? 0;
      if (expectedRevision !== undefined && currentRev !== expectedRevision) {
        throw new Error('CONFLICT');
      }
      const meta: Record<string, unknown> = {
        ...(prevMeta && typeof prevMeta === 'object' ? prevMeta : {}),
        sheetSnapshot: snapshot,
        sheetRevision: currentRev + 1,
      };
      if (prevSnapshot != null && typeof prevSnapshot === 'object') {
        meta.sheetPrevSnapshot = prevSnapshot;
      }
      const updated = await updateDocument(documentId, { meta });
      const updatedMeta = updated?.meta as SheetDocMeta | undefined;
      return { revision: updatedMeta?.sheetRevision ?? currentRev + 1 };
    },

    async requestUndo() {
      const res = await requestSheetUndo(documentId);
      return res;
    },

    async requestRedo() {
      const res = await requestSheetRedo(documentId);
      return res;
    },
  };
}
