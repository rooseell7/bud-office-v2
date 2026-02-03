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
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
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
import { getForemanCandidates, updateObject, type ForemanCandidate } from '../../api/objects';
import { useAuth } from '../auth/AuthContext';
import { getActs, type ActDto } from '../../api/acts';
import { listInvoices, type Invoice } from '../invoices/api/invoices.api';
import { getProjectSummary, getTransactions, createTransactionIn, createTransactionOut, type ProjectSummaryDto, type TransactionDto } from '../../api/finance';
import { TransactionInModal } from '../finance/components/TransactionInModal';
import { TransactionOutModal } from '../finance/components/TransactionOutModal';

import { n } from '../shared/sheet/utils';

type ProjectObject = {
  id: number;
  name: string;
  type?: string | null;
  address?: string | null;
  status?: string | null;
  clientId?: number | null;
  foremanId?: number | null;
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
  const { can } = useAuth();
  const objectId = Number(id);

  const [tab, setTab] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [obj, setObj] = useState<ProjectObject | null>(null);
  const [acts, setActs] = useState<ActDto[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [foremanCandidates, setForemanCandidates] = useState<ForemanCandidate[]>([]);
  const [foremanId, setForemanId] = useState<number | ''>('');
  const [savingForeman, setSavingForeman] = useState(false);

  const [financeSummary, setFinanceSummary] = useState<ProjectSummaryDto | null>(null);
  const [financeTransactions, setFinanceTransactions] = useState<TransactionDto[]>([]);
  const [financeInModal, setFinanceInModal] = useState(false);
  const [financeOutModal, setFinanceOutModal] = useState(false);

  const canWrite = can('objects:write') || can('projects:write');
  const canFinanceRead = can('finance:read');
  const canFinanceWrite = can('finance:write');

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
        const data = res.data ?? null;
        setObj(data);
        setForemanId(data?.foremanId ?? '');

        const [candidates] = await Promise.all([
          getForemanCandidates(),
        ]);
        setForemanCandidates(candidates);

        // Накладні по обʼєкту
        const inv = await listInvoices({ objectId });
        setInvoices(Array.isArray(inv) ? inv : []);

        // Акти (фільтр по projectId)
        const allActs = await getActs();
        const list = Array.isArray(allActs) ? allActs : [];
        setActs(list.filter((a) => Number((a as any).projectId) === objectId));

        if (can('finance:read')) {
          try {
            const [summary, tx] = await Promise.all([
              getProjectSummary(objectId),
              getTransactions({ projectId: objectId, limit: 30 }),
            ]);
            setFinanceSummary(summary);
            setFinanceTransactions(tx.items);
          } catch {
            setFinanceSummary(null);
            setFinanceTransactions([]);
          }
        }
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || 'Помилка завантаження обʼєкта');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [objectId, canFinanceRead]);

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
          {canFinanceRead && <Tab label="Фінанси" {...a11yProps(3)} />}
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
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Виконроб
                    </Typography>
                    {canWrite ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <FormControl size="small" sx={{ minWidth: 220 }}>
                          <InputLabel>Виконроб</InputLabel>
                          <Select
                            value={foremanId === '' ? '' : foremanId}
                            label="Виконроб"
                            onChange={(e) => setForemanId(e.target.value === '' ? '' : Number(e.target.value))}
                          >
                            <MenuItem value="">
                              <em>Не призначено</em>
                            </MenuItem>
                            {foremanCandidates.map((f) => (
                              <MenuItem key={f.id} value={f.id}>
                                {f.fullName}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Button
                          variant="contained"
                          size="small"
                          disabled={
                            savingForeman ||
                            (foremanId === '' ? !(obj as any).foremanId : Number(foremanId) === Number((obj as any).foremanId))
                          }
                          onClick={async () => {
                            setSavingForeman(true);
                            try {
                              await updateObject(objectId, { foremanId: foremanId === '' ? null : foremanId });
                              setObj((o) => (o ? { ...o, foremanId: foremanId === '' ? null : foremanId } : null));
                            } catch (e: any) {
                              setError(e?.response?.data?.message || 'Помилка збереження');
                            } finally {
                              setSavingForeman(false);
                            }
                          }}
                        >
                          {savingForeman ? 'Збереження…' : 'Зберегти'}
                        </Button>
                      </Box>
                    ) : (
                      <Typography sx={{ fontWeight: 700 }}>
                        {obj.foremanId
                          ? foremanCandidates.find((f) => f.id === obj.foremanId)?.fullName ?? `#${obj.foremanId}`
                          : '—'}
                      </Typography>
                    )}
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

          {canFinanceRead && tab === 3 && (
            <Box>
              {financeSummary != null && (
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, mb: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Прихід (UAH)</Typography>
                    <Typography fontWeight={700}>{financeSummary.inUAH.toFixed(2)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Витрата (UAH)</Typography>
                    <Typography fontWeight={700}>{financeSummary.outUAH.toFixed(2)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Баланс обʼєкта (UAH)</Typography>
                    <Typography fontWeight={700}>{financeSummary.balanceUAH.toFixed(2)}</Typography>
                  </Box>
                </Box>
              )}
              {canFinanceWrite && (
                <Stack direction="row" gap={1} sx={{ mb: 2 }}>
                  <Button variant="contained" color="success" size="small" onClick={() => setFinanceInModal(true)}>
                    + Отримали гроші (для цього обʼєкта)
                  </Button>
                  <Button variant="contained" color="error" size="small" onClick={() => setFinanceOutModal(true)}>
                    – Оплатили (для цього обʼєкта)
                  </Button>
                </Stack>
              )}
              {financeTransactions.length === 0 ? (
                <Typography color="text.secondary">По цьому обʼєкту фінансових операцій поки немає.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Дата</TableCell>
                      <TableCell>Тип</TableCell>
                      <TableCell align="right">Сума</TableCell>
                      <TableCell>Контрагент</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {financeTransactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{new Date(t.date).toLocaleDateString('uk-UA')}</TableCell>
                        <TableCell>{t.type === 'in' ? 'Прихід' : t.type === 'out' ? 'Витрата' : 'Переказ'}</TableCell>
                        <TableCell align="right">{(t.amountUAH ?? t.amount).toFixed(2)} {t.currency}</TableCell>
                        <TableCell>{t.counterparty || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <TransactionInModal
                open={financeInModal}
                onClose={() => setFinanceInModal(false)}
                projectId={objectId}
                onSubmit={async (dto) => {
                  await createTransactionIn(dto);
                  setFinanceInModal(false);
                  const [summary, tx] = await Promise.all([
                    getProjectSummary(objectId),
                    getTransactions({ projectId: objectId, limit: 30 }),
                  ]);
                  setFinanceSummary(summary);
                  setFinanceTransactions(tx.items);
                }}
              />
              <TransactionOutModal
                open={financeOutModal}
                onClose={() => setFinanceOutModal(false)}
                projectId={objectId}
                onSubmit={async (dto) => {
                  await createTransactionOut(dto);
                  setFinanceOutModal(false);
                  const [summary, tx] = await Promise.all([
                    getProjectSummary(objectId),
                    getTransactions({ projectId: objectId, limit: 30 }),
                  ]);
                  setFinanceSummary(summary);
                  setFinanceTransactions(tx.items);
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProjectDetailsPage;
