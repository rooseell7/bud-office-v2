import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Snackbar,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../../modules/auth/AuthContext';
import { getObjects } from '../../api/objects';
import {
  getEstimatesByProject,
  getRecentEstimates,
  createEstimate,
  deleteEstimate,
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
  const { can, roles, user } = useAuth();
  const rolesNormalized = (roles ?? []).map((r) => String(r).toLowerCase());
  const isAdmin = rolesNormalized.includes('admin') || rolesNormalized.includes('superadmin');
  const canDeleteKp =
    isAdmin ||
    can('estimates:delete') ||
    can('admin:access') ||
    can('users:write');

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
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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
      navigate(`/estimate/${id}`, { state: { from: '/estimate' } });
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Не вдалося створити КП');
    } finally {
      setCreating(false);
    }
  }, [selectedProjectId, navigate]);

  const handleDeleteClick = useCallback((id: number) => {
    setDeleteConfirmId(id);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    const id = deleteConfirmId;
    if (id == null) return;
    setDeleting(true);
    setDeleteConfirmId(null);
    try {
      await deleteEstimate(id);
      setProjectEstimates((prev) => prev.filter((e) => e.id !== id));
      setRecentEstimates((prev) => prev.filter((e) => e.id !== id));
      setToast('КП видалено');
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message;
      if (status === 403) setToast('Недостатньо прав');
      else if (status === 404) {
        setToast('КП не знайдено (фантом)');
        setProjectEstimates((prev) => prev.filter((e) => e.id !== id));
        setRecentEstimates((prev) => prev.filter((e) => e.id !== id));
        if (selectedProjectId != null) {
          getEstimatesByProject(selectedProjectId).then(setProjectEstimates);
        }
        getRecentEstimates(10).then(setRecentEstimates);
      } else setToast(msg || 'Помилка сервера');
    } finally {
      setDeleting(false);
    }
  }, [deleteConfirmId, selectedProjectId]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmId(null);
  }, []);

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
              <Box sx={{ listStyle: 'none', m: 0, p: 0 }}>
                {projectEstimates.map((e) => (
                  <Box
                    key={e.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 0.75,
                      px: 0,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': { borderBottom: 'none' },
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap sx={{ lineHeight: 1.3 }}>
                        {e.title || `КП №${e.id}`}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ lineHeight: 1.25, display: 'block' }}
                      >
                        {[
                          e.projectName && `Об'єкт: ${e.projectName}`,
                          e.createdByName && `Автор: ${e.createdByName}`,
                          formatDate(e.updatedAt),
                        ]
                          .filter(Boolean)
                          .join(' • ')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, ml: 1, flexShrink: 0 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => navigate(`/estimate/${e.id}?mode=read`, { state: { from: '/estimate' } })}
                      >
                        Відкрити
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => navigate(`/estimate/${e.id}`, { state: { from: '/estimate' } })}
                      >
                        Редагувати
                      </Button>
                      {canDeleteKp && (
                        <Tooltip title="Видалити КП">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(e.id)}
                            disabled={deleting}
                            sx={{ color: 'error.main' }}
                            aria-label="Видалити КП"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
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
              <Box sx={{ listStyle: 'none', m: 0, p: 0 }}>
                {recentEstimates.map((e) => (
                  <Box
                    key={e.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 0.75,
                      px: 0,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': { borderBottom: 'none' },
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap sx={{ lineHeight: 1.3 }}>
                        {e.title || `КП №${e.id}`}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ lineHeight: 1.25, display: 'block' }}
                      >
                        {[
                          e.projectName && `Об'єкт: ${e.projectName}`,
                          e.createdByName && `Автор: ${e.createdByName}`,
                          formatDate(e.updatedAt),
                        ]
                          .filter(Boolean)
                          .join(' • ')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, ml: 1, flexShrink: 0 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => navigate(`/estimate/${e.id}?mode=read`, { state: { from: '/estimate' } })}
                      >
                        Відкрити
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => navigate(`/estimate/${e.id}`, { state: { from: '/estimate' } })}
                      >
                        Редагувати
                      </Button>
                      {canDeleteKp && (
                        <Tooltip title="Видалити КП">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(e.id)}
                            disabled={deleting}
                            sx={{ color: 'error.main' }}
                            aria-label="Видалити КП"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      <Dialog open={deleteConfirmId != null} onClose={handleDeleteCancel}>
        <DialogTitle>Видалити КП?</DialogTitle>
        <DialogContent>
          <DialogContentText>Цю дію не можна скасувати.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Скасувати</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={deleting}>
            Видалити
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
      />
    </Box>
  );
};
