/**
 * Modal for column filter. Canonical sheet: src/sheet/**
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import type { FilterSpec } from '../engine/types';

export type ColumnFilterDialogProps = {
  open: boolean;
  columnTitle: string;
  columnType?: 'text' | 'number' | 'uah' | 'percent';
  initialSpec: FilterSpec | null;
  onSave: (spec: FilterSpec | null) => void;
  onCancel: () => void;
};

export const ColumnFilterDialog: React.FC<ColumnFilterDialogProps> = ({
  open,
  columnTitle,
  columnType = 'text',
  initialSpec,
  onSave,
  onCancel,
}) => {
  const [contains, setContains] = useState('');
  const [isEmpty, setIsEmpty] = useState(false);
  const [isNotEmpty, setIsNotEmpty] = useState(false);
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');

  const isNumeric = columnType === 'number' || columnType === 'uah' || columnType === 'percent';

  useEffect(() => {
    if (open) {
      const s = initialSpec;
      if (!s) {
        setContains('');
        setIsEmpty(false);
        setIsNotEmpty(false);
        setMin('');
        setMax('');
      } else if (s.type === 'text') {
        setContains(s.contains ?? '');
        setIsEmpty(s.isEmpty ?? false);
        setIsNotEmpty(s.isNotEmpty ?? false);
        setMin('');
        setMax('');
      } else {
        setContains('');
        setIsEmpty(s.isEmpty ?? false);
        setIsNotEmpty(s.isNotEmpty ?? false);
        setMin(s.min != null ? String(s.min) : '');
        setMax(s.max != null ? String(s.max) : '');
      }
    }
  }, [open, initialSpec]);

  const handleSave = () => {
    if (isEmpty && isNotEmpty) {
      onSave(null);
      return;
    }
    if (isNumeric) {
      const mn = min.trim() ? parseFloat(min.replace(',', '.')) : undefined;
      const mx = max.trim() ? parseFloat(max.replace(',', '.')) : undefined;
      if (mn == null && mx == null && !isEmpty && !isNotEmpty) {
        onSave(null);
        return;
      }
      onSave({
        type: 'number',
        min: mn,
        max: mx,
        isEmpty: isEmpty || undefined,
        isNotEmpty: isNotEmpty || undefined,
      } as FilterSpec);
    } else {
      if (!contains.trim() && !isEmpty && !isNotEmpty) {
        onSave(null);
        return;
      }
      onSave({
        type: 'text',
        contains: contains.trim() || undefined,
        isEmpty: isEmpty || undefined,
        isNotEmpty: isNotEmpty || undefined,
      } as FilterSpec);
    }
  };

  const handleClear = () => {
    onSave(null);
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>Фільтр: {columnTitle}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        {isNumeric ? (
          <>
            <TextField
              label="Мін"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              size="small"
              type="text"
            />
            <TextField
              label="Макс"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              size="small"
              type="text"
            />
          </>
        ) : (
          <TextField
            label="Містить"
            value={contains}
            onChange={(e) => setContains(e.target.value)}
            size="small"
            placeholder="текст..."
          />
        )}
        <FormControlLabel
          control={<Checkbox checked={isEmpty} onChange={(e) => setIsEmpty(e.target.checked)} />}
          label="Порожні"
        />
        <FormControlLabel
          control={<Checkbox checked={isNotEmpty} onChange={(e) => setIsNotEmpty(e.target.checked)} />}
          label="Непорожні"
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClear} color="secondary">
          Очистити
        </Button>
        <Button onClick={onCancel}>Скасувати</Button>
        <Button onClick={handleSave} variant="contained">
          Застосувати
        </Button>
      </DialogActions>
    </Dialog>
  );
};
