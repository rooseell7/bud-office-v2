import React, { useState, useCallback } from 'react';
import { Box, Dialog, DialogTitle, DialogContent, IconButton, Snackbar } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../modules/auth/context/AuthContext';
import { useSheetController } from '../hooks/useSheetController';
import { useSheetKeymap } from '../hooks/useSheetKeymap';
import { useSheetClipboard } from '../hooks/useSheetClipboard';
import { useSheetLocalDraft } from '../hooks/useSheetLocalDraft';
import { useSheetServerSave } from '../hooks/useSheetServerSave';
import { useSheetServerLoad } from '../hooks/useSheetServerLoad';
import { useSheetCollab } from '../hooks/useSheetCollab';
import { SaveIndicator } from './SaveIndicator';
import { Grid } from './Grid';
import { Toolbar } from './Toolbar';
import { VersionsButton } from './VersionsButton';
import { ExportButton } from './ExportButton';
import type { SheetConfig } from '../configs/types';
import type { SheetSnapshot } from '../engine/types';
import type { SheetAdapter } from '../adapters/types';

export type SheetMode = 'edit' | 'readonly';

export type SheetProps = {
  config?: Partial<SheetConfig>;
  initialSnapshot?: SheetSnapshot | null;
  adapter?: SheetAdapter | null;
  documentId?: number | null;
  readonly?: boolean;
  /** Explicit mode: 'readonly' shows preview badge, disables all edit */
  sheetMode?: SheetMode;
  onSaved?: () => void;
};

export const Sheet: React.FC<SheetProps> = ({
  config,
  initialSnapshot = null,
  adapter = null,
  documentId = null,
  readonly = false,
  sheetMode,
  onSaved,
}) => {
  const isPreview = sheetMode === 'readonly' || readonly;
  const {
    state,
    dispatch,
    setActiveCell,
    setSelection,
    setSelectionAnchor,
    extendSelection,
    startEdit,
    updateEditorValue,
    applyStyles,
    hydrate,
    setColumnWidth,
    commitColumnResize,
    commitRowResize,
    insertRowAbove,
    insertRowBelow,
    insertColumnAt,
    renameColumn,
    deleteRow,
    deleteColumn,
    deleteColumnsBatch,
    deleteRowsBatch,
    setColumnFormula,
    applyFill,
    sortRows,
    setFiltersEnabled,
    setColumnFilter,
    clearAllFilters,
    setFreezeRows,
    setFreezeCols,
  } = useSheetController({ config, initialSnapshot, adapter });

  const { accessToken } = useAuth();
  const [previewSnapshot, setPreviewSnapshot] = React.useState<SheetSnapshot | null>(null);

  const handlePreviewVersion = React.useCallback(
    (snapshot: SheetSnapshot) => {
      setPreviewSnapshot(snapshot);
    },
    [],
  );

  const handleVersionsRestore = React.useCallback(
    (snapshot?: Record<string, any>) => {
      if (snapshot) {
        hydrate(snapshot);
        return;
      }
      adapter?.loadSnapshot?.().then((snap) => {
        if (snap) hydrate(snap);
      });
    },
    [adapter, hydrate],
  );

  const [undoToast, setUndoToast] = useState<string | null>(null);

  const handleServerUndo = useCallback(async () => {
    if (!adapter?.requestUndo) return false;
    const r = await adapter.requestUndo();
    if (r.ok && r.snapshot) {
      hydrate(r.snapshot);
      return true;
    }
    setUndoToast(r.reason === 'UNDO_CONFLICT' ? 'Конфлікт змін: неможливо відкотити' : 'Немає дій для відкату');
    return false;
  }, [adapter, hydrate]);

  const handleServerRedo = useCallback(async () => {
    if (!adapter?.requestRedo) return false;
    const r = await adapter.requestRedo();
    if (r.ok && r.snapshot) {
      hydrate(r.snapshot);
      return true;
    }
    setUndoToast(r.reason === 'CONFLICT' ? 'Конфлікт: неможливо повторити' : 'Немає дій для повтору');
    return false;
  }, [adapter, hydrate]);

  const useServerUndoRedo = Boolean(adapter?.requestUndo && adapter?.requestRedo);

  useSheetLocalDraft({ state, adapter, onHydrate: hydrate });

  const setLastSavedSnapshotRef = React.useRef<((s: SheetSnapshot | null) => void) | null>(null);
  const setRevisionRef = React.useRef<((v: number) => void) | null>(null);
  const lastAppliedVersionRef = React.useRef(0);

  const handleResync = useCallback(async (): Promise<number | void> => {
    if (!adapter?.loadSnapshot) return;
    const result = await adapter.loadSnapshot();
    if (!result) return;
    const snapshot =
      result && typeof result === 'object' && 'snapshot' in result
        ? (result as { snapshot: SheetSnapshot }).snapshot
        : (result as SheetSnapshot);
    const revision =
      result && typeof result === 'object' && 'revision' in result
        ? (result as { revision?: number }).revision
        : undefined;
    if (revision != null) lastAppliedVersionRef.current = Math.max(lastAppliedVersionRef.current, revision);
    hydrate(snapshot);
    setLastSavedSnapshotRef.current?.(snapshot);
    if (revision != null) setRevisionRef.current?.(revision);
    return revision ?? undefined;
  }, [adapter, hydrate]);

  const queuedRemoteSnapshotRef = React.useRef<{ snap: SheetSnapshot; ver: number } | null>(null);
  const isEditingRef = React.useRef(state.isEditing);
  const hasPendingOpsRef = React.useRef(false);
  isEditingRef.current = state.isEditing;

  const handleRemoteUpdate = React.useCallback(
    (snapshot: SheetSnapshot, version?: number) => {
      const v = version ?? 0;
      if (v > 0 && v <= lastAppliedVersionRef.current) return;
      if (isEditingRef.current || hasPendingOpsRef.current) {
        queuedRemoteSnapshotRef.current = { snap: snapshot, ver: v };
        return;
      }
      queuedRemoteSnapshotRef.current = null;
      lastAppliedVersionRef.current = Math.max(lastAppliedVersionRef.current, v);
      hydrate(snapshot);
    },
    [hydrate],
  );

  const prevEditingRef = React.useRef(state.isEditing);

  const { connected: collabConnected, serverVersion, hasPendingOps, applyOp } = useSheetCollab({
    documentId: documentId ?? null,
    token: accessToken ?? null,
    onRemoteUpdate: handleRemoteUpdate,
    onResync: handleResync,
    onDocState: (v) => {
      setRevisionRef.current?.(v);
      lastAppliedVersionRef.current = Math.max(lastAppliedVersionRef.current, v);
    },
    hasPendingOpsRef,
  });

  React.useEffect(() => {
    const wasEditing = prevEditingRef.current;
    const wasPending = hasPendingOpsRef.current;
    prevEditingRef.current = state.isEditing;
    if (!state.isEditing && !hasPendingOps && queuedRemoteSnapshotRef.current) {
      if (wasEditing) {
        queuedRemoteSnapshotRef.current = null;
        return;
      }
      if (wasPending) {
        queuedRemoteSnapshotRef.current = null;
        return;
      }
      const { snap, ver } = queuedRemoteSnapshotRef.current;
      queuedRemoteSnapshotRef.current = null;
      if (ver <= lastAppliedVersionRef.current) return;
      lastAppliedVersionRef.current = Math.max(lastAppliedVersionRef.current, ver);
      hydrate(snap);
    }
  }, [state.isEditing, hasPendingOps, hydrate]);

  const applyOpViaCollab = useCallback(
    async (
      snapshot: SheetSnapshot,
      prevSnapshot: SheetSnapshot | null,
      baseVersion: number,
    ): Promise<{ revision: number }> => {
      const result = await applyOp(
        { type: 'SNAPSHOT_UPDATE', payload: { prevSnapshot, nextSnapshot: snapshot } },
        baseVersion,
      );
      if (!result.ok) throw new Error('CONFLICT');
      return { revision: result.version };
    },
    [applyOp],
  );

  const saveResult = useSheetServerSave({
    state,
    adapter,
    mode: isPreview ? 'readonly' : 'edit',
    onSaved,
    collabConnected,
    applyOpViaCollab: collabConnected ? applyOpViaCollab : undefined,
    externalRevision: serverVersion,
  });
  const { status: saveStatus, errorMessage, setLastSavedSnapshot, setRevision } = saveResult;
  setLastSavedSnapshotRef.current = setLastSavedSnapshot;
  setRevisionRef.current = setRevision;

  const handleLoaded = useCallback(
    (snap: SheetSnapshot | null, revision?: number) => {
      if (snap) {
        if (revision != null) lastAppliedVersionRef.current = Math.max(lastAppliedVersionRef.current, revision);
        hydrate(snap);
        setLastSavedSnapshot?.(snap);
        if (revision != null) setRevisionRef.current?.(revision);
      }
    },
    [hydrate, setLastSavedSnapshot],
  );
  useSheetServerLoad({ adapter, onLoaded: handleLoaded });

  useSheetKeymap({
    state,
    dispatch,
    readonly: isPreview,
    onServerUndo: useServerUndoRedo ? handleServerUndo : undefined,
    onServerRedo: useServerUndoRedo ? handleServerRedo : undefined,
    onServerUndoError: setUndoToast,
  });
  useSheetClipboard({ state, dispatch, isEditing: state.isEditing, readonly: isPreview });

  const handleCellSelect = React.useCallback(
    (coord: { row: number; col: number }) => {
      setActiveCell(coord);
      setSelection({ r1: coord.row, c1: coord.col, r2: coord.row, c2: coord.col });
      setSelectionAnchor(coord);
    },
    [setActiveCell, setSelection, setSelectionAnchor],
  );

  const handleExtendSelection = React.useCallback(
    (coord: { row: number; col: number }) => {
      extendSelection(coord);
    },
    [extendSelection],
  );

  return (
    <Box sx={{ width: '100%', border: '1px solid #e2e8f0', position: 'relative' }}>
      {isPreview && (
        <Box
          sx={{
            position: 'absolute',
            top: 4,
            right: 8,
            zIndex: 10,
            px: 1,
            py: 0.25,
            borderRadius: 1,
            bgcolor: 'action.hover',
            typography: 'caption',
            color: 'text.secondary',
          }}
        >
          Перегляд (read-only)
        </Box>
      )}
      <SaveIndicator status={saveStatus} message={errorMessage || undefined} />
      <Snackbar
        open={!!undoToast}
        message={undoToast ?? ''}
        onClose={() => setUndoToast(null)}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, borderBottom: 1, borderColor: 'divider', px: 0.5 }}>
        <Toolbar state={state} onApplyStyles={applyStyles} readonly={isPreview} />
        <VersionsButton
          documentId={documentId ?? null}
          state={state}
          onRestore={handleVersionsRestore}
          onPreview={isPreview ? undefined : handlePreviewVersion}
          disabled={isPreview}
        />
        <ExportButton documentId={documentId ?? null} disabled={isPreview} />
      </Box>
      <Grid
      state={state}
      config={config}
      onCellSelect={handleCellSelect}
      onExtendSelection={handleExtendSelection}
      onCellDoubleClick={
        isPreview
          ? undefined
          : () => {
              const col = state.activeCell?.col;
              if (col == null) return;
              const colDef = state.columns?.[col];
              if (colDef?.computed) return;
              const ro = config?.readonlyColumns;
              if (ro && Array.isArray(ro) && ro.includes(col)) return;
              startEdit();
            }
      }
      onEditorChange={updateEditorValue}
      onColumnResize={isPreview ? undefined : setColumnWidth}
      onColumnResizeCommit={isPreview ? undefined : commitColumnResize}
      onRowResizeCommit={isPreview ? undefined : commitRowResize}
      onInsertColumnAt={isPreview || !config?.allowColumnInsert ? undefined : insertColumnAt}
      onDeleteColumn={isPreview || !config?.allowColumnDelete ? undefined : deleteColumn}
      onDeleteColumnsBatch={
        isPreview || !config?.allowColumnDelete || !config?.allowDeleteMultiple
          ? undefined
          : deleteColumnsBatch
      }
      onDeleteRowsBatch={
        isPreview || !config?.allowRowDelete || !config?.allowDeleteMultiple
          ? undefined
          : deleteRowsBatch
      }
      onRenameColumn={isPreview || !config?.allowColumnRename ? undefined : renameColumn}
      onInsertRowAbove={isPreview || !config?.allowRowInsert ? undefined : insertRowAbove}
      onInsertRowBelow={isPreview || !config?.allowRowInsert ? undefined : insertRowBelow}
      onDeleteRow={isPreview || !config?.allowRowDelete ? undefined : deleteRow}
      onSetColumnFormula={
        isPreview || !config?.allowColumnFormulaEdit ? undefined : setColumnFormula
      }
      onApplyFill={isPreview ? undefined : applyFill}
      onSortRows={isPreview || !config?.allowSort ? undefined : sortRows}
      onSetFiltersEnabled={isPreview || !config?.allowFilter ? undefined : setFiltersEnabled}
      onSetColumnFilter={isPreview || !config?.allowFilter ? undefined : setColumnFilter}
      onClearAllFilters={isPreview || !config?.allowFilter ? undefined : clearAllFilters}
      onSetFreezeRows={isPreview || !config?.allowFreeze ? undefined : setFreezeRows}
      onSetFreezeCols={isPreview || !config?.allowFreeze ? undefined : setFreezeCols}
    />
      {previewSnapshot && (
        <Dialog
          open={!!previewSnapshot}
          onClose={() => setPreviewSnapshot(null)}
          maxWidth={false}
          fullWidth
          PaperProps={{ sx: { maxWidth: '95vw', maxHeight: '90vh' } }}
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Перегляд версії
            <IconButton size="small" onClick={() => setPreviewSnapshot(null)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Sheet
              config={config}
              initialSnapshot={previewSnapshot}
              documentId={null}
              readonly
              sheetMode="readonly"
            />
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
};
