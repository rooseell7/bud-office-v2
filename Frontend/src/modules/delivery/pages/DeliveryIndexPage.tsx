import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Card,
  CardContent,
  Stack,
  Divider,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LaunchIcon from '@mui/icons-material/Launch';
import NumbersIcon from '@mui/icons-material/Numbers';

type DeliveryProjectLite = {
  id: number;
  name: string;
  clientName?: string;
  address?: string;
};

export default function DeliveryIndexPage() {
  const navigate = useNavigate();

  // Швидкий перехід по ID
  const [projectId, setProjectId] = useState('');
  const [hint, setHint] = useState<string>('Потрібно ввести числовий ID проєкту (наприклад 1).');

  // Список проєктів (тимчасово). Потім підключимо реальний API.
  const projects: DeliveryProjectLite[] = useMemo(
    () => [
      { id: 1, name: 'Проєкт #1', clientName: 'Клієнт', address: '—' },
      { id: 2, name: 'Проєкт #2', clientName: 'Клієнт', address: '—' },
    ],
    [],
  );

  // Пошук по списку
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return projects;
    return projects.filter((p) => {
      return (
        String(p.id).includes(s) ||
        p.name.toLowerCase().includes(s) ||
        (p.clientName || '').toLowerCase().includes(s) ||
        (p.address || '').toLowerCase().includes(s)
      );
    });
  }, [q, projects]);

  const openById = (id: number) => {
    navigate(`/delivery/${id}`);
  };

  const handleOpen = () => {
    const raw = projectId.trim();
    const id = Number(raw);

    if (!raw || Number.isNaN(id) || !Number.isFinite(id) || id <= 0 || !Number.isInteger(id)) {
      setHint('Введи коректний числовий ID (ціле число, > 0).');
      return;
    }

    setHint(''); // чистимо підказку
    openById(id);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>
        Delivery
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>
        Відкривай проєкт і веди: Роботи / Акти / Аналітика.
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Швидкий перехід за ID
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="stretch">
            <TextField
              label="Project ID"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleOpen();
              }}
              placeholder="Напр. 1"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <NumbersIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              onClick={handleOpen}
              startIcon={<LaunchIcon />}
              sx={{ minWidth: 160 }}
            >
              Відкрити
            </Button>
          </Stack>

          <Box sx={{ mt: 1.5 }}>
            {hint ? (
              <Alert severity="info">{hint}</Alert>
            ) : (
              <Alert severity="success">Переходимо в проєкт…</Alert>
            )}
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Проєкти (тимчасово)
          </Typography>

          <TextField
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Пошук: ID / назва / клієнт / адреса…"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <Divider sx={{ my: 2 }} />

          {filtered.length === 0 ? (
            <Alert severity="warning">Нічого не знайдено.</Alert>
          ) : (
            <Stack spacing={1.25}>
              {filtered.map((p) => (
                <Card key={p.id} variant="outlined">
                  <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                      justifyContent="space-between"
                    >
                      <Box>
                        <Typography variant="subtitle1" sx={{ lineHeight: 1.2 }}>
                          {p.name}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.75 }}>
                          ID: {p.id}
                          {p.clientName ? ` • ${p.clientName}` : ''}
                          {p.address ? ` • ${p.address}` : ''}
                        </Typography>
                      </Box>

                      <Button
                        variant="outlined"
                        onClick={() => openById(p.id)}
                        startIcon={<LaunchIcon />}
                        sx={{ whiteSpace: 'nowrap' }}
                      >
                        Відкрити
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}

          <Box sx={{ mt: 2 }}>
            <Alert severity="info">
              Далі підключимо реальний список проєктів з бекенду (Projects API) і приберемо “тимчасово”.
            </Alert>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
