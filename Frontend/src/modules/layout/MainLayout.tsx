import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useRealtime } from '../../realtime/RealtimeContext';
import { getPresenceOnline } from '../../api/presence';
import { RealtimeDebugPanel } from '../../realtime/RealtimeDebugPanel';
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
  Tooltip,
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

// Ініціал для аватара: перша буква displayName (або "?")
function getInitial(displayName: string): string {
  const s = displayName?.trim();
  return s ? s.charAt(0).toUpperCase() : '?';
}

// Відображуване ім'я: fullName → частина email до @ → "Користувач"
function getDisplayName(user: { fullName?: string; email?: string } | null): string {
  if (!user) return '';
  if (user.fullName?.trim()) return user.fullName.trim();
  if (user.email?.trim()) return user.email.split('@')[0]?.trim() || 'Користувач';
  return 'Користувач';
}

const MainLayout: React.FC = () => {
  const loc = useLocation();
  const navigate = useNavigate();
  const { user, logout, can, isAuthLoading, roles } = useAuth();
  const realtime = useRealtime();
  const connectionStatus = realtime?.connectionStatus ?? 'offline';
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    if (connectionStatus !== 'connected') {
      setOnlineCount(0);
      return;
    }
    let cancelled = false;
    const fetchOnline = async () => {
      try {
        const list = await getPresenceOnline();
        if (!cancelled) setOnlineCount(list.length);
      } catch {
        if (!cancelled) setOnlineCount(0);
      }
    };
    fetchOnline();
    const t = setInterval(fetchOnline, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [connectionStatus]);
  const displayName = getDisplayName(user);
  const initial = getInitial(displayName);

  // З цих сторінок NavLink іноді не спрацьовує — показуємо звичайні посилання для гарантованого переходу
  const forceFullNav =
    /^\/estimate\/\d+$/.test(loc.pathname) ||
    /^\/delivery\/acts\/\d+$/.test(loc.pathname) ||
    /^\/estimate\/acts\/\d+$/.test(loc.pathname) ||
    /^\/invoices\/[^/]+$/.test(loc.pathname) ||
    /^\/supply\/invoices\/[^/]+$/.test(loc.pathname);

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
      items: [{ to: '/execution/projects', label: "Об'єкти", icon: <ConstructionOutlinedIcon /> }],
    },
    {
      title: 'Відділ постачання',
      items: [
        { to: '/supply/orders', label: 'Замовлення', icon: <ReceiptLongOutlinedIcon /> },
        { to: '/supply/receipts', label: 'Приходи', icon: <Inventory2OutlinedIcon /> },
        { to: '/supply/payables', label: 'До оплати', icon: <AccountBalanceOutlinedIcon /> },
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
      ],
    },
    {
      title: 'Кабінет виконроба',
      items: [
        { to: '/foreman', label: "Мої об'єкти", icon: <EngineeringOutlinedIcon /> },
        { to: '/supply/requests', label: 'Заявки', icon: <WorkOutlineOutlinedIcon /> },
      ],
    },
    {
      title: 'Відділ фінансів',
      items: [{ to: '/finance', label: 'Фінанси', icon: <AccountBalanceOutlinedIcon /> }],
    },
    {
      title: 'Аналітика (для власників)',
      items: [
        { to: '/analytics', label: 'Огляд', icon: <InsightsOutlinedIcon /> },
        { to: '/analytics/projects', label: "Об'єкти", icon: <WorkOutlineOutlinedIcon /> },
        { to: '/analytics/finance', label: 'Фінанси', icon: <AccountBalanceOutlinedIcon /> },
        { to: '/analytics/execution', label: 'Реалізація', icon: <ConstructionOutlinedIcon /> },
      ],
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
              if (/^\/estimate\/\d+$/.test(loc.pathname) || /^\/delivery\/acts\/\d+$/.test(loc.pathname) || /^\/estimate\/acts\/\d+$/.test(loc.pathname) || /^\/invoices\/[^/]+$/.test(loc.pathname) || /^\/supply\/invoices\/[^/]+$/.test(loc.pathname)) {
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

          {realtime && (
            <Tooltip
              title={
                connectionStatus === 'connected'
                  ? 'Синхронізація онлайн'
                  : connectionStatus === 'reconnecting'
                    ? 'Повторне підключення…'
                    : 'Офлайн'
              }
              placement="bottom"
            >
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  backgroundColor:
                    connectionStatus === 'connected'
                      ? 'rgba(76, 175, 80, 0.15)'
                      : connectionStatus === 'reconnecting'
                        ? 'rgba(255, 193, 7, 0.2)'
                        : 'rgba(0,0,0,0.06)',
                  color:
                    connectionStatus === 'connected'
                      ? '#4caf50'
                      : connectionStatus === 'reconnecting'
                        ? '#ffc107'
                        : 'var(--text-secondary)',
                }}
              >
                <Box
                  component="span"
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor:
                      connectionStatus === 'connected'
                        ? '#4caf50'
                        : connectionStatus === 'reconnecting'
                          ? '#ffc107'
                          : 'var(--text-secondary)',
                    animation: connectionStatus === 'reconnecting' ? 'pulse 1.5s ease-in-out infinite' : 'none',
                    '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
                  }}
                />
                {connectionStatus === 'connected' && 'Online'}
                {connectionStatus === 'reconnecting' && 'Reconnecting…'}
                {connectionStatus === 'offline' && 'Offline'}
                {onlineCount > 0 && connectionStatus === 'connected' && ` · ${onlineCount} онлайн`}
              </Box>
            </Tooltip>
          )}

          {isAuthLoading && (
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                backgroundColor: 'var(--divider)',
                opacity: 0.6,
              }}
              aria-hidden
            />
          )}
          {!isAuthLoading && user && (
            <Tooltip
              title={
                <Box component="span" sx={{ display: 'block', fontSize: '0.8rem' }}>
                  <strong>{displayName}</strong>
                  {user.email && (
                    <>
                      <br />
                      {user.email}
                    </>
                  )}
                  {roles.length > 0 && (
                    <>
                      <br />
                      {roles.join(', ')}
                    </>
                  )}
                </Box>
              }
              placement="bottom"
              arrow
            >
              <Link
                to="/profile"
                style={{ textDecoration: 'none', color: 'inherit' }}
                aria-label="Перейти до профілю"
              >
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    backgroundColor: BRAND.accent ?? 'var(--primary)',
                    color: '#fff',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {initial}
                </Box>
              </Link>
            </Tooltip>
          )}
          {!isAuthLoading && user && (
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
              {displayName}
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
          {navGroups
            .filter((g) => {
              if (g.title === 'Кабінет виконроба') return can('foreman:read');
              if (g.title === 'Відділ реалізації') return can('execution:read');
              if (g.title === 'Відділ фінансів') return can('finance:read');
              if (g.title === 'Аналітика (для власників)') return can('analytics:read');
              return true;
            })
            .map((group, idx) => (
            <Box key={group.title} sx={{ mt: idx === 0 ? 0 : undefined }}>
              <Box component="div" className="boNavSection" sx={{ px: 2, py: 0.5 }}>
                {group.title}
              </Box>

              {group.items.map((item) => {
                const isActive = loc.pathname === item.to || (item.to !== '/' && loc.pathname.startsWith(item.to + '/'));
                if (forceFullNav) {
                  return (
                    <ListItemButton
                      key={item.to}
                      component="a"
                      href={item.to}
                      className={`boNavItem ${isActive ? 'isActive' : ''}`}
                      sx={{
                        borderRadius: 2,
                        mx: 1,
                        my: 0.5,
                        py: 1,
                        textDecoration: 'none',
                        color: 'inherit',
                        '& .MuiListItemIcon-root': { minWidth: 40 },
                        '& .MuiListItemText-primary': { fontWeight: 500, fontSize: '0.875rem' },
                      }}
                    >
                      <ListItemIcon className="boNavIcon">{item.icon}</ListItemIcon>
                      <ListItemText primary={item.label} />
                    </ListItemButton>
                  );
                }
                return (
                  <ListItemButton
                    key={item.to}
                    component={NavLink}
                    to={item.to}
                    className={({ isActive: active }) => `boNavItem ${active ? 'isActive' : ''}`}
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
                );
              })}
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
      <RealtimeDebugPanel />
    </Box>
  );
};

export default MainLayout;
