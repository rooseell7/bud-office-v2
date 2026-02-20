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
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  getRealizationProjects,
  getRealizationIssues,
  createRealizationIssue,
  updateRealizationIssue,
  deleteRealizationIssue,
  type RealizationIssueDto,
  type RealizationProjectListItem,
} from '../../../api/realization';
import { useAuth } from '../../auth/AuthContext';
import { IssueModal } from '../components/IssueModal';
import type { IssueForm } from '../components/IssueModal';

const priorityLabels: Record<string, string> = {
  low: 'Низький',
  medium: 'Середній',
  high: 'Високий',
  critical: 'Критичний',
};

const statusLabels: Record<string, string> = {
  open: 'Відкрито',
  in_progress: 'В роботі',
  blocked: 'Заблоковано',
  done: 'Виконано',
  wontfix: 'Не вирішувати',
};

export default function RealizationIssuesPage() {
  const navigate = useNavigate();
  void navigate;
  const { can } = useAuth();
  const [projects, setProjects] = useState<RealizationProjectListItem[]>([]);
  const [projectId, setProjectId] = useState<number | ''>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [list, setList] = useState<RealizationIssueDto[]>([]);
  const [total, setTotal] = useState(0);
  void total;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<RealizationIssueDto | null>(null);

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
      const res = await getRealizationIssues(projectId as number, {
        status: statusFilter || undefined,
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
  }, [projectId, statusFilter]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = () => {
    setEditingIssue(null);
    setModalOpen(true);
  };

  const handleEdit = (issue: RealizationIssueDto) => {
    setEditingIssue(issue);
    setModalOpen(true);
  };

  const handleSubmit = async (form: IssueForm) => {
    if (projectId === '') return;
    const pid = projectId as number;
    if (editingIssue) {
      await updateRealizationIssue(pid, editingIssue.id, {
        title: form.title,
        description: form.description || null,
        priority: form.priority,
        status: form.status,
      });
    } else {
      await createRealizationIssue(pid, {
        title: form.title,
        description: form.description || null,
        priority: form.priority as any,
        status: form.status as any,
      });
    }
    load();
  };

  const handleDelete = async (issue: RealizationIssueDto) => {
    if (projectId === '' || !window.confirm('Видалити проблему?')) return;
    try {
      await deleteRealizationIssue(projectId as number, issue.id);
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
        <Typography variant="h6">Проблеми / Дефекти</Typography>
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
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Статус</InputLabel>
            <Select value={statusFilter} label="Статус" onChange={(e) => setStatusFilter(e.target.value)}>
              <MenuItem value="">Усі</MenuItem>
              {Object.entries(statusLabels).map(([v, l]) => (
                <MenuItem key={v} value={v}>
                  {l}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {canWrite && projectId !== '' && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
              Створити
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
          Оберіть об'єкт, щоб переглянути проблеми
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Назва</TableCell>
                <TableCell>Пріоритет</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Термін</TableCell>
                {canWrite && <TableCell width={80} />}
              </TableRow>
            </TableHead>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canWrite ? 5 : 4}>
                    <Typography variant="body2" color="text.secondary">
                      Немає записів
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                list.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.title}</TableCell>
                    <TableCell>
                      <Chip size="small" label={priorityLabels[row.priority] ?? row.priority} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={statusLabels[row.status] ?? row.status} variant="outlined" />
                    </TableCell>
                    <TableCell>{row.dueDate ?? '—'}</TableCell>
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

      <IssueModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initial={editingIssue}
      />
    </Box>
  );
}
