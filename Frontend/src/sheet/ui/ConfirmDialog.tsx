/**
 * Confirm dialog for dangerous operations. Canonical sheet: src/sheet/**
 */

import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  hasData?: boolean;
  hasFormulas?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  hasData = false,
  hasFormulas = false,
  onConfirm,
  onCancel,
  confirmLabel = 'Видалити',
  cancelLabel = 'Скасувати',
}) => {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText component="div" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span>{message}</span>
          <span style={{ fontSize: 13, color: 'text.secondary' }}>
            Цю дію можна відмінити (Ctrl+Z).
          </span>
          {hasData && (
            <span style={{ color: '#d32f2f', fontWeight: 500 }}>
              У видалених клітинках є дані.
            </span>
          )}
          {hasFormulas && (
            <span style={{ color: '#ed6c02', fontWeight: 500 }}>
              Формули можуть змінитися або з&apos;явиться #REF!
            </span>
          )}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} color="inherit">
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained" autoFocus>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
