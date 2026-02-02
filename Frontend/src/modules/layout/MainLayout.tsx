import React, { useEffect } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { DEBUG_NAV } from '../../shared/config/env';

import {
  AppBar,
  Box,
  Toolbar,
  Button,
  IconButton,
  Drawer,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
} from '@mui/material';

import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import EngineeringOutlinedIcon from '@mui/icons-material/EngineeringOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined';
import SettingsIcon from '@mui/icons-material/Settings';
import { BRAND } from '../../theme/muiTheme';

const drawerWidth = 260;

const MainLayout: React.FC = () => {
  const loc = useLocation();
  const navigate = useNavigate();
  const { user, logout, can } = useAuth();
  useEffect(() => {
    if (!DEBUG_NAV) return;
    console.log('[RR][layout] init, DEBUG_NAV=on');
    return undefined;
  }, []);
  useEffect(() => {
    if (!DEBUG_NAV) return;
    console.log('[RR][layout] location:', {
      pathname: loc.pathname,
      search: loc.search,
      hash: loc.hash,
      key: (loc as any).key,
      state: (loc as any).state,
    });
  }, [loc.pathname, loc.search, loc.hash, (loc as any).key]);

  const navGroups = [
    {
      title: 'Відділ кошторису',
      items: [
        { to: '/estimate/objects', label: "Об'єкти", icon: <WorkOutlineOutlinedIcon /> },
        { to: '/estimate/acts', label: 'Акти виконаних робіт', icon: <DescriptionOutlinedIcon /> },
        { to: '/estimate', label: 'Комерційні пропозиції', icon: <RequestQuoteOutlinedIcon /> },
      ],
    },
    {
      title: 'Відділ реалізації',
      items: [{ to: '/realization', label: 'Заглушка', icon: <ConstructionOutlinedIcon /> }],
    },
    {
      title: 'Відділ постачання',
      items: [
        { to: '/supply/invoices', label: 'Накладні', icon: <ReceiptLongOutlinedIcon /> },
        { to: '/supply/warehouses', label: 'Склади', icon: <Inventory2OutlinedIcon /> },
        { to: '/supply/materials', label: 'Матеріали', icon: <CategoryOutlinedIcon /> },
      ],
    },
    {
      title: 'Відділ продажів',
      items: [
        { to: '/sales/clients', label: 'Клієнти', icon: <PeopleAltOutlinedIcon /> },
        { to: '/sales/objects', label: "Об'єкти", icon: <WorkOutlineOutlinedIcon /> },
        { to: '/sales/deals', label: 'Угоди', icon: <FactCheckOutlinedIcon /> },
        { to: '/sales/quotes', label: 'Комерційні пропозиції', icon: <RequestQuoteOutlinedIcon /> },
      ],
    },
    {
      title: 'Кабінет виконроба',
      items: [{ to: '/foreman', label: 'Заглушка', icon: <EngineeringOutlinedIcon /> }],
    },
    {
      title: 'Відділ фінансів',
      items: [{ to: '/finance', label: 'Заглушка', icon: <AccountBalanceOutlinedIcon /> }],
    },
    {
      title: 'Аналітика (для власників)',
      items: [{ to: '/analytics', label: 'Заглушка', icon: <InsightsOutlinedIcon /> }],
    },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        className="boHeader"
        sx={{
          zIndex: 2147483647,
          isolation: 'isolate',
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <Box
            component="a"
            href="/home"
            className="boBrand"
            aria-label="BUD Office — на головну"
            onClick={(e) => {
              e.preventDefault();
              if (/^\/estimate\/\d+$/.test(loc.pathname)) {
                window.location.href = '/home';
              } else {
                navigate('/home', { state: undefined });
              }
            }}
            sx={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
          >
            <span className="boBrandLogo">BUD Office</span>
          </Box>

          <Box sx={{ flex: 1 }} />

          {user && (
            <Link
              to="/profile"
              style={{
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                transition: 'color var(--anim-fast)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.textDecoration = 'none';
              }}
              aria-label="Перейти до профілю"
            >
              {user.fullName}
            </Link>
          )}
          {can('users:read') && (
            <IconButton
              component={Link}
              to="/admin/users"
              size="small"
              sx={{
                color: 'var(--text-primary)',
                borderRadius: '10px',
                transition: 'all 120ms ease-out',
                '&:hover': {
                  color: BRAND.accent,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                },
              }}
              aria-label="Меню адміна"
            >
              <SettingsIcon />
            </IconButton>
          )}
          <Button
            onClick={logout}
            variant="outlined"
            size="small"
            sx={{
              borderColor: 'var(--divider)',
              color: 'var(--text-primary)',
              borderRadius: '10px',
              transition: 'all 120ms ease-out',
              '&:hover': {
                borderColor: BRAND.accent,
                color: BRAND.accent,
                backgroundColor: BRAND.accentGlow,
              },
            }}
          >
            Вийти
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{ width: drawerWidth, flexShrink: 0 }}
        PaperProps={{
          className: 'boSidebar',
          sx: {
            width: drawerWidth,
            boxSizing: 'border-box',
            overflow: 'hidden',
            position: 'relative',
            zIndex: 2147483646,
            isolation: 'isolate',
          },
        }}
      >
        <Toolbar />
        <Box
          sx={{
            height: '100%',
            px: 1,
            py: 1,
            overflow: 'auto',
          }}
        >
          {navGroups.map((group, idx) => (
            <Box key={group.title} sx={{ mt: idx === 0 ? 0 : undefined }}>
              <Box component="div" className="boNavSection" sx={{ px: 2, py: 0.5 }}>
                {group.title}
              </Box>

              {group.items.map((item) => (
                <ListItemButton
                  key={item.to}
                  component={NavLink}
                  to={item.to}
                  className={({ isActive }) => `boNavItem ${isActive ? 'isActive' : ''}`}
                  onClick={(e) => {
                    if (/^\/estimate\/\d+$/.test(loc.pathname)) {
                      e.preventDefault();
                      window.location.href = item.to;
                    }
                  }}
                  sx={{
                    borderRadius: 2,
                    mx: 1,
                    my: 0.5,
                    py: 1,
                    '& .MuiListItemIcon-root': { minWidth: 40 },
                    '& .MuiListItemText-primary': { fontWeight: 500, fontSize: '0.875rem' },
                  }}
                >
                  <ListItemIcon className="boNavIcon">{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              ))}
            </Box>
          ))}

          <Divider sx={{ my: 1.5, borderColor: 'var(--divider)' }} />

          <Box
            component="span"
            sx={{
              px: 2,
              color: 'var(--text-secondary)',
              fontSize: '0.7rem',
              display: 'block',
            }}
          >
            BUD Office v2.1 — структура меню затверджена
          </Box>
        </Box>
      </Drawer>

      <Box
        component="main"
        className="boMain"
        sx={{
          flex: 1,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 0,
        }}
      >
        <Toolbar />
        {DEBUG_NAV && (
          <Typography variant="caption" sx={{ px: 2, color: 'text.disabled', fontFamily: 'monospace' }}>
            route: {loc.pathname}
          </Typography>
        )}
        <Box sx={{ flex: 1 }}>
          <Box className="boContentPanel">
            <Outlet key={loc.pathname} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;
