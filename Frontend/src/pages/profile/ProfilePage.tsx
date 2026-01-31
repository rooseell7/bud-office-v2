import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Snackbar,
  Chip,
} from '@mui/material';
import { useAuth } from '../../modules/auth/AuthContext';
import { updateMyProfile, changeMyPassword } from '../../api/client';

const BIO_MAX = 500;

export const ProfilePage: React.FC = () => {
  const { user, refreshMe } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');

  useEffect(() => {
    setFullName(user?.fullName ?? '');
    setBio(user?.bio ?? '');
  }, [user?.fullName, user?.bio]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const roleCodes = Array.isArray(user?.roles)
    ? (user.roles as any[]).map((r) => (typeof r === 'string' ? r : r?.code ?? r)).filter(Boolean)
    : [];

  const handleSaveProfile = useCallback(async () => {
    const name = fullName.trim();
    if (name.length < 2) {
      setToast('Ім\'я має бути щонайменше 2 символи');
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
      const msg = e?.response?.data?.message ?? e?.message ?? 'Помилка збереження';
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

  if (!user) return null;

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
        Профіль
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
            Основні дані
          </Typography>
          <TextField
            label="Email"
            value={user.email}
            disabled
            fullWidth
            size="small"
            sx={{ mb: 2 }}
          />
          <TextField
            label="Ім'я"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            fullWidth
            size="small"
            placeholder="Мінімум 2 символи"
            sx={{ mb: 2 }}
          />
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Роль / Ролі
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {roleCodes.length > 0
                ? roleCodes.map((code) => (
                    <Chip key={code} label={code} size="small" variant="outlined" />
                  ))
                : '—'}
            </Box>
          </Box>
          <Button
            variant="contained"
            onClick={handleSaveProfile}
            disabled={profileLoading}
          >
            {profileLoading ? 'Збереження…' : 'Зберегти'}
          </Button>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
            Про себе
          </Typography>
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
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            onClick={handleSaveProfile}
            disabled={profileLoading}
          >
            {profileLoading ? 'Збереження…' : 'Зберегти'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
            Зміна паролю
          </Typography>
          <TextField
            label="Поточний пароль"
            type="password"
            value={pwCurrent}
            onChange={(e) => setPwCurrent(e.target.value)}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
          />
          <TextField
            label="Новий пароль"
            type="password"
            value={pwNew}
            onChange={(e) => setPwNew(e.target.value)}
            fullWidth
            size="small"
            placeholder="Мінімум 8 символів"
            sx={{ mb: 2 }}
          />
          <TextField
            label="Підтвердження нового паролю"
            type="password"
            value={pwConfirm}
            onChange={(e) => setPwConfirm(e.target.value)}
            fullWidth
            size="small"
            error={Boolean(pwError)}
            helperText={pwError}
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            onClick={handleChangePassword}
            disabled={pwLoading}
          >
            {pwLoading ? 'Зміна…' : 'Змінити пароль'}
          </Button>
        </CardContent>
      </Card>

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
