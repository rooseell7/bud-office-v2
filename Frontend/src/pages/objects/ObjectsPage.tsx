import React, { useEffect, useMemo, useState } from 'react';

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
  TextField,
  Typography,
} from '@mui/material';

import { getAxiosErrorMessage } from '../../shared/httpError';
import { getObjects, type ObjectDto } from '../../api/objects';

export type ObjectsMode = 'sales' | 'delivery';

type Props = {
  mode: ObjectsMode;
};

function modeSubtitle(mode: ObjectsMode): string {
  return mode === 'sales'
    ? 'Відділ продажів • обʼєкти (лід/договір/підготовка)'
    : 'Відділ реалізації • обʼєкти в роботі';
}

export const ObjectsPage: React.FC<Props> = ({ mode }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<ObjectDto[]>([]);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'all' | 'active' | 'done'>('all');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getObjects({ department: mode });
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(getAxiosErrorMessage(e, 'Помилка завантаження обʼєктів.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();

    return rows.filter((r) => {
      if (tab === 'active') {
        const st = (r.status ?? '').toLowerCase();
        if (st === 'done' || st === 'archived') return false;
      }
      if (tab === 'done') {
        const st = (r.status ?? '').toLowerCase();
        if (st !== 'done') return false;
      }
      if (!s) return true;
      return `${r.name} ${r.address ?? ''} ${r.clientName ?? ''}`.toLowerCase().includes(s);
    });
  }, [rows, q, tab]);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Об&apos;єкти
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {modeSubtitle(mode)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button variant="outlined" onClick={load} disabled={loading}>
            Оновити
          </Button>
          <Button variant="contained" disabled>
            Додати обʼєкт
          </Button>
        </Box>
      </Box>

      <Card>
        <CardContent>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab value="all" label="Усі" />
            <Tab value="active" label="Активні" />
            <Tab value="done" label="Завершені" />
          </Tabs>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
            <TextField
              size="small"
              label="Пошук (назва/адреса/клієнт)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              sx={{ minWidth: 320 }}
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
                    <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e0e0e0' }}>Адреса</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e0e0e0', width: 220 }}>Клієнт</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e0e0e0', width: 140 }}>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td style={{ padding: '10px 8px', borderBottom: '1px solid #f0f0f0' }}>{r.name}</td>
                      <td style={{ padding: '10px 8px', borderBottom: '1px solid #f0f0f0' }}>{r.address ?? '—'}</td>
                      <td style={{ padding: '10px 8px', borderBottom: '1px solid #f0f0f0' }}>{r.clientName ?? '—'}</td>
                      <td style={{ padding: '10px 8px', borderBottom: '1px solid #f0f0f0' }}>{r.status ?? '—'}</td>
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
    </Box>
  );
};

export default ObjectsPage;