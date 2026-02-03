import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import { getForemanCandidates } from '../../../api/objects';
import { getStagesByObjectId, type ExecutionTaskPriority } from '../../../api/execution';

export type CreateTaskForm = {
  stageId: number | null;
  title: string;
  description: string;
  assigneeId: number;
  priority: ExecutionTaskPriority;
  dueDate: string;
};

const defaultForm: CreateTaskForm = {
  stageId: null,
  title: '',
  description: '',
  assigneeId: 0,
  priority: 'medium',
  dueDate: '',
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: CreateTaskForm) => Promise<void>;
  projectId: number;
};

const CreateTaskModal: React.FC<Props> = ({ open, onClose, onSubmit, projectId }) => {
  const [form, setForm] = useState<CreateTaskForm>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foremen, setForemen] = useState<{ id: number; fullName: string }[]>([]);
  const [stages, setStages] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    if (!open || !projectId) return;
    setForm(defaultForm);
    setError(null);
    (async () => {
      try {
        const [candidates, stageList] = await Promise.all([
          getForemanCandidates(),
          getStagesByObjectId(projectId),
        ]);
        setForemen(candidates);
        setStages(stageList);
        if (candidates.length > 0 && form.assigneeId === 0) {
          setForm((f) => ({ ...f, assigneeId: candidates[0].id }));
        }
      } catch {
        setForemen([]);
        setStages([]);
      }
    })();
  }, [open, projectId]);

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setError('Вкажіть назву задачі');
      return;
    }
    if (!form.assigneeId) {
      setError('Оберіть виконроба');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        ...form,
        stageId: form.stageId || null,
        dueDate: form.dueDate ? form.dueDate : undefined,
      });
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Помилка збереження');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Створити задачу</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {stages.length > 0 && (
            <FormControl fullWidth size="small">
              <InputLabel>Етап</InputLabel>
              <Select
                value={form.stageId ?? ''}
                label="Етап"
                onChange={(e) => setForm((f) => ({ ...f, stageId: e.target.value ? Number(e.target.value) : null }))}
              >
                <MenuItem value="">Без етапу</MenuItem>
                {stages.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <TextField
            label="Назва"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            fullWidth
            size="small"
          />
          <TextField
            label="Опис"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            multiline
            rows={2}
            fullWidth
            size="small"
          />
          <FormControl fullWidth size="small" required>
            <InputLabel>Виконроб</InputLabel>
            <Select
              value={form.assigneeId || ''}
              label="Виконроб"
              onChange={(e) => setForm((f) => ({ ...f, assigneeId: Number(e.target.value) }))}
            >
              {foremen.map((u) => (
                <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Пріоритет</InputLabel>
            <Select
              value={form.priority}
              label="Пріоритет"
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as ExecutionTaskPriority }))}
            >
              <MenuItem value="low">Низький</MenuItem>
              <MenuItem value="medium">Середній</MenuItem>
              <MenuItem value="high">Високий</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Дедлайн"
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            fullWidth
            size="small"
          />
          {error && <Typography color="error" variant="body2">{error}</Typography>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Скасувати</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Збереження…' : 'Створити'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateTaskModal;
