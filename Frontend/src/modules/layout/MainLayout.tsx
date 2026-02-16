import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useRealtime } from '../../realtime/RealtimeContext';
import { usePresence } from '../../shared/realtime/usePresence';
import { buildPresenceContext } from '../../shared/realtime/presenceClient';
import { RealtimeDebugPanel } from '../../realtime/RealtimeDebugPanel';
import { DEBUG_NAV } from '../../shared/config/env';

import {
  AppBar,
  Badge,
  Box,
  IconButton,
  Toolbar,
  Button,
  Drawer,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Tooltip,
  Popover,
  Menu,
  MenuItem,
  List,
  ListItem,
} from '@mui/material';

import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
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
import TimelineIcon from '@mui/icons-material/Timeline';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { getNotifications, getUnreadCount, markNotificationRead } from '../../api/notifications';
const accent = '#7AC854';

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
  const presence = usePresence();
  const connectionStatus = realtime?.connectionStatus ?? 'offline';
  const [onlineAnchor, setOnlineAnchor] = useState<HTMLElement | null>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<HTMLElement | null>(null);
  const [notifyAnchor, setNotifyAnchor] = useState<HTMLElement | null>(null);
  const [notifyUnread, setNotifyUnread] = useState(0);
  const [notifyList, setNotifyList] = useState<any[]>([]);

  // STEP 4: send presence hello on connect and route change
  useEffect(() => {
    if (!realtime?.connected || !presence.sendPresenceHello) return;
    const searchParams = loc.search ? new URLSearchParams(loc.search) : undefined;
    presence.sendPresenceHello(buildPresenceContext(loc.pathname, searchParams, 'view'));
  }, [realtime?.connected, loc.pathname, loc.search, presence.sendPresenceHello]);

  useEffect(() => {
    return () => {
      presence.sendPresenceLeave?.();
    };
  }, []);

  const fetchNotifyCount = useCallback(async () => {
    try {
      const c = await getUnreadCount();
      setNotifyUnread(c);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchNotifyCount();
  }, [user, fetchNotifyCount]);

  const handleNotifyOpen = useCallback(async (e: React.MouseEvent<HTMLElement>) => {
    setNotifyAnchor(e.currentTarget);
    try {
      const res = await getNotifications({ limit: 10 });
      setNotifyList(res.items ?? []);
    } catch {
      setNotifyList([]);
    }
  }, []);

  const onlineCount = presence.globalUsers.length;
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
      title: 'Система',
      items: [
        { to: '/activity', label: 'Активність', icon: <TimelineIcon /> },
      ],
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

          {isAuthLoading && (
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                backgroundColor: 'var(--bo-line)',
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
              <Button
                onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                size="small"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  color: 'var(--bo-text)',
                  minWidth: 'auto',
                  px: 1,
                  borderRadius: 9999,
                  textTransform: 'none',
                  transition: 'all 140ms ease',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  },
                }}
                aria-label="Меню профілю"
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
                    backgroundColor: accent,
                    color: '#fff',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {initial}
                </Box>
                <Typography component="span" variant="body2" sx={{ fontWeight: 500 }}>
                  {displayName}
                </Typography>
              </Button>
            </Tooltip>
          )}
          {/* STEP 10: Notifications bell */}
          {!isAuthLoading && user && (
            <>
              <Tooltip title="Сповіщення">
                <IconButton
                  size="small"
                  onClick={(e) => handleNotifyOpen(e)}
                  sx={{
                    color: 'var(--bo-text)',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                  }}
                >
                  <Badge badgeContent={notifyUnread} color="error">
                    <NotificationsIcon fontSize="small" />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Popover
                open={Boolean(notifyAnchor)}
                anchorEl={notifyAnchor}
                onClose={() => setNotifyAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                  paper: {
                    sx: { mt: 1.5, minWidth: 280, maxHeight: 400, borderRadius: 2 },
                  },
                }}
              >
                <Box sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2">Сповіщення</Typography>
                    <Button size="small" component={Link} to="/notifications" onClick={() => setNotifyAnchor(null)}>
                      Всі
                    </Button>
                  </Box>
                  <List dense disablePadding>
                    {notifyList.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Немає сповіщень
                      </Typography>
                    ) : (
                      notifyList.slice(0, 10).map((n) => {
                        const route =
                          n.entityType && n.entityId
                            ? n.entityType === 'invoice'
                              ? `/supply/invoices/${n.entityId}`
                              : n.entityType === 'act'
                                ? `/estimate/acts/${n.entityId}`
                                : n.entityType === 'project'
                                  ? `/projects/${n.entityId}`
                                  : '/notifications'
                            : '/notifications';
                        return (
                          <ListItem
                            key={n.id}
                            disablePadding
                            sx={{ py: 0.5 }}
                            component={Link}
                            to={route}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                            onClick={async () => {
                              if (!n.readAt) {
                                try {
                                  await markNotificationRead(n.id);
                                  setNotifyUnread((c) => Math.max(0, c - 1));
                                } catch {
                                  /* ignore */
                                }
                              }
                              setNotifyAnchor(null);
                            }}
                          >
                            <ListItemText
                              primary={n.title}
                              secondary={n.createdAt ? new Date(n.createdAt).toLocaleString('uk-UA') : null}
                              primaryTypographyProps={{ variant: 'body2', fontWeight: n.readAt ? 400 : 600 }}
                            />
                          </ListItem>
                        );
                      })
                    )}
                  </List>
                </Box>
              </Popover>
            </>
          )}
          {/* STEP 4: Online indicator + dropdown */}
          {realtime?.connected && (
            <>
              <Tooltip title="Онлайн зараз">
                <Button
                  size="small"
                  onClick={(e) => setOnlineAnchor(e.currentTarget)}
                  sx={{
                    color: 'var(--bo-text)',
                    minWidth: 'auto',
                    px: 1,
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: '#7AC854',
                      mr: 0.75,
                      flexShrink: 0,
                    }}
                  />
                  <Typography component="span" variant="body2">
                    {onlineCount}
                  </Typography>
                </Button>
              </Tooltip>
              <Popover
                open={Boolean(onlineAnchor)}
                anchorEl={onlineAnchor}
                onClose={() => setOnlineAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <Box sx={{ p: 2, minWidth: 220 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Онлайн зараз: {onlineCount}
                  </Typography>
                  <List dense disablePadding>
                    {presence.globalUsers.slice(0, 10).map((u) => (
                      <ListItem key={u.userId} disablePadding sx={{ py: 0.25 }}>
                        <Typography variant="body2">
                          {u.name}
                          {u.role && (
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                              · {u.role}
                            </Typography>
                          )}
                          {u.module && (
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                              · {u.module}
                            </Typography>
                          )}
                        </Typography>
                      </ListItem>
                    ))}
                    {onlineCount > 10 && (
                      <ListItem disablePadding>
                        <Typography variant="caption" color="text.secondary">
                          +{onlineCount - 10} ще
                        </Typography>
                      </ListItem>
                    )}
                  </List>
                </Box>
              </Popover>
            </>
          )}
          {!isAuthLoading && user && (
            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={() => setUserMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{
                paper: {
                  sx: {
                    mt: 1.5,
                    minWidth: 200,
                    borderRadius: 2,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                    bgcolor: 'var(--bo-surface-elevated, #1e293b)',
                    border: '1px solid var(--bo-line, rgba(255,255,255,0.08))',
                  },
                },
              }}
            >
              <MenuItem
                component={Link}
                to="/profile"
                onClick={() => setUserMenuAnchor(null)}
                sx={{
                  py: 1.25,
                  gap: 1.5,
                  color: 'var(--bo-text)',
                  '&:hover': { bgcolor: 'rgba(122,200,84,0.12)', color: accent },
                }}
              >
                <PersonOutlinedIcon fontSize="small" sx={{ color: 'inherit' }} />
                Профіль
              </MenuItem>
              {can('users:read') && (
                <MenuItem
                  component={Link}
                  to="/admin/users"
                  onClick={() => setUserMenuAnchor(null)}
                  sx={{
                    py: 1.25,
                    gap: 1.5,
                    color: 'var(--bo-text)',
                    '&:hover': { bgcolor: 'rgba(122,200,84,0.12)', color: accent },
                  }}
                >
                  <SettingsIcon fontSize="small" sx={{ color: 'inherit' }} />
                  Налаштування
                </MenuItem>
              )}
              <Divider sx={{ borderColor: 'var(--bo-line)' }} />
              <MenuItem
                onClick={() => {
                  setUserMenuAnchor(null);
                  logout();
                }}
                sx={{
                  py: 1.25,
                  gap: 1.5,
                  color: 'var(--bo-text-muted)',
                  '&:hover': { bgcolor: 'rgba(239,68,68,0.12)', color: '#ef4444' },
                }}
              >
                <LogoutOutlinedIcon fontSize="small" sx={{ color: 'inherit' }} />
                Вийти
              </MenuItem>
            </Menu>
          )}
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
              if (g.title === 'Система') return can('activity:read:global');
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

          <Divider sx={{ my: 1.5, borderColor: 'var(--bo-line)' }} />

          <Box
            component="span"
            sx={{
              px: 2,
              color: 'var(--bo-text-muted)',
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
        <Box sx={{ flex: 1 }} className="boPage">
          <Outlet key={loc.pathname} />
        </Box>
      </Box>
      <RealtimeDebugPanel />
    </Box>
  );
};

export default MainLayout;
