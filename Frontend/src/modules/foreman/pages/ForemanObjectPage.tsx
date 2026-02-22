import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BuildIcon from '@mui/icons-material/Build';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import {
  getForemanObject,
  getForemanEvents,
  createForemanEvent,
  getForemanObjectTasks,
  updateForemanTaskStatus,
  type ForemanEventDto,
  type ForemanTaskDto,
} from '../../../api/foreman';

import AddWorkDialog from '../components/AddWorkDialog';
import AddMaterialReceiptDialog from '../components/AddMaterialReceiptDialog';
import AddIssueDialog from '../components/AddIssueDialog';

const statusLabels: Record<string, string> = {
  planned: 'Планується',
  in_progress: 'В роботі',
  paused: 'Пауза',
  done: 'Завершено',
};

const eventTypeLabels: Record<string, string> = {
  WORK_LOG: 'Робота',
  MATERIAL_RECEIPT: 'Приймання матеріалів',
  ISSUE: 'Проблема',
  COMMENT: 'Коментар',
  TASK_CREATED: 'Задачу створено',
  TASK_STATUS_CHANGE: 'Зміна статусу задачі',
  TASK_COMMENT: 'Коментар до задачі',
};

const taskStatusLabels: Record<string, string> = {
  new: 'Нова',
  in_progress: 'В роботі',
  blocked: 'Очікування',
  done: 'Готово',
  canceled: 'Скасовано',
};

function formatDate(s: string): string {
  const d = new Date(s);
  return d.toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ForemanObjectPage: React.FC = () => {
  const { objectId } = useParams<{ objectId: string }>();
  const nav = useNavigate();
  const { can } = useAuth();
  const id = Number(objectId ?? 0);

  const [project, setProject] = useState<Awaited<ReturnType<typeof getForemanObject>> | null>(null);
  const [events, setEvents] = useState<ForemanEventDto[]>([]);
  const [tasks, setTasks] = useState<ForemanTaskDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [workDialogOpen, setWorkDialogOpen] = useState(false);
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);

  if (!can('foreman:read')) {
    return <Navigate to="/403" replace />;
  }

  const load = useCallback(async () => {
    if (!id || !Number.isFinite(id)) return;
    setLoading(true);
    setError(null);
    try {
      const [proj, evts, taskList] = await Promise.all([
        getForemanObject(id),
        getForemanEvents(id, { limit: 50 }),
        getForemanObjectTasks(id, { includeDone: false }),
      ]);
      setProject(proj);
      setEvents(evts);
      setTasks(taskList);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Помилка завантаження';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAddWork = async (data: {
    workName: string;
    unit?: string;
    qty?: number;
    comment?: string;
  }) => {
    await createForemanEvent(id, {
      type: 'WORK_LOG',
      payload: data,
    });
    setWorkDialogOpen(false);
    load();
  };

  const handleAddMaterialReceipt = async (data: {
    supplierName: string;
    invoiceNumber?: string;
    status: 'accepted' | 'partial' | 'rejected';
    comment?: string;
  }) => {
    await createForemanEvent(id, {
      type: 'MATERIAL_RECEIPT',
      payload: data,
    });
    setMaterialDialogOpen(false);
    load();
  };

  const handleAddIssue = async (data: {
    title: string;
    description?: string;
    priority?: string;
  }) => {
    await createForemanEvent(id, {
      type: 'ISSUE',
      payload: { ...data, status: 'open' },
    });
    setIssueDialogOpen(false);
    load();
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !project) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error || 'Обʼєкт не знайдено'}</Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => nav('/foreman')} sx={{ mt: 2 }}>
          Назад
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" gap={1}>
          <IconButton size="small" onClick={() => nav('/foreman')} aria-label="Назад">
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {project.name}
            </Typography>
            {project.address && (
              <Typography variant="body2" color="text.secondary">
                {project.address}
              </Typography>
            )}
            <Chip
              size="small"
              label={statusLabels[project.status] || project.status}
              sx={{ mt: 0.5 }}
            />
          </Box>
        </Stack>
      </Stack>

      <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Швидкі дії
      </Typography>
      <Stack direction="row" gap={1} sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<BuildIcon />}
          onClick={() => setWorkDialogOpen(true)}
        >
          Додати роботу
        </Button>
        <Button
          variant="contained"
          startIcon={<LocalShippingIcon />}
          onClick={() => setMaterialDialogOpen(true)}
        >
          Прийняти матеріали
        </Button>
        <Button
          variant="contained"
          color="warning"
          startIcon={<WarningAmberIcon />}
          onClick={() => setIssueDialogOpen(true)}
        >
          Проблема
        </Button>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      {tasks.length > 0 && (
        <>
          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Мої задачі
          </Typography>
          <Stack spacing={1} sx={{ mb: 3 }}>
            {tasks.map((t) => (
              <Card key={t.id} variant="outlined">
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                    <Box>
                      <Typography fontWeight={600}>{t.title}</Typography>
                      <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                        <Chip size="small" label={taskStatusLabels[t.status] ?? t.status} />
                        {t.dueDate && (
                          <Typography variant="caption" color="text.secondary">
                            Дедлайн: {t.dueDate}
                            {t.isOverdue && ' (прострочено)'}
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                    {can('foreman:write') && (
                      <Stack direction="row" gap={0.5}>
                        {t.status === 'new' && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={async () => {
                              await updateForemanTaskStatus(t.id, { status: 'in_progress' });
                              load();
                            }}
                          >
                            В роботу
                          </Button>
                        )}
                        {t.status === 'in_progress' && (
                          <>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={async () => {
                                await updateForemanTaskStatus(t.id, { status: 'done' });
                                load();
                              }}
                            >
                              Готово
                            </Button>
                            <Button
                              size="small"
                              color="warning"
                              onClick={async () => {
                                const reason = window.prompt('Причина очікування (опційно):');
                                await updateForemanTaskStatus(t.id, {
                                  status: 'blocked',
                                  blockedReason: reason ?? undefined,
                                });
                                load();
                              }}
                            >
                              Очікування
                            </Button>
                          </>
                        )}
                        {t.status === 'blocked' && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={async () => {
                              await updateForemanTaskStatus(t.id, { status: 'in_progress' });
                              load();
                            }}
                          >
                            В роботу
                          </Button>
                        )}
                      </Stack>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </>
      )}

      <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Стрічка подій
      </Typography>
      <Card>
        <CardContent>
          {events.length === 0 ? (
            <Typography color="text.secondary">Поки немає подій</Typography>
          ) : (
            <Stack spacing={1.5}>
              {events.map((ev) => (
                <Box
                  key={ev.id}
                  sx={{
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 0.5 }}>
                    <Chip size="small" label={eventTypeLabels[ev.type] || ev.type} />
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(ev.createdAt)}
                    </Typography>
                  </Stack>
                  {ev.type === 'WORK_LOG' && ev.payload && (() => {
                    const p = ev.payload as Record<string, unknown>;
                    const s = String(p.workName || '')
                      + (p.qty != null ? ` — ${String(p.qty)} ${String(p.unit || '')}` : '')
                      + (p.comment ? ` (${String(p.comment)})` : '');
                    return <Typography variant="body2">{s}</Typography>;
                  })()}
                  {ev.type === 'MATERIAL_RECEIPT' && ev.payload && (() => {
                    const p = ev.payload as Record<string, unknown>;
                    const s = String(p.supplierName ?? '') + ' — ' + String(p.status ?? '')
                      + (p.invoiceNumber ? ` (${String(p.invoiceNumber)})` : '')
                      + (p.comment ? ` — ${String(p.comment)}` : '');
                    return <Typography variant="body2">{s}</Typography>;
                  })()}
                  {ev.type === 'ISSUE' && ev.payload && (() => {
                    const p = ev.payload as Record<string, unknown>;
                    return (
                      <Typography variant="body2">
                        <strong>{String(p.title ?? '')}</strong>
                        {p.description ? ` — ${String(p.description)}` : ''}
                        {p.priority ? ` [${String(p.priority)}]` : ''}
                      </Typography>
                    );
                  })()}
                  {ev.type === 'COMMENT' && ev.payload && (
                    <Typography variant="body2">{String(ev.payload.content || '')}</Typography>
                  )}
                  {ev.type === 'TASK_CREATED' && ev.payload && (
                    <Typography variant="body2">Задача: {(ev.payload as any).title ?? ''}</Typography>
                  )}
                  {ev.type === 'TASK_STATUS_CHANGE' && ev.payload && (
                    <Typography variant="body2">
                      {(ev.payload as any).from ?? ''} → {(ev.payload as any).to ?? ''}
                    </Typography>
                  )}
                  {ev.type === 'TASK_COMMENT' && ev.payload && (
                    <Typography variant="body2">{String((ev.payload as any).comment ?? '')}</Typography>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <AddWorkDialog
        open={workDialogOpen}
        onClose={() => setWorkDialogOpen(false)}
        onSubmit={handleAddWork}
      />
      <AddMaterialReceiptDialog
        open={materialDialogOpen}
        onClose={() => setMaterialDialogOpen(false)}
        onSubmit={handleAddMaterialReceipt}
      />
      <AddIssueDialog
        open={issueDialogOpen}
        onClose={() => setIssueDialogOpen(false)}
        onSubmit={handleAddIssue}
      />

      <Divider sx={{ my: 3 }} />

      <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Документи (тільки перегляд)
      </Typography>
      <Stack direction="row" gap={1} flexWrap="wrap">
        <Button variant="outlined" size="small" component={Link} to="/estimate">
          КП (читання)
        </Button>
        <Button variant="outlined" size="small" component={Link} to="/estimate/acts">
          Акти (читання)
        </Button>
        <Button variant="outlined" size="small" component={Link} to="/invoices">
          Накладні (читання)
        </Button>
      </Stack>
    </Box>
  );
};

export default ForemanObjectPage;
