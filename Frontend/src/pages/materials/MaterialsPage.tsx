import React, { useEffect, useMemo, useState } from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';

import { getAxiosErrorMessage } from '../../shared/httpError';
import { createMaterial, getMaterials, type MaterialDto } from '../../api/materials';

import { parseNumber } from '../../modules/shared/sheet/utils';

export const MaterialsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<MaterialDto[]>([]);
  const [q, setQ] = useState('');

  const [openCreate, setOpenCreate] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMaterials();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(getAxiosErrorMessage(e, 'Помилка завантаження матеріалів.'));
    } finally {
      setLoading(false);
    }
  };

  const onCreate = async () => {
    const n = name.trim();
    if (!n) {
      setError('Введіть назву матеріалу.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const w = weightKg.trim();
      const wNum = w ? parseNumber(w, NaN) : undefined;
      if (wNum !== undefined && !Number.isFinite(wNum)) {
        setError('Некоректна вага.');
        setSaving(false);
        return;
      }

      const created = await createMaterial({
        name: n,
        unit: unit.trim() || undefined,
        weightKg: wNum,
      });
      setRows((prev) => [created, ...prev]);
      setOpenCreate(false);
      setName('');
      setUnit('');
      setWeightKg('');
    } catch (e: any) {
      setError(getAxiosErrorMessage(e, 'Не вдалося створити матеріал.'));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => `${r.name} ${r.unit ?? ''}`.toLowerCase().includes(s));
  }, [rows, q]);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Матеріали
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Постачання • довідник матеріалів
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button variant="outlined" onClick={load} disabled={loading}>
            Оновити
          </Button>
          <Button variant="contained" onClick={() => setOpenCreate(true)}>
            Додати матеріал
          </Button>
        </Box>
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
            <TextField
              size="small"
              label="Пошук"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              sx={{ minWidth: 260 }}
            />
            <Box sx={{ flex: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Рядків: {filtered.length}
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
                    <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e0e0e0' }}>Назва</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e0e0e0', width: 120 }}>Од.</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e0e0e0', width: 140 }}>Вага, кг</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e0e0e0', width: 120 }}>Активний</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td style={{ padding: '10px 8px', borderBottom: '1px solid #f0f0f0' }}>{r.name}</td>
                      <td style={{ padding: '10px 8px', borderBottom: '1px solid #f0f0f0' }}>{r.unit ?? '—'}</td>
                      <td style={{ padding: '10px 8px', borderBottom: '1px solid #f0f0f0' }}>{r.weightKg == null ? '—' : String(r.weightKg)}</td>
                      <td style={{ padding: '10px 8px', borderBottom: '1px solid #f0f0f0' }}>
                        {r.isActive == null ? '—' : r.isActive ? 'Так' : 'Ні'}
                      </td>
                    </tr>
                  ))}
                  {!filtered.length && (
                    <tr>
                      <td colSpan={4} style={{ padding: '14px 8px', color: '#777' }}>
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

      <Dialog open={openCreate} onClose={() => (saving ? null : setOpenCreate(false))} maxWidth="sm" fullWidth>
        <DialogTitle>Додати матеріал</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Назва *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              disabled={saving}
            />
            <TextField
              label="Одиниця (опц.)"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              disabled={saving}
            />
            <TextField
              label="Вага, кг (опц.)"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              disabled={saving}
              placeholder="Напр. 25"
              inputProps={{ inputMode: 'decimal' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)} disabled={saving}>
            Скасувати
          </Button>
          <Button variant="contained" onClick={onCreate} disabled={saving}>
            {saving ? 'Збереження…' : 'Створити'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MaterialsPage;