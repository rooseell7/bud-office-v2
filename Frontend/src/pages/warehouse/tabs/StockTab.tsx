import { Paper, Typography, Box, CircularProgress } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { useWarehouseStock } from '../../../hooks/useWarehouseStock';

interface Props {
  warehouseId: string;
}

export default function StockTab({ warehouseId }: Props) {
  const { data, isLoading } = useWarehouseStock(warehouseId);

  const columns: GridColDef[] = [
    { field: 'materialName', headerName: 'Матеріал', flex: 1 },
    { field: 'unit', headerName: 'Од.', width: 90 },
    {
      field: 'quantity',
      headerName: 'К-сть',
      width: 110,
      cellClassName: (p) =>
        p.value < p.row.minQuantity ? 'stock-low' : '',
    },
    { field: 'minQuantity', headerName: 'Мін.', width: 110 },
  ];

  if (isLoading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        📊 Залишки на складі
      </Typography>

      <Box sx={{ height: 420 }}>
        <DataGrid
          rows={data ?? []}
          columns={columns}
          disableRowSelectionOnClick
          sx={{
            '& .stock-low': {
              color: 'error.main',
              fontWeight: 600,
            },
          }}
        />
      </Box>
    </Paper>
  );
}
