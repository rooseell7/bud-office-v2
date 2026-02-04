import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { getSupplyRequests, getSupplyProjectOptions } from '../../../api/supply';
import type { SupplyRequestDto } from '../../../api/supply';

const statusLabels: Record<string, string> = { draft: 'Чернетка', submitted: 'Передано', closed: 'Закрито', cancelled: 'Скасовано' };

export default function SupplyRequestsPage() {
  const navigate = useNavigate();
  const [list, setList] = useState<SupplyRequestDto[]>([]);
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);
  const [projectId, setProjectId] = useState<number | ''>('');
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { getSupplyProjectOptions().then(setProjects).catch(() => setProjects([])); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const params: { projectId?: number; status?: string } = {};
      if (projectId !== '') params.projectId = projectId as number;
      if (status) params.status = status;
      const data = await getSupplyRequests(params);
      setList(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId, status]);

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6">Заявки на постачання</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Об'єкт</InputLabel>
            <Select value={projectId === '' ? '' : projectId} label="Об'єкт" onChange={(e) => setProjectId(e.target.value === '' ? '' : (e.target.value as number))}>
              <MenuItem value="">Усі</MenuItem>
              {projects.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Статус</InputLabel>
            <Select value={status} label="Статус" onChange={(e) => setStatus(e.target.value)}>
              <MenuItem value="">Усі</MenuItem>
              {Object.entries(statusLabels).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/supply/requests/new')}>
            Створити
          </Button>
        </Box>
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>№</TableCell>
              <TableCell>Об'єкт</TableCell>
              <TableCell>Дата потреби</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Позицій</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5}>Завантаження…</TableCell></TableRow>
            ) : list.length === 0 ? (
              <TableRow><TableCell colSpan={5}>Немає заявок</TableCell></TableRow>
            ) : (
              list.map((r) => (
                <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/supply/requests/${r.id}`)}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{projectMap[r.projectId] ?? `Об'єкт ${r.projectId}`}</TableCell>
                  <TableCell>{r.neededAt ?? '—'}</TableCell>
                  <TableCell>{statusLabels[r.status] ?? r.status}</TableCell>
                  <TableCell>{r.items?.length ?? 0}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
