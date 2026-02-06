import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Select, MenuItem, FormControl, InputLabel, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { getSupplyOrders, deleteSupplyOrder, getSupplyProjectOptions } from '../../../api/supply';
import type { SupplyOrderDto } from '../../../api/supply';
import { useAuth } from '../../auth/AuthContext';

const statusLabels: Record<string, string> = {
  draft: 'Чернетка', sent: 'Відправлено', confirmed: 'Підтверджено',
  partially_delivered: 'Частково доставлено', delivered: 'Доставлено', closed: 'Закрито', cancelled: 'Скасовано',
};

export default function SupplyOrdersPage() {
  const navigate = useNavigate();
  const { roles } = useAuth();
  const isAdmin = Array.isArray(roles) && roles.map((r) => String(r).toLowerCase()).includes('admin');
  const [list, setList] = useState<SupplyOrderDto[]>([]);
  const [projectId, setProjectId] = useState<number | ''>('');
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => { getSupplyProjectOptions().then(setProjects).catch(() => setProjects([])); }, []);
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

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

  const receiptsCount = (o: SupplyOrderDto) => (o as { receiptsCount?: number }).receiptsCount ?? 0;
  const handleDeleteOrder = async (orderId: number) => {
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await deleteSupplyOrder(orderId);
      setDeleteConfirmId(null);
      load();
    } catch (e: any) {
      setDeleteError(e?.response?.data?.message || 'Помилка видалення');
    } finally {
      setDeleteBusy(false);
    }
  };

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
      <Dialog open={deleteConfirmId != null} onClose={() => !deleteBusy && setDeleteConfirmId(null)}>
        <DialogTitle>Видалити замовлення?</DialogTitle>
        <DialogContent>
          {deleteError && <Typography color="error" sx={{ mt: 1 }}>{deleteError}</Typography>}
          <Typography>Замовлення №{deleteConfirmId} буде видалено безповоротно.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)} disabled={deleteBusy}>Скасувати</Button>
          <Button color="error" variant="contained" onClick={() => deleteConfirmId != null && handleDeleteOrder(deleteConfirmId)} disabled={deleteBusy}>
            {deleteBusy ? 'Видалення…' : 'Видалити'}
          </Button>
        </DialogActions>
      </Dialog>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>№</TableCell>
              <TableCell>Об'єкт</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Сума (план)</TableCell>
              <TableCell>Приходів</TableCell>
              <TableCell width={56} />
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6}>Завантаження…</TableCell></TableRow>
            ) : list.length === 0 ? (
              <>
                <TableRow><TableCell colSpan={6}>Немає замовлень</TableCell></TableRow>
                <TableRow><TableCell colSpan={6} sx={{ py: 2, color: 'text.secondary', fontSize: '0.875rem' }}>
                  Замовлення створюються з заявок: відкрийте заявку зі статусом «Передано» і натисніть «Створити замовлення».
                </TableCell></TableRow>
              </>
            ) : (
              list.map((o) => (
                <TableRow key={o.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/supply/orders/${o.id}`)}>
                  <TableCell>{o.id}</TableCell>
                  <TableCell>{projectMap[o.projectId] ?? `Об'єкт ${o.projectId}`}</TableCell>
                  <TableCell>{statusLabels[o.status] ?? o.status}</TableCell>
                  <TableCell>{(o as { totalPlan?: number }).totalPlan != null ? `${(o as { totalPlan?: number }).totalPlan} грн` : '—'}</TableCell>
                  <TableCell>{receiptsCount(o)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {(receiptsCount(o) === 0 || isAdmin) && (
                      <IconButton size="small" color="error" aria-label="Видалити" onClick={() => setDeleteConfirmId(o.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
