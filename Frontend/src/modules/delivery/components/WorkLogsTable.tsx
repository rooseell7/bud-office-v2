// FILE: src/modules/delivery/components/WorkLogsTable.tsx

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Chip,
} from '@mui/material';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import type { WorkLog, Id } from '../types/work-log.types';

import { n } from '../../shared/sheet/utils';

type Props = {
  items: WorkLog[];
  onEdit: (item: WorkLog) => void;
  onDelete: (id: Id) => void;

  // permissions flags from page
  canEdit?: boolean;
  canDelete?: boolean;
};

/** Локальна нормалізація для відображення: WorkLog → поля таблиці (без cast до Record). */
function toDisplayRow(r: WorkLog): { name: string; qty: number; unit: string; price: number; amount: number; status: string } {
  type WithStatus = WorkLog & { status?: string };
  const statusStr = 'status' in r ? (r as WithStatus).status : undefined;
  return {
    name: r.title ?? '',
    qty: r.qty,
    unit: r.unit ?? '',
    price: r.price,
    amount: r.total,
    status: statusStr === 'done' ? 'done' : 'draft',
  };
}

export default function WorkLogsTable({
  items,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}: Props) {
  const showActions = canEdit || canDelete;

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Назва</TableCell>
          <TableCell align="right">К-сть</TableCell>
          <TableCell>Од.</TableCell>
          <TableCell align="right">Ціна</TableCell>
          <TableCell align="right">Сума</TableCell>
          <TableCell>Статус</TableCell>
          <TableCell align="right">{showActions ? 'Дії' : ''}</TableCell>
        </TableRow>
      </TableHead>

      <TableBody>
        {items.map((r) => {
          const row = toDisplayRow(r);
          return (
            <TableRow key={String(r.id)}>
              <TableCell>{row.name}</TableCell>
              <TableCell align="right">{n(row.qty).toFixed(3)}</TableCell>
              <TableCell>{row.unit}</TableCell>
              <TableCell align="right">{n(row.price).toFixed(2)}</TableCell>
              <TableCell align="right">{n(row.amount).toFixed(2)}</TableCell>
              <TableCell>
                <Chip size="small" label={row.status} variant="outlined" />
              </TableCell>

              <TableCell align="right">
                {canEdit && (
                  <IconButton size="small" onClick={() => onEdit(r)} title="Редагувати">
                    <EditIcon />
                  </IconButton>
                )}
                {canDelete && (
                  <IconButton size="small" onClick={() => onDelete(r.id)} title="Видалити">
                    <DeleteIcon />
                  </IconButton>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
