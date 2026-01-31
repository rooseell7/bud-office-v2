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
      const snapshot = doc?.meta?.sheetSnapshot;
      if (!snapshot || typeof snapshot !== 'object') return null;
      const revision = (doc?.meta as any)?.sheetRevision;
      return { snapshot: snapshot as SheetSnapshot, revision };
    },

    async saveSnapshot(
      snapshot: SheetSnapshot,
      expectedRevision?: number,
      prevSnapshot?: SheetSnapshot | null,
    ): Promise<{ revision?: number }> {
      const doc = await getDocument(documentId);
      const currentRev = doc?.meta?.sheetRevision ?? 0;
      if (expectedRevision !== undefined && currentRev !== expectedRevision) {
        throw new Error('CONFLICT');
      }
      const meta: Record<string, any> = {
        ...doc?.meta,
        sheetSnapshot: snapshot,
        sheetRevision: currentRev + 1,
      };
      if (prevSnapshot != null && typeof prevSnapshot === 'object') {
        meta.sheetPrevSnapshot = prevSnapshot;
      }
      const updated = await updateDocument(documentId, { meta });
      return { revision: (updated?.meta as any)?.sheetRevision ?? currentRev + 1 };
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
