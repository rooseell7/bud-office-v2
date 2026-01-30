import { useEffect, useMemo, useState } from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
  Autocomplete,
} from '@mui/material';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import type { Client } from '../../clients/types';
import { getAxiosErrorMessage } from '../../shared/httpError';

import { createClient, deleteClient, fetchClients, updateClient } from './api';
import { getObjects, type ObjectDto } from '../../api/objects';
import { lsGetJson, lsSetJson } from '../../shared/localStorageJson';

const LS_CLIENT_META_KEY = 'buduy.clients.meta.v1';

type ClientMeta = {
  objectId?: number | null;
  requisites?: {
    companyName?: string;
    edrpou?: string;
    iban?: string;
    bankName?: string;
    legalAddress?: string;
  };
};

type ClientMetaMap = Record<string, ClientMeta>;

function loadMeta(): ClientMetaMap {
  return lsGetJson<ClientMetaMap>(LS_CLIENT_META_KEY, {});
}

function saveMeta(meta: ClientMetaMap): void {
  lsSetJson(LS_CLIENT_META_KEY, meta);
}

type EditModel = {
  id?: string; // undefined => create
  name: string;
  phone: string;
  email: string;
  note: string;
  objectId: number | null;
  companyName: string;
  edrpou: string;
  iban: string;
  bankName: string;
  legalAddress: string;
};

function toEditModel(c?: Client, meta?: ClientMeta): EditModel {
  return {
    id: c?.id,
    name: c?.name ?? '',
    phone: c?.phone ?? '',
    email: (c?.email ?? '') as string,
    note: (c?.note ?? '') as string,
    objectId: (meta?.objectId ?? null) as number | null,
    companyName: meta?.requisites?.companyName ?? '',
    edrpou: meta?.requisites?.edrpou ?? '',
    iban: meta?.requisites?.iban ?? '',
    bankName: meta?.requisites?.bankName ?? '',
    legalAddress: meta?.requisites?.legalAddress ?? '',
  };
}

export default function ClientsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [clients, setClients] = useState<Client[]>([]);
  const [objects, setObjects] = useState<ObjectDto[]>([]);
  const [metaMap, setMetaMap] = useState<ClientMetaMap>(() => loadMeta());
  const objectsById = useMemo(() => new Map(objects.map((o) => [Number(o.id), o])), [objects]);

  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [model, setModel] = useState<EditModel>(toEditModel());

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const [c, o] = await Promise.all([fetchClients(), getObjects({ department: 'sales' })]);
      setClients(c);
      setObjects(o);
      setMetaMap(loadMeta());
    } catch (e) {
      setErr(getAxiosErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return clients;
    return clients.filter((c) => {
      const s = `${c.name ?? ''} ${c.phone ?? ''} ${c.email ?? ''}`.toLowerCase();
      return s.includes(needle);
    });
  }, [clients, q]);

  function openCreate() {
    setErr('');
    setModel(toEditModel());
    setOpen(true);
  }

  function openEdit(c: Client) {
    setErr('');
    const meta = metaMap[c.id];
    setModel(toEditModel(c, meta));
    setOpen(true);
  }

  function persistMeta(id: string, m: EditModel) {
    const next: ClientMetaMap = { ...metaMap };
    next[id] = {
      objectId: m.objectId,
      requisites: {
        companyName: m.companyName,
        edrpou: m.edrpou,
        iban: m.iban,
        bankName: m.bankName,
        legalAddress: m.legalAddress,
      },
    };
    setMetaMap(next);
    saveMeta(next);
  }

  async function onSave() {
    if (saving) return;
    if (!model.name.trim()) {
      setErr('Вкажіть назву/ПІБ клієнта.');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      const payload: Partial<Client> = {
        name: model.name.trim(),
        phone: model.phone.trim(),
        email: model.email.trim() ? model.email.trim() : null,
        note: model.note.trim() ? model.note.trim() : null,
      };

      if (model.id) {
        const updated = await updateClient(model.id, payload);
        setClients((prev) => prev.map((c) => (c.id === model.id ? updated : c)));
        persistMeta(model.id, model);
      } else {
        const created = await createClient(payload);
        setClients((prev) => [created, ...prev]);
        persistMeta(created.id, model);
      }

      setOpen(false);
    } catch (e) {
      setErr(getAxiosErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (saving) return;
    if (!model.id) {
      setOpen(false);
      return;
    }
    const ok = window.confirm('Видалити клієнта?');
    if (!ok) return;

    setSaving(true);
    setErr('');
    try {
      await deleteClient(model.id);
      setClients((prev) => prev.filter((c) => c.id !== model.id));
      const next: ClientMetaMap = { ...metaMap };
      delete next[model.id];
      setMetaMap(next);
      saveMeta(next);
      setOpen(false);
    } catch (e) {
      setErr(getAxiosErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box p={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} mb={2}>
        <Box>
          <Typography variant="h6">Клієнти</Typography>
          <Typography variant="body2" color="text.secondary">
            Довідник клієнтів (CRUD) + карточка клієнта
          </Typography>
        </Box>

        <Stack direction="row" gap={1}>
          <Button onClick={load} disabled={loading} variant="outlined">
            Оновити
          </Button>
          <Button onClick={openCreate} variant="contained">
            Додати клієнта
          </Button>
        </Stack>
      </Stack>

      {err ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      ) : null}

      <Card>
        <CardContent>
          <TextField
            size="small"
            fullWidth
            label="Пошук"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Divider sx={{ mb: 2 }} />

          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: 8 }}>Назва</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Телефон</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Email</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Об'єкт</th>
                    <th style={{ textAlign: 'right', padding: 8, width: 64 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const meta = metaMap[c.id];
                    const objName = meta?.objectId ? objectsById.get(Number(meta.objectId))?.name : '';
                    return (
                      <tr key={c.id}>
                        <td style={{ padding: 8 }}>{c.name}</td>
                        <td style={{ padding: 8 }}>{c.phone}</td>
                        <td style={{ padding: 8 }}>{c.email ?? ''}</td>
                        <td style={{ padding: 8 }}>{objName ?? ''}</td>
                        <td style={{ padding: 8, textAlign: 'right' }}>
                          <IconButton size="small" onClick={() => openEdit(c)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 8, color: '#666' }}>
                        Нічого не знайдено
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => (saving ? null : setOpen(false))} fullWidth maxWidth="md">
        <DialogTitle>{model.id ? 'Карточка клієнта' : 'Додати клієнта'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
              <TextField
                fullWidth
                label="Назва / ПІБ"
                value={model.name}
                onChange={(e) => setModel((p) => ({ ...p, name: e.target.value }))}
                autoFocus
              />
              <TextField
                fullWidth
                label="Телефон"
                value={model.phone}
                onChange={(e) => setModel((p) => ({ ...p, phone: e.target.value }))}
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
              <TextField
                fullWidth
                label="Email"
                value={model.email}
                onChange={(e) => setModel((p) => ({ ...p, email: e.target.value }))}
              />
              <Autocomplete
                options={objects}
                getOptionLabel={(o) => o?.name ?? ''}
                isOptionEqualToValue={(o, v) => Number(o.id) === Number(v.id)}
                value={model.objectId ? objectsById.get(Number(model.objectId)) ?? null : null}
                onChange={(_, v) => setModel((p) => ({ ...p, objectId: v ? Number(v.id) : null }))}
                renderInput={(params) => (
                  <TextField {...params} label="Прив'язка до об'єкта" helperText="Локально (зберігається в цьому браузері)" />
                )}
              />
            </Stack>

            <TextField
              label="Нотатка"
              value={model.note}
              onChange={(e) => setModel((p) => ({ ...p, note: e.target.value }))}
              multiline
              minRows={2}
            />

            <Divider />

            <Typography variant="subtitle1">Реквізити</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
              <TextField
                fullWidth
                label="Назва компанії"
                value={model.companyName}
                onChange={(e) => setModel((p) => ({ ...p, companyName: e.target.value }))}
              />
              <TextField
                fullWidth
                label="ЄДРПОУ"
                value={model.edrpou}
                onChange={(e) => setModel((p) => ({ ...p, edrpou: e.target.value }))}
              />
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
              <TextField
                fullWidth
                label="IBAN"
                value={model.iban}
                onChange={(e) => setModel((p) => ({ ...p, iban: e.target.value }))}
              />
              <TextField
                fullWidth
                label="Банк"
                value={model.bankName}
                onChange={(e) => setModel((p) => ({ ...p, bankName: e.target.value }))}
              />
            </Stack>
            <TextField
              label="Юридична адреса"
              value={model.legalAddress}
              onChange={(e) => setModel((p) => ({ ...p, legalAddress: e.target.value }))}
              helperText="Локально (зберігається в цьому браузері)"
            />

            {saving ? (
              <Box display="flex" justifyContent="center" py={1}>
                <CircularProgress size={20} />
              </Box>
            ) : null}
          </Box>
        </DialogContent>
        <DialogActions>
          {model.id ? (
            <Button color="error" onClick={onDelete} disabled={saving} startIcon={<DeleteIcon />}>
              Видалити
            </Button>
          ) : null}
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setOpen(false)} disabled={saving}>
            Скасувати
          </Button>
          <Button onClick={onSave} disabled={saving || !model.name.trim()} variant="contained">
            Зберегти
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
