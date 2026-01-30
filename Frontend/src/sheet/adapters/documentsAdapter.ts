/**
 * Documents adapter for server persist. Canonical sheet: src/sheet/**
 */

import { getDocument, updateDocument } from '../../api/documents';
import type { SheetSnapshot } from '../engine/types';
import { draftKey } from './localDraftAdapter';

export type DocumentsAdapterOptions = {
  documentId: number;
  docType?: string;
};

export function createDocumentsAdapter(options: DocumentsAdapterOptions) {
  const { documentId, docType = 'sheet' } = options;

  return {
    getDraftKey: () => draftKey(docType, documentId),

    async loadSnapshot(): Promise<SheetSnapshot | null> {
      const doc = await getDocument(documentId);
      const snapshot = doc?.meta?.sheetSnapshot;
      if (!snapshot || typeof snapshot !== 'object') return null;
      return snapshot as SheetSnapshot;
    },

    async saveSnapshot(
      snapshot: SheetSnapshot,
      expectedRevision?: number,
    ): Promise<{ revision?: number }> {
      const doc = await getDocument(documentId);
      const currentRev = doc?.meta?.sheetRevision ?? 0;
      if (expectedRevision !== undefined && currentRev !== expectedRevision) {
        throw new Error('CONFLICT');
      }
      const updated = await updateDocument(documentId, {
        meta: {
          ...doc?.meta,
          sheetSnapshot: snapshot,
          sheetRevision: currentRev + 1,
        },
      });
      return { revision: (updated?.meta as any)?.sheetRevision ?? currentRev + 1 };
    },
  };
}
