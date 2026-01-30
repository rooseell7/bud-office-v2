import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Typography,
  Stack,
} from '@mui/material';

import type { WarehouseMovement, WarehouseMovementItem } from '../types/warehouse-movement.types';

import { n } from '../../shared/sheet/utils';

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function typeLabel(t: WarehouseMovement['type']): { label: string; color: any } {
  if (t === 'IN') return { label: 'IN', color: 'success' };
  if (t === 'OUT') return { label: 'OUT', color: 'error' };
  return { label: 'TRANSFER', color: 'info' };
}

function renderRoute(m: WarehouseMovement): string {
  const from = m.fromWarehouse?.name ?? (m.fromWarehouseId ? `#${m.fromWarehouseId}` : '');
  const to = m.toWarehouse?.name ?? (m.toWarehouseId ? `#${m.toWarehouseId}` : '');
  if (m.type === 'IN') return `→ ${to || '(склад)'}`;
  if (m.type === 'OUT') return `${from || '(склад)'} →`;
  return `${from || '(склад)'} → ${to || '(склад)'}`;
}

function flattenItems(m: WarehouseMovement): WarehouseMovementItem[] {
  const items = Array.isArray(m.items) ? m.items : [];
  return items;
}

export default function WarehouseMovementsTable({ items }: { items: WarehouseMovement[] }) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Дата</TableCell>
          <TableCell>Тип</TableCell>
          <TableCell>Маршрут</TableCell>
          <TableCell>Позиції</TableCell>
          <TableCell>Обʼєкт</TableCell>
          <TableCell>Користувач</TableCell>
          <TableCell align="right">Сума</TableCell>
        </TableRow>
      </TableHead>

      <TableBody>
        {items.map((m) => {
          const meta = typeLabel(m.type);
          const its = flattenItems(m);
          const total = its.reduce((acc, it) => acc + n(it.amount), 0);

          return (
            <TableRow key={m.id} hover>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(m.createdAt)}</TableCell>

              <TableCell>
                <Chip size="small" label={meta.label} color={meta.color} />
              </TableCell>

              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                {renderRoute(m)}
              </TableCell>

              <TableCell>
                {its.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">—</Typography>
                ) : (
                  <Stack spacing={0.25}>
                    {its.slice(0, 4).map((it, idx) => (
                      <Typography key={idx} variant="body2">
                        {it.material?.name ?? `Матеріал #${it.materialId}`} — {n(it.qty)} {it.material?.unit ?? ''} × {n(it.price)} = {n(it.amount)}
                      </Typography>
                    ))}
                    {its.length > 4 && (
                      <Typography variant="body2" color="text.secondary">
                        …ще {its.length - 4}
                      </Typography>
                    )}
                  </Stack>
                )}
              </TableCell>

              <TableCell>
                {m.object?.name ?? (m.objectId ? `#${m.objectId}` : '—')}
              </TableCell>

              <TableCell>
                {m.user?.fullName ?? (m.userId ? `#${m.userId}` : '—')}
              </TableCell>

              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                {total.toFixed(2)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}