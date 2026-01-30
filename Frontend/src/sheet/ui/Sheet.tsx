import React from 'react';
import { Box } from '@mui/material';
import { useSheetController } from '../hooks/useSheetController';
import { useSheetKeymap } from '../hooks/useSheetKeymap';
import { useSheetClipboard } from '../hooks/useSheetClipboard';
import { useSheetLocalDraft } from '../hooks/useSheetLocalDraft';
import { useSheetServerSave } from '../hooks/useSheetServerSave';
import { useSheetServerLoad } from '../hooks/useSheetServerLoad';
import { SaveIndicator } from './SaveIndicator';
import { Grid } from './Grid';
import { Toolbar } from './Toolbar';
import { VersionsButton } from './VersionsButton';
import type { SheetConfig } from '../configs/types';
import type { SheetSnapshot } from '../engine/types';
import type { SheetAdapter } from '../adapters/types';

export type SheetProps = {
  config?: Partial<SheetConfig>;
  initialSnapshot?: SheetSnapshot | null;
  adapter?: SheetAdapter | null;
  documentId?: number | null;
  readonly?: boolean;
};

export const Sheet: React.FC<SheetProps> = ({
  config,
  initialSnapshot = null,
  adapter = null,
  documentId = null,
  readonly = false,
}) => {
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
  } = useSheetController({ config, initialSnapshot, adapter });

  const handleVersionsRestore = React.useCallback(() => {
    adapter?.loadSnapshot?.().then((snap) => {
      if (snap) hydrate(snap);
    });
  }, [adapter, hydrate]);

  useSheetLocalDraft({ state, adapter, onHydrate: hydrate });
  useSheetServerLoad({ adapter, onLoaded: hydrate });
  const { status: saveStatus, errorMessage } = useSheetServerSave({
    state,
    adapter,
    mode: readonly ? 'readonly' : 'edit',
  });
  useSheetKeymap({ state, dispatch, readonly });
  useSheetClipboard({ state, dispatch, isEditing: state.isEditing, readonly });

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
    <Box sx={{ display: 'inline-block', border: '1px solid #e2e8f0' }}>
      <SaveIndicator status={saveStatus} message={errorMessage || undefined} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, borderBottom: 1, borderColor: 'divider', px: 0.5 }}>
        <Toolbar state={state} onApplyStyles={applyStyles} readonly={readonly} />
        <VersionsButton
          documentId={documentId ?? null}
          state={state}
          onRestore={handleVersionsRestore}
          disabled={readonly}
        />
      </Box>
      <Grid
      state={state}
      config={config}
      onCellSelect={handleCellSelect}
      onExtendSelection={handleExtendSelection}
      onCellDoubleClick={readonly ? undefined : startEdit}
      onEditorChange={updateEditorValue}
      onColumnResize={setColumnWidth}
    />
    </Box>
  );
};
