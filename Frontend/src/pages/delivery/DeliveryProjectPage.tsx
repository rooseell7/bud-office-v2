import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';

import {
  getWorkLogs,
  createWorkLog,
  setWorkStatus,
  getActs,
  createAct,
  getAnalytics,
  type WorkLog,
  type Act,
  type DeliveryAnalytics,
} from './api';

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function DeliveryProjectPage() {
  const { projectId: projectIdRaw } = useParams();
  const projectId = Number(projectIdRaw);

  const [tab, setTab] = useState(0);

  const [works, setWorks] = useState<WorkLog[]>([]);
  const [acts, setActs] = useState<Act[]>([]);
  const [analytics, setAnalytics] = useState<DeliveryAnalytics | null>(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // dialog: create work
  const [openWork, setOpenWork] = useState(false);
  const [wName, setWName] = useState('');
  const [wQty, setWQty] = useState<number>(1);
  const [wUnit, setWUnit] = useState<string>('м2');
  const [wPrice, setWPrice] = useState<number>(0);
  const [wDone, setWDone] = useState(false);

  // selection for act
  const [selectedWorkIds, setSelectedWorkIds] = useState<number[]>([]);
  const selectedWorks = useMemo(
    () => works.filter((w) => selectedWorkIds.includes(w.id)),
    [works, selectedWorkIds],
  );

  // dialog: create act
  const [openAct, setOpenAct] = useState(false);
  const [aNumber, setANumber] = useState('Акт-1');
  const [aDate, setADate] = useState(todayISO());

  const worksSum = useMemo(
    () => works.reduce((s, w) => s + Number(w.amount || 0), 0),
    [works],
  );
  const actsSum = useMemo(
    () => acts.reduce((s, a) => s + Number(a.totalAmount || 0), 0),
    [acts],
  );

  async function refreshAll() {
    if (!projectId || !Number.isFinite(projectId)) return;

    setLoading(true);
    setErr(null);
    try {
      const [w, a, an] = await Promise.all([
        getWorkLogs(projectId),
        getActs(projectId),
        getAnalytics(projectId),
      ]);
      setWorks(w);
      setActs(a);
      setAnalytics(an);
      // якщо якісь роботи зникли — чистимо selection
      setSelectedWorkIds((prev) => prev.filter((id) => w.some((x) => x.id === id)));
    } catch (e: any) {
      setErr(e?.message || 'Internal server error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function onCreateWork() {
    if (!wName.trim()) {
      setErr('Вкажи назву роботи');
      return;
    }

    setLoading(true);
    setErr(null);
    try {
      await createWorkLog({
        projectId,
        name: wName.trim(),
        qty: Number(wQty),
        unit: wUnit.trim() ? wUnit.trim() : undefined,
        price: Number(wPrice),
        status: wDone ? 'done' : 'draft',
      });

      setOpenWork(false);
      setWName('');
      setWQty(1);
      setWUnit('м2');
      setWPrice(0);
      setWDone(false);

      await refreshAll();
    } catch (e: any) {
      setErr(e?.message || 'Internal server error');
    } finally {
      setLoading(false);
    }
  }

  async function toggleDone(work: WorkLog) {
    setLoading(true);
    setErr(null);
    try {
      await setWorkStatus(work.id, work.status === 'done' ? 'draft' : 'done');
      await refreshAll();
    } catch (e: any) {
      setErr(e?.message || 'Internal server error');
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(id: number) {
    setSelectedWorkIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function openCreateAct() {
    if (selectedWorks.length === 0) {
      setErr('Вибери роботи, з яких створити акт');
      return;
    }
    setOpenAct(true);
    setANumber(`Акт-${acts.length + 1}`);
    setADate(todayISO());
  }

  async function onCreateAct() {
    if (!aNumber.trim()) {
      setErr('Вкажи номер акту');
      return;
    }
    if (!aDate.trim()) {
      setErr('Вкажи дату акту');
      return;
    }
    if (selectedWorks.length === 0) {
      setErr('Немає вибраних робіт для акту');
      return;
    }

    setLoading(true);
    setErr(null);
    try {
      await createAct({
        projectId,
        number: aNumber.trim(),
        date: aDate.trim(),
        items: selectedWorks.map((w) => ({
          name: w.name,
          qty: Number(w.qty),
          unit: w.unit ?? undefined,
          price: Number(w.price),
        })),
      });

      setOpenAct(false);
      setSelectedWorkIds([]);

      await refreshAll();
    } catch (e: any) {
      setErr(e?.message || 'Internal server error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Реалізація по проєкту #{projectId}</Typography>
        <Stack direction="row" gap={1}>
          <Button variant="outlined" disabled={loading} onClick={refreshAll}>
            Оновити
          </Button>
        </Stack>
      </Stack>

      {err && (
        <Box mb={2}>
          <Alert severity="error">{err}</Alert>
        </Box>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label="Роботи" />
        <Tab label="Акти" />
        <Tab label="Аналітика" />
      </Tabs>

      <Divider sx={{ mt: 1 }} />

      {/* Роботи */}
      {tab === 0 && (
        <Box mt={2}>
          <Stack direction="row" gap={1} mb={2} flexWrap="wrap">
            <Button variant="contained" disabled={loading} onClick={() => setOpenWork(true)}>
              Додати роботу
            </Button>
            <Button
              variant="outlined"
              disabled={loading || selectedWorks.length === 0}
              onClick={openCreateAct}
            >
              Створити акт з вибраних ({selectedWorks.length})
            </Button>
            <Typography variant="body2" sx={{ alignSelf: 'center' }}>
              Сума робіт: {worksSum.toFixed(2)}
            </Typography>
          </Stack>

          <Box sx={{ border: '1px solid #2a2a2a', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '44px 1fr 120px 120px 120px 110px', p: 1, fontWeight: 600 }}>
              <span></span>
              <span>Робота</span>
              <span>К-сть</span>
              <span>Ціна</span>
              <span>Сума</span>
              <span>Статус</span>
            </Box>
            <Divider />
            {works.length === 0 ? (
              <Box p={2}>
                <Typography variant="body2">Поки немає робіт</Typography>
              </Box>
            ) : (
              works.map((w) => (
                <Box
                  key={w.id}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '44px 1fr 120px 120px 120px 110px',
                    p: 1,
                    alignItems: 'center',
                    borderTop: '1px solid #1f1f1f',
                  }}
                >
                  <Checkbox
                    checked={selectedWorkIds.includes(w.id)}
                    onChange={() => toggleSelect(w.id)}
                  />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {w.name}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                      #{w.id} • {new Date(w.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography variant="body2">
                    {Number(w.qty).toFixed(3)} {w.unit ?? ''}
                  </Typography>
                  <Typography variant="body2">{Number(w.price).toFixed(2)}</Typography>
                  <Typography variant="body2">{Number(w.amount).toFixed(2)}</Typography>
                  <Button
                    size="small"
                    variant={w.status === 'done' ? 'contained' : 'outlined'}
                    disabled={loading}
                    onClick={() => toggleDone(w)}
                  >
                    {w.status === 'done' ? 'Готово' : 'Чернетка'}
                  </Button>
                </Box>
              ))
            )}
          </Box>

          {/* Dialog: Work */}
          <Dialog open={openWork} onClose={() => setOpenWork(false)} fullWidth maxWidth="sm">
            <DialogTitle>Додати роботу</DialogTitle>
            <DialogContent>
              <Stack gap={2} mt={1}>
                <TextField
                  label="Назва роботи"
                  value={wName}
                  onChange={(e) => setWName(e.target.value)}
                  fullWidth
                />
                <Stack direction="row" gap={2}>
                  <TextField
                    label="Кількість"
                    type="number"
                    value={wQty}
                    onChange={(e) => setWQty(Number(e.target.value))}
                    fullWidth
                  />
                  <TextField
                    label="Одиниця"
                    value={wUnit}
                    onChange={(e) => setWUnit(e.target.value)}
                    fullWidth
                  />
                </Stack>
                <TextField
                  label="Ціна"
                  type="number"
                  value={wPrice}
                  onChange={(e) => setWPrice(Number(e.target.value))}
                  fullWidth
                />
                <FormControlLabel
                  control={<Checkbox checked={wDone} onChange={(e) => setWDone(e.target.checked)} />}
                  label="Одразу позначити як “Готово”"
                />
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Сума: {(Number(wQty) * Number(wPrice)).toFixed(2)}
                </Typography>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenWork(false)} disabled={loading}>
                Скасувати
              </Button>
              <Button onClick={onCreateWork} variant="contained" disabled={loading}>
                Зберегти
              </Button>
            </DialogActions>
          </Dialog>

          {/* Dialog: Act */}
          <Dialog open={openAct} onClose={() => setOpenAct(false)} fullWidth maxWidth="sm">
            <DialogTitle>Створити акт з вибраних робіт</DialogTitle>
            <DialogContent>
              <Stack gap={2} mt={1}>
                <TextField
                  label="Номер акту"
                  value={aNumber}
                  onChange={(e) => setANumber(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Дата"
                  type="date"
                  value={aDate}
                  onChange={(e) => setADate(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <Divider />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Позиції в акті: {selectedWorks.length}
                </Typography>
                <Box sx={{ maxHeight: 240, overflow: 'auto', border: '1px solid #2a2a2a', borderRadius: 2, p: 1 }}>
                  {selectedWorks.map((w) => (
                    <Box key={w.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography variant="body2">{w.name}</Typography>
                      <Typography variant="body2">
                        {Number(w.qty).toFixed(3)} {w.unit ?? ''} × {Number(w.price).toFixed(2)} ={' '}
                        {Number(w.amount).toFixed(2)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Разом: {selectedWorks.reduce((s, w) => s + Number(w.amount || 0), 0).toFixed(2)}
                </Typography>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenAct(false)} disabled={loading}>
                Скасувати
              </Button>
              <Button onClick={onCreateAct} variant="contained" disabled={loading}>
                Створити акт
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}

      {/* Акти */}
      {tab === 1 && (
        <Box mt={2}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Сума актів: {actsSum.toFixed(2)}
          </Typography>

          {acts.length === 0 ? (
            <Typography variant="body2">Поки немає актів</Typography>
          ) : (
            <Stack gap={2}>
              {acts.map((a) => (
                <Box key={a.id} sx={{ border: '1px solid #2a2a2a', borderRadius: 2, p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                      {a.number} • {a.date}
                    </Typography>
                    <Typography variant="h6">{Number(a.totalAmount).toFixed(2)}</Typography>
                  </Stack>
                  <Divider sx={{ my: 1 }} />
                  {a.items?.length ? (
                    <Stack gap={0.5}>
                      {a.items.map((it) => (
                        <Box key={it.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">{it.name}</Typography>
                          <Typography variant="body2">
                            {Number(it.qty).toFixed(3)} {it.unit ?? ''} × {Number(it.price).toFixed(2)} ={' '}
                            {Number(it.amount).toFixed(2)}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2">Немає позицій</Typography>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      )}

      {/* Аналітика */}
      {tab === 2 && (
        <Box mt={2}>
          <Stack gap={1}>
            <Typography variant="body2">
              Сума виконаних робіт: <b>{analytics ? Number(analytics.worksSum).toFixed(2) : worksSum.toFixed(2)}</b>
            </Typography>
            <Typography variant="body2">
              Сума актів: <b>{analytics ? Number(analytics.actsSum).toFixed(2) : actsSum.toFixed(2)}</b>
            </Typography>
            <Typography variant="body2">
              Різниця (не закрито актами):{' '}
              <b>
                {analytics ? Number(analytics.diff).toFixed(2) : (worksSum - actsSum).toFixed(2)}
              </b>
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Робіт: {analytics?.worksCount ?? works.length} • Актів: {analytics?.actsCount ?? acts.length}
            </Typography>
          </Stack>
        </Box>
      )}
    </Box>
  );
}