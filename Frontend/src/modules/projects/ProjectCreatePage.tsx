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
import api from '../../api/api';
import { createProject, type CreateProjectBody } from '../../api/projects';
import { getSalesOwners } from '../../api/sales';
import { useAuth } from '../auth/AuthContext';

const SALES_STAGE_OPTIONS = [
  { value: 'lead_new', label: 'Новий' },
  { value: 'contact_made', label: 'Контакт' },
  { value: 'meeting_scheduled', label: 'Зустріч запланована' },
  { value: 'meeting_done', label: 'Зустріч проведена' },
  { value: 'kp_preparing', label: 'КП готується' },
  { value: 'kp_sent', label: 'КП відправлено' },
  { value: 'kp_negotiation', label: 'Узгодження' },
  { value: 'deal_signed', label: 'Угода підписана' },
  { value: 'handoff_to_exec', label: 'Передано в реалізацію' },
  { value: 'paused', label: 'Пауза' },
  { value: 'lost', label: 'Втрачено' },
];

const EXECUTION_STATUS_OPTIONS = [
  { value: 'planned', label: 'Планується' },
  { value: 'active', label: 'Активний' },
  { value: 'paused', label: 'Пауза' },
  { value: 'completed', label: 'Завершено' },
  { value: 'cancelled', label: 'Скасовано' },
];

interface ClientOption {
  id: number;
  name: string;
  phone?: string;
}

export default function ProjectCreatePage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const canCreate = can('sales:write');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [clientId, setClientId] = useState<number | ''>('');
  const [ownerId, setOwnerId] = useState<number | ''>('');
  const [salesStage, setSalesStage] = useState('lead_new');
  const [executionStatus, setExecutionStatus] = useState('planned');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [owners, setOwners] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<ClientOption[]>('/clients').then((r) => Array.isArray(r.data) ? r.data : []),
      getSalesOwners().catch(() => []),
    ])
      .then(([c, o]) => {
        setClients(c);
        setOwners(o);
      })
      .finally(() => setLoadingOptions(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const body: CreateProjectBody = {
        name: name.trim(),
        address: address.trim() || undefined,
        clientId: clientId === '' ? null : Number(clientId),
        ownerId: ownerId === '' ? null : Number(ownerId),
        salesStage,
        executionStatus,
      };
      const { id } = await createProject(body);
      navigate(`/sales/projects/${id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Помилка створення');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/sales/projects')} sx={{ mb: 1 }}>
        Назад
      </Button>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Створити об'єкт
      </Typography>

      {loadingOptions ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Card sx={{ maxWidth: 480 }}>
          <CardContent>
            <form onSubmit={handleSubmit}>
              {error && (
                <Typography color="error" sx={{ mb: 1 }}>
                  {error}
                </Typography>
              )}
              <TextField
                fullWidth
                required
                label="Назва"
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
                      {c.phone ? ` · ${c.phone}` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ mb: 1.5 }}>
                <InputLabel>Відповідальний (продажі)</InputLabel>
                <Select
                  label="Відповідальний (продажі)"
                  value={ownerId === '' ? '' : ownerId}
                  onChange={(e) => setOwnerId(e.target.value === '' ? '' : Number(e.target.value))}
                >
                  <MenuItem value="">— не обрано —</MenuItem>
                  {owners.map((u) => (
                    <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ mb: 1.5 }}>
                <InputLabel>Стадія продажу</InputLabel>
                <Select label="Стадія продажу" value={salesStage} onChange={(e) => setSalesStage(e.target.value)}>
                  {SALES_STAGE_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Стан виконання</InputLabel>
                <Select label="Стан виконання" value={executionStatus} onChange={(e) => setExecutionStatus(e.target.value)}>
                  {EXECUTION_STATUS_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button type="submit" variant="contained" disabled={loading || !name.trim()}>
                {loading ? 'Створення…' : 'Створити'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
