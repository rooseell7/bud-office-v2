import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Select, MenuItem, FormControl, InputLabel, Dialog, DialogTitle, DialogContent, TextField, List, ListItem, ListItemText,
  IconButton, DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import { getSupplyRequests, getSupplyProjectOptions, getSupplyTemplates, createRequestFromTemplate, deleteSupplyRequest } from '../../../api/supply';
import type { SupplyRequestDto, SupplyRequestTemplateDto } from '../../../api/supply';
import { useAuth } from '../../auth/AuthContext';

const statusLabels: Record<string, string> = { draft: 'Чернетка', submitted: 'Передано', closed: 'Закрито', cancelled: 'Скасовано' };

export default function SupplyRequestsPage() {
  const navigate = useNavigate();
  const { roles } = useAuth();
  const isAdmin = Array.isArray(roles) && roles.map((r) => String(r).toLowerCase()).includes('admin');
  const [list, setList] = useState<SupplyRequestDto[]>([]);
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);
  const [projectId, setProjectId] = useState<number | ''>('');
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templates, setTemplates] = useState<SupplyRequestTemplateDto[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
  const [createProjectId, setCreateProjectId] = useState<number | ''>('');
  const [createNeededAt, setCreateNeededAt] = useState('');
  const [createComment, setCreateComment] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState('');

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => { getSupplyProjectOptions().then(setProjects).catch(() => setProjects([])); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const params: { projectId?: number; status?: string } = {};
      if (projectId !== '') params.projectId = projectId as number;
      if (status) params.status = status;
      const data = await getSupplyRequests(params);
      setList(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId, status]);

  const openTemplateModal = () => {
    const pid = projectId !== '' ? projectId as number : undefined;
    setCreateProjectId(projectId !== '' ? projectId as number : '');
    setCreateNeededAt('');
    setCreateComment('');
    setSelectedTemplateId('');
    setCreateError('');
    setTemplateModalOpen(true);
    getSupplyTemplates(pid).then(setTemplates).catch(() => setTemplates([]));
  };

  useEffect(() => {
    if (templateModalOpen) {
      getSupplyTemplates(createProjectId !== '' ? createProjectId as number : undefined).then(setTemplates).catch(() => setTemplates([]));
    }
  }, [templateModalOpen, createProjectId]);

  const handleCreateFromTemplate = async () => {
    if (selectedTemplateId === '' || createProjectId === '') {
      setCreateError("Оберіть шаблон та об'єкт");
      return;
    }
    setCreateBusy(true);
    setCreateError('');
    try {
      const { requestId } = await createRequestFromTemplate(selectedTemplateId as number, {
        projectId: createProjectId as number,
        neededAt: createNeededAt || undefined,
        comment: createComment || undefined,
      });
      setTemplateModalOpen(false);
      navigate(`/supply/requests/${requestId}`);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Помилка створення заявки';
      setCreateError(msg);
    } finally {
      setCreateBusy(false);
    }
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  const handleDeleteRequest = async (requestId: number) => {
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await deleteSupplyRequest(requestId);
      setDeleteConfirmId(null);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Помилка видалення';
      setDeleteError(msg);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6">Заявки на постачання</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Об'єкт</InputLabel>
            <Select value={projectId === '' ? '' : projectId} label="Об'єкт" onChange={(e) => setProjectId(e.target.value === '' ? '' : (e.target.value as number))}>
              <MenuItem value="">Усі</MenuItem>
              {projects.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Статус</InputLabel>
            <Select value={status} label="Статус" onChange={(e) => setStatus(e.target.value)}>
              <MenuItem value="">Усі</MenuItem>
              {Object.entries(statusLabels).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={openTemplateModal}>
            Створити з шаблону
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/supply/requests/new')}>
            Створити
          </Button>
        </Box>
      </Box>

      <Dialog open={templateModalOpen} onClose={() => setTemplateModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Створити заявку з шаблону</DialogTitle>
        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mt: 1, mb: 2 }}>
            <InputLabel>Об'єкт *</InputLabel>
            <Select value={createProjectId} label="Об'єкт *" onChange={(e) => setCreateProjectId(e.target.value === '' ? '' : (e.target.value as number))}>
              <MenuItem value="">—</MenuItem>
              {projects.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Шаблон *</InputLabel>
            <Select value={selectedTemplateId} label="Шаблон *" onChange={(e) => setSelectedTemplateId(e.target.value === '' ? '' : (e.target.value as number))}>
              <MenuItem value="">—</MenuItem>
              {templates.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}{t.projectId ? ` (об'єкт ${t.projectId})` : ' (глобальний)'}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField fullWidth size="small" label="Дата потреби" type="date" value={createNeededAt} onChange={(e) => setCreateNeededAt(e.target.value)} sx={{ mb: 2 }} InputLabelProps={{ shrink: true }} />
          <TextField fullWidth size="small" label="Коментар" multiline value={createComment} onChange={(e) => setCreateComment(e.target.value)} sx={{ mb: 2 }} />
          {selectedTemplate?.items && selectedTemplate.items.length > 0 && (
            <>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Прев'ю позицій ({selectedTemplate.items.length})</Typography>
              <List dense sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                {selectedTemplate.items.map((row, idx) => (
                  <ListItem key={idx}>
                    <ListItemText primary={row.customName || `Матеріал #${row.materialId}`} secondary={`${row.qtyDefault} ${row.unit}`} />
                  </ListItem>
                ))}
              </List>
            </>
          )}
          {createError && <Typography color="error" sx={{ mt: 1 }}>{createError}</Typography>}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={() => setTemplateModalOpen(false)}>Скасувати</Button>
            <Button variant="contained" disabled={createBusy || selectedTemplateId === '' || createProjectId === ''} onClick={handleCreateFromTemplate}>
              Створити
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteConfirmId != null} onClose={() => !deleteBusy && setDeleteConfirmId(null)}>
        <DialogTitle>Видалити заявку?</DialogTitle>
        <DialogContent>
          {deleteError && <Typography color="error" sx={{ mt: 1 }}>{deleteError}</Typography>}
          <Typography>Заявку №{deleteConfirmId} буде видалено безповоротно.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)} disabled={deleteBusy}>Скасувати</Button>
          <Button color="error" variant="contained" onClick={() => deleteConfirmId != null && handleDeleteRequest(deleteConfirmId)} disabled={deleteBusy}>
            {deleteBusy ? 'Видалення…' : 'Видалити'}
          </Button>
        </DialogActions>
      </Dialog>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>№</TableCell>
              <TableCell>Об'єкт</TableCell>
              <TableCell>Дата потреби</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Позицій</TableCell>
              <TableCell width={56} />
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6}>Завантаження…</TableCell></TableRow>
            ) : list.length === 0 ? (
              <TableRow><TableCell colSpan={6}>Немає заявок</TableCell></TableRow>
            ) : (
              list.map((r) => (
                <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/supply/requests/${r.id}`)}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{projectMap[r.projectId] ?? `Об'єкт ${r.projectId}`}</TableCell>
                  <TableCell>{r.neededAt ?? '—'}</TableCell>
                  <TableCell>{statusLabels[r.status] ?? r.status}</TableCell>
                  <TableCell>{r.items?.length ?? 0}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {(r.status === 'draft' || isAdmin) && (
                      <IconButton size="small" color="error" aria-label="Видалити" onClick={() => setDeleteConfirmId(r.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
