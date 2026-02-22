// FILE: src/modules/delivery/pages/DeliveryProjectPage.tsx

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Chip,
  Tooltip,
} from '@mui/material';

import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';

import { useAuth } from '../../../auth/AuthContext';

import {
  getWorkLogs,
  createWorkLog,
  updateWorkLog,
  deleteWorkLog,
} from '../api/delivery.api';

import { getActs, createAct, deleteAct } from '../api/delivery-acts.api';

import type {
  WorkLog,
  CreateWorkLogDto,
  UpdateWorkLogDto,
  Id as WorkId,
} from '../types/work-log.types';

import type { DeliveryAct, Id as ActId } from '../types/act.types';

import WorkLogsTable from '../components/WorkLogsTable';
import WorkLogModal from '../components/WorkLogModal';

import ActsTable from '../components/ActsTable';

function a11yProps(index: number) {
  return {
    id: `delivery-tab-${index}`,
    'aria-controls': `delivery-tabpanel-${index}`,
  };
}

function toNumberId(v: string | undefined): number | null {
  const s = (v ?? '').trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n;
}

export default function DeliveryProjectPage() {
  const { can } = useAuth();

  const { projectId } = useParams();
  const pid = useMemo(() => toNumberId(projectId), [projectId]);

  const [tab, setTab] = useState(0);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // WORK LOGS
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [openWorkModal, setOpenWorkModal] = useState(false);
  const [editWork, setEditWork] = useState<WorkLog | null>(null);

  // ACTS
  const [acts, setActs] = useState<DeliveryAct[]>([]);
  const nav = useNavigate();

  const canUseProject = !!pid;

  // PERMISSIONS
  const canRead = can('delivery:read');
  const canWrite = can('delivery:write');
  const canApprove = can('delivery:approve'); // видалення/керівні дії

  const refreshWorkLogs = async () => {
    if (!pid) return;
    if (!canRead) return;

    setErr(null);
    setLoading(true);
    try {
      const data = await getWorkLogs(pid as unknown as WorkId);
      setWorkLogs(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setErr((e as { message?: string })?.message ?? 'Помилка завантаження робіт');
    } finally {
      setLoading(false);
    }
  };

  const refreshActs = async () => {
    if (!pid) return;
    if (!canRead) return;

    setErr(null);
    setLoading(true);
    try {
      const data = await getActs(pid as unknown as ActId);
      setActs(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setErr((e as { message?: string })?.message ?? 'Помилка завантаження актів');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!pid) return;
    if (!canRead) return;

    refreshWorkLogs();
    refreshActs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid, canRead]);

  // =========================================================
  // WORK LOGS CRUD
  // =========================================================

  type CreateWorkLogFormDto = Omit<CreateWorkLogDto, 'projectId'>;

  const onCreateWork = async (dto: CreateWorkLogFormDto) => {
    if (!pid) return;
    if (!canWrite) return;

    setErr(null);
    setLoading(true);
    try {
      const payload: CreateWorkLogDto = {
        ...(dto as any),
        projectId: pid as any,
      };

      await createWorkLog(pid as unknown as WorkId, payload as any);

      await refreshWorkLogs();
      setOpenWorkModal(false);
      setEditWork(null);
    } catch (e: unknown) {
      setErr((e as { message?: string })?.message ?? 'Помилка створення роботи');
    } finally {
      setLoading(false);
    }
  };

  const onUpdateWork = async (id: WorkId, dto: UpdateWorkLogDto) => {
    if (!canWrite) return;

    setErr(null);
    setLoading(true);
    try {
      await updateWorkLog(id, dto);
      await refreshWorkLogs();
      setOpenWorkModal(false);
      setEditWork(null);
    } catch (e: unknown) {
      setErr((e as { message?: string })?.message ?? 'Помилка оновлення роботи');
    } finally {
      setLoading(false);
    }
  };

  const onDeleteWork = async (id: WorkId) => {
    if (!canApprove) return;

    if (!confirm('Видалити роботу?')) return;
    setErr(null);
    setLoading(true);
    try {
      await deleteWorkLog(id);
      await refreshWorkLogs();
    } catch (e: unknown) {
      setErr((e as { message?: string })?.message ?? 'Помилка видалення роботи');
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // ACTS CRUD
  // =========================================================

  const onCreateAct = async () => {
    if (!pid) return;
    if (!canWrite) return;

    setErr(null);
    setLoading(true);
    try {
      const created = await createAct(pid as unknown as ActId, {
        // safe defaults; editor will handle details
        date: new Date().toISOString().slice(0, 10),
        comment: '',
        items: [],
      } as any);

      await refreshActs();
      if (created?.id) nav(`/delivery/acts/${created.id}`);
    } catch (e: unknown) {
      setErr((e as { message?: string })?.message ?? 'Помилка створення акту');
    } finally {
      setLoading(false);
    }
  };

  const onDeleteAct = async (id: ActId) => {
    if (!canApprove) return;

    if (!confirm('Видалити акт?')) return;
    setErr(null);
    setLoading(true);
    try {
      await deleteAct(id);
      await refreshActs();
    } catch (e: unknown) {
      setErr((e as { message?: string })?.message ?? 'Помилка видалення акту');
    } finally {
      setLoading(false);
    }
  };

  const canRefresh = !loading && canUseProject && canRead;

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6">Delivery / Проєкт #{projectId ?? ''}</Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="outlined"
            onClick={() => {
              if (!canRead) return;
              if (tab === 0) refreshWorkLogs();
              if (tab === 1) refreshActs();
            }}
            disabled={!canRefresh}
          >
            Оновити
          </Button>

          {loading && <CircularProgress size={22} />}
        </Stack>
      </Stack>

      {!canUseProject && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Невірний projectId у URL. Очікую число (наприклад: <b>/delivery/1</b>).
        </Alert>
      )}

      {canUseProject && !canRead && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Немає доступу до модуля Delivery (потрібен дозвіл <b>delivery:read</b>).
        </Alert>
      )}

      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Роботи" {...a11yProps(0)} />
        <Tab label="Акти" {...a11yProps(1)} />
        <Tab label="Аналітика" {...a11yProps(2)} />
      </Tabs>

      {/* TAB 0: WORK LOGS */}
      {tab === 0 && (
        <Box>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button
              variant="contained"
              onClick={() => {
                setEditWork(null);
                setOpenWorkModal(true);
              }}
              disabled={loading || !canUseProject || !canWrite || !canRead}
            >
              Додати роботу
            </Button>

            <Button
              variant="outlined"
              onClick={refreshWorkLogs}
              disabled={!canRefresh}
            >
              Оновити
            </Button>
          </Stack>

          {!canWrite && canRead && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Ви можете переглядати роботи, але не можете створювати/редагувати (потрібен <b>delivery:write</b>).
            </Alert>
          )}

          <WorkLogsTable
            items={workLogs}
            onEdit={(item) => {
              if (!canWrite) return;
              setEditWork(item);
              setOpenWorkModal(true);
            }}
            onDelete={(id) => onDeleteWork(id)}
          />

          <WorkLogModal
            open={openWorkModal}
            editItem={editWork}
            onClose={() => {
              setOpenWorkModal(false);
              setEditWork(null);
            }}
            onCreate={onCreateWork}
            onUpdate={onUpdateWork}
          />
        </Box>
      )}

      {/* TAB 1: ACTS */}
      {tab === 1 && (
        <Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Акти
              </Typography>
              <Chip size="small" label={`${acts.length}`} />
            </Stack>

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Tooltip title={canWrite ? 'Створити акт' : 'Потрібен дозвіл delivery:write'}>
                <span>
                  <Button
                    variant="contained"
                    onClick={onCreateAct}
                    disabled={loading || !canUseProject || !canWrite || !canRead}
                    startIcon={<AddIcon />}
                  >
                    Створити акт
                  </Button>
                </span>
              </Tooltip>

              <Tooltip title="Оновити список">
                <span>
                  <Button
                    variant="outlined"
                    onClick={refreshActs}
                    disabled={!canRefresh}
                    startIcon={<RefreshIcon />}
                  >
                    Оновити
                  </Button>
                </span>
              </Tooltip>
            </Stack>
          </Stack>

          {!canWrite && canRead && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Ви можете переглядати акти, але не можете створювати/редагувати (потрібен <b>delivery:write</b>).
            </Alert>
          )}

          <ActsTable
            items={acts}
            onOpen={(a) => {
              if (!canRead) return;
              nav(`/delivery/acts/${a.id}`);
            }}
            onDelete={(id) => onDeleteAct(id)}
            canEdit={canRead}
            canDelete={canApprove}
          />
        </Box>
      )}

      {/* TAB 2: ANALYTICS */}
      {tab === 2 && (
        <Alert severity="info">
          Аналітика: наступний крок — агрегувати WorkLogs та Acts по періодах/етапах.
        </Alert>
      )}
    </Box>
  );
}
