import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { getPayables } from '../../../api/supply';
import type { PayableDto } from '../../../api/supply';

const statusLabels: Record<string, string> = { pending: 'Очікує', partially_paid: 'Частково оплачено', paid: 'Оплачено', cancelled: 'Скасовано' };

export default function SupplyPayablesPage() {
  const navigate = useNavigate();
  const [list, setList] = useState<PayableDto[]>([]);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = status ? { status } : {};
      const data = await getPayables(params);
      setList(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [status]);

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h6">До оплати</Typography>
        <FormControl size="small" sx={{ minWidth: 160 }}>
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
              <TableCell>Сума</TableCell>
              <TableCell>Оплачено</TableCell>
              <TableCell>Статус</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5}>Завантаження…</TableCell></TableRow>
            ) : list.length === 0 ? (
              <TableRow><TableCell colSpan={5}>Немає записів</TableCell></TableRow>
            ) : (
              list.map((p) => (
                <TableRow key={p.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/supply/payables/${p.id}`)}>
                  <TableCell>{p.id}</TableCell>
                  <TableCell>Проєкт {p.projectId}</TableCell>
                  <TableCell>{p.amount}</TableCell>
                  <TableCell>{p.paidAmount}</TableCell>
                  <TableCell>{statusLabels[p.status] ?? p.status}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
