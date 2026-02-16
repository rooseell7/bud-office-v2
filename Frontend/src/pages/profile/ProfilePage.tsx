import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Snackbar,
  Chip,
  IconButton,
  InputAdornment,
  Switch,
  FormControlLabel,
  Grid,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../../modules/auth/AuthContext';
import { updateMyProfile, changeMyPassword } from '../../api/client';
import { BRAND } from '../../shared/theme/budModernTheme';

const BIO_MAX = 500;
const LS_COMPACT = 'profile.pref.compactMode';
const LS_HINTS = 'profile.pref.showHints';

function formatUpdatedAt(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function getInitials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (name || '?').slice(0, 2).toUpperCase();
}

export const ProfilePage: React.FC = () => {
  const theme = useTheme();
  const isWide = useMediaQuery(theme.breakpoints.up(1200));
  const { user, refreshMe, logout } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [profileLoading, setProfileLoading] = useState(false);

  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);

  const [compactMode, setCompactMode] = useState(
    () => localStorage.getItem(LS_COMPACT) === '1',
  );
  const [showHints, setShowHints] = useState(
    () => localStorage.getItem(LS_HINTS) === '1',
  );

  const [toast, setToast] = useState<string | null>(null);

  const initialName = user?.fullName ?? '';
  const initialBio = user?.bio ?? '';
  const profileDirty = useMemo(
    () =>
      fullName.trim() !== initialName ||
      (bio.trim() || '') !== (initialBio || ''),
    [fullName, bio, initialName, initialBio],
  );

  useEffect(() => {
    setFullName(user?.fullName ?? '');
    setBio(user?.bio ?? '');
  }, [user?.fullName, user?.bio]);

  const roleCodes = useMemo(
    () =>
      Array.isArray(user?.roles)
        ? (user.roles as any[])
            .map((r) => (typeof r === 'string' ? r : r?.code ?? r))
            .filter(Boolean)
        : [],
    [user?.roles],
  );

  const pwValid = useMemo(() => {
    const cur = pwCurrent.trim();
    const newP = pwNew.trim();
    const conf = pwConfirm.trim();
    return cur.length > 0 && newP.length >= 8 && newP === conf;
  }, [pwCurrent, pwNew, pwConfirm]);

  const pwConfirmError = useMemo(() => {
    if (!pwConfirm.trim()) return null;
    if (pwNew.trim() !== pwConfirm.trim()) return 'Паролі не співпадають';
    return null;
  }, [pwNew, pwConfirm]);

  const handleSaveProfile = useCallback(async () => {
    const name = fullName.trim();
    if (name.length < 2) {
      setToast("Ім'я має бути щонайменше 2 символи");
      return;
    }
    if (bio.length > BIO_MAX) {
      setToast(`Про себе — максимум ${BIO_MAX} символів`);
      return;
    }
    try {
      setProfileLoading(true);
      await updateMyProfile({
        fullName: name,
        bio: bio.trim() || null,
      });
      await refreshMe();
      setToast('Профіль оновлено');
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ?? e?.message ?? 'Помилка збереження';
      setToast(msg);
    } finally {
      setProfileLoading(false);
    }
  }, [fullName, bio, refreshMe]);

  const handleChangePassword = useCallback(async () => {
    setPwError(null);
    const newPw = pwNew.trim();
    const confirm = pwConfirm.trim();
    if (newPw.length < 8) {
      setPwError('Новий пароль має бути щонайменше 8 символів');
      return;
    }
    if (newPw !== confirm) {
      setPwError('Новий пароль і підтвердження не співпадають');
      return;
    }
    try {
      setPwLoading(true);
      await changeMyPassword({
        currentPassword: pwCurrent,
        newPassword: newPw,
      });
      setPwCurrent('');
      setPwNew('');
      setPwConfirm('');
      setPwError(null);
      setToast('Пароль змінено');
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Невірний поточний пароль';
      setPwError(msg);
    } finally {
      setPwLoading(false);
    }
  }, [pwCurrent, pwNew, pwConfirm]);

  const copyEmail = useCallback(() => {
    if (user?.email) {
      navigator.clipboard.writeText(user.email);
      setToast('Email скопійовано');
    }
  }, [user?.email]);

  const copyUserId = useCallback(() => {
    if (user?.id != null) {
      navigator.clipboard.writeText(String(user.id));
      setToast('User ID скопійовано');
    }
  }, [user?.id]);

  const handleCompactChange = useCallback((_e: any, v: boolean) => {
    setCompactMode(v);
    localStorage.setItem(LS_COMPACT, v ? '1' : '0');
  }, []);

  const handleHintsChange = useCallback((_e: any, v: boolean) => {
    setShowHints(v);
    localStorage.setItem(LS_HINTS, v ? '1' : '0');
  }, []);

  if (!user) return null;

  const cardSx = {
    mb: 1.5,
    '& .MuiCardContent-root': { p: 2, '&:last-child': { pb: 2 } },
  };

  const sectionTitleSx = {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'text.secondary',
    mb: 1,
    mt: 0,
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.5,
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Профіль
        </Typography>
      </Box>

      {/* Швидкі дії */}
      <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, flexWrap: 'wrap' }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ContentCopyIcon fontSize="small" />}
          onClick={copyEmail}
        >
          Скопіювати email
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ContentCopyIcon fontSize="small" />}
          onClick={copyUserId}
        >
          Скопіювати User ID
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon fontSize="small" />}
          onClick={logout}
        >
          Вийти
        </Button>
      </Box>

      {/* Статус сесії */}
      <Box
        sx={{
          fontSize: '0.8rem',
          color: 'text.secondary',
          mb: 1.5,
          py: 0.5,
        }}
      >
        Ви авторизовані як: {user.email} · Роль: {roleCodes.join(', ') || '—'}
        {user.updatedAt && (
          <> · Оновлено: {formatUpdatedAt(user.updatedAt)}</>
        )}
      </Box>

      <Grid container spacing={1.5} sx={{ maxWidth: 1400 }}>
        {/* Ліва колонка */}
        <Grid item xs={12} md={isWide ? 6 : 12}>
          <Card sx={cardSx}>
            <CardContent>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    bgcolor: BRAND.primary,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1rem',
                    flexShrink: 0,
                  }}
                >
                  {getInitials(fullName || user.fullName)}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={sectionTitleSx}>Основні дані</Typography>
                  <TextField
                    label="Email"
                    value={user.email}
                    disabled
                    fullWidth
                    size="small"
                    sx={{ mb: 1 }}
                  />
                  <TextField
                    label="Ім'я"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="Мінімум 2 символи"
                    sx={{ mb: 1 }}
                  />
                  <Box sx={{ mb: 0 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mb: 0.25 }}
                    >
                      Роль / Ролі
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 0.25,
                        flexWrap: 'wrap',
                        alignItems: 'center',
                      }}
                    >
                      {roleCodes.length > 0 ? (
                        roleCodes.map((code) => (
                          <Chip
                            key={code}
                            label={code}
                            size="small"
                            variant="outlined"
                          />
                        ))
                      ) : (
                        '—'
                      )}
                    </Box>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={cardSx}>
            <CardContent>
              <Typography sx={sectionTitleSx}>Безпека</Typography>
              <TextField
                label="Поточний пароль"
                type={showPwCurrent ? 'text' : 'password'}
                value={pwCurrent}
                onChange={(e) => setPwCurrent(e.target.value)}
                fullWidth
                size="small"
                sx={{ mb: 1 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPwCurrent((v) => !v)}
                        edge="end"
                      >
                        {showPwCurrent ? (
                          <VisibilityOffIcon fontSize="small" />
                        ) : (
                          <VisibilityIcon fontSize="small" />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Новий пароль"
                type={showPwNew ? 'text' : 'password'}
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                fullWidth
                size="small"
                placeholder="Мінімум 8 символів"
                error={pwNew.length > 0 && pwNew.length < 8}
                helperText={
                  pwNew.length > 0 && pwNew.length < 8
                    ? 'Мінімум 8 символів'
                    : undefined
                }
                sx={{ mb: 1 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPwNew((v) => !v)}
                        edge="end"
                      >
                        {showPwNew ? (
                          <VisibilityOffIcon fontSize="small" />
                        ) : (
                          <VisibilityIcon fontSize="small" />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Підтвердження нового паролю"
                type={showPwConfirm ? 'text' : 'password'}
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                fullWidth
                size="small"
                error={Boolean(pwConfirmError)}
                helperText={pwError ?? pwConfirmError ?? undefined}
                sx={{ mb: 1 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPwConfirm((v) => !v)}
                        edge="end"
                      >
                        {showPwConfirm ? (
                          <VisibilityOffIcon fontSize="small" />
                        ) : (
                          <VisibilityIcon fontSize="small" />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Мінімум 8 символів
              </Typography>
              <Button
                variant="contained"
                onClick={handleChangePassword}
                disabled={pwLoading || !pwValid}
              >
                {pwLoading ? 'Зміна…' : 'Змінити пароль'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Права колонка */}
        <Grid item xs={12} md={isWide ? 6 : 12}>
          <Card sx={cardSx}>
            <CardContent>
              <Typography sx={sectionTitleSx}>Про себе</Typography>
              <TextField
                label="Про себе"
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                fullWidth
                multiline
                rows={3}
                size="small"
                placeholder="Нотатка про себе (0–500 символів)"
                helperText={`${bio.length}/${BIO_MAX}`}
                sx={{ mb: 1 }}
              />
            </CardContent>
          </Card>

          <Card sx={cardSx}>
            <CardContent>
              <Typography sx={sectionTitleSx}>Налаштування</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={compactMode}
                    onChange={handleCompactChange}
                    size="small"
                  />
                }
                label="Компактний режим таблиць"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showHints}
                    onChange={handleHintsChange}
                    size="small"
                  />
                }
                label="Показувати підказки"
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Button
        variant="contained"
        onClick={handleSaveProfile}
        disabled={profileLoading || !profileDirty}
        sx={{ mt: 1 }}
      >
        {profileLoading ? 'Збереження…' : 'Зберегти профіль'}
      </Button>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};
