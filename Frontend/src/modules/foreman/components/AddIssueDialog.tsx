import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
} from '@mui/material';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    priority?: string;
  }) => void;
};

const AddIssueDialog: React.FC<Props> = ({ open, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<string>('medium');

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      priority: priority || undefined,
    });
    setTitle('');
    setDescription('');
    setPriority('medium');
    onClose();
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Додати проблему</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Заголовок"
          fullWidth
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Опис"
          fullWidth
          multiline
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Пріоритет"
          select
          fullWidth
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <MenuItem value="low">Низький</MenuItem>
          <MenuItem value="medium">Середній</MenuItem>
          <MenuItem value="high">Високий</MenuItem>
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Скасувати</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!title.trim()}>
          Зберегти
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddIssueDialog;
