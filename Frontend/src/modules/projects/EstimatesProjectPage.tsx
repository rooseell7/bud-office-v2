import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Link,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { getProjectSummary, type ProjectSummaryDto } from '../../api/projects';
import { ProjectHeader } from './components/ProjectHeader';
import ProjectTimelineTab from './components/ProjectTimelineTab';
import { getEstimatesByProject, createEstimate, getEstimatesProjectDashboard, type EstimateItem, type EstimatesProjectItem } from '../../api/estimates';
import { getActs, type ActDto } from '../../api/acts';
import { listInvoices, type Invoice } from '../invoices/api/invoices.api';

function a11yProps(index: number) {
  return { id: `estimates-tab-${index}`, 'aria-controls': `estimates-tabpanel-${index}` };
}

export default function EstimatesProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = id ? Number(id) : NaN;
  const [summary, setSummary] = useState<ProjectSummaryDto | null>(null);
  const [dashboard, setDashboard] = useState<EstimatesProjectItem | null>(null);
  const [quotes, setQuotes] = useState<EstimateItem[]>([]);
  const [acts, setActs] = useState<ActDto[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingQuote, setCreatingQuote] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(projectId) || projectId <= 0) {
      setError('Некоректний ID проєкту');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const load = async () => {
      try {
        const [s, dash, qList, invList] = await Promise.all([
          getProjectSummary(projectId),
          getEstimatesProjectDashboard(projectId).catch(() => null),
          getEstimatesByProject(projectId),
          listInvoices({ objectId: projectId }),
        ]);
        setSummary(s);
        setDashboard(dash ?? null);
        setQuotes(Array.isArray(qList) ? qList : []);
        setInvoices(Array.isArray(invList) ? invList : []);
        const allActs = await getActs();
        setActs(Array.isArray(allActs) ? allActs.filter((a) => Number((a as any).projectId) === projectId) : []);
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || 'Помилка завантаження');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [projectId]);

  const handleCreateQuote = async () => {
    if (!Number.isFinite(projectId)) return;
    setCreatingQuote(true);
    try {
      const { id: quoteId } = await createEstimate({ projectId });
      navigate(`/estimate/${quoteId}`);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Помилка створення КП');
    } finally {
      setCreatingQuote(false);
    }
  };

  if (loading && !summary) {
    return (
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error || !summary) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">{error || 'Проєкт не знайдено'}</Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mt: 1 }}>
          Назад
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/estimates/projects')} sx={{ mb: 1 }}>
        Назад
      </Button>
      <ProjectHeader summary={summary} currentView="estimates" />

      {dashboard && (
        <Box sx={{ mt: 2, p: 1.5, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', bgcolor: 'action.hover', borderRadius: 1 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Остання КП</Typography>
            <Typography variant="body2">
              {dashboard.quote.lastQuoteId ? (
                <>
                  <Chip size="small" label={dashboard.quote.status ?? '—'} sx={{ mr: 0.5 }} />
                  {dashboard.quote.total != null && Number(dashboard.quote.total).toLocaleString('uk-UA')}
                  {dashboard.quote.updatedAt && ` · ${new Date(dashboard.quote.updatedAt).toLocaleDateString('uk-UA')}`}
                </>
              ) : (
                '—'
              )}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Акти</Typography>
            <Typography variant="body2">
              {dashboard.acts.count}
              {dashboard.acts.lastActAt && ` · останній ${new Date(dashboard.acts.lastActAt).toLocaleDateString('uk-UA')}`}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Накладні</Typography>
            <Typography variant="body2">
              {dashboard.invoices.count}
              {dashboard.invoices.unpaidCount > 0 && (
                <Chip size="small" color="warning" label={dashboard.invoices.unpaidCount} sx={{ ml: 0.5 }} />
              )}
              {dashboard.invoices.lastInvoiceAt && ` · остання ${new Date(dashboard.invoices.lastInvoiceAt).toLocaleDateString('uk-UA')}`}
            </Typography>
          </Box>
          {dashboard.lastActivityAt && (
            <Typography variant="caption" color="text.secondary">
              Остання активність: {new Date(dashboard.lastActivityAt).toLocaleString('uk-UA')}
            </Typography>
          )}
        </Box>
      )}

      <Card sx={{ mt: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, pt: 1 }}>
          <Tab label={`КП (${quotes.length})`} {...a11yProps(0)} />
          <Tab label={`Акти (${acts.length})`} {...a11yProps(1)} />
          <Tab label={`Накладні (${invoices.length})`} {...a11yProps(2)} />
          <Tab label="Таймлайн" {...a11yProps(3)} />
        </Tabs>
        <Divider />
        <CardContent>
          {tab === 0 && (
            <Box>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={handleCreateQuote}
                disabled={creatingQuote}
                sx={{ mb: 1 }}
              >
                Новий КП
              </Button>
              {quotes.length === 0 ? (
                <Typography color="text.secondary">Немає кошторисів по цьому об'єкту.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Назва</TableCell>
                      <TableCell>Статус</TableCell>
                      <TableCell>Оновлено</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {quotes.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell>{q.title ?? `КП #${q.id}`}</TableCell>
                        <TableCell>{q.status ?? '—'}</TableCell>
                        <TableCell>{q.updatedAt ? new Date(q.updatedAt).toLocaleDateString('uk-UA') : '—'}</TableCell>
                        <TableCell>
                          <Link
                            component="button"
                            variant="body2"
                            onClick={() => navigate(`/estimate/${q.id}`)}
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                          >
                            Відкрити <OpenInNewIcon fontSize="small" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          )}
          {tab === 1 && (
            <Box>
              {acts.length === 0 ? (
                <Typography color="text.secondary">Немає актів по цьому об'єкту.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>№</TableCell>
                      <TableCell>Дата</TableCell>
                      <TableCell>Статус</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {acts.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.id}</TableCell>
                        <TableCell>{a.actDate}</TableCell>
                        <TableCell>{a.status ?? '—'}</TableCell>
                        <TableCell>
                          <Link
                            component="button"
                            variant="body2"
                            onClick={() => navigate(`/estimate/acts/${a.id}`)}
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                          >
                            Відкрити <OpenInNewIcon fontSize="small" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          )}
          {tab === 2 && (
            <Box>
              {invoices.length === 0 ? (
                <Typography color="text.secondary">Немає накладних по цьому об'єкту.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Накладна</TableCell>
                      <TableCell>Статус</TableCell>
                      <TableCell>Оновлено</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>{(inv as any).name ?? `#${inv.id}`}</TableCell>
                        <TableCell>{inv.status ?? '—'}</TableCell>
                        <TableCell>
                          {inv.updatedAt ? new Date(inv.updatedAt).toLocaleDateString('uk-UA') : '—'}
                        </TableCell>
                        <TableCell>
                          <Link
                            component="button"
                            variant="body2"
                            onClick={() => navigate(`/invoices/${inv.id}`)}
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                          >
                            Відкрити <OpenInNewIcon fontSize="small" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          )}
          {tab === 3 && <ProjectTimelineTab projectId={projectId} />}
        </CardContent>
      </Card>
    </Box>
  );
}
