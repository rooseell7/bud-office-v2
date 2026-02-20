import { Paper, Typography, Box } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import { getOperations } from '../../../api/operations.api';

interface Props {
  warehouseId: string;
}

export default function OperationsTab({ warehouseId }: Props) {
  const { data = [] } = useQuery({
    queryKey: ['operations', warehouseId],
    queryFn: () => getOperations(warehouseId),
  });

  const columns: GridColDef[] = [
    { field: 'type', headerName: 'Тип', width: 80 },
    { field: 'materialName', headerName: 'Матеріал', flex: 1 },
    { field: 'quantity', headerName: 'К-сть', width: 100 },
    { field: 'createdAt', headerName: 'Дата', width: 180 },
  ];

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        🔁 Журнал операцій
      </Typography>

      <Box sx={{ height: 420 }}>
        <DataGrid rows={data} columns={columns} />
      </Box>
    </Paper>
  );
}
