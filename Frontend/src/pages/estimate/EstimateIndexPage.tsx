import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { getObjects } from '../../api/objects';
import {
  getEstimatesByProject,
  getRecentEstimates,
  createEstimate,
  type EstimateItem,
  type RecentEstimateItem,
} from '../../api/estimates';

const STORAGE_KEY = 'estimate.selectedProjectId';

function formatDate(s: string | undefined): string {
  if (!s) return '—';
  try {
    const d = new Date(s);
    return d.toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return s;
  }
}

export const EstimateIndexPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(() => {
    const v = localStorage.getItem(STORAGE_KEY);
    const n = v ? parseInt(v, 10) : NaN;
    return Number.isFinite(n) ? n : null;
  });
  const [projectEstimates, setProjectEstimates] = useState<EstimateItem[]>([]);
  const [recentEstimates, setRecentEstimates] = useState<RecentEstimateItem[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingProjectList, setLoadingProjectList] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getObjects()
      .then((rows) => {
        setProjects(
          rows.map((r: any) => ({
            id: r.id,
            name: r.name || `Об'єкт #${r.id}`,
          })),
        );
      })
      .catch(() => setProjects([]))
      .finally(() => setLoadingProjects(false));
  }, []);

  useEffect(() => {
    setLoadingRecent(true);
    getRecentEstimates(10)
      .then(setRecentEstimates)
      .catch(() => setRecentEstimates([]))
      .finally(() => setLoadingRecent(false));
  }, []);

  useEffect(() => {
    if (selectedProjectId == null) {
      setProjectEstimates([]);
      return;
    }
    if (selectedProjectId != null) {
      localStorage.setItem(STORAGE_KEY, String(selectedProjectId));
    }
    setLoadingProjectList(true);
    getEstimatesByProject(selectedProjectId)
      .then(setProjectEstimates)
      .catch(() => setProjectEstimates([]))
      .finally(() => setLoadingProjectList(false));
  }, [selectedProjectId]);

  const handleCreate = useCallback(async () => {
    if (selectedProjectId == null) return;
    setCreating(true);
    setError(null);
    try {
      const { id } = await createEstimate({ projectId: selectedProjectId });
      navigate(`/estimate/${id}`);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Не вдалося створити КП');
    } finally {
      setCreating(false);
    }
  }, [selectedProjectId, navigate]);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
        Комерційні пропозиції
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 220 }} size="small">
              <InputLabel>Об'єкт</InputLabel>
              <Select
                value={selectedProjectId ?? ''}
                label="Об'єкт"
                onChange={(e) =>
                  setSelectedProjectId(
                    e.target.value === '' ? null : Number(e.target.value),
                  )
                }
                disabled={loadingProjects}
              >
                <MenuItem value="">Не вибрано</MenuItem>
                {projects.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreate}
              disabled={selectedProjectId == null || creating}
            >
              {creating ? 'Створення…' : 'Створити КП'}
            </Button>
            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              КП об'єкту
            </Typography>
            {selectedProjectId == null ? (
              <Typography color="text.secondary" variant="body2">
                Оберіть об'єкт
              </Typography>
            ) : loadingProjectList ? (
              <Skeleton variant="rectangular" height={120} />
            ) : projectEstimates.length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                Немає КП для цього об'єкту
              </Typography>
            ) : (
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {projectEstimates.map((e) => (
                  <Box
                    component="li"
                    key={e.id}
                    sx={{
                      py: 0.5,
                      cursor: 'pointer',
                      '&:hover': { color: 'primary.main' },
                    }}
                    onClick={() => navigate(`/estimate/${e.id}`)}
                  >
                    {e.title} — {formatDate(e.updatedAt)}
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Останні редаговані КП
            </Typography>
            {loadingRecent ? (
              <Skeleton variant="rectangular" height={120} />
            ) : recentEstimates.length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                Немає КП
              </Typography>
            ) : (
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {recentEstimates.map((e) => (
                  <Box
                    component="li"
                    key={e.id}
                    sx={{
                      py: 0.5,
                      cursor: 'pointer',
                      '&:hover': { color: 'primary.main' },
                    }}
                    onClick={() => navigate(`/estimate/${e.id}`)}
                  >
                    {e.title}
                    {e.projectName && ` (${e.projectName})`} —{' '}
                    {formatDate(e.updatedAt)}
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};
