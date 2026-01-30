import { createTheme } from '@mui/material/styles';

/**
 * BUD Office brand palette (derived from Buduy corporate identity).
 * Primary: deep green, Accent: lime.
 */
export const BRAND = {
  primary: '#0b2923',
  accent: '#cdd629',
  surface: '#ffffff',
  text: '#0f172a',
} as const;

export const muiTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: BRAND.primary },
    secondary: { main: BRAND.accent },
    background: { default: '#f6f7f9', paper: BRAND.surface },
    text: { primary: BRAND.text },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 700,
        },
      },
    },
  },
});
