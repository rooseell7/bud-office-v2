import { createTheme } from '@mui/material/styles';

/**
 * Theme v3 — Dark industrial + green accent
 * BUD Office brand palette.
 */
export const BRAND = {
  primary: '#0b0f0d',
  accent: '#7ac854',
  accentDark: '#5fa93e',
  accentGlow: 'rgba(122,200,84,0.25)',
  surface: 'rgba(18,20,19,0.95)',
  text: '#e6e6e6',
  textSecondary: 'rgba(230,230,230,0.65)',
  divider: 'rgba(255,255,255,0.06)',
  sidebar: 'rgba(10,12,11,0.78)',
  header: 'rgba(12,14,13,0.82)',
} as const;

export const muiTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: BRAND.accent },
    secondary: { main: BRAND.accentDark },
    background: {
      default: BRAND.primary,
      paper: BRAND.surface,
    },
    text: {
      primary: BRAND.text,
      secondary: BRAND.textSecondary,
    },
  },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    h1: { fontFamily: '"Oswald", sans-serif', fontWeight: 700 },
    h2: { fontFamily: '"Oswald", sans-serif', fontWeight: 700 },
    h3: { fontFamily: '"Oswald", sans-serif', fontWeight: 700 },
    h4: { fontFamily: '"Oswald", sans-serif', fontWeight: 700 },
    h5: { fontFamily: '"Oswald", sans-serif', fontWeight: 700 },
    h6: { fontFamily: '"Oswald", sans-serif', fontWeight: 700 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          transition: 'all 120ms ease-out',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 120ms ease-out',
        },
      },
    },
  },
});
