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
  Dialog,
  DialogTitle,
  DialogContent,
  FormControlLabel,
  Checkbox,
  Snackbar,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveAsIcon from '@mui/icons-material/SaveAs';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import {
  getSupplyRequest,
  submitSupplyRequest,
  closeSupplyRequest,
  createOrderFromRequest,
  createSupplyRequest,
  updateSupplyRequest,
  getSupplyProjectOptions,
  saveRequestAsTemplate,
  getPurchasePlan,
  createOrdersByPlan,
} from '../../../api/supply';
import type { PurchasePlan } from '../../../api/supply';
import { AuditBlock } from '../components/AuditBlock';
import { LinksBlockRequest } from '../components/LinksBlock';
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

  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateProjectScoped, setTemplateProjectScoped] = useState(true);
  const handleSaveAsTemplate = async () => {
    if (!data || !templateName.trim()) return;
    setBusy(true);
    try {
      await saveRequestAsTemplate(data.id, { name: templateName.trim(), projectScoped: templateProjectScoped });
      setSaveAsTemplateOpen(false);
      setTemplateName('');
      await load();
    } finally {
      setBusy(false);
    }
  };

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [plan, setPlan] = useState<PurchasePlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [includeUnassigned, setIncludeUnassigned] = useState(true);
  const [createPlanBusy, setCreatePlanBusy] = useState(false);
  const [planError, setPlanError] = useState('');
  const [createdOrderIds, setCreatedOrderIds] = useState<number[]>([]);
  const [conflictOrders, setConflictOrders] = useState<{ id: number }[]>([]);
  const [snackOpen, setSnackOpen] = useState(false);

  const openPlanModal = async () => {
    if (!data) return;
    setPlanModalOpen(true);
    setPlan(null);
    setPlanError('');
    setConflictOrders([]);
    setPlanLoading(true);
    try {
      const p = await getPurchasePlan(data.id, data.projectId);
      setPlan(p);
    } catch (e: any) {
      setPlanError(e?.response?.data?.message || 'Не вдалося завантажити план');
    } finally {
      setPlanLoading(false);
    }
  };

  const handleCreateOrdersByPlan = async () => {
    if (!data) return;
    setCreatePlanBusy(true);
    setPlanError('');
    setConflictOrders([]);
    try {
      const res = await createOrdersByPlan(data.id, { includeUnassigned, mode: 'use_last_purchase', unassignedStrategy: 'single_order_no_supplier' });
      setCreatedOrderIds(res.createdOrderIds);
      setPlanModalOpen(false);
      setSnackOpen(true);
      await load();
    } catch (e: any) {
      if (e?.response?.status === 409) {
        setPlanError(e?.response?.data?.message || 'Для цієї заявки вже створені замовлення.');
        try {
          const refreshed = await getSupplyRequest(data.id);
          setConflictOrders(refreshed.linkedOrders ?? []);
          if (refreshed.linkedOrders?.length) setData((prev) => (prev ? { ...prev, linkedOrders: refreshed.linkedOrders } : null));
        } catch {
          setConflictOrders(data.linkedOrders ?? []);
        }
      } else {
        setPlanError(e?.response?.data?.message || 'Помилка створення замовлень');
      }
    } finally {
      setCreatePlanBusy(false);
    }
  };

  const ordersToCreate = plan ? (includeUnassigned ? plan.groups.length : plan.groups.filter((g) => g.key !== 'UNASSIGNED').length) : 0;

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
      <LinksBlockRequest linkedOrders={data.linkedOrders} />
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {(data.status === 'draft' || data.status === 'submitted') && (data.items?.length ?? 0) > 0 && (
          <Button variant="outlined" size="small" startIcon={<SaveAsIcon />} disabled={busy} onClick={() => { setTemplateName(''); setTemplateProjectScoped(true); setSaveAsTemplateOpen(true); }}>
            Зберегти як шаблон
          </Button>
        )}
        {isDraft && (
          <>
            <Button variant="contained" disabled={busy || !editDirty} onClick={handleSaveDraft}>Зберегти</Button>
            <Button variant="contained" disabled={busy} onClick={handleSubmit}>Передати в постачання</Button>
            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              Після цього зʼявиться кнопка «Створити замовлення» — тоді замовлення потрапить у розділ Замовлення.
            </Typography>
          </>
        )}
        {data.status === 'submitted' && (
          <>
            <Button variant="contained" disabled={busy} onClick={handleCreateOrder}>Створити замовлення</Button>
            <Button variant="outlined" disabled={busy} onClick={openPlanModal} startIcon={<AccountTreeIcon />}>Авто-розбиття в замовлення</Button>
            <Button variant="outlined" disabled={busy} onClick={handleClose}>Закрити</Button>
          </>
        )}
      </Box>
      <Dialog open={saveAsTemplateOpen} onClose={() => setSaveAsTemplateOpen(false)}>
        <DialogTitle>Зберегти заявку як шаблон</DialogTitle>
        <DialogContent>
          <TextField fullWidth size="small" label="Назва шаблону" value={templateName} onChange={(e) => setTemplateName(e.target.value)} sx={{ mt: 1, mb: 2 }} />
          <FormControlLabel control={<Checkbox checked={templateProjectScoped} onChange={(e) => setTemplateProjectScoped(e.target.checked)} />} label="Прив'язати до поточного об'єкта" />
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={() => setSaveAsTemplateOpen(false)}>Скасувати</Button>
            <Button variant="contained" disabled={busy || !templateName.trim()} onClick={handleSaveAsTemplate}>Зберегти</Button>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={planModalOpen} onClose={() => setPlanModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>План закупівлі</DialogTitle>
        <DialogContent>
          {planLoading && <Typography color="text.secondary">Завантаження…</Typography>}
          {!planLoading && plan && (
            <>
              {plan.groups.map((group) => (
                <Box key={group.key} sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {group.supplierId != null ? (group.supplierName ?? `Постачальник #${group.supplierId}`) : 'Без постачальника'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Позицій: {group.totals.itemsCount}, сума (за підказаними цінами): {group.totals.sumSuggested.toFixed(2)} грн
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Матеріал / Найменування</TableCell>
                          <TableCell>Од.</TableCell>
                          <TableCell>К-ть</TableCell>
                          <TableCell>Ціна</TableCell>
                          <TableCell>Сума</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {group.items.map((it) => {
                          const qty = Number(it.qty) || 0;
                          const price = it.suggestedUnitPrice ?? 0;
                          const lineSum = Math.round(qty * price * 100) / 100;
                          return (
                            <TableRow key={it.requestItemId}>
                              <TableCell>{it.customName ?? `Матеріал #${it.materialId ?? '—'}`}</TableCell>
                              <TableCell>{it.unit}</TableCell>
                              <TableCell>{it.qty}</TableCell>
                              <TableCell>{it.suggestedUnitPrice != null ? `${it.suggestedUnitPrice} грн` : '—'}</TableCell>
                              <TableCell>{lineSum.toFixed(2)} грн</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ))}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Всього груп: {plan.totals.groupsCount}, позицій: {plan.totals.itemsCount}, сума: {plan.totals.sumSuggested.toFixed(2)} грн
              </Typography>
              <FormControlLabel
                control={<Checkbox checked={includeUnassigned} onChange={(e) => setIncludeUnassigned(e.target.checked)} />}
                label='Створювати замовлення для "Без постачальника"'
              />
              {planError && <Typography color="error" sx={{ mt: 1 }}>{planError}</Typography>}
              {conflictOrders.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">Існуючі замовлення:</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                    {conflictOrders.map((o) => (
                      <Button key={o.id} size="small" variant="outlined" onClick={() => { navigate(`/supply/orders/${o.id}`); setPlanModalOpen(false); }}>Замовлення №{o.id}</Button>
                    ))}
                  </Box>
                </Box>
              )}
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button onClick={() => setPlanModalOpen(false)}>Скасувати</Button>
                <Button variant="contained" disabled={createPlanBusy || ordersToCreate === 0} onClick={handleCreateOrdersByPlan}>
                  Створити замовлення ({ordersToCreate})
                </Button>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar open={snackOpen} autoHideDuration={6000} onClose={() => setSnackOpen(false)}>
        <Alert severity="success" onClose={() => setSnackOpen(false)}>
          Створено {createdOrderIds.length} замовлень.
          {createdOrderIds.length > 0 && (
            <Box component="span" sx={{ ml: 1 }}>
              {createdOrderIds.map((oid) => (
                <Button key={oid} size="small" onClick={() => { navigate(`/supply/orders/${oid}`); setSnackOpen(false); }}>№{oid}</Button>
              ))}
            </Box>
          )}
        </Alert>
      </Snackbar>

      <AuditBlock events={data.audit ?? []} />
    </Box>
  );
}
