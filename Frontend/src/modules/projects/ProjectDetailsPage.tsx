import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import api from '../../api/client';
import { getActs, type ActDto } from '../../api/acts';
import { listInvoices, type Invoice } from '../invoices/api/invoices.api';

import { n } from '../shared/sheet/utils';

type ProjectObject = {
  id: number;
  name: string;
  type?: string | null;
  address?: string | null;
  status?: string | null;
  clientId?: number | null;
};

function a11yProps(index: number) {
  return {
    id: `object-tab-${index}`,
    'aria-controls': `object-tabpanel-${index}`,
  };
}

function calcInvoiceTotal(inv: Invoice): number {
  // backend може повертати total як string (numeric)
  return n((inv as any).total);
}

function calcActSum(items: any): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((acc, it) => acc + n(it?.amount ?? n(it?.qty) * n(it?.price)), 0);
}

const ProjectDetailsPage: React.FC = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const objectId = Number(id);

  const [tab, setTab] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [obj, setObj] = useState<ProjectObject | null>(null);
  const [acts, setActs] = useState<ActDto[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (!Number.isFinite(objectId) || objectId <= 0) {
      setError('Некоректний ID обʼєкта');
      return;
    }

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        // Обʼєкт
        const res = await api.get<ProjectObject>(`/objects/${objectId}`);
        setObj(res.data ?? null);

        // Накладні по обʼєкту
        const inv = await listInvoices({ objectId });
        setInvoices(Array.isArray(inv) ? inv : []);

        // Акти (фільтр по projectId)
        const allActs = await getActs();
        const list = Array.isArray(allActs) ? allActs : [];
        setActs(list.filter((a) => Number((a as any).projectId) === objectId));
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || 'Помилка завантаження обʼєкта');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [objectId]);

  const invTotal = useMemo(() => invoices.reduce((acc, x) => acc + calcInvoiceTotal(x), 0), [invoices]);
  const actTotal = useMemo(() => acts.reduce((acc, a) => acc + calcActSum((a as any).items), 0), [acts]);

  if (loading && !obj) {
    return (
      <Box>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Обʼєкт #{objectId}{obj?.name ? ` — ${obj.name}` : ''}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Деталі обʼєкта: загальна інформація, акти та накладні
          </Typography>
        </Box>

        <Button variant="outlined" onClick={() => nav(-1)}>
          Назад
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, pt: 1 }}>
          <Tab label="Загальна" {...a11yProps(0)} />
          <Tab label={`Акти (${acts.length})`} {...a11yProps(1)} />
          <Tab label={`Накладні (${invoices.length})`} {...a11yProps(2)} />
        </Tabs>
        <Divider />
        <CardContent>
          {tab === 0 && (
            <Box>
              {!obj ? (
                <Typography color="text.secondary">Немає даних по обʼєкту.</Typography>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Назва
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>{obj.name}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Адреса
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>{obj.address || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Статус
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>{obj.status || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Тип
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>{obj.type || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Сума актів (по поточному фільтру)
                    </Typography>
                    <Typography sx={{ fontWeight: 800 }}>{actTotal.toFixed(2)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Сума накладних (по обʼєкту)
                    </Typography>
                    <Typography sx={{ fontWeight: 800 }}>{invTotal.toFixed(2)}</Typography>
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {tab === 1 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Button
                  size="small"
                  endIcon={<OpenInNewIcon />}
                  onClick={() => nav(`/delivery/acts?projectId=${objectId}`)}
                >
                  Відкрити повний список актів
                </Button>
              </Box>

              {loading ? (
                <CircularProgress size={20} />
              ) : acts.length === 0 ? (
                <Typography color="text.secondary">По цьому обʼєкту актів поки немає.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Дата</TableCell>
                      <TableCell>Статус</TableCell>
                      <TableCell align="right">Сума</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {acts.slice(0, 20).map((a) => (
                      <TableRow
                        key={a.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => nav(`/delivery/acts/${a.id}`)}
                      >
                        <TableCell>{a.id}</TableCell>
                        <TableCell>{String((a as any).actDate ?? '—')}</TableCell>
                        <TableCell>{String((a as any).status ?? '—')}</TableCell>
                        <TableCell align="right">{calcActSum((a as any).items).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          )}

          {tab === 2 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1, gap: 1 }}>
                <Button
                  size="small"
                  endIcon={<OpenInNewIcon />}
                  onClick={() => nav(`/invoices?objectId=${objectId}`)}
                >
                  Відкрити накладні (фільтр)
                </Button>
              </Box>

              {loading ? (
                <CircularProgress size={20} />
              ) : invoices.length === 0 ? (
                <Typography color="text.secondary">По цьому обʼєкту накладних поки немає.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Статус</TableCell>
                      <TableCell>Постачальник/Клієнт</TableCell>
                      <TableCell align="right">Сума</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoices.slice(0, 20).map((inv) => (
                      <TableRow
                        key={inv.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => nav(`/invoices/${inv.id}`)}
                      >
                        <TableCell>{inv.id}</TableCell>
                        <TableCell>{String((inv as any).status ?? '—')}</TableCell>
                        <TableCell>
                          {(inv as any).supplierName || (inv as any).customerName || '—'}
                        </TableCell>
                        <TableCell align="right">{calcInvoiceTotal(inv).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProjectDetailsPage;
