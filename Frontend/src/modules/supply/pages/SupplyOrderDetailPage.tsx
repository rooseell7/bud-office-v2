import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getSupplyOrder, setSupplyOrderStatus, createReceiptFromOrder } from '../../../api/supply';
import { AuditBlock } from '../components/AuditBlock';
import type { SupplyOrderDto } from '../../../api/supply';

const statusOptions = ['draft', 'sent', 'confirmed', 'partially_delivered', 'delivered', 'closed', 'cancelled'];

export default function SupplyOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<SupplyOrderDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const d = await getSupplyOrder(Number(id));
      setData(d);
    } catch {
      setData(null);
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
            {statusOptions.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>
      <Typography variant="body2" color="text.secondary">Постачальник ID: {data.supplierId ?? '—'} • Доставка: {data.deliveryType} • Планова дата: {data.deliveryDatePlanned ?? '—'}</Typography>
      <TableContainer component={Paper} sx={{ my: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Найменування</TableCell>
              <TableCell>Од.</TableCell>
              <TableCell>К-ть</TableCell>
              <TableCell>Ціна</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(data.items ?? []).map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.customName ?? `Матеріал ${row.materialId ?? '—'}`}</TableCell>
                <TableCell>{row.unit}</TableCell>
                <TableCell>{row.qtyPlanned}</TableCell>
                <TableCell>{row.unitPrice ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {(data.linkedReceipts?.length ?? 0) > 0 && (
        <Typography variant="body2" sx={{ mb: 1 }}>Приходи: {data.linkedReceipts!.map((r) => `№${r.id}`).join(', ')}</Typography>
      )}
      {(data.status === 'draft' || data.status === 'sent' || data.status === 'confirmed') && (
        <Button variant="contained" disabled={busy} onClick={handleCreateReceipt}>Створити прихід</Button>
      )}
      <AuditBlock events={data.audit ?? []} />
    </Box>
  );
}
