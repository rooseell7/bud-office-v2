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
    supplierName: string;
    invoiceNumber?: string;
    status: 'accepted' | 'partial' | 'rejected';
    comment?: string;
  }) => void;
};

const AddMaterialReceiptDialog: React.FC<Props> = ({ open, onClose, onSubmit }) => {
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [status, setStatus] = useState<'accepted' | 'partial' | 'rejected'>('accepted');
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (!supplierName.trim()) return;
    onSubmit({
      supplierName: supplierName.trim(),
      invoiceNumber: invoiceNumber.trim() || undefined,
      status,
      comment: comment.trim() || undefined,
    });
    setSupplierName('');
    setInvoiceNumber('');
    setStatus('accepted');
    setComment('');
    onClose();
  };

  const handleClose = () => {
    setSupplierName('');
    setInvoiceNumber('');
    setStatus('accepted');
    setComment('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Прийняти матеріали</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Постачальник"
          fullWidth
          required
          value={supplierName}
          onChange={(e) => setSupplierName(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Номер накладної"
          fullWidth
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Статус"
          select
          fullWidth
          value={status}
          onChange={(e) => setStatus(e.target.value as 'accepted' | 'partial' | 'rejected')}
        >
          <MenuItem value="accepted">Прийнято повністю</MenuItem>
          <MenuItem value="partial">Частково</MenuItem>
          <MenuItem value="rejected">Відхилено</MenuItem>
        </TextField>
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
        <Button onClick={handleSubmit} variant="contained" disabled={!supplierName.trim()}>
          Зберегти
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddMaterialReceiptDialog;
