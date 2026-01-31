import React from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Drawer,
  List,
  ListSubheader,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
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
  const { user, logout, can } = useAuth();

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
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          backgroundColor: BRAND.primary,
          borderBottom: `1px solid rgba(255,255,255,0.08)`,
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <Typography
            component={Link}
            to="/home"
            variant="h6"
            aria-label="BUD Office — на головну"
            sx={{
              fontWeight: 800,
              color: '#fff',
              letterSpacing: 0.2,
              textDecoration: 'none',
              cursor: 'pointer',
              '&:hover': { color: 'rgba(255,255,255,0.95)', textDecoration: 'underline' },
            }}
          >
            BUD Office
          </Typography>

          <Box sx={{ flex: 1 }} />

          {user && (
            <Typography
              component={Link}
              to="/profile"
              variant="body2"
              aria-label="Перейти до профілю"
              sx={{
                color: 'rgba(255,255,255,0.82)',
                cursor: 'pointer',
                textDecoration: 'none',
                '&:hover': { color: '#fff', textDecoration: 'underline' },
              }}
            >
              {user.fullName}
            </Typography>
          )}
          {can('users:read') && (
            <IconButton
              component={Link}
              to="/admin/users"
              size="small"
              sx={{
                color: 'rgba(255,255,255,0.9)',
                '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
              }}
              aria-label="Меню адміна"
            >
              <SettingsIcon />
            </IconButton>
          )}
          <Button
            onClick={logout}
            variant="outlined"
            sx={{
              borderColor: 'rgba(255,255,255,0.35)',
              color: '#fff',
              '&:hover': { borderColor: 'rgba(255,255,255,0.65)' },
            }}
          >
            Вийти
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: BRAND.primary,
            borderRight: `1px solid rgba(255,255,255,0.08)`,
            color: '#fff',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ px: 1, py: 1 }}>
          <List
            disablePadding
            subheader={
              <ListSubheader
                component="div"
                disableSticky
                sx={{
                  bgcolor: 'transparent',
                  color: 'rgba(255,255,255,0.72)',
                  px: 2,
                  py: 1,
                }}
              >
                Навігація
              </ListSubheader>
            }
          >
            {navGroups.map((group) => (
              <Box key={group.title} sx={{ pb: 1 }}>
                <Typography
                  variant="overline"
                  sx={{
                    px: 2,
                    color: BRAND.accent,
                    letterSpacing: '0.08em',
                  }}
                >
                  {group.title}
                </Typography>

                {group.items.map((item) => (
                  <ListItemButton
                    key={item.to}
                    component={NavLink}
                    to={item.to}
                    sx={{
                      borderRadius: 2,
                      mx: 1,
                      my: 0.5,
                      color: '#fff',
                      '& .MuiListItemIcon-root': { color: 'rgba(255,255,255,0.8)' },
                      '&.active': {
                        bgcolor: 'rgba(205,214,41,0.16)',
                        '& .MuiListItemIcon-root': { color: BRAND.accent },
                        '& .MuiListItemText-primary': { fontWeight: 700 },
                      },
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.06)',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                ))}
              </Box>
            ))}
          </List>

          <Divider sx={{ my: 1.5 }} />

          <Typography variant="caption" sx={{ px: 2, color: 'rgba(255,255,255,0.6)' }}>
            BUD Office v2.1 — структура меню затверджена
          </Typography>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flex: 1, bgcolor: 'background.default' }}>
        <Toolbar />
        <Box sx={{ p: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;
