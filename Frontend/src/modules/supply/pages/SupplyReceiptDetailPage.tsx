import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getSupplyReceipt, receiveSupplyReceipt, verifySupplyReceipt, sendReceiptToPay } from '../../../api/supply';
import { AuditBlock } from '../components/AuditBlock';
import type { SupplyReceiptDto } from '../../../api/supply';

export default function SupplyReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<SupplyReceiptDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const d = await getSupplyReceipt(Number(id));
      setData(d);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

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

  if (!id || loading || !data) return <Box sx={{ p: 2 }}>Завантаження…</Box>;

  const hasAttachments = (data.attachments?.length ?? 0) > 0;

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/supply/receipts')}>Назад</Button>
        <Typography variant="h6">Прихід №{data.id}</Typography>
        <Typography color="text.secondary">З замовлення №{data.sourceOrderId}</Typography>
        <Typography color="text.secondary">Статус: {data.status}</Typography>
        {data.payable && (
          <Button size="small" onClick={() => navigate(`/supply/payables/${data.payable!.id}`)}>До оплати №{data.payable.id}</Button>
        )}
      </Box>
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
            </TableRow>
          </TableHead>
          <TableBody>
            {(data.items ?? []).map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.customName ?? `Матеріал ${row.materialId ?? '—'}`}</TableCell>
                <TableCell>{row.unit}</TableCell>
                <TableCell>{row.qtyReceived}</TableCell>
                <TableCell>{row.unitPrice ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {data.status === 'draft' && (
          <Button variant="contained" disabled={busy || !hasAttachments} onClick={handleReceive} title={!hasAttachments ? 'Потрібно хоча б одне фото' : ''}>
            Підтвердити приймання
          </Button>
        )}
        {data.status === 'received' && <Button variant="contained" disabled={busy} onClick={handleVerify}>Перевірено</Button>}
        {(data.status === 'verified' || data.status === 'received') && !data.payable && (
          <Button variant="contained" disabled={busy} onClick={handleSendToPay}>Відправити на оплату</Button>
        )}
      </Box>
      <AuditBlock events={data.audit ?? []} />
    </Box>
  );
}
