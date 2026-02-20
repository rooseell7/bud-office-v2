import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { getSupplyReceipts } from '../../../api/supply';
import type { SupplyReceiptDto } from '../../../api/supply';

const statusLabels: Record<string, string> = {
  draft: 'Чернетка', received: 'Прийнято', verified: 'Перевірено', sent_to_pay: 'На оплату', paid: 'Оплачено', cancelled: 'Скасовано',
};

export default function SupplyReceiptsPage() {
  const navigate = useNavigate();
  const [list, setList] = useState<SupplyReceiptDto[]>([]);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = status ? { status } : {};
      const data = await getSupplyReceipts(params);
      setList(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [status]);

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h6">Приходи</Typography>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Статус</InputLabel>
          <Select value={status} label="Статус" onChange={(e) => setStatus(e.target.value)}>
            <MenuItem value="">Усі</MenuItem>
            {Object.entries(statusLabels).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>№</TableCell>
              <TableCell>Замовлення</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Сума</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4}>Завантаження…</TableCell></TableRow>
            ) : list.length === 0 ? (
              <TableRow><TableCell colSpan={4}>Немає приходів</TableCell></TableRow>
            ) : (
              list.map((r) => (
                <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/supply/receipts/${r.id}`)}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>Замовлення №{r.sourceOrderId}</TableCell>
                  <TableCell>{statusLabels[r.status] ?? r.status}</TableCell>
                  <TableCell>{r.total != null ? `${r.total} грн` : '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
