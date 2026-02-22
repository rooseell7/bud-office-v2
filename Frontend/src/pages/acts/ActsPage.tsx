import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  TextField,
  Typography,
} from '@mui/material';

import { getAxiosErrorMessage } from '../../shared/httpError';
import {
  createAct,
  createActFromQuote,
  deleteAct,
  getActs,
  updateAct,
  type ActDto,
  type CreateActDto,
} from '../../api/acts';
import { getObjects, type ObjectDto } from '../../api/objects';
import { listDocuments, type DocumentDto } from '../../api/documents';
import { useAuth } from '../../modules/auth/context/AuthContext';
import { useRealtime } from '../../realtime/RealtimeContext';
import { buildDraftKey } from '../../shared/drafts/draftsApi';
import { useDraft } from '../../shared/drafts/useDraft';
import { n } from '../../modules/shared/sheet/utils';

function fmtDate(value?: string | null): string {
  if (!value) return '—';
  // backend returns YYYY-MM-DD
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('uk-UA');
}

function safeJsonParse(value: string): { ok: true; data: any } | { ok: false; error: string } {
  const s = (value ?? '').trim();
  if (!s) return { ok: true, data: [] };
  try {
    const parsed = JSON.parse(s);
    return { ok: true, data: parsed };
  } catch (e: unknown) {
    return { ok: false, error: (e as { message?: string })?.message ?? 'Невалідний JSON' };
  }
}

function calcActSum(items: unknown): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((acc, it) => {
    if (it && typeof it === 'object') {
      const anyIt: any = it as any;
      const amount = Number.isFinite(Number(anyIt.amount)) ? Number(anyIt.amount) : n(anyIt.qty) * n(anyIt.price);
      return acc + (Number.isFinite(amount) ? amount : 0);
    }
    return acc;
  }, 0);
}

function statusChip(status?: string | null) {
  const s = (status ?? 'draft').trim() || 'draft';
  const map: Record<string, { label: string; color: 'default' | 'success' | 'warning' | 'info' | 'error' } > = {
    draft: { label: 'draft', color: 'default' },
    submitted: { label: 'submitted', color: 'info' },
    approved: { label: 'approved', color: 'success' },
    exported: { label: 'exported', color: 'warning' },
  };
  const v = map[s] ?? { label: s, color: 'default' };
  return <Chip size="small" label={v.label} color={v.color} variant={v.color === 'default' ? 'outlined' : 'filled'} />;
}

type EditState =
  | { open: false }
  | {
      open: true;
      mode: 'create' | 'edit';
      id?: number;
      projectId: string;
      foremanId: string;
      quoteId: string;
      actDate: string;
      status: string;
      itemsJson: string;
    };

export const ActsPage: React.FC = () => {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const { can, user } = useAuth();

  const canRead = can('delivery:read');
  const canWrite = can('delivery:write');
  const canApprove = can('delivery:approve');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const [rows, setRows] = useState<ActDto[]>([]);
  const [objects, setObjects] = useState<ObjectDto[]>([]);
  const [quoteDocs, setQuoteDocs] = useState<DocumentDto[]>([]);
  const [q, setQ] = useState('');
  const [filterProject, setFilterProject] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [edit, setEdit] = useState<EditState>({ open: false });
  const realtime = useRealtime();

  const draftKey = useMemo(() => {
    if (!edit.open) return '';
    const pid = Number(edit.projectId);
    return buildDraftKey({
      entityType: 'act',
      mode: edit.mode,
      projectId: Number.isFinite(pid) && pid > 0 ? pid : 0,
      entityId: edit.mode === 'edit' && edit.id != null ? String(edit.id) : null,
    });
  }, [edit.open, edit.open ? edit.projectId : undefined, edit.open ? edit.mode : undefined, edit.open ? edit.id : undefined]);

  const {
    hasDraft,
    loading: draftLoading,
    saveDraftData,
    clearDraftData,
    restoreFromDraft,
  } = useDraft<EditState & { open: true }>({
    key: draftKey,
    enabled: edit.open && !!draftKey,
    projectId: edit.open && Number(edit.projectId) > 0 ? Number(edit.projectId) : undefined,
    entityType: 'act',
    entityId: edit.open && edit.mode === 'edit' && edit.id != null ? String(edit.id) : undefined,
    scopeType: 'project',
  });

  // deep-link підтримка: /delivery/acts?projectId=123
  useEffect(() => {
    const raw = (searchParams.get('projectId') ?? searchParams.get('objectId') ?? '').trim();
    if (!raw) return;
    const pid = Number(raw);
    if (Number.isFinite(pid) && pid > 0) {
      setFilterProject(String(pid));
    }
     
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    getObjects()
      .then((rows) => {
        if (!mounted) return;
        setObjects(rows);
      })
      .catch(() => {
        if (!mounted) return;
        setObjects([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!edit.open || edit.mode !== 'create') {
      setQuoteDocs([]);
      return;
    }
    const pid = Number(edit.projectId);
    if (!Number.isFinite(pid) || pid <= 0) {
      setQuoteDocs([]);
      return;
    }
    listDocuments({ type: 'quote', projectId: pid, limit: 100, offset: 0 })
      .then((rows) => {
        if (!mounted) return;
        setQuoteDocs(rows);
      })
      .catch(() => {
        if (!mounted) return;
        setQuoteDocs([]);
      });
    return () => {
      mounted = false;
    };
  }, [edit.open, edit.open ? edit.mode : undefined, edit.open ? edit.projectId : undefined]);

  const load = async () => {
    if (!canRead) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getActs();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(getAxiosErrorMessage(e, 'Помилка завантаження актів.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead]);

  useEffect(() => {
    if (!edit.open || !draftKey) return;
    const e = edit;
    saveDraftData({ ...e });
  }, [edit.open, draftKey, edit.open ? edit.projectId : undefined, edit.open ? edit.foremanId : undefined, edit.open ? edit.quoteId : undefined, edit.open ? edit.actDate : undefined, edit.open ? edit.status : undefined, edit.open ? edit.itemsJson : undefined, saveDraftData]);

  useEffect(() => {
    if (!realtime) return;
    return realtime.subscribeInvalidateAll(load);
  }, [realtime]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterProject.trim()) {
        const pid = Number(filterProject);
        if (Number.isFinite(pid) && pid > 0) {
          if (Number(r.projectId) !== pid) return false;
        }
      }
      if (filterStatus.trim()) {
        if (String(r.status ?? '').trim() !== filterStatus.trim()) return false;
      }
      if (!s) return true;
      const hay = `${r.id} ${r.projectId} ${r.foremanId} ${r.actDate} ${r.status}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q, filterProject, filterStatus]);

  const totals = useMemo(() => {
    const count = filtered.length;
    const sum = filtered.reduce((acc, r) => acc + calcActSum(r.items), 0);
    return { count, sum };
  }, [filtered]);

  const uniqueStatuses = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const s = String(r.status ?? '').trim();
      if (s) set.add(s);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const openCreate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setDialogError(null);
    setEdit({
      open: true,
      mode: 'create',
      projectId: '',
      foremanId: user?.id ? String(user.id) : '',
      quoteId: '',
      actDate: `${yyyy}-${mm}-${dd}`,
      status: 'draft',
      itemsJson: '[]',
    });
  };

  const openRead = (row: ActDto) => {
    nav(`/delivery/acts/${row.id}?mode=read`, { state: { from: '/estimate/acts' } });
  };

  const openEdit = (row: ActDto) => {
    nav(`/delivery/acts/${row.id}`, { state: { from: '/estimate/acts' } });
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogError(null);
    setEdit({ open: false });
  };

  const submit = async () => {
    if (!edit.open) return;
    if (!canWrite) {
      setDialogError('Немає прав для створення/редагування актів (delivery:write).');
      return;
    }

    const pid = Number(edit.projectId);
    const qid = Number(edit.quoteId);
    if (!Number.isFinite(pid) || pid <= 0) {
      setDialogError('Вкажи коректний projectId (ціле число > 0).');
      return;
    }
    if (!String(edit.actDate ?? '').trim()) {
      setDialogError('Вкажи дату акту (YYYY-MM-DD).');
      return;
    }

    const pj = safeJsonParse(edit.itemsJson);
    if (!pj.ok) {
      setDialogError(`items: ${pj.error}`);
      return;
    }

    const dto: CreateActDto = {
      projectId: pid,
      foremanId: edit.foremanId ? Number(edit.foremanId) : undefined,
      actDate: edit.actDate,
      status: (edit.status ?? 'draft').trim() || 'draft',
      items: pj.data,
    };

    setSaving(true);
    setDialogError(null);
    try {
      if (edit.mode === 'create') {
        const created = Number.isFinite(qid) && qid > 0
          ? await createActFromQuote({ quoteId: qid, projectId: pid, actDate: edit.actDate })
          : await createAct(dto);
        await clearDraftData();
        closeDialog();
        await load();
        if (created?.id) nav(`/delivery/acts/${created.id}`);
      } else {
        await updateAct(Number(edit.id!), dto);
        await clearDraftData();
        closeDialog();
        await load();
      }
    } catch (e: unknown) {
      setDialogError(getAxiosErrorMessage(e, 'Помилка збереження акту.'));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!canApprove) {
      setError('Немає прав для видалення актів (delivery:approve).');
      return;
    }
    // просте підтвердження через native confirm
     
    if (!window.confirm(`Видалити акт #${id}?`)) return;
    setLoading(true);
    setError(null);
    try {
      await deleteAct(id);
      await load();
    } catch (e: unknown) {
      setError(getAxiosErrorMessage(e, 'Помилка видалення акту.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Акти
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Реалізація • Акти виконаних робіт
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button variant="outlined" onClick={load} disabled={loading || !canRead}>
            Оновити
          </Button>
          <Button variant="contained" onClick={openCreate} disabled={!canWrite}>
            Створити акт
          </Button>
        </Box>
      </Box>

      {!canRead && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Немає доступу до актів (потрібно <b>delivery:read</b>).
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
            <TextField
              size="small"
              label="Пошук (id/projectId/foremanId/дата/статус)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              sx={{ minWidth: 360 }}
              disabled={!canRead}
            />
            <TextField
              size="small"
              label="Фільтр: projectId"
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              sx={{ width: 180 }}
              disabled={!canRead}
            />
            <FormControl size="small" sx={{ minWidth: 200 }} disabled={!canRead}>
              <InputLabel id="acts-status-filter-label">Статус</InputLabel>
              <Select
                labelId="acts-status-filter-label"
                value={filterStatus || 'all'}
                label="Статус"
                onChange={(e: SelectChangeEvent) => {
                  const v = String(e.target.value ?? 'all');
                  setFilterStatus(v === 'all' ? '' : v);
                }}
              >
                <MenuItem value="all">Усі</MenuItem>
                {uniqueStatuses.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ flex: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Рядків: {totals.count} • Сума: {totals.sum.toLocaleString('uk-UA', { maximumFractionDigits: 2 })}
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e0e0e0', width: 90 }}>ID</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e0e0e0', width: 160 }}>Дата</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e0e0e0', width: 140 }}>Project</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e0e0e0', width: 140 }}>Foreman</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e0e0e0', width: 160 }}>Статус</th>
                    <th style={{ textAlign: 'right', padding: '10px 8px', borderBottom: '1px solid #e0e0e0', width: 140 }}>Позицій</th>
                    <th style={{ textAlign: 'right', padding: '10px 8px', borderBottom: '1px solid #e0e0e0', width: 160 }}>Сума</th>
                    <th style={{ textAlign: 'right', padding: '10px 8px', borderBottom: '1px solid #e0e0e0', width: 220 }}>Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td style={{ padding: '10px 8px', borderBottom: '1px solid #f0f0f0' }}>#{r.id}</td>
                      <td style={{ padding: '10px 8px', borderBottom: '1px solid #f0f0f0' }}>{fmtDate(r.actDate)}</td>
                      <td style={{ padding: '10px 8px', borderBottom: '1px solid #f0f0f0' }}>{r.projectId}</td>
                      <td style={{ padding: '10px 8px', borderBottom: '1px solid #f0f0f0' }}>{r.foremanId}</td>
                      <td style={{ padding: '10px 8px', borderBottom: '1px solid #f0f0f0' }}>{statusChip(r.status)}</td>
                      <td style={{ padding: '10px 8px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>
                        {Array.isArray(r.items) ? r.items.length : 0}
                      </td>
                      <td style={{ padding: '10px 8px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>
                        {calcActSum(r.items).toLocaleString('uk-UA', { maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '10px 8px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          <Button size="small" variant="outlined" onClick={() => openRead(r)} disabled={!canRead}>
                            Відкрити
                          </Button>
                          <Button size="small" variant="contained" onClick={() => openEdit(r)} disabled={!canRead}>
                            Редагувати
                          </Button>
                          <Button size="small" variant="outlined" color="error" onClick={() => onDelete(r.id)} disabled={!canApprove}>
                            Видалити
                          </Button>
                        </Box>
                      </td>
                    </tr>
                  ))}
                  {!filtered.length && (
                    <tr>
                      <td colSpan={8} style={{ padding: '14px 8px', color: '#777' }}>
                        Немає даних
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={edit.open} onClose={closeDialog} fullWidth maxWidth="md">
        <DialogTitle>{edit.open && edit.mode === 'create' ? 'Створити акт' : 'Редагувати акт'}</DialogTitle>
        <DialogContent>
          {hasDraft && !draftLoading && edit.open ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              Є збережена чернетка.{' '}
              <Button size="small" onClick={() => restoreFromDraft((p) => setEdit({ ...edit, ...p }))}>
                Відновити
              </Button>
              {' / '}
              <Button size="small" onClick={() => clearDraftData()}>
                Скинути
              </Button>
            </Alert>
          ) : null}
          {dialogError && (
            <Alert severity="error" sx={{ mt: 1, mb: 2 }}>
              {dialogError}
            </Alert>
          )}

          {edit.open && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
              <FormControl fullWidth disabled={saving}>
                <InputLabel>Об'єкт</InputLabel>
                <Select
                  label="Об'єкт"
                  value={edit.projectId}
                  onChange={(e) => setEdit({ ...edit, projectId: String(e.target.value ?? '') })}
                >
                  <MenuItem value="">
                    <em>Не вибрано</em>
                  </MenuItem>
                  {objects.map((o) => (
                    <MenuItem key={o.id} value={String(o.id)}>
                      {o.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Виконроб"
                value={user ? `${user.fullName} (#${user.id})` : edit.foremanId}
                onChange={(e) => setEdit({ ...edit, foremanId: e.target.value })}
                fullWidth
                disabled
              />

              <FormControl fullWidth disabled={saving || !edit.projectId}>
                <InputLabel>Кошторис (КП) для об'єкта</InputLabel>
                <Select
                  label="Кошторис (КП) для об'єкта"
                  value={edit.quoteId}
                  onChange={(e) => setEdit({ ...edit, quoteId: String(e.target.value ?? '') })}
                >
                  <MenuItem value="">
                    <em>Не використовувати (порожній акт)</em>
                  </MenuItem>
                  {quoteDocs.map((d) => (
                    <MenuItem key={d.id} value={String(d.id)}>
                      #{d.id} {d.title || 'КП'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Дата (YYYY-MM-DD)"
                value={edit.actDate}
                onChange={(e) => setEdit({ ...edit, actDate: e.target.value })}
                fullWidth
                disabled={saving}
              />
              <TextField
                label="Статус"
                value={edit.status}
                onChange={(e) => setEdit({ ...edit, status: e.target.value })}
                fullWidth
                disabled={saving}
              />
              <Alert severity="info" sx={{ gridColumn: '1 / -1' }}>
                Позиції акту редагуються на детальній сторінці у табличному редакторі (як Google Sheets).
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>Скасувати</Button>
          <Button onClick={submit} disabled={saving || !canWrite} variant="contained">
            Зберегти
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ActsPage;
