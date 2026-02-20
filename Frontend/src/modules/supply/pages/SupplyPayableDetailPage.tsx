import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent, TextField } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getPayable, addPayment } from '../../../api/supply';
import { AuditBlock } from '../components/AuditBlock';
import { LinksBlockPayable } from '../components/LinksBlock';
import type { PayableDto } from '../../../api/supply';

export default function SupplyPayableDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PayableDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payComment, setPayComment] = useState('');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const d = await getPayable(Number(id));
      setData(d);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleAddPayment = async () => {
    if (!id || !payAmount || !payDate) return;
    const amount = parseFloat(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setBusy(true);
    try {
      await addPayment(Number(id), { amount, paidAt: payDate, comment: payComment || undefined });
      setPaymentOpen(false);
      setPayAmount('');
      setPayComment('');
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (!id || loading || !data) return <Box sx={{ p: 2 }}>Завантаження…</Box>;

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/supply/payables')}>Назад</Button>
        <Typography variant="h6">До оплати №{data.id}</Typography>
        <Typography color="text.secondary">Сума: {data.amount} грн • Оплачено: {data.paidAmount} грн • Статус: {data.status}</Typography>
        <Button variant="contained" disabled={busy || data.status === 'paid' || data.status === 'cancelled'} onClick={() => setPaymentOpen(true)}>
          Додати оплату
        </Button>
      </Box>
      <LinksBlockPayable sourceReceipt={data.sourceReceipt ?? { id: data.sourceReceiptId }} />
      <Typography variant="body2">Проєкт: {data.projectId} • Постачальник: {data.supplierId ?? '—'}</Typography>
      <TableContainer component={Paper} sx={{ my: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Сума</TableCell>
              <TableCell>Дата</TableCell>
              <TableCell>Спосіб</TableCell>
              <TableCell>Коментар</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(data.payments ?? []).map((pay) => (
              <TableRow key={pay.id}>
                <TableCell>{pay.amount}</TableCell>
                <TableCell>{pay.paidAt}</TableCell>
                <TableCell>{pay.method}</TableCell>
                <TableCell>{pay.comment ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <AuditBlock events={data.audit ?? []} />

      <Dialog open={paymentOpen} onClose={() => setPaymentOpen(false)}>
        <DialogTitle>Додати оплату</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Сума" type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} margin="dense" />
          <TextField fullWidth label="Дата" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} margin="dense" InputLabelProps={{ shrink: true }} />
          <TextField fullWidth label="Коментар" value={payComment} onChange={(e) => setPayComment(e.target.value)} margin="dense" />
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={() => setPaymentOpen(false)}>Скасувати</Button>
            <Button variant="contained" disabled={busy || !payAmount} onClick={handleAddPayment}>Зберегти</Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
