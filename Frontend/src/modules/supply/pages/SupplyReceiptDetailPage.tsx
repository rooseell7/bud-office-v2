import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Dialog, DialogTitle, DialogContent, MenuItem, Select, FormControl, InputLabel, Chip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PriceCheckIcon from '@mui/icons-material/PriceCheck';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { getSupplyReceipt, receiveSupplyReceipt, verifySupplyReceipt, sendReceiptToPay, fillReceiptPricesFromLast, getLastPurchasesBatch, updateSupplyReceipt, refillReceiptFromRemaining, setReceiptSubstitution, clearReceiptSubstitution, getSupplyMaterials } from '../../../api/supply';
import { AuditBlock } from '../components/AuditBlock';
import { LinksBlockReceipt } from '../components/LinksBlock';
import type { SupplyReceiptDto, SupplyReceiptItemDto, LastPurchaseResult, SupplyMaterialDto } from '../../../api/supply';

function formatLastPurchaseReceipt(last: LastPurchaseResult): string {
  const date = last.receivedAt ? new Date(last.receivedAt).toLocaleDateString('uk-UA') : '';
  return `Останнє: ${last.unitPrice} грн, Постачальник: #${last.supplierId ?? '—'}, ${date}`;
}

type ItemEdit = { id: number; sourceOrderItemId: number | null; materialId: number | null; customName: string | null; unit: string; qtyReceived: string; unitPrice: string | null };

export default function SupplyReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const createdFromQuick = (location.state as { createdFromQuick?: boolean } | null)?.createdFromQuick ?? false;
  const [data, setData] = useState<SupplyReceiptDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [lastPurchases, setLastPurchases] = useState<Record<number, LastPurchaseResult>>({});
  const [itemsLocal, setItemsLocal] = useState<ItemEdit[]>([]);
  const [substitutionModalOpen, setSubstitutionModalOpen] = useState(false);
  const [substitutionItem, setSubstitutionItem] = useState<SupplyReceiptItemDto | null>(null);
  const [substituteMaterialId, setSubstituteMaterialId] = useState<number | ''>('');
  const [substituteCustomName, setSubstituteCustomName] = useState('');
  const [substitutionReason, setSubstitutionReason] = useState('');
  const [materials, setMaterials] = useState<SupplyMaterialDto[]>([]);
  const [substitutionError, setSubstitutionError] = useState('');
  const substitutionAllowed = data?.status === 'draft' || data?.status === 'received';

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const d = await getSupplyReceipt(Number(id));
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

  useEffect(() => {
    if (data?.items) {
      setItemsLocal(data.items.map((i) => ({
        id: i.id,
        sourceOrderItemId: (i as { sourceOrderItemId?: number }).sourceOrderItemId ?? null,
        materialId: i.materialId ?? null,
        customName: i.customName ?? null,
        unit: i.unit,
        qtyReceived: i.qtyReceived,
        unitPrice: i.unitPrice ?? null,
      })));
    }
  }, [data?.items]);

  const setItemQty = (itemId: number, qty: string) => {
    setItemsLocal((prev) => prev.map((i) => (i.id === itemId ? { ...i, qtyReceived: qty } : i)));
  };

  const handleSaveItems = async () => {
    if (!id || !data) return;
    setBusy(true);
    try {
      const payload = {
        items: itemsLocal.map((i) => ({
          sourceOrderItemId: i.sourceOrderItemId,
          materialId: i.materialId,
          customName: i.customName,
          unit: i.unit,
          qtyReceived: Number(i.qtyReceived) || 0,
          unitPrice: i.unitPrice != null ? Number(i.unitPrice) : undefined,
        })),
      };
      const updated = await updateSupplyReceipt(Number(id), payload);
      setData(updated);
    } finally {
      setBusy(false);
    }
  };

  const handleZeroAll = async () => {
    if (!id || !data || itemsLocal.length === 0) return;
    setBusy(true);
    try {
      const payload = {
        items: itemsLocal.map((i) => ({
          sourceOrderItemId: i.sourceOrderItemId ?? undefined,
          materialId: i.materialId ?? undefined,
          customName: i.customName ?? undefined,
          unit: i.unit,
          qtyReceived: 0,
          unitPrice: i.unitPrice != null ? Number(i.unitPrice) : undefined,
        })),
      };
      const updated = await updateSupplyReceipt(Number(id), payload);
      setData(updated);
      setItemsLocal(updated.items!.map((i) => ({ id: i.id, sourceOrderItemId: (i as { sourceOrderItemId?: number }).sourceOrderItemId ?? null, materialId: i.materialId ?? null, customName: i.customName ?? null, unit: i.unit, qtyReceived: '0', unitPrice: i.unitPrice ?? null })));
    } finally {
      setBusy(false);
    }
  };

  const handleRefillRemaining = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const updated = await refillReceiptFromRemaining(Number(id));
      setData(updated);
      setItemsLocal(updated.items!.map((i) => ({ id: i.id, sourceOrderItemId: (i as any).sourceOrderItemId ?? null, materialId: i.materialId ?? null, customName: i.customName ?? null, unit: i.unit, qtyReceived: i.qtyReceived, unitPrice: i.unitPrice ?? null })));
    } finally {
      setBusy(false);
    }
  };

  const handleReceive = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await receiveSupplyReceipt(Number(id));
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await verifySupplyReceipt(Number(id));
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleSendToPay = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await sendReceiptToPay(Number(id));
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleFillPricesFromLast = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const res = await fillReceiptPricesFromLast(Number(id));
      setData(res.receipt);
      if (res.filledCount > 0) await load();
    } finally {
      setBusy(false);
    }
  };

  const openSubstitutionModal = (row: SupplyReceiptItemDto) => {
    setSubstitutionItem(row);
    setSubstituteMaterialId(row.substituteMaterialId ?? '');
    setSubstituteCustomName(row.substituteCustomName ?? '');
    setSubstitutionReason(row.substitutionReason ?? '');
    setSubstitutionError('');
    setSubstitutionModalOpen(true);
    getSupplyMaterials().then(setMaterials);
  };

  const handleSaveSubstitution = async () => {
    if (!id || !substitutionItem) return;
    const hasSubstitute = substituteMaterialId !== '' || (substituteCustomName != null && String(substituteCustomName).trim() !== '');
    if (!hasSubstitute) {
      setSubstitutionError('Вкажіть матеріал або найменування заміни.');
      return;
    }
    setBusy(true);
    setSubstitutionError('');
    try {
      const updated = await setReceiptSubstitution(Number(id), substitutionItem.id, {
        isSubstitution: true,
        substituteMaterialId: substituteMaterialId === '' ? null : substituteMaterialId,
        substituteCustomName: substituteCustomName.trim() || null,
        substitutionReason: substitutionReason.trim() || null,
      });
      setData(updated);
      setSubstitutionModalOpen(false);
      load();
    } catch (e: any) {
      setSubstitutionError(e?.response?.data?.message || 'Помилка збереження заміни');
    } finally {
      setBusy(false);
    }
  };

  const handleClearSubstitution = async (itemId: number) => {
    if (!id) return;
    setBusy(true);
    try {
      const updated = await clearReceiptSubstitution(Number(id), itemId);
      setData(updated);
      load();
    } finally {
      setBusy(false);
    }
  };

  const originalNameForRow = (row: SupplyReceiptItemDto) => {
    if (row.isSubstitution && (row.originalCustomName || row.originalMaterialId != null)) {
      return row.originalCustomName || `Матеріал #${row.originalMaterialId}`;
    }
    return row.customName ?? `Матеріал ${row.materialId ?? '—'}`;
  };

  const substituteNameForRow = (row: SupplyReceiptItemDto) => {
    if (row.isSubstitution && (row.substituteCustomName || row.substituteMaterialId != null)) {
      return row.substituteCustomName || `Матеріал #${row.substituteMaterialId}`;
    }
    return null;
  };

  if (!id || loading || !data) return <Box sx={{ p: 2 }}>Завантаження…</Box>;

  const hasAttachments = (data.attachments?.length ?? 0) > 0;

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/supply/receipts')}>Назад</Button>
        <Typography variant="h6">Прихід №{data.id}</Typography>
        <Typography color="text.secondary">Статус: {data.status}</Typography>
        {data.total != null && <Typography color="text.secondary">Сума: {data.total} грн</Typography>}
      </Box>
      {createdFromQuick && (
        <Typography variant="body2" color="info.main" sx={{ mb: 1, display: 'block' }}>
          Заповнено по залишку. Відкоригуйте фактичні кількості та додайте фото.
        </Typography>
      )}
      <LinksBlockReceipt sourceOrder={data.sourceOrder ?? { id: data.sourceOrderId }} linkedPayable={data.linkedPayable ?? data.payable ?? null} />
      <Typography variant="body2">Документ: {data.docNumber ?? '—'} • Отримано: {data.receivedAt ? new Date(data.receivedAt).toLocaleString('uk-UA') : '—'}</Typography>
      <Typography variant="body2">Фото: {(data.attachments?.length ?? 0)} шт.</Typography>
      <TableContainer component={Paper} sx={{ my: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Найменування</TableCell>
              <TableCell>Од.</TableCell>
              <TableCell>К-ть</TableCell>
              <TableCell>Ціна</TableCell>
              {substitutionAllowed && <TableCell>Заміна</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {(data.status === 'draft' && itemsLocal.length > 0 ? itemsLocal : (data.items ?? [])).map((row) => {
              const fullRow = (data.items ?? []).find((i) => i.id === row.id) || (row as SupplyReceiptItemDto);
              const last = row.materialId != null ? lastPurchases[row.materialId] : null;
              const isDraft = data.status === 'draft';
              const qtyVal = (row as ItemEdit).qtyReceived ?? (row as SupplyReceiptItemDto).qtyReceived;
              const isSub = fullRow.isSubstitution === true;
              const subName = substituteNameForRow(fullRow);
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <Typography variant="body2">{fullRow.customName ?? `Матеріал ${fullRow.materialId ?? '—'}`}</Typography>
                    {isSub && (
                      <>
                        <Chip size="small" label="Заміна" color="warning" sx={{ mt: 0.5 }} />
                        <Typography variant="caption" display="block" color="text.secondary">
                          Було: {originalNameForRow(fullRow)} → Стало: {subName ?? '—'}
                        </Typography>
                      </>
                    )}
                    {last && !isSub && <Typography variant="caption" display="block" color="text.secondary">{formatLastPurchaseReceipt(last)}</Typography>}
                  </TableCell>
                  <TableCell>{row.unit}</TableCell>
                  <TableCell>
                    {isDraft ? (
                      <TextField
                        type="number"
                        size="small"
                        inputProps={{ min: 0, step: 0.0001 }}
                        value={qtyVal}
                        onChange={(e) => setItemQty(row.id, e.target.value)}
                        sx={{ width: 90 }}
                      />
                    ) : (
                      qtyVal
                    )}
                  </TableCell>
                  <TableCell>{row.unitPrice ?? '—'}</TableCell>
                  {substitutionAllowed && (
                    <TableCell>
                      {isSub ? (
                        <Button size="small" onClick={() => handleClearSubstitution(row.id)} disabled={busy}>Зняти заміну</Button>
                      ) : (
                        <Button size="small" startIcon={<SwapHorizIcon />} onClick={() => openSubstitutionModal(fullRow)} disabled={busy}>Заміна</Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {data.status === 'draft' && (
          <>
            <Button variant="outlined" size="small" disabled={busy} onClick={handleZeroAll}>
              Обнулити всі
            </Button>
            <Button variant="outlined" size="small" disabled={busy} onClick={handleRefillRemaining}>
              Залишок
            </Button>
            <Button variant="outlined" size="small" disabled={busy} onClick={handleSaveItems}>
              Зберегти кількості
            </Button>
            <Button variant="outlined" size="small" startIcon={<PriceCheckIcon />} disabled={busy} onClick={handleFillPricesFromLast}>
              Заповнити ціни (останні)
            </Button>
            <Button variant="contained" disabled={busy || !hasAttachments} onClick={handleReceive} title={!hasAttachments ? 'Додайте фото накладної перед підтвердженням приймання.' : ''}>
              Підтвердити приймання
            </Button>
            {!hasAttachments && (
              <Typography variant="caption" color="text.secondary" component="span" sx={{ ml: 1 }}>
                Додайте фото накладної перед підтвердженням приймання.
              </Typography>
            )}
          </>
        )}
        {data.status === 'received' && <Button variant="contained" disabled={busy} onClick={handleVerify}>Перевірено</Button>}
        {(data.status === 'verified' || data.status === 'received') && !data.payable && (
          <Button variant="contained" disabled={busy} onClick={handleSendToPay}>Відправити на оплату</Button>
        )}
      </Box>
      <Dialog open={substitutionModalOpen} onClose={() => setSubstitutionModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Заміна матеріалу</DialogTitle>
        <DialogContent>
          {substitutionItem && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 1 }}>
                Було (із замовлення): {originalNameForRow(substitutionItem)}
              </Typography>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Матеріал (стало)</InputLabel>
                <Select
                  value={substituteMaterialId}
                  label="Матеріал (стало)"
                  onChange={(e) => { setSubstituteMaterialId(e.target.value === '' ? '' : (e.target.value as number)); setSubstituteCustomName(''); }}
                >
                  <MenuItem value="">— Свій текст нижче —</MenuItem>
                  {materials.map((m) => (
                    <MenuItem key={m.id} value={m.id}>{m.name} {m.unit ? `(${m.unit})` : ''}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField fullWidth size="small" label="Або своє найменування (стало)" value={substituteCustomName} onChange={(e) => setSubstituteCustomName(e.target.value)} sx={{ mb: 2 }} placeholder="Якщо не обрано матеріал зі списку" />
              <TextField fullWidth size="small" label="Причина заміни" multiline minRows={2} value={substitutionReason} onChange={(e) => setSubstitutionReason(e.target.value)} sx={{ mb: 2 }} />
              {substitutionError && <Typography color="error" sx={{ mb: 1 }}>{substitutionError}</Typography>}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button onClick={() => setSubstitutionModalOpen(false)}>Скасувати</Button>
                <Button variant="contained" disabled={busy} onClick={handleSaveSubstitution}>Зберегти</Button>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AuditBlock events={data.audit ?? []} />
    </Box>
  );
}
