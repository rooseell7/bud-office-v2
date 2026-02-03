import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    workName: string;
    unit?: string;
    qty?: number;
    comment?: string;
  }) => void;
};

const AddWorkDialog: React.FC<Props> = ({ open, onClose, onSubmit }) => {
  const [workName, setWorkName] = useState('');
  const [unit, setUnit] = useState('');
  const [qty, setQty] = useState<string>('');
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (!workName.trim()) return;
    onSubmit({
      workName: workName.trim(),
      unit: unit.trim() || undefined,
      qty: qty ? parseFloat(qty) : undefined,
      comment: comment.trim() || undefined,
    });
    setWorkName('');
    setUnit('');
    setQty('');
    setComment('');
  };

  const handleClose = () => {
    setWorkName('');
    setUnit('');
    setQty('');
    setComment('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Додати роботу</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Найменування роботи"
          fullWidth
          required
          value={workName}
          onChange={(e) => setWorkName(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Од. виміру"
          fullWidth
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Кількість"
          type="number"
          fullWidth
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Коментар"
          fullWidth
          multiline
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Скасувати</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!workName.trim()}>
          Зберегти
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddWorkDialog;
