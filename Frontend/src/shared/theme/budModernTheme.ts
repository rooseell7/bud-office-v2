import { createTheme } from '@mui/material/styles';

/**
 * BUD Office — Premium dark-gray + glass (ref_primary_dashboard.png)
 * Значення узгоджені з bud-modern.tokens.css
 */

const accent = '#7AC854';
const accentDark = '#63B944';
const bgDefault = '#12151B';
const bgBottom = '#0C0F14';
const surface = 'rgba(24, 28, 35, 0.72)';
const surfaceStrong = 'rgba(24, 28, 35, 0.84)';
const line = 'rgba(255, 255, 255, 0.1)';
const shadow1 = '0 10px 26px rgba(0, 0, 0, 0.35)';
const shadow2 = '0 18px 52px rgba(0, 0, 0, 0.5)';

export const BRAND = {
  primary: bgDefault,
  accent,
  accentDark,
  accentGlow: 'rgba(122,200,84,0.2)',
  surface,
  text: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.68)',
  divider: line,
  sidebar: 'rgba(14, 16, 20, 0.72)',
  header: 'rgba(16, 19, 24, 0.78)',
} as const;

export const budModernTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: accent, contrastText: '#0E140E' },
    secondary: { main: accentDark, contrastText: '#0E140E' },
    background: {
      default: bgDefault,
      paper: surface,
    },
    text: {
      primary: 'rgba(255, 255, 255, 0.92)',
      secondary: 'rgba(255, 255, 255, 0.68)',
      disabled: 'rgba(255, 255, 255, 0.5)',
    },
    error: { main: '#e57373' },
    divider: line,
    info: { main: accent },
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial',
    fontSize: 14,
    h1: { fontSize: 28, fontWeight: 700 },
    h2: { fontSize: 18, fontWeight: 600 },
    h3: { fontSize: 16, fontWeight: 600 },
    h4: { fontSize: 15, fontWeight: 600 },
    h5: { fontSize: 14, fontWeight: 600 },
    h6: { fontSize: 14, fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial',
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(16, 19, 24, 0.78)',
          borderBottom: `1px solid ${line}`,
          backdropFilter: 'blur(10px)',
          boxShadow: shadow1,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: 'rgba(14, 16, 20, 0.72)',
          borderRight: `1px solid ${line}`,
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          background: surface,
          border: `1px solid ${line}`,
          boxShadow: shadow1,
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: surface,
          border: `1px solid ${line}`,
          borderRadius: 20,
          boxShadow: shadow1,
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 9999,
          textTransform: 'none',
          fontWeight: 600,
          transition: 'all 140ms ease',
        },
        contained: {
          color: '#0E140E',
          '&:hover': {
            backgroundColor: accentDark,
            boxShadow: '0 4px 14px rgba(122, 200, 84, 0.3)',
          },
        },
        outlined: {
          borderColor: line,
          color: 'rgba(255, 255, 255, 0.92)',
          '&:hover': {
            borderColor: accent,
            color: accent,
            background: 'rgba(122, 200, 84, 0.12)',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: '50%',
          transition: 'all 140ms ease',
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.06)',
            color: accent,
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 9999,
            '& fieldset': { borderColor: line },
            '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.12)' },
            '&.Mui-focused fieldset': { borderColor: accent, borderWidth: 1 },
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 9999,
          '& fieldset': { borderColor: line },
          '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.12)' },
          '&.Mui-focused fieldset': { borderColor: accent, borderWidth: 1 },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          '&.MuiOutlinedInput-root': {
            borderRadius: 9999,
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 9999,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          background: surfaceStrong,
          border: `1px solid ${line}`,
          borderRadius: 16,
          boxShadow: shadow2,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          margin: '2px 8px',
          '&:hover': { background: 'rgba(255, 255, 255, 0.06)' },
          '&.Mui-selected': {
            background: 'rgba(122, 200, 84, 0.16)',
            '&:hover': { background: 'rgba(122, 200, 84, 0.22)' },
          },
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          background: surfaceStrong,
          border: `1px solid ${line}`,
          borderRadius: 16,
          boxShadow: shadow2,
        },
      },
    },
    MuiList: {
      styleOverrides: {
        root: {
          '& .MuiMenuItem-root': { color: 'rgba(255, 255, 255, 0.92)' },
          '& .MuiListItemText-primary': { color: 'rgba(255, 255, 255, 0.92)' },
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          background: surfaceStrong,
          border: `1px solid ${line}`,
          borderRadius: 16,
          '& .MuiAutocomplete-option': { color: 'rgba(255, 255, 255, 0.92)' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 9999,
          fontWeight: 500,
        },
        colorPrimary: {
          background: 'rgba(122, 200, 84, 0.18)',
          color: accent,
          border: '1px solid rgba(122, 200, 84, 0.3)',
        },
        outlined: {
          borderColor: line,
          color: 'rgba(255, 255, 255, 0.92)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${line}`,
          color: 'rgba(255, 255, 255, 0.92)',
        },
        head: {
          background: 'rgba(255, 255, 255, 0.05)',
          fontWeight: 600,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { background: 'rgba(255, 255, 255, 0.04)' },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: accent,
          height: 3,
          borderRadius: '3px 3px 0 0',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          '&.Mui-selected': { color: accent },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: surface,
          border: `1px solid ${line}`,
          borderRadius: 20,
          boxShadow: shadow2,
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: `1px solid ${line}`,
          borderRadius: 20,
          overflow: 'hidden',
          backgroundColor: surface,
          '& .MuiDataGrid-columnHeaders': {
            background: 'rgba(255, 255, 255, 0.05)',
            borderBottom: `1px solid ${line}`,
          },
          '& .MuiDataGrid-cell': {
            borderBottom: `1px solid ${line}`,
            color: 'rgba(255, 255, 255, 0.92)',
          },
          '& .MuiDataGrid-columnHeader': {
            borderRight: `1px solid ${line}`,
          },
          '& .MuiDataGrid-row:hover': {
            background: 'rgba(255, 255, 255, 0.04)',
          },
        },
      },
    },
  },
});
