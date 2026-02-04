import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useRealtime } from '../../../realtime/RealtimeContext';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';

import {
  getExecutionProject,
  createExecutionTask,
  updateExecutionTask,
  type ExecutionTaskDto,
  type ExecutionTaskStatus,
} from '../../../api/execution';
import { getForemanEvents, type ForemanEventDto } from '../../../api/foreman';

const statusLabels: Record<string, string> = {
  new: 'Нова',
  in_progress: 'В роботі',
  blocked: 'Очікування',
  done: 'Готово',
  canceled: 'Скасовано',
};

const priorityLabels: Record<string, string> = {
  low: 'Низький',
  medium: 'Середній',
  high: 'Високий',
};

const eventTypeLabels: Record<string, string> = {
  WORK_LOG: 'Робота',
  MATERIAL_RECEIPT: 'Матеріали',
  ISSUE: 'Проблема',
  COMMENT: 'Коментар',
  TASK_CREATED: 'Задачу створено',
  TASK_STATUS_CHANGE: 'Зміна статусу задачі',
  TASK_COMMENT: 'Коментар до задачі',
};

function formatDate(s: string): string {
  return new Date(s).toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ExecutionProjectDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = useAuth();
  const realtime = useRealtime();
  const projectId = Number(id ?? 0);

  const [projectDetail, setProjectDetail] = useState<{ project: any; tasks: ExecutionTaskDto[] } | null>(null);
  const [events, setEvents] = useState<ForemanEventDto[]>([]);
  const [tab, setTab] = useState(0);
  const [taskFilter, setTaskFilter] = useState<ExecutionTaskStatus | ''>('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!projectId || !Number.isFinite(projectId)) return;
    setLoading(true);
    setError(null);
    try {
      const [detail, evts] = await Promise.all([
        getExecutionProject(projectId),
        getForemanEvents(projectId, { limit: 80 }),
      ]);
      setProjectDetail(detail);
      setEvents(evts);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Помилка завантаження');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!projectId || !Number.isFinite(projectId) || !realtime) return;
    realtime.joinProject(projectId);
    return () => {
      realtime.leaveProject(projectId);
    };
  }, [projectId, realtime]);

  useEffect(() => {
    if (!realtime) return;
    return realtime.subscribe((ev) => {
      if (ev.entity === 'task' && Number(ev.projectId) === projectId) load();
    });
  }, [realtime, projectId, load]);

  useEffect(() => {
    if (!realtime) return;
    return realtime.refetchOnReconnect(load);
  }, [realtime, load]);

  const handleCreateTask = async (form: {
    stageId: number | null;
    title: string;
    description?: string;
    assigneeId: number;
    priority?: string;
    dueDate?: string;
  }) => {
    await createExecutionTask(projectId, {
      stageId: form.stageId ?? undefined,
      title: form.title,
      description: form.description ?? null,
      assigneeId: form.assigneeId,
      priority: form.priority as any,
      dueDate: form.dueDate?.trim() ? form.dueDate : null,
    });
    setCreateModalOpen(false);
    load();
  };

  const handleQuickStatus = async (task: ExecutionTaskDto, newStatus: ExecutionTaskStatus) => {
    if (!can('execution:write')) return;
    await updateExecutionTask(task.id, { status: newStatus });
    load();
  };

  if (!can('execution:read')) {
    return <Navigate to="/403" replace />;
  }

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !projectDetail) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error || 'Обʼєкт не знайдено'}</Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/execution/projects')} sx={{ mt: 2 }}>
          Назад
        </Button>
      </Box>
    );
  }

  const { project, tasks } = projectDetail;
  const filteredTasks =
    taskFilter === ''
      ? tasks
      : tasks.filter((t) => t.status === taskFilter);

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
        <Stack direction="row" alignItems="center" gap={1}>
          <IconButton size="small" onClick={() => navigate('/execution/projects')} aria-label="Назад">
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
            <Chip size="small" label={project.status} sx={{ mt: 0.5 }} variant="outlined" />
          </Box>
        </Stack>
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Задачі" />
        <Tab label="Події" />
      </Tabs>

      {tab === 0 && (
        <>
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
            <Stack direction="row" gap={1}>
              <Chip
                size="small"
                variant={taskFilter === '' ? 'filled' : 'outlined'}
                label="Усі"
                onClick={() => setTaskFilter('')}
              />
              {(['new', 'in_progress', 'blocked', 'done'] as const).map((s) => (
                <Chip
                  key={s}
                  size="small"
                  variant={taskFilter === s ? 'filled' : 'outlined'}
                  label={statusLabels[s]}
                  onClick={() => setTaskFilter(s === taskFilter ? '' : s)}
                />
              ))}
            </Stack>
            {can('execution:write') && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateModalOpen(true)}>
                Створити задачу
              </Button>
            )}
          </Stack>

          {filteredTasks.length === 0 ? (
            <Typography color="text.secondary">Немає задач за обраним фільтром.</Typography>
          ) : (
            <Stack spacing={1.5}>
              {filteredTasks.map((t) => (
                <Card key={t.id} variant="outlined">
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                      <Box>
                        <Typography fontWeight={600}>{t.title}</Typography>
                        <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                          <Chip size="small" label={statusLabels[t.status] ?? t.status} />
                          <Chip size="small" variant="outlined" label={priorityLabels[t.priority] ?? t.priority} />
                          {t.dueDate && (
                            <Typography variant="caption" color="text.secondary">
                              Дедлайн: {t.dueDate}
                              {t.isOverdue && ' (прострочено)'}
                            </Typography>
                          )}
                          {t.assigneeName && (
                            <Typography variant="caption" color="text.secondary">
                              Виконроб: {t.assigneeName}
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                      {can('execution:write') &&
                        t.status !== 'done' &&
                        t.status !== 'canceled' && (
                          <Stack direction="row" gap={0.5}>
                            {t.status === 'new' && (
                              <Button size="small" onClick={() => handleQuickStatus(t, 'in_progress')}>
                                В роботу
                              </Button>
                            )}
                            {t.status === 'in_progress' && (
                              <>
                                <Button size="small" onClick={() => handleQuickStatus(t, 'done')}>
                                  Готово
                                </Button>
                                <Button size="small" color="warning" onClick={() => handleQuickStatus(t, 'blocked')}>
                                  Очікування
                                </Button>
                              </>
                            )}
                            {t.status === 'blocked' && (
                              <Button size="small" onClick={() => handleQuickStatus(t, 'in_progress')}>
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
          )}

          <CreateTaskModal
            open={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            onSubmit={handleCreateTask}
            projectId={projectId}
          />
        </>
      )}

      {tab === 1 && (
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
                      <Chip size="small" label={eventTypeLabels[ev.type] ?? ev.type} />
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(ev.createdAt)}
                      </Typography>
                    </Stack>
                    {ev.payload && typeof ev.payload === 'object' && (
                      <Typography variant="body2">
                        {ev.type === 'TASK_CREATED' && `Задача: ${(ev.payload as any).title ?? ''}`}
                        {ev.type === 'TASK_STATUS_CHANGE' &&
                          `${(ev.payload as any).from ?? ''} → ${(ev.payload as any).to ?? ''}`}
                        {ev.type === 'TASK_COMMENT' && String((ev.payload as any).comment ?? '')}
                        {ev.type === 'WORK_LOG' &&
                          `${(ev.payload as any).workName ?? ''} ${(ev.payload as any).qty != null ? `— ${(ev.payload as any).qty}` : ''}`}
                        {ev.type === 'COMMENT' && String((ev.payload as any).content ?? '')}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default ExecutionProjectDetailsPage;
