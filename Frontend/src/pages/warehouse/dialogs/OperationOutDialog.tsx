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

export default function OperationOutDialog({
  open,
  onClose,
  warehouseId,
}: Props) {
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [projectId, setProjectId] = useState('');
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    // v2.1: тут буде API POST /operations/out
    console.log('OUT', {
      warehouseId,
      materialId,
      quantity,
      projectId,
      comment,
    });

    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>➖ Витрата матеріалу (OUT)</DialogTitle>

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
            label="Обʼєкт / Проєкт ID"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
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
        <Button variant="contained" color="error" onClick={handleSubmit}>
          Зберегти
        </Button>
      </DialogActions>
    </Dialog>
  );
}
