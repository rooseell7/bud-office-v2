import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Select, MenuItem, FormControl, InputLabel, Snackbar, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Chip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PriceCheckIcon from '@mui/icons-material/PriceCheck';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import MergeTypeIcon from '@mui/icons-material/MergeType';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  getSupplyOrder, setSupplyOrderStatus, createReceiptFromOrder, createReceiptQuickFromOrder, fillOrderPricesFromLast, updateSupplyOrder,
  getLastPurchasesBatch, getSupplyOrders, moveOrderItems, mergeOrder, getOrderSubstitutions, deleteSupplyOrder,
} from '../../../api/supply';
import { useAuth } from '../../auth/AuthContext';
import { AuditBlock } from '../components/AuditBlock';
import { LinksBlockOrder } from '../components/LinksBlock';
import type { SupplyOrderDto, LastPurchaseResult, OrderSubstitutionDto } from '../../../api/supply';

const statusOptions = ['draft', 'sent', 'confirmed', 'partially_delivered', 'delivered', 'closed', 'cancelled'];
const statusLabels: Record<string, string> = {
  draft: 'Чернетка', sent: 'Відправлено', confirmed: 'Підтверджено',
  partially_delivered: 'Частково доставлено', delivered: 'Доставлено', closed: 'Закрито', cancelled: 'Скасовано',
};

function formatLastPurchase(last: LastPurchaseResult): string {
  const date = last.receivedAt ? new Date(last.receivedAt).toLocaleDateString('uk-UA') : '';
  return `Останнє: ${last.unitPrice} грн, Постачальник: #${last.supplierId ?? '—'}, ${date}`;
}

export default function SupplyOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { roles } = useAuth();
  const isAdmin = Array.isArray(roles) && roles.map((r) => String(r).toLowerCase()).includes('admin');
  const [data, setData] = useState<SupplyOrderDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [lastPurchases, setLastPurchases] = useState<Record<number, LastPurchaseResult>>({});
  const [supplierSnack, setSupplierSnack] = useState<{ open: boolean; supplierId: number } | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [targetOrderList, setTargetOrderList] = useState<SupplyOrderDto[]>([]);
  const [moveToOrderId, setMoveToOrderId] = useState<number | ''>('');
  const [moveMergeDuplicates, setMoveMergeDuplicates] = useState(true);
  const [mergeTargetOrderId, setMergeTargetOrderId] = useState<number | ''>('');
  const [mergeMergeDuplicates, setMergeMergeDuplicates] = useState(true);
  const [mergeCancelSource, setMergeCancelSource] = useState(true);
  const [moveError, setMoveError] = useState('');
  const [mergeError, setMergeError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [substitutionsModalOpen, setSubstitutionsModalOpen] = useState(false);
  const [substitutionsList, setSubstitutionsList] = useState<OrderSubstitutionDto[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const d = await getSupplyOrder(Number(id));
      setData(d);
      const materialIds = (d.items ?? []).map((i) => i.materialId).filter((mid): mid is number => mid != null);
      if (materialIds.length > 0) {
        getLastPurchasesBatch({ materialIds, projectId: d.projectId }).then(setLastPurchases).catch(() => setLastPurchases({}));
      } else {
        setLastPurchases({});
      }
    } catch {
      setData(null);
      setLastPurchases({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleSetStatus = async (status: string) => {
    if (!id) return;
    setBusy(true);
    try {
      await setSupplyOrderStatus(Number(id), status);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleCreateReceipt = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const { receiptId } = await createReceiptFromOrder(Number(id));
      navigate(`/supply/receipts/${receiptId}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!id) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await deleteSupplyOrder(Number(id));
      navigate('/supply/orders');
    } catch (e: any) {
      setDeleteError(e?.response?.data?.message || 'Помилка видалення');
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleQuickReceipt = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const { receiptId } = await createReceiptQuickFromOrder(Number(id), { mode: 'remaining', includeZeroLines: false });
      navigate(`/supply/receipts/${receiptId}`, { state: { createdFromQuick: true } });
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Помилка створення швидкого приходу';
      setToastMessage(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleFillPricesFromLast = async () => {
    if (!id || !data) return;
    setBusy(true);
    try {
      const res = await fillOrderPricesFromLast(Number(id));
      setData(res.order);
      if (res.filledCount > 0) {
        load();
      }
      if (res.suggestedSupplierId != null && !data.supplierId) {
        setSupplierSnack({ open: true, supplierId: res.suggestedSupplierId });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleApplySuggestedSupplier = async () => {
    if (!id || !supplierSnack) return;
    setSupplierSnack(null);
    setBusy(true);
    try {
      await updateSupplyOrder(Number(id), { supplierId: supplierSnack.supplierId });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const toggleItemSelection = (itemId: number) => {
    setSelectedItemIds((prev) => (prev.includes(itemId) ? prev.filter((x) => x !== itemId) : [...prev, itemId]));
  };
  const toggleSelectAll = () => {
    const ids = (data?.items ?? []).map((i) => i.id);
    if (selectedItemIds.length >= ids.length) setSelectedItemIds([]);
    else setSelectedItemIds(ids);
  };

  const openMoveModal = () => {
    setMoveModalOpen(true);
    setMoveToOrderId('');
    setMoveMergeDuplicates(true);
    setMoveError('');
    getSupplyOrders({ projectId: data!.projectId }).then((list) => setTargetOrderList(list.filter((o) => o.id !== data!.id)));
  };

  const handleMoveItems = async () => {
    if (!id || moveToOrderId === '') return;
    setBusy(true);
    setMoveError('');
    try {
      const res = await moveOrderItems(Number(id), { toOrderId: moveToOrderId as number, itemIds: selectedItemIds, mergeDuplicates: moveMergeDuplicates });
      setToastMessage(`Переміщено ${res.movedCount} позицій у замовлення №${moveToOrderId}`);
      setMoveModalOpen(false);
      setSelectedItemIds([]);
      setData(res.fromOrder);
      await load();
    } catch (e: any) {
      setMoveError(e?.response?.data?.message || 'Помилка переміщення');
    } finally {
      setBusy(false);
    }
  };

  const openMergeModal = () => {
    setMergeModalOpen(true);
    setMergeTargetOrderId('');
    setMergeMergeDuplicates(true);
    setMergeCancelSource(true);
    setMergeError('');
    getSupplyOrders({ projectId: data!.projectId }).then((list) => setTargetOrderList(list.filter((o) => o.id !== data!.id)));
  };

  const handleMergeOrder = async () => {
    if (!id || mergeTargetOrderId === '') return;
    setBusy(true);
    setMergeError('');
    try {
      const res = await mergeOrder(Number(id), {
        targetOrderId: mergeTargetOrderId as number,
        mergeDuplicates: mergeMergeDuplicates,
        cancelSourceOrder: mergeCancelSource,
      });
      setToastMessage(`Злито: ${res.movedCount} позицій у замовлення №${mergeTargetOrderId}`);
      setMergeModalOpen(false);
      setData(res.sourceOrder);
      await load();
    } catch (e: any) {
      setMergeError(e?.response?.data?.message || 'Помилка злиття');
    } finally {
      setBusy(false);
    }
  };

  const moveTargetOrder = moveToOrderId !== '' ? targetOrderList.find((o) => o.id === moveToOrderId) : null;
  const mergeTargetOrder = mergeTargetOrderId !== '' ? targetOrderList.find((o) => o.id === mergeTargetOrderId) : null;
  const differentSupplierWarning = (data?.supplierId != null && mergeTargetOrder?.supplierId != null && data.supplierId !== mergeTargetOrder.supplierId);

  const openSubstitutionsModal = async () => {
    if (!id) return;
    const list = await getOrderSubstitutions(Number(id));
    setSubstitutionsList(list);
    setSubstitutionsModalOpen(true);
  };

  const substitutionsCount = data?.substitutionsCount ?? 0;

  if (!id || loading || !data) return <Box sx={{ p: 2 }}>Завантаження…</Box>;

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/supply/orders')}>Назад</Button>
        <Typography variant="h6">Замовлення №{data.id}</Typography>
        {data.sourceRequestId && <Typography color="text.secondary">Створено із заявки №{data.sourceRequestId}</Typography>}
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Статус</InputLabel>
          <Select value={data.status} label="Статус" onChange={(e) => handleSetStatus(e.target.value)} disabled={busy}>
            {statusOptions.map((s) => <MenuItem key={s} value={s}>{statusLabels[s] ?? s}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>
      <LinksBlockOrder sourceRequest={data.sourceRequest ?? null} linkedReceipts={data.linkedReceipts} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary">Постачальник ID: {data.supplierId ?? '—'} • Доставка: {data.deliveryType} • Планова дата: {data.deliveryDatePlanned ?? '—'} {data.totalPlan != null && `• Сума (план): ${data.totalPlan} грн`}</Typography>
        {substitutionsCount > 0 && (
          <>
            <Chip size="small" icon={<WarningAmberIcon />} label="Є заміни" color="warning" />
            <Button size="small" variant="outlined" onClick={openSubstitutionsModal}>Показати відхилення</Button>
          </>
        )}
      </Box>
      <TableContainer component={Paper} sx={{ my: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {(data.status === 'draft' || data.status === 'sent' || data.status === 'confirmed') && (
                <TableCell padding="checkbox">
                  <Checkbox indeterminate={selectedItemIds.length > 0 && selectedItemIds.length < (data.items?.length ?? 0)} checked={(data.items?.length ?? 0) > 0 && selectedItemIds.length === (data.items?.length ?? 0)} onChange={toggleSelectAll} />
                </TableCell>
              )}
              <TableCell>Найменування</TableCell>
              <TableCell>Од.</TableCell>
              <TableCell>К-ть</TableCell>
              <TableCell>Отримано</TableCell>
              <TableCell>Залишилось</TableCell>
              <TableCell>Ціна</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(data.items ?? []).map((row) => {
              const last = row.materialId != null ? lastPurchases[row.materialId] : null;
              const received = row.receivedQtyTotal ?? 0;
              const remaining = row.remainingQty ?? 0;
              return (
                <TableRow key={row.id}>
                  {(data.status === 'draft' || data.status === 'sent' || data.status === 'confirmed') && (
                    <TableCell padding="checkbox">
                      <Checkbox checked={selectedItemIds.includes(row.id)} onChange={() => toggleItemSelection(row.id)} />
                    </TableCell>
                  )}
                  <TableCell>
                    <Typography variant="body2">{row.customName ?? `Матеріал ${row.materialId ?? '—'}`}</Typography>
                    {last && <Typography variant="caption" display="block" color="text.secondary">{formatLastPurchase(last)}</Typography>}
                  </TableCell>
                  <TableCell>{row.unit}</TableCell>
                  <TableCell>{row.qtyPlanned}</TableCell>
                  <TableCell>{received}</TableCell>
                  <TableCell>{remaining}</TableCell>
                  <TableCell>{row.unitPrice ?? '—'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {(data.status === 'draft' || data.status === 'sent' || data.status === 'confirmed') && (
          <>
            <Button variant="outlined" size="small" startIcon={<SwapHorizIcon />} disabled={busy || selectedItemIds.length === 0} onClick={openMoveModal}>
              Перемістити{selectedItemIds.length > 0 ? ` (${selectedItemIds.length})` : ''}
            </Button>
            <Button variant="outlined" size="small" startIcon={<MergeTypeIcon />} disabled={busy} onClick={openMergeModal}>
              Злити…
            </Button>
          </>
        )}
        {data.status === 'draft' && (
          <Button variant="outlined" size="small" startIcon={<PriceCheckIcon />} disabled={busy} onClick={handleFillPricesFromLast}>
            Заповнити ціни (останні)
          </Button>
        )}
        {(data.status === 'draft' || data.status === 'sent' || data.status === 'confirmed') && (
          <>
            <Button variant="contained" disabled={busy} onClick={handleCreateReceipt}>Створити прихід</Button>
            <Button variant="outlined" disabled={busy} onClick={handleQuickReceipt} title="Створити прихід по залишку (тільки позиції з залишком)">Швидкий прихід</Button>
            {data.supplierId == null && (
              <Typography variant="caption" color="text.secondary" component="span" sx={{ alignSelf: 'center' }}>Постачальник не вказано — можна створити прихід, але краще заповнити.</Typography>
            )}
          </>
        )}
        {((data.linkedReceipts?.length ?? 0) === 0 || isAdmin) && (
          <Button color="error" variant="outlined" size="small" disabled={busy} onClick={() => setDeleteConfirmOpen(true)}>Видалити замовлення</Button>
        )}
      </Box>

      <Dialog open={deleteConfirmOpen} onClose={() => !deleteBusy && setDeleteConfirmOpen(false)}>
        <DialogTitle>Видалити замовлення?</DialogTitle>
        <DialogContent>
          {deleteError && <Typography color="error" sx={{ mt: 1 }}>{deleteError}</Typography>}
          <Typography>Замовлення №{data.id} буде видалено безповоротно.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleteBusy}>Скасувати</Button>
          <Button color="error" variant="contained" onClick={handleDeleteOrder} disabled={deleteBusy}>{deleteBusy ? 'Видалення…' : 'Видалити'}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={moveModalOpen} onClose={() => setMoveModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Перемістити позиції</DialogTitle>
        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mt: 1, mb: 2 }}>
            <InputLabel>Куди</InputLabel>
            <Select value={moveToOrderId} label="Куди" onChange={(e) => setMoveToOrderId(e.target.value === '' ? '' : (e.target.value as number))}>
              <MenuItem value="">—</MenuItem>
              {targetOrderList.map((o) => (
                <MenuItem key={o.id} value={o.id}>№{o.id} • Постачальник #{o.supplierId ?? '—'} • {statusLabels[o.status] ?? o.status}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel control={<Checkbox checked={moveMergeDuplicates} onChange={(e) => setMoveMergeDuplicates(e.target.checked)} />} label="Зливати дублікати (однаковий sourceRequestItemId)" />
          {moveError && <Typography color="error" sx={{ mt: 1 }}>{moveError}</Typography>}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={() => setMoveModalOpen(false)}>Скасувати</Button>
            <Button variant="contained" disabled={busy || moveToOrderId === ''} onClick={handleMoveItems}>Перемістити</Button>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={mergeModalOpen} onClose={() => setMergeModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Злити замовлення</DialogTitle>
        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mt: 1, mb: 2 }}>
            <InputLabel>Злити в замовлення</InputLabel>
            <Select value={mergeTargetOrderId} label="Злити в замовлення" onChange={(e) => setMergeTargetOrderId(e.target.value === '' ? '' : (e.target.value as number))}>
              <MenuItem value="">—</MenuItem>
              {targetOrderList.map((o) => (
                <MenuItem key={o.id} value={o.id}>№{o.id} • Постачальник #{o.supplierId ?? '—'}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {differentSupplierWarning && (
            <Typography variant="body2" color="warning.main" sx={{ mb: 1 }}>У цільового замовлення інший постачальник.</Typography>
          )}
          <FormControlLabel control={<Checkbox checked={mergeMergeDuplicates} onChange={(e) => setMergeMergeDuplicates(e.target.checked)} />} label="Зливати дублікати" />
          <FormControlLabel control={<Checkbox checked={mergeCancelSource} onChange={(e) => setMergeCancelSource(e.target.checked)} />} label="Скасувати поточне замовлення після злиття" sx={{ display: 'block' }} />
          {mergeError && <Typography color="error" sx={{ mt: 1 }}>{mergeError}</Typography>}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={() => setMergeModalOpen(false)}>Скасувати</Button>
            <Button variant="contained" disabled={busy || mergeTargetOrderId === ''} onClick={handleMergeOrder}>Злити</Button>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={substitutionsModalOpen} onClose={() => setSubstitutionsModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Відхилення (заміни)</DialogTitle>
        <DialogContent>
          {substitutionsList.length === 0 ? (
            <Typography color="text.secondary">Немає замін по цьому замовленню.</Typography>
          ) : (
            <TableContainer sx={{ mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Прихід / дата</TableCell>
                    <TableCell>Було</TableCell>
                    <TableCell>Стало</TableCell>
                    <TableCell>К-ть</TableCell>
                    <TableCell>Причина</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {substitutionsList.map((s) => (
                    <TableRow key={s.receiptItemId}>
                      <TableCell>№{s.receiptId} {s.receiptReceivedAt ? new Date(s.receiptReceivedAt).toLocaleDateString('uk-UA') : '—'}</TableCell>
                      <TableCell>{s.originalName}</TableCell>
                      <TableCell>{s.substituteName}</TableCell>
                      <TableCell>{s.qty}</TableCell>
                      <TableCell>{s.reason ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setSubstitutionsModalOpen(false)}>Закрити</Button>
          </Box>
        </DialogContent>
      </Dialog>

      <Snackbar open={!!toastMessage} autoHideDuration={5000} onClose={() => setToastMessage('')} message={toastMessage} />
      <Snackbar
        open={supplierSnack?.open ?? false}
        autoHideDuration={10000}
        onClose={() => setSupplierSnack(null)}
        message={`Встановити постачальника #${supplierSnack?.supplierId ?? ''}?`}
        action={<Button color="primary" size="small" onClick={handleApplySuggestedSupplier}>Так</Button>}
      />
      <AuditBlock events={data.audit ?? []} />
    </Box>
  );
}
