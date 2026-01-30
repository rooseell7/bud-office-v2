import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
} from '@mui/material';
import { useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  warehouseId: string;
}

export default function OperationInDialog({
  open,
  onClose,
  warehouseId,
}: Props) {
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    // v2.1: тут буде API POST /operations/in
    console.log('IN', {
      warehouseId,
      materialId,
      quantity,
      comment,
    });

    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>➕ Прихід матеріалу (IN)</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Матеріал ID"
            value={materialId}
            onChange={(e) => setMaterialId(e.target.value)}
            fullWidth
          />

          <TextField
            label="Кількість"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            fullWidth
          />

          <TextField
            label="Коментар"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            fullWidth
            multiline
            rows={3}
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Скасувати</Button>
        <Button variant="contained" onClick={handleSubmit}>
          Зберегти
        </Button>
      </DialogActions>
    </Dialog>
  );
}
