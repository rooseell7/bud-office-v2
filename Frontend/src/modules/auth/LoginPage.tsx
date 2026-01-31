import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useAuth } from './AuthContext';
import { BRAND } from '../../theme/muiTheme';

const LOGIN = {
  primary: BRAND.primary,
  accent: BRAND.accent,
  cardBg: 'rgba(20,35,32,0.88)',
  inputBg: 'rgba(30,48,44,0.9)',
  text: 'rgba(255,255,255,0.95)',
  muted: 'rgba(255,255,255,0.65)',
  border: 'rgba(255,255,255,0.18)',
  error: '#f87171',
};

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const emailRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      window.location.href = '/home';
    } catch (err) {
      setError('Невірний email або пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      className="loginRoot"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: { xs: 3, sm: 4 },
        px: 2,
        backgroundImage: 'url(/login-bg.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at center, rgba(0,0,0,0.35), rgba(0,0,0,0.70))',
        },
      }}
    >
      <Box
        className="loginCenter"
        sx={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', justifyContent: 'center' }}
      >
        <Card
          component="form"
          onSubmit={handleSubmit}
          className="loginCard"
          sx={{
            width: '100%',
            maxWidth: { xs: '92vw', sm: 420 },
            minWidth: 280,
            p: { xs: 2.5, sm: 3 },
            borderRadius: '16px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
            bgcolor: LOGIN.cardBg,
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Typography
              variant="body2"
              sx={{ mb: 2.5, textAlign: 'center', color: LOGIN.muted, fontSize: '0.875rem' }}
            >
              Вхід до системи
            </Typography>

            {error && (
              <Box
                sx={{
                  mb: 2,
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: 'rgba(248,113,113,0.12)',
                  border: '1px solid rgba(248,113,113,0.4)',
                }}
              >
                <Typography variant="body2" sx={{ color: LOGIN.error }}>
                  {error}
                </Typography>
              </Box>
            )}

            <TextField
              inputRef={emailRef}
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              InputLabelProps={{ sx: { color: LOGIN.muted } }}
              inputProps={{ sx: { color: LOGIN.text } }}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  bgcolor: LOGIN.inputBg,
                  '& fieldset': { borderColor: LOGIN.border },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.28)' },
                  '&.Mui-focused fieldset': {
                    borderColor: `${LOGIN.accent}99`,
                    borderWidth: 1.5,
                    boxShadow: `0 0 0 3px ${LOGIN.accent}40`,
                  },
                },
              }}
            />

            <TextField
              fullWidth
              label="Пароль"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              InputLabelProps={{ sx: { color: LOGIN.muted } }}
              inputProps={{ sx: { color: LOGIN.text } }}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  bgcolor: LOGIN.inputBg,
                  '& fieldset': { borderColor: LOGIN.border },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.28)' },
                  '&.Mui-focused fieldset': {
                    borderColor: `${LOGIN.accent}99`,
                    borderWidth: 1.5,
                    boxShadow: `0 0 0 3px ${LOGIN.accent}40`,
                  },
                },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                py: 1.5,
                bgcolor: LOGIN.primary,
                borderRadius: 1.5,
                fontWeight: 700,
                textTransform: 'none',
                '&:hover': {
                  bgcolor: '#0d342c',
                },
                '&:focus-visible': {
                  boxShadow: `0 0 0 3px ${LOGIN.accent}59`,
                },
                '&:disabled': {
                  opacity: 0.6,
                  cursor: 'not-allowed',
                },
              }}
            >
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <CircularProgress size={20} color="inherit" />
                  Вхід...
                </Box>
              ) : (
                'Увійти'
              )}
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default LoginPage;
