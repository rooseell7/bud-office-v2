import { useMemo } from 'react';
import {
  Box,
  Stack,
  TextField,
  MenuItem,
  Button,
} from '@mui/material';

import type { MovementType, WarehouseMovementsQuery } from '../types/warehouse-movement.types';

type Props = {
  value: WarehouseMovementsQuery;
  onChange: (next: WarehouseMovementsQuery) => void;
  onApply: () => void;
  onReset: () => void;
};

const types: Array<{ value: MovementType | ''; label: string }> = [
  { value: '', label: 'Всі типи' },
  { value: 'IN', label: 'IN — Прихід' },
  { value: 'OUT', label: 'OUT — Списання' },
  { value: 'TRANSFER', label: 'TRANSFER — Переміщення' },
];

export default function WarehouseMovementsFilters({
  value,
  onChange,
  onApply,
  onReset,
}: Props) {
  const v = value;

  const dateFrom = useMemo(() => (v.dateFrom ? v.dateFrom.slice(0, 10) : ''), [v.dateFrom]);
  const dateTo = useMemo(() => (v.dateTo ? v.dateTo.slice(0, 10) : ''), [v.dateTo]);

  return (
    <Box sx={{ mb: 1 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="flex-end">
        <TextField
          select
          size="small"
          label="Тип"
          value={(v.type ?? '') as any}
          onChange={(e) => onChange({ ...v, type: (e.target.value || undefined) as any })}
          sx={{ minWidth: 200 }}
        >
          {types.map((t) => (
            <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
          ))}
        </TextField>

        <TextField
          size="small"
          label="Матеріал ID"
          value={v.materialId ?? ''}
          onChange={(e) => onChange({ ...v, materialId: e.target.value ? Number(e.target.value) : undefined })}
          sx={{ width: 140 }}
        />

        <TextField
          size="small"
          label="Обʼєкт ID"
          value={v.objectId ?? ''}
          onChange={(e) => onChange({ ...v, objectId: e.target.value ? Number(e.target.value) : undefined })}
          sx={{ width: 140 }}
        />

        <TextField
          size="small"
          label="Дата від"
          type="date"
          value={dateFrom}
          onChange={(e) =>
            onChange({
              ...v,
              dateFrom: e.target.value
                ? new Date(e.target.value + 'T00:00:00.000Z').toISOString()
                : undefined,
            })
          }
          InputLabelProps={{ shrink: true }}
          sx={{ width: 150 }}
        />

        <TextField
          size="small"
          label="Дата до"
          type="date"
          value={dateTo}
          onChange={(e) =>
            onChange({
              ...v,
              dateTo: e.target.value
                ? new Date(e.target.value + 'T23:59:59.999Z').toISOString()
                : undefined,
            })
          }
          InputLabelProps={{ shrink: true }}
          sx={{ width: 150 }}
        />

        <Button variant="contained" onClick={onApply}>Застосувати</Button>
        <Button variant="outlined" onClick={onReset}>Скинути</Button>
      </Stack>
    </Box>
  );
}