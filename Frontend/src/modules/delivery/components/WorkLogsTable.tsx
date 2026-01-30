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
        {items.map((r) => (
          <TableRow key={String(r.id)}>
            <TableCell>{(r as any).name ?? ''}</TableCell>
            <TableCell align="right">{n((r as any).qty).toFixed(3)}</TableCell>
            <TableCell>{(r as any).unit ?? ''}</TableCell>
            <TableCell align="right">{n((r as any).price).toFixed(2)}</TableCell>
            <TableCell align="right">
              {n((r as any).amount ?? n((r as any).qty) * n((r as any).price)).toFixed(2)}
            </TableCell>
            <TableCell>
              <Chip
                size="small"
                label={(r as any).status === 'done' ? 'done' : 'draft'}
                variant="outlined"
              />
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
        ))}
      </TableBody>
    </Table>
  );
}
