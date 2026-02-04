import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  getSupplyRequest,
  submitSupplyRequest,
  closeSupplyRequest,
  createOrderFromRequest,
  createSupplyRequest,
  updateSupplyRequest,
  getSupplyProjectOptions,
} from '../../../api/supply';
import { AuditBlock } from '../components/AuditBlock';
import type { SupplyRequestDto, SupplyRequestItemDto } from '../../../api/supply';

const statusLabels: Record<string, string> = { draft: 'Чернетка', submitted: 'Передано', closed: 'Закрито', cancelled: 'Скасовано' };
const priorityLabels: Record<string, string> = { low: 'Низький', normal: 'Звичайний', high: 'Високий' };

type ItemRow = { customName: string; unit: string; qty: number; note: string; priority: string };

export default function SupplyRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<SupplyRequestDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id || id === 'new') return;
    setLoading(true);
    try {
      const d = await getSupplyRequest(Number(id));
      setData(d);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleSubmit = async () => {
    if (!id || id === 'new') return;
    setBusy(true);
    try {
      await submitSupplyRequest(Number(id));
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await closeSupplyRequest(Number(id));
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const { orderId } = await createOrderFromRequest(Number(id));
      navigate(`/supply/orders/${orderId}`);
    } finally {
      setBusy(false);
    }
  };

  // ----- Create form (id === 'new') -----
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);
  const [projectId, setProjectId] = useState<number | ''>('');
  const [neededAt, setNeededAt] = useState('');
  const [comment, setComment] = useState('');
  const [items, setItems] = useState<ItemRow[]>([{ customName: '', unit: 'шт', qty: 0, note: '', priority: 'normal' }]);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    if (id !== 'new') return;
    getSupplyProjectOptions().then(setProjects).catch(() => setProjects([]));
  }, [id]);

  const addItem = () => setItems((prev) => [...prev, { customName: '', unit: 'шт', qty: 0, note: '', priority: 'normal' }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof ItemRow, value: string | number) => {
    setItems((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  };

  const handleCreate = async () => {
    setCreateError('');
    if (projectId === '' || typeof projectId !== 'number') {
      setCreateError("Оберіть об'єкт");
      return;
    }
    const validItems: SupplyRequestItemDto[] = items
      .filter((r) => r.customName.trim() !== '' && r.qty > 0)
      .map((r) => ({ customName: r.customName.trim(), unit: r.unit || 'шт', qty: Number(r.qty), note: r.note || null, priority: r.priority || 'normal' }));
    if (validItems.length === 0) {
      setCreateError('Додайте щонайменше одну позицію (найменування та кількість > 0)');
      return;
    }
    setBusy(true);
    try {
      const created = await createSupplyRequest({
        projectId: projectId as number,
        neededAt: neededAt || undefined,
        comment: comment || undefined,
        items: validItems,
      });
      navigate(`/supply/requests/${created.id}`);
    } catch (e: any) {
      setCreateError(e?.response?.data?.message || 'Помилка створення заявки');
    } finally {
      setBusy(false);
    }
  };

  if (id === 'new') {
    return (
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/supply/requests')}>Назад</Button>
          <Typography variant="h6">Нова заявка на постачання</Typography>
        </Box>
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Об'єкт *</InputLabel>
          <Select value={projectId} label="Об'єкт *" onChange={(e) => setProjectId(e.target.value as number)}>
            <MenuItem value="">—</MenuItem>
            {projects.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField fullWidth size="small" label="Дата потреби" type="date" value={neededAt} onChange={(e) => setNeededAt(e.target.value)} sx={{ mb: 2 }} InputLabelProps={{ shrink: true }} />
        <TextField fullWidth size="small" label="Коментар" multiline value={comment} onChange={(e) => setComment(e.target.value)} sx={{ mb: 2 }} />
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Позиції</Typography>
        <TableContainer component={Paper} sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Найменування *</TableCell>
                <TableCell>Од. вим.</TableCell>
                <TableCell>К-ть *</TableCell>
                <TableCell>Пріоритет</TableCell>
                <TableCell>Примітка</TableCell>
                <TableCell width={48} />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <TextField size="small" fullWidth value={row.customName} onChange={(e) => updateItem(idx, 'customName', e.target.value)} placeholder="Назва матеріалу" />
                  </TableCell>
                  <TableCell>
                    <TextField size="small" value={row.unit} onChange={(e) => updateItem(idx, 'unit', e.target.value)} sx={{ width: 80 }} />
                  </TableCell>
                  <TableCell>
                    <TextField size="small" type="number" inputProps={{ min: 0, step: 0.01 }} value={row.qty || ''} onChange={(e) => updateItem(idx, 'qty', e.target.value === '' ? 0 : parseFloat(e.target.value))} sx={{ width: 90 }} />
                  </TableCell>
                  <TableCell>
                    <Select size="small" value={row.priority} onChange={(e) => updateItem(idx, 'priority', e.target.value)} sx={{ minWidth: 120 }}>
                      {Object.entries(priorityLabels).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <TextField size="small" fullWidth value={row.note} onChange={(e) => updateItem(idx, 'note', e.target.value)} placeholder="—" />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => removeItem(idx)} disabled={items.length <= 1}><DeleteOutlineIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={addItem} sx={{ mb: 2 }}>Додати позицію</Button>
        {createError && <Typography color="error" sx={{ mb: 1 }}>{createError}</Typography>}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" disabled={busy} onClick={handleCreate}>Створити заявку</Button>
        </Box>
      </Box>
    );
  }

  // ----- Draft edit state (for Save) -----
  const [editNeededAt, setEditNeededAt] = useState('');
  const [editComment, setEditComment] = useState('');
  const [editItems, setEditItems] = useState<ItemRow[]>([]);
  const [editDirty, setEditDirty] = useState(false);
  useEffect(() => {
    if (data) {
      setEditNeededAt(data.neededAt ?? '');
      setEditComment(data.comment ?? '');
      setEditItems((data.items ?? []).map((row: any) => ({
        customName: row.customName ?? '',
        unit: row.unit ?? 'шт',
        qty: typeof row.qty === 'number' ? row.qty : parseFloat(String(row.qty)) || 0,
        note: row.note ?? '',
        priority: row.priority ?? 'normal',
      })));
      setEditDirty(false);
    }
  }, [data?.id, data?.updatedAt]);

  const handleSaveDraft = async () => {
    if (!data || data.status !== 'draft') return;
    const validItems: SupplyRequestItemDto[] = editItems
      .filter((r) => r.customName.trim() !== '' && r.qty > 0)
      .map((r) => ({ customName: r.customName.trim(), unit: r.unit || 'шт', qty: Number(r.qty), note: r.note || null, priority: r.priority || 'normal' }));
    setBusy(true);
    try {
      await updateSupplyRequest(data.id, { neededAt: editNeededAt || undefined, comment: editComment || undefined, items: validItems });
      setEditDirty(false);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const addEditItem = () => { setEditItems((prev) => [...prev, { customName: '', unit: 'шт', qty: 0, note: '', priority: 'normal' }]); setEditDirty(true); };
  const removeEditItem = (idx: number) => { setEditItems((prev) => prev.filter((_, i) => i !== idx)); setEditDirty(true); };
  const updateEditItem = (idx: number, field: keyof ItemRow, value: string | number) => {
    setEditItems((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
    setEditDirty(true);
  };

  if (loading || !data) {
    return <Box sx={{ p: 2 }}>Завантаження…</Box>;
  }

  const isDraft = data.status === 'draft';

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/supply/requests')}>Назад</Button>
        <Typography variant="h6">Заявка №{data.id}</Typography>
        <Typography color="text.secondary">Об'єкт: {data.projectId}</Typography>
        <Typography color="text.secondary">Дата потреби: {data.neededAt ?? '—'}</Typography>
        <Typography color="text.secondary">Статус: {statusLabels[data.status] ?? data.status}</Typography>
      </Box>
      {isDraft ? (
        <>
          <TextField fullWidth size="small" label="Дата потреби" type="date" value={editNeededAt} onChange={(e) => { setEditNeededAt(e.target.value); setEditDirty(true); }} sx={{ mb: 2 }} InputLabelProps={{ shrink: true }} />
          <TextField fullWidth size="small" label="Коментар" multiline value={editComment} onChange={(e) => { setEditComment(e.target.value); setEditDirty(true); }} sx={{ mb: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Позиції</Typography>
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Найменування *</TableCell>
                  <TableCell>Од.</TableCell>
                  <TableCell>К-ть *</TableCell>
                  <TableCell>Пріоритет</TableCell>
                  <TableCell>Примітка</TableCell>
                  <TableCell width={48} />
                </TableRow>
              </TableHead>
              <TableBody>
                {editItems.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell><TextField size="small" fullWidth value={row.customName} onChange={(e) => updateEditItem(idx, 'customName', e.target.value)} /></TableCell>
                    <TableCell><TextField size="small" value={row.unit} onChange={(e) => updateEditItem(idx, 'unit', e.target.value)} sx={{ width: 80 }} /></TableCell>
                    <TableCell><TextField size="small" type="number" inputProps={{ min: 0 }} value={row.qty || ''} onChange={(e) => updateEditItem(idx, 'qty', e.target.value === '' ? 0 : parseFloat(e.target.value))} sx={{ width: 90 }} /></TableCell>
                    <TableCell>
                      <Select size="small" value={row.priority} onChange={(e) => updateEditItem(idx, 'priority', e.target.value)} sx={{ minWidth: 120 }}>
                        {Object.entries(priorityLabels).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                      </Select>
                    </TableCell>
                    <TableCell><TextField size="small" fullWidth value={row.note} onChange={(e) => updateEditItem(idx, 'note', e.target.value)} /></TableCell>
                    <TableCell><IconButton size="small" onClick={() => removeEditItem(idx)} disabled={editItems.length <= 1}><DeleteOutlineIcon /></IconButton></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={addEditItem} sx={{ mb: 2 }}>Додати позицію</Button>
        </>
      ) : (
        <>
          {data.comment && <Typography variant="body2" sx={{ mb: 1 }}>Коментар: {data.comment}</Typography>}
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Матеріал / Найменування</TableCell>
                  <TableCell>Од.</TableCell>
                  <TableCell>К-ть</TableCell>
                  <TableCell>Пріоритет</TableCell>
                  <TableCell>Примітка</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data.items ?? []).map((row: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell>{row.customName ?? `Матеріал ${row.materialId ?? '—'}`}</TableCell>
                    <TableCell>{row.unit}</TableCell>
                    <TableCell>{row.qty}</TableCell>
                    <TableCell>{row.priority ?? 'normal'}</TableCell>
                    <TableCell>{row.note ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {isDraft && (
          <>
            <Button variant="contained" disabled={busy || !editDirty} onClick={handleSaveDraft}>Зберегти</Button>
            <Button variant="contained" disabled={busy} onClick={handleSubmit}>Передати в постачання</Button>
          </>
        )}
        {data.status === 'submitted' && (
          <>
            <Button variant="contained" disabled={busy} onClick={handleCreateOrder}>Створити замовлення</Button>
            <Button variant="outlined" disabled={busy} onClick={handleClose}>Закрити</Button>
          </>
        )}
      </Box>
      <AuditBlock events={data.audit ?? []} />
    </Box>
  );
}
