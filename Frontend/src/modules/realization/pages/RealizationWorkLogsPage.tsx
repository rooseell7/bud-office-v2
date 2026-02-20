import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  getRealizationProjects,
  getRealizationWorkLogs,
  createRealizationWorkLog,
  updateRealizationWorkLog,
  deleteRealizationWorkLog,
  type RealizationWorkLogDto,
  type RealizationProjectListItem,
} from '../../../api/realization';
import { useAuth } from '../../auth/AuthContext';
import { WorkLogModal } from '../components/WorkLogModal';
import type { WorkLogForm } from '../components/WorkLogModal';

export default function RealizationWorkLogsPage() {
  const navigate = useNavigate();
  void navigate;
  const { can } = useAuth();
  const [projects, setProjects] = useState<RealizationProjectListItem[]>([]);
  const [projectId, setProjectId] = useState<number | ''>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [list, setList] = useState<RealizationWorkLogDto[]>([]);
  const [total, setTotal] = useState(0);
  void total;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<RealizationWorkLogDto | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      const res = await getRealizationProjects({ limit: 500 });
      setProjects(res.items ?? []);
    } catch {
      setProjects([]);
    }
  }, []);

  const load = useCallback(async () => {
    if (projectId === '') {
      setList([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getRealizationWorkLogs(projectId as number, {
        from: fromDate || undefined,
        to: toDate || undefined,
        limit: 100,
      });
      setList(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Помилка завантаження';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId, fromDate, toDate]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);
  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = () => {
    setEditingLog(null);
    setModalOpen(true);
  };

  const handleEdit = (row: RealizationWorkLogDto) => {
    setEditingLog(row);
    setModalOpen(true);
  };

  const handleSubmit = async (form: WorkLogForm) => {
    if (projectId === '') return;
    const pid = projectId as number;
    if (editingLog) {
      await updateRealizationWorkLog(pid, editingLog.id, {
        workDate: form.workDate,
        comment: form.comment || null,
        items: form.items,
      });
    } else {
      await createRealizationWorkLog(pid, {
        workDate: form.workDate,
        comment: form.comment || null,
        items: form.items,
      });
    }
    load();
  };

  const handleDelete = async (row: RealizationWorkLogDto) => {
    if (projectId === '' || !window.confirm('Видалити запис?')) return;
    try {
      await deleteRealizationWorkLog(projectId as number, row.id);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Помилка видалення';
      setError(msg);
    }
  };

  if (!can('realization:read')) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">Немає доступу</Typography>
      </Box>
    );
  }

  const canWrite = can('realization:write');

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6">Журнал робіт</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Об'єкт</InputLabel>
            <Select
              value={projectId}
              label="Об'єкт"
              onChange={(e) => setProjectId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <MenuItem value="">— Оберіть об'єкт —</MenuItem>
              {projects.map((p) => (
                <MenuItem key={p.projectId} value={p.projectId}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="З дати"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 140 }}
          />
          <TextField
            size="small"
            label="По дату"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 140 }}
          />
          {canWrite && projectId !== '' && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
              Додати запис
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : projectId === '' ? (
        <Typography variant="body2" color="text.secondary">
          Оберіть об'єкт, щоб переглянути журнал робіт
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Дата</TableCell>
                <TableCell>Коментар</TableCell>
                <TableCell>Позицій</TableCell>
                {canWrite && <TableCell width={100} />}
              </TableRow>
            </TableHead>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canWrite ? 4 : 3}>
                    <Typography variant="body2" color="text.secondary">
                      Немає записів
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                list.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.workDate}</TableCell>
                    <TableCell sx={{ maxWidth: 300 }}>{row.comment ? row.comment.slice(0, 80) + (row.comment.length > 80 ? '…' : '') : '—'}</TableCell>
                    <TableCell>{row.items?.length ?? 0}</TableCell>
                    {canWrite && (
                      <TableCell>
                        <IconButton size="small" onClick={() => handleEdit(row)} aria-label="Редагувати">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(row)} aria-label="Видалити" color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <WorkLogModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initial={editingLog}
      />
    </Box>
  );
}
