import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { getSupplyOrders } from '../../../api/supply';
import type { SupplyOrderDto } from '../../../api/supply';

const statusLabels: Record<string, string> = {
  draft: 'Чернетка', sent: 'Відправлено', confirmed: 'Підтверджено',
  partially_delivered: 'Частково доставлено', delivered: 'Доставлено', closed: 'Закрито', cancelled: 'Скасовано',
};

export default function SupplyOrdersPage() {
  const navigate = useNavigate();
  const [list, setList] = useState<SupplyOrderDto[]>([]);
  const [projectId, setProjectId] = useState<number | ''>('');
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params: { projectId?: number; status?: string } = {};
      if (projectId !== '') params.projectId = projectId as number;
      if (status) params.status = status;
      const data = await getSupplyOrders(params);
      setList(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId, status]);

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h6">Замовлення</Typography>
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
              <TableCell>Об'єкт</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Сума (план)</TableCell>
              <TableCell>Приходів</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5}>Завантаження…</TableCell></TableRow>
            ) : list.length === 0 ? (
              <>
                <TableRow><TableCell colSpan={5}>Немає замовлень</TableCell></TableRow>
                <TableRow><TableCell colSpan={5} sx={{ py: 2, color: 'text.secondary', fontSize: '0.875rem' }}>
                  Замовлення створюються з заявок: відкрийте заявку зі статусом «Передано» і натисніть «Створити замовлення».
                </TableCell></TableRow>
              </>
            ) : (
              list.map((o) => (
                <TableRow key={o.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/supply/orders/${o.id}`)}>
                  <TableCell>{o.id}</TableCell>
                  <TableCell>Проєкт {o.projectId}</TableCell>
                  <TableCell>{statusLabels[o.status] ?? o.status}</TableCell>
                  <TableCell>{(o as { totalPlan?: number }).totalPlan != null ? `${(o as { totalPlan?: number }).totalPlan} грн` : '—'}</TableCell>
                  <TableCell>{(o as { receiptsCount?: number }).receiptsCount ?? 0}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
