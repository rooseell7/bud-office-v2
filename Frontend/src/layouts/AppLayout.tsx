import React from 'react';
import { Outlet } from 'react-router-dom';

import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

import { useTheme } from '@mui/material/styles';
import Sidebar from './Sidebar';
import { BRAND } from '../shared/theme/budModernTheme';

const DRAWER_WIDTH = 280;

export const AppLayout: React.FC = () => {
  const theme = useTheme();
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));

  const [mobileOpen, setMobileOpen] = React.useState(false);

  const toggleMobile = () => setMobileOpen((v) => !v);

  return (
    <Box sx={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
      {/* Top bar */}
      <AppBar
        position="fixed"
        color="primary"
        elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          bgcolor: BRAND.primary,
          color: '#fff',
          borderBottom: `1px solid ${BRAND.primary}`,
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          {!mdUp && (
            <IconButton edge="start" onClick={toggleMobile} aria-label="menu">
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            BUD Office
          </Typography>

          {/* Тут можна буде додати дії (наприклад профіль/вийти), якщо захочеш */}
          <Box sx={{ flex: 1 }} />
        </Toolbar>
      </AppBar>

      {/* Sidebar (desktop) */}
      {mdUp && (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              borderRightColor: 'divider',
            },
          }}
        >
          <Toolbar />
          <Sidebar />
        </Drawer>
      )}

      {/* Sidebar (mobile) */}
      {!mdUp && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={toggleMobile}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          <Sidebar />
        </Drawer>
      )}

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          bgcolor: 'background.default',
        }}
      >
        {/* відступ під AppBar */}
        <Toolbar />

        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;