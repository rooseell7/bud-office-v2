/**
 * Modal for editing column formula. Canonical sheet: src/sheet/**
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';

export type ColumnFormulaDialogProps = {
  open: boolean;
  columnTitle: string;
  initialExpr: string;
  validate: (expr: string) => string | null;
  onSave: (expr: string) => void;
  onCancel: () => void;
};

export const ColumnFormulaDialog: React.FC<ColumnFormulaDialogProps> = ({
  open,
  columnTitle,
  initialExpr,
  validate,
  onSave,
  onCancel,
}) => {
  const [expr, setExpr] = useState(initialExpr);

  useEffect(() => {
    if (open) setExpr(initialExpr);
  }, [open, initialExpr]);

  const error = expr.trim() ? validate(expr) : null;
  const canSave = expr.trim() === '' || !error;

  const handleSave = () => {
    if (!canSave) return;
    const trimmed = expr.trim();
    onSave(trimmed === '' ? '' : trimmed);
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Формула колонки &quot;{columnTitle}&quot;</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 1, fontSize: 13 }}>
          Використовуй {'{key}'} для посилань. Оператори: {'> < >= <= == !='}. Функції: SUM, ROUND, IF, MIN, MAX, AND, OR, NOT. Агрегати: SUMCOL, MINCOL, MAXCOL, AVGCOL, COUNTCOL. ROW()
        </DialogContentText>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={3}
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          placeholder="{qty} * {price}"
          error={!!error}
          helperText={error}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel}>Скасувати</Button>
        <Button onClick={handleSave} variant="contained" disabled={!canSave}>
          Зберегти
        </Button>
      </DialogActions>
    </Dialog>
  );
};
