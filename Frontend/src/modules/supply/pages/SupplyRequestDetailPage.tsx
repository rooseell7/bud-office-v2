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
  Radio,
  RadioGroup,
  Snackbar,
  Alert,
  Menu,
  ListItemText,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveAsIcon from '@mui/icons-material/SaveAs';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
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
  getQuoteStages,
  getQuoteStageMaterialsNeed,
  previewAddQuoteMaterials,
  addQuoteMaterialsToRequest,
  exportSupplyRequest,
} from '../../../api/supply';
import type {
  PurchasePlan,
  QuoteStagesResponse,
  QuoteStageMaterialsNeedGroup,
  QuoteStageMaterialNeedItem,
  AddQuoteMaterialsPreviewResult,
  AddQuoteMaterialsMode,
} from '../../../api/supply';
import { AuditBlock } from '../components/AuditBlock';
import { LinksBlockRequest } from '../components/LinksBlock';
import type { SupplyRequestDto, SupplyRequestItemDto } from '../../../api/supply';

const statusLabels: Record<string, string> = { draft: 'Чернетка', submitted: 'Передано', closed: 'Закрито', cancelled: 'Скасовано' };
const priorityLabels: Record<string, string> = { low: 'Низький', normal: 'Звичайний', high: 'Високий' };

type ItemRow = {
  customName: string;
  unit: string;
  qty: number;
  note: string;
  priority: string;
  id?: number;
  sourceType?: string;
  sourceQuoteId?: number | null;
  sourceStageId?: string | null;
  sourceQuoteRowId?: string | null;
  sourceMaterialFingerprint?: string | null;
  sourceStageName?: string | null;
  materialId?: number | null;
};

type QuoteSelectionRow = QuoteStageMaterialNeedItem & { stageId: string; stageName: string; qtyToAdd: number; selected: boolean };

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
        id: row.id,
        sourceType: row.sourceType,
        sourceQuoteId: row.sourceQuoteId,
        sourceStageId: row.sourceStageId,
        sourceQuoteRowId: row.sourceQuoteRowId,
        sourceMaterialFingerprint: row.sourceMaterialFingerprint,
        sourceStageName: row.sourceStageName,
        materialId: row.materialId,
      })));
      setEditDirty(false);
    }
  }, [data?.id, data?.updatedAt]);

  const handleSaveDraft = async () => {
    if (!data || data.status !== 'draft') return;
    const validItems: SupplyRequestItemDto[] = editItems
      .filter((r) => r.customName.trim() !== '' && r.qty > 0)
      .map((r) => ({
        id: r.id,
        materialId: r.materialId ?? undefined,
        customName: r.customName.trim(),
        unit: r.unit || 'шт',
        qty: Number(r.qty),
        note: r.note || null,
        priority: r.priority || 'normal',
        sourceType: r.sourceType,
        sourceQuoteId: r.sourceQuoteId ?? undefined,
        sourceStageId: r.sourceStageId ?? undefined,
        sourceQuoteRowId: r.sourceQuoteRowId ?? undefined,
        sourceMaterialFingerprint: r.sourceMaterialFingerprint ?? undefined,
        sourceStageName: r.sourceStageName ?? undefined,
      }));
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

  // ----- Quote stages: add materials from KP (read-only, no sheet writes) -----
  const [quoteStagesData, setQuoteStagesData] = useState<QuoteStagesResponse | null>(null);
  const [quoteStagesLoading, setQuoteStagesLoading] = useState(false);
  const [selectedStageIds, setSelectedStageIds] = useState<string[]>([]);
  const [selectionRows, setSelectionRows] = useState<QuoteSelectionRow[]>([]);
  const [stageMaterialsLoading, setStageMaterialsLoading] = useState(false);
  const [addQuoteBusy, setAddQuoteBusy] = useState(false);
  const [addQuoteSnack, setAddQuoteSnack] = useState<{ open: boolean; added: number; merged: number; skipped: number }>({ open: false, added: 0, merged: 0, skipped: 0 });
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictPreview, setConflictPreview] = useState<AddQuoteMaterialsPreviewResult | null>(null);
  const [conflictMode, setConflictMode] = useState<AddQuoteMaterialsMode>('merge_qty');
  const [pendingAddPayload, setPendingAddPayload] = useState<{ quoteId: number; selections: Parameters<typeof addQuoteMaterialsToRequest>[1]['selections'] } | null>(null);

  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [exportGroupByStage, setExportGroupByStage] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const handleExport = async (format: 'pdf' | 'xlsx') => {
    if (!data) return;
    setExportBusy(true);
    try {
      const blob = await exportSupplyRequest(data.id, format, exportGroupByStage ? 'stage' : 'none');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `request-${data.id}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMenuAnchor(null);
    } finally {
      setExportBusy(false);
    }
  };

  useEffect(() => {
    if (!data?.projectId || data.status !== 'draft') return;
    setQuoteStagesLoading(true);
    getQuoteStages(data.projectId)
      .then(setQuoteStagesData)
      .catch(() => setQuoteStagesData(null))
      .finally(() => setQuoteStagesLoading(false));
  }, [data?.projectId, data?.status]);

  useEffect(() => {
    if (!data?.projectId || !quoteStagesData?.quoteId || selectedStageIds.length === 0) {
      setSelectionRows([]);
      return;
    }
    setStageMaterialsLoading(true);
    getQuoteStageMaterialsNeed(data.projectId, quoteStagesData.quoteId, selectedStageIds, 'received_based')
      .then((groups: QuoteStageMaterialsNeedGroup[]) => {
        const rows: QuoteSelectionRow[] = [];
        groups.forEach((g) => {
          g.items.forEach((it) => {
            rows.push({
              ...it,
              stageId: g.stageId,
              stageName: g.stageName,
              qtyToAdd: it.qtyRemainingNeed,
              selected: it.qtyRemainingNeed > 0,
            });
          });
        });
        setSelectionRows(rows);
      })
      .catch(() => setSelectionRows([]))
      .finally(() => setStageMaterialsLoading(false));
  }, [data?.projectId, quoteStagesData?.quoteId, selectedStageIds.join(',')]);

  const toggleStageSelection = (stageId: string) => {
    setSelectedStageIds((prev) =>
      prev.includes(stageId) ? prev.filter((id) => id !== stageId) : [...prev, stageId]
    );
  };
  const selectAllStages = () => {
    if (quoteStagesData?.stages) setSelectedStageIds(quoteStagesData.stages.map((s) => s.stageId));
  };
  const clearStages = () => setSelectedStageIds([]);

  const setSelectionRowSelected = (idx: number, selected: boolean) => {
    setSelectionRows((prev) => prev.map((r, i) => (i === idx ? { ...r, selected } : r)));
  };
  const setSelectionRowQty = (idx: number, qty: number) => {
    setSelectionRows((prev) => prev.map((r, i) => (i === idx ? { ...r, qtyToAdd: qty } : r)));
  };
  const selectAllMaterials = () => setSelectionRows((prev) => prev.map((r) => ({ ...r, selected: true })));
  const clearMaterials = () => setSelectionRows((prev) => prev.map((r) => ({ ...r, selected: false })));
  const selectAllRemaining = () =>
    setSelectionRows((prev) => prev.map((r) => ({ ...r, selected: r.qtyRemainingNeed > 0 })));

  const [showOnlyRemaining, setShowOnlyRemaining] = useState(true);
  const displayRows = selectionRows.flatMap((r, i) =>
    showOnlyRemaining && r.qtyRemainingNeed <= 0 ? [] : [{ ...r, _idx: i }]
  );

  const selectedCount = selectionRows.filter((r) => r.selected).length;
  const buildSelections = () => {
    const toAdd = selectionRows.filter((r) => r.selected);
    return toAdd.map((r) => ({
      stageId: r.stageId,
      stageName: r.stageName,
      quoteRowId: r.quoteRowId ?? undefined,
      materialId: r.materialId ?? undefined,
      customName: r.materialName || undefined,
      unit: r.unit,
      qty: r.qtyToAdd,
      fingerprint: r.fingerprint,
    }));
  };

  const handleAddQuoteMaterials = async () => {
    if (!data || selectedCount === 0 || !quoteStagesData?.quoteId) return;
    const selections = buildSelections();
    const payload = { quoteId: quoteStagesData.quoteId, selections };
    setAddQuoteBusy(true);
    try {
      const preview = await previewAddQuoteMaterials(data.id, payload);
      if (preview.conflicts.length === 0) {
        const res = await addQuoteMaterialsToRequest(data.id, {
          ...payload,
          mode: 'add_missing_only',
          filterMode: 'remaining',
        });
        setAddQuoteSnack({ open: true, added: res.added, merged: res.merged, skipped: res.skipped });
        await load();
        return;
      }
      setConflictPreview(preview);
      setPendingAddPayload(payload);
      setConflictMode('merge_qty');
      setConflictModalOpen(true);
    } finally {
      setAddQuoteBusy(false);
    }
  };

  const handleApplyConflictModal = async () => {
    if (!data || !pendingAddPayload) return;
    setAddQuoteBusy(true);
    try {
      const res = await addQuoteMaterialsToRequest(data.id, {
        ...pendingAddPayload,
        mode: conflictMode,
        filterMode: 'remaining',
      });
      setConflictModalOpen(false);
      setConflictPreview(null);
      setPendingAddPayload(null);
      setAddQuoteSnack({ open: true, added: res.added, merged: res.merged, skipped: res.skipped });
      await load();
    } finally {
      setAddQuoteBusy(false);
    }
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
          {data.projectId && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Етапи КП (додати матеріали в заявку)</Typography>
              {quoteStagesLoading && <Typography color="text.secondary">Завантаження етапів…</Typography>}
              {!quoteStagesLoading && quoteStagesData && (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block">Оберіть етапи</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                      <Button size="small" variant="outlined" onClick={selectAllStages}>Select all</Button>
                      <Button size="small" variant="outlined" onClick={clearStages}>Clear</Button>
                      {quoteStagesData.stages.map((s) => (
                        <FormControlLabel
                          key={s.stageId}
                          control={
                            <Checkbox
                              checked={selectedStageIds.includes(s.stageId)}
                              onChange={() => toggleStageSelection(s.stageId)}
                            />
                          }
                          label={s.stageName}
                        />
                      ))}
                    </Box>
                  </Box>
                  {selectedStageIds.length > 0 && (
                    <>
                      {stageMaterialsLoading && <Typography color="text.secondary" sx={{ mb: 1 }}>Завантаження матеріалів…</Typography>}
                      {!stageMaterialsLoading && selectionRows.length > 0 && (
                        <>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={showOnlyRemaining}
                                onChange={(e) => setShowOnlyRemaining(e.target.checked)}
                              />
                            }
                            label="Показувати тільки залишок (не отримано)"
                            sx={{ mb: 1, display: 'block' }}
                          />
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Button size="small" variant="outlined" onClick={selectAllMaterials}>Select all</Button>
                            <Button size="small" variant="outlined" onClick={selectAllRemaining}>Select all remaining</Button>
                            <Button size="small" variant="outlined" onClick={clearMaterials}>Clear</Button>
                            <Button
                              variant="contained"
                              size="small"
                              disabled={addQuoteBusy || selectedCount === 0}
                              onClick={handleAddQuoteMaterials}
                            >
                              Додати вибране в заявку ({selectedCount})
                            </Button>
                          </Box>
                          <TableContainer sx={{ maxHeight: 320, mb: 1 }}>
                            <Table size="small" stickyHeader>
                              <TableHead>
                                <TableRow>
                                  <TableCell padding="checkbox" />
                                  <TableCell>Матеріал</TableCell>
                                  <TableCell>Од.</TableCell>
                                  <TableCell>КП</TableCell>
                                  <TableCell>Отримано</TableCell>
                                  <TableCell>Залишок</TableCell>
                                  <TableCell>Qty до додавання</TableCell>
                                  <TableCell>Етап</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {displayRows.map((row) => (
                                  <TableRow key={row._idx}>
                                    <TableCell padding="checkbox">
                                      <Checkbox
                                        checked={row.selected}
                                        onChange={(e) => setSelectionRowSelected(row._idx, e.target.checked)}
                                      />
                                    </TableCell>
                                    <TableCell title={row.qtyRequested > 0 || row.qtyOrdered > 0 ? `Запитано: ${row.qtyRequested}, Замовлено: ${row.qtyOrdered}` : undefined}>
                                      {row.materialName}
                                    </TableCell>
                                    <TableCell>{row.unit}</TableCell>
                                    <TableCell>{row.qtyFromQuote}</TableCell>
                                    <TableCell>{row.qtyReceived}</TableCell>
                                    <TableCell>{row.qtyRemainingNeed}</TableCell>
                                    <TableCell>
                                      <TextField
                                        size="small"
                                        type="number"
                                        inputProps={{ min: 0, step: 0.01 }}
                                        value={row.qtyToAdd}
                                        onChange={(e) => setSelectionRowQty(row._idx, e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                        sx={{ width: 90 }}
                                      />
                                    </TableCell>
                                    <TableCell>{row.stageName}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </>
                      )}
                      {!stageMaterialsLoading && selectedStageIds.length > 0 && selectionRows.length === 0 && (
                        <Typography color="text.secondary">По обраних етапах матеріалів не знайдено.</Typography>
                      )}
                      {!stageMaterialsLoading && selectionRows.length > 0 && displayRows.length === 0 && (
                        <Typography color="text.secondary" sx={{ mt: 1 }}>
                          Усі позиції вже отримано (залишок = 0). Вимкніть фільтр «Показувати тільки залишок», щоб переглянути всі.
                        </Typography>
                      )}
                    </>
                  )}
                </>
              )}
              {!quoteStagesLoading && !quoteStagesData && data.projectId && (
                <Typography color="text.secondary">КП для об'єкта не знайдено або немає етапів.</Typography>
              )}
            </Paper>
          )}
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
                    <TableCell>
                      <TextField size="small" fullWidth value={row.customName} onChange={(e) => updateEditItem(idx, 'customName', e.target.value)} />
                      {row.sourceStageName && (
                        <Typography variant="caption" color="text.secondary" display="block">КП: {row.sourceStageName}</Typography>
                      )}
                    </TableCell>
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
        {(data.items?.length ?? 0) > 0 && (
          <Button variant="outlined" size="small" startIcon={<FileDownloadIcon />} disabled={exportBusy} onClick={(e) => setExportMenuAnchor(e.currentTarget)}>
            Експорт
          </Button>
        )}
        <Menu anchorEl={exportMenuAnchor} open={Boolean(exportMenuAnchor)} onClose={() => setExportMenuAnchor(null)}>
          <FormControlLabel
            sx={{ px: 2, py: 1 }}
            control={<Checkbox size="small" checked={exportGroupByStage} onChange={(e) => setExportGroupByStage(e.target.checked)} />}
            label="Групувати по етапах КП"
          />
          <MenuItem onClick={() => handleExport('pdf')}>PDF</MenuItem>
          <MenuItem onClick={() => handleExport('xlsx')}>Excel</MenuItem>
        </Menu>
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

      <Snackbar open={addQuoteSnack.open} autoHideDuration={6000} onClose={() => setAddQuoteSnack((p) => ({ ...p, open: false }))}>
        <Alert severity="success" onClose={() => setAddQuoteSnack((p) => ({ ...p, open: false }))}>
          Додано {addQuoteSnack.added}, об'єднано {addQuoteSnack.merged}, пропущено {addQuoteSnack.skipped}.
        </Alert>
      </Snackbar>

      <Dialog open={conflictModalOpen} onClose={() => { setConflictModalOpen(false); setPendingAddPayload(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>Знайдено дублікати</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>Деякі позиції вже є в заявці. Що робимо?</Typography>
          {conflictPreview && conflictPreview.conflicts.length > 0 && (
            <>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, maxHeight: 240 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Матеріал, од.</TableCell>
                      <TableCell>Було qty</TableCell>
                      <TableCell>Додаємо qty</TableCell>
                      <TableCell>Після об'єднання</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {conflictPreview.conflicts.map((c) => (
                      <TableRow key={c.selectionKey}>
                        <TableCell>{c.materialName}, {c.unit}</TableCell>
                        <TableCell>{c.existingQty}</TableCell>
                        <TableCell>{c.incomingQty}</TableCell>
                        <TableCell>{c.existingQty + c.incomingQty}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <RadioGroup value={conflictMode} onChange={(e) => setConflictMode(e.target.value as AddQuoteMaterialsMode)} sx={{ mb: 2 }}>
                <FormControlLabel value="merge_qty" control={<Radio />} label="Об'єднати кількості (рекомендовано)" />
                <FormControlLabel value="add_missing_only" control={<Radio />} label="Пропустити дублікати" />
                <FormControlLabel value="add_separate" control={<Radio />} label="Додати окремими рядками (для КП-позицій дублі не створюються — будуть пропущені)" />
              </RadioGroup>
            </>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={() => { setConflictModalOpen(false); setPendingAddPayload(null); }}>Скасувати</Button>
            <Button variant="contained" disabled={addQuoteBusy} onClick={handleApplyConflictModal}>Застосувати</Button>
          </Box>
        </DialogContent>
      </Dialog>

      <AuditBlock events={data.audit ?? []} />
    </Box>
  );
}
