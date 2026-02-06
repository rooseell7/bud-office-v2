import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import api from '../../api/api';
import { createObject, getForemanCandidates, type CreateObjectPayload, type ForemanCandidate } from '../../api/objects';
import { useAuth } from '../auth/AuthContext';

const TYPE_OPTIONS = [
  { value: 'apartment', label: 'Квартира' },
  { value: 'house', label: 'Будинок' },
  { value: 'commercial', label: 'Комерція' },
  { value: 'other', label: 'Інше' },
];

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Планується' },
  { value: 'in_progress', label: 'В роботі' },
  { value: 'paused', label: 'Пауза' },
  { value: 'done', label: 'Завершено' },
];

interface ClientOption {
  id: number;
  name: string;
}

export default function ObjectCreatePage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const canCreate = can('objects:create');

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState<string>('apartment');
  const [status, setStatus] = useState<string>('planned');
  const [clientId, setClientId] = useState<number | ''>('');
  const [foremanId, setForemanId] = useState<number | ''>('');

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [foremanCandidates, setForemanCandidates] = useState<ForemanCandidate[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<ClientOption[]>('/clients').then((r) => (Array.isArray(r.data) ? r.data : [])),
      getForemanCandidates().catch(() => []),
    ])
      .then(([c, f]) => {
        setClients(c);
        setForemanCandidates(f);
      })
      .finally(() => setLoadingOptions(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!canCreate) {
      setError('Немає прав на створення обʼєкта. Тільки відділ продажів може додавати обʼєкти.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload: CreateObjectPayload = {
        name: name.trim(),
        address: address.trim() || undefined,
        type: type || undefined,
        status: status || undefined,
        clientId: clientId === '' ? undefined : Number(clientId),
        foremanId: foremanId === '' ? undefined : Number(foremanId),
      };
      const created = await createObject(payload);
      navigate(`/sales/objects/${created.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Помилка створення обʼєкта');
    } finally {
      setLoading(false);
    }
  };

  if (!canCreate) {
    return (
      <Box sx={{ p: 2 }}>
        <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/sales/objects')} sx={{ mb: 1 }}>
          Назад
        </Button>
        <Typography color="error">
          Створювати нові обʼєкти може тільки відділ продажів. У вас немає відповідних прав.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/sales/objects')} sx={{ mb: 1 }}>
        Назад
      </Button>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Додати обʼєкт
      </Typography>

      {loadingOptions ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Card sx={{ maxWidth: 520 }}>
          <CardContent>
            <form onSubmit={handleSubmit}>
              {error && (
                <Typography color="error" sx={{ mb: 1.5 }}>
                  {error}
                </Typography>
              )}
              <TextField
                fullWidth
                required
                label="Назва обʼєкта"
                value={name}
                onChange={(e) => setName(e.target.value)}
                sx={{ mb: 1.5 }}
              />
              <TextField
                fullWidth
                label="Адреса"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                sx={{ mb: 1.5 }}
              />
              <FormControl fullWidth sx={{ mb: 1.5 }}>
                <InputLabel>Тип</InputLabel>
                <Select label="Тип" value={type} onChange={(e) => setType(e.target.value)}>
                  {TYPE_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ mb: 1.5 }}>
                <InputLabel>Статус</InputLabel>
                <Select label="Статус" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUS_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ mb: 1.5 }}>
                <InputLabel>Клієнт</InputLabel>
                <Select
                  label="Клієнт"
                  value={clientId === '' ? '' : clientId}
                  onChange={(e) => setClientId(e.target.value === '' ? '' : Number(e.target.value))}
                >
                  <MenuItem value="">— не обрано —</MenuItem>
                  {clients.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Виконроб</InputLabel>
                <Select
                  label="Виконроб"
                  value={foremanId === '' ? '' : foremanId}
                  onChange={(e) => setForemanId(e.target.value === '' ? '' : Number(e.target.value))}
                >
                  <MenuItem value="">— не обрано —</MenuItem>
                  {foremanCandidates.map((f) => (
                    <MenuItem key={f.id} value={f.id}>
                      {f.fullName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button type="submit" variant="contained" startIcon={<AddIcon />} disabled={loading || !name.trim()}>
                {loading ? 'Створення…' : 'Додати обʼєкт'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
