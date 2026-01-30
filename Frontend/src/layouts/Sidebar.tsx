import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import {
  Box,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Typography,
} from '@mui/material';

import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';

import { BRAND } from '../theme/muiTheme';

type NavItem = {
  label: string;
  to: string;
  icon: React.ReactNode;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    title: 'Відділ постачання',
    items: [
      { label: 'Склади', to: '/supply/warehouses', icon: <WarehouseOutlinedIcon /> },
      { label: 'Матеріали', to: '/supply/materials', icon: <Inventory2OutlinedIcon /> },
      { label: 'Накладні', to: '/supply/invoices', icon: <ReceiptLongOutlinedIcon /> },
    ],
  },
  {
    title: 'Відділ продажів',
    items: [
      { label: 'Клієнти', to: '/sales/clients', icon: <PeopleAltOutlinedIcon /> },
      { label: 'Угоди', to: '/sales/deals', icon: <HandshakeOutlinedIcon /> },
      { label: 'Проєкти', to: '/sales/projects', icon: <WorkOutlineOutlinedIcon /> },
    ],
  },
  {
    title: 'Відділ кошторису',
    items: [
      { label: "Об'єкти", to: '/estimate/objects', icon: <ApartmentOutlinedIcon /> },
      { label: 'Акти виконаних робіт', to: '/estimate/acts', icon: <AssignmentTurnedInOutlinedIcon /> },
    ],
  },
];

function isActivePath(pathname: string, to: string): boolean {
  // активний пункт: або точний матч, або дочірні шляхи (наприклад /supply/warehouses/1)
  return pathname === to || pathname.startsWith(to + '/');
}

export const Sidebar: React.FC = () => {
  const { pathname } = useLocation();

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
          BUD Office
        </Typography>
        <Typography variant="caption" color="text.secondary">
          SRM / CRM
        </Typography>
      </Box>

      <Divider />

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {sections.map((section) => (
          <List
            key={section.title}
            dense
            subheader={
              <ListSubheader component="div" sx={{ bgcolor: 'transparent', fontWeight: 700 }}>
                {section.title}
              </ListSubheader>
            }
          >
            {section.items.map((item) => {
              const active = isActivePath(pathname, item.to);
              return (
                <ListItemButton
                  key={item.to}
                  component={NavLink}
                  to={item.to}
                  selected={active}
                  sx={{
                    mx: 1,
                    mb: 0.5,
                    borderRadius: 2,
                    '&.Mui-selected': {
                      bgcolor: BRAND.accent,
                      color: BRAND.primary,
                      '& .MuiListItemIcon-root': {
                        color: BRAND.primary,
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 38 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              );
            })}
            <Box sx={{ height: 8 }} />
          </List>
        ))}
      </Box>

      <Divider />

      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          v2.1 — Розділи по відділах
        </Typography>
      </Box>
    </Box>
  );
};

export default Sidebar;