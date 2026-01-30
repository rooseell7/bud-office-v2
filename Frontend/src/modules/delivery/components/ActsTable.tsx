// FILE: src/modules/delivery/components/ActsTable.tsx

import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import type { DeliveryAct, Id } from '../types/act.types';

import { n } from '../../shared/sheet/utils';

type Props = {
  items: DeliveryAct[];
  onOpen: (item: DeliveryAct) => void;
  onDelete: (id: Id) => void;

  // permissions flags from page
  canEdit?: boolean;
  canDelete?: boolean;
};

function formatMoney(v: unknown): string {
  const value = n(v);
  try {
    return new Intl.NumberFormat('uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return value.toFixed(2);
  }
}

function formatDateISO(date: unknown): string {
  const s = String(date ?? '').slice(0, 10);
  if (!s || s === 'null' || s === 'undefined') return '—';
  // expecting YYYY-MM-DD
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s);
  if (!m) return s;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function statusLabel(status: unknown): string {
  return String(status) === 'done' ? 'Підписано' : 'Чернетка';
}

function statusVariant(status: unknown): 'filled' | 'outlined' {
  return String(status) === 'done' ? 'filled' : 'outlined';
}

function statusColor(status: unknown): 'default' | 'success' | 'warning' {
  return String(status) === 'done' ? 'success' : 'warning';
}

export default function ActsTable({
  items,
  onOpen,
  onDelete,
  canEdit = true,
  canDelete = true,
}: Props) {
  const showActions = canEdit || canDelete;

  if (!items?.length) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Актів поки немає.
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Акт</TableCell>
            <TableCell>Дата</TableCell>
            <TableCell>Коментар</TableCell>
            <TableCell align="right">Сума</TableCell>
            <TableCell>Статус</TableCell>
            <TableCell align="right">{showActions ? 'Дії' : ''}</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {items.map((a) => {
            const title = a.number ? `№ ${a.number}` : `Акт ${String(a.id).slice(0, 6)}`;
            const subtitle = a.items?.length ? `${a.items.length} позицій` : '—';

            return (
              <TableRow
                key={String(a.id)}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => onOpen(a)}
              >
                <TableCell>
                  <Stack spacing={0.25}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {title}
                      </Typography>
                      <Tooltip title="Відкрити">
                        <Box component="span" onClick={(e) => e.stopPropagation()}>
                          <IconButton
                            size="small"
                            onClick={() => onOpen(a)}
                            aria-label="Відкрити"
                          >
                            <OpenInNewIcon fontSize="inherit" />
                          </IconButton>
                        </Box>
                      </Tooltip>
                    </Stack>

                    <Typography variant="caption" color="text.secondary">
                      {subtitle}
                    </Typography>
                  </Stack>
                </TableCell>

                <TableCell>{formatDateISO((a as any).date)}</TableCell>
                <TableCell>{(a as any).comment ?? '—'}</TableCell>

                <TableCell align="right">{formatMoney((a as any).totalAmount)}</TableCell>

                <TableCell>
                  <Chip
                    size="small"
                    label={statusLabel((a as any).status)}
                    variant={statusVariant((a as any).status)}
                    color={statusColor((a as any).status)}
                  />
                </TableCell>

                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title={canEdit ? 'Редагувати' : 'Недоступно'}>
                      <Box component="span">
                        <IconButton
                          size="small"
                          onClick={() => onOpen(a)}
                          disabled={!canEdit}
                          aria-label="Редагувати"
                        >
                          <EditIcon fontSize="inherit" />
                        </IconButton>
                      </Box>
                    </Tooltip>

                    <Tooltip title={canDelete ? 'Видалити' : 'Недоступно'}>
                      <Box component="span">
                        <IconButton
                          size="small"
                          onClick={() => onDelete(a.id)}
                          disabled={!canDelete}
                          aria-label="Видалити"
                        >
                          <DeleteIcon fontSize="inherit" />
                        </IconButton>
                      </Box>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
