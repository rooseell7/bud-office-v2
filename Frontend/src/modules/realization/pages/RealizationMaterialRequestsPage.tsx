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
  TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import {
  getRealizationProjects,
  getRealizationMaterialRequests,
  createRealizationMaterialRequest,
  updateRealizationMaterialRequest,
  linkMaterialRequestInvoice,
  deleteRealizationMaterialRequest,
  type RealizationMaterialRequestDto,
  type RealizationProjectListItem,
} from '../../../api/realization';
import { useAuth } from '../../auth/AuthContext';
import { MaterialRequestModal } from '../components/MaterialRequestModal';
import type { MaterialRequestForm } from '../components/MaterialRequestModal';

const statusLabels: Record<string, string> = {
  draft: 'Чернетка',
  sent: 'Відправлено',
  in_progress: 'В роботі',
  ordered: 'Замовлено',
  delivered: 'Доставлено',
  received: 'Отримано',
  cancelled: 'Скасовано',
};

export default function RealizationMaterialRequestsPage() {
  const navigate = useNavigate();
  void navigate;
  const { can } = useAuth();
  const [projects, setProjects] = useState<RealizationProjectListItem[]>([]);
  const [projectId, setProjectId] = useState<number | ''>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [list, setList] = useState<RealizationMaterialRequestDto[]>([]);
  const [total, setTotal] = useState(0);
  void total;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<RealizationMaterialRequestDto | null>(null);
  const [linkInvoiceId, setLinkInvoiceId] = useState<string>('');
  const [linkRequestId, setLinkRequestId] = useState<number | null>(null);

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
      const res = await getRealizationMaterialRequests(projectId as number, {
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
    setEditingRequest(null);
    setModalOpen(true);
  };

  const handleEdit = (row: RealizationMaterialRequestDto) => {
    setEditingRequest(row);
    setModalOpen(true);
  };

  const handleSubmit = async (form: MaterialRequestForm) => {
    if (projectId === '') return;
    const pid = projectId as number;
    if (editingRequest) {
      await updateRealizationMaterialRequest(pid, editingRequest.id, {
        comment: form.comment || null,
        neededAt: form.neededAt || null,
        status: form.status,
        items: form.items,
      });
    } else {
      await createRealizationMaterialRequest(pid, {
        comment: form.comment || null,
        neededAt: form.neededAt || null,
        status: form.status,
        items: form.items,
      });
    }
    load();
  };

  const handleDelete = async (row: RealizationMaterialRequestDto) => {
    if (projectId === '' || !window.confirm('Видалити заявку?')) return;
    try {
      await deleteRealizationMaterialRequest(projectId as number, row.id);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Помилка видалення';
      setError(msg);
    }
  };

  const openLinkInvoice = (row: RealizationMaterialRequestDto) => {
    setLinkRequestId(row.id);
    setLinkInvoiceId(String(row.links?.invoiceId ?? ''));
  };

  const handleLinkInvoice = async () => {
    if (projectId === '' || linkRequestId === null) return;
    const id = parseInt(linkInvoiceId, 10);
    if (isNaN(id)) {
      setError('Вкажіть ID накладної (число)');
      return;
    }
    try {
      await linkMaterialRequestInvoice(projectId as number, linkRequestId, id);
      setLinkRequestId(null);
      setLinkInvoiceId('');
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Помилка прив’язки';
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
        <Typography variant="h6">Заявки на матеріали</Typography>
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
              Створити заявку
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {linkRequestId !== null && projectId !== '' && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            size="small"
            label="ID накладної"
            value={linkInvoiceId}
            onChange={(e) => setLinkInvoiceId(e.target.value)}
            type="number"
            sx={{ width: 120 }}
          />
          <Button variant="contained" size="small" onClick={handleLinkInvoice}>
            Прив’язати
          </Button>
          <Button size="small" onClick={() => { setLinkRequestId(null); setLinkInvoiceId(''); }}>
            Скасувати
          </Button>
        </Paper>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : projectId === '' ? (
        <Typography variant="body2" color="text.secondary">
          Оберіть об'єкт, щоб переглянути заявки
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Потрібно до</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Коментар</TableCell>
                <TableCell>Накладна</TableCell>
                {canWrite && <TableCell width={100} />}
              </TableRow>
            </TableHead>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canWrite ? 5 : 4}>
                    <Typography variant="body2" color="text.secondary">
                      Немає заявок
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                list.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.neededAt ?? '—'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={statusLabels[row.status] ?? row.status} />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>{row.comment ? row.comment.slice(0, 50) + (row.comment.length > 50 ? '…' : '') : '—'}</TableCell>
                    <TableCell>
                      {row.links?.invoiceId != null ? (
                        <Typography variant="body2">#{row.links.invoiceId}</Typography>
                      ) : canWrite ? (
                        <IconButton size="small" onClick={() => openLinkInvoice(row)} title="Прив’язати накладну">
                          <LinkIcon fontSize="small" />
                        </IconButton>
                      ) : (
                        '—'
                      )}
                    </TableCell>
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

      <MaterialRequestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initial={editingRequest}
      />
    </Box>
  );
}
