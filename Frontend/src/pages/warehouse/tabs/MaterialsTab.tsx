import {
  Paper,
  Typography,
  Button,
  Stack,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  getMaterials,
  archiveMaterial,
} from '../../../api/materials.api';

export default function MaterialsTab() {
  const { data = [], refetch } = useQuery({
    queryKey: ['materials'],
    queryFn: getMaterials,
  });

  const archive = useMutation({
    mutationFn: archiveMaterial,
    onSuccess: () => refetch(),
  });

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Матеріал', flex: 1 },
    { field: 'unit', headerName: 'Од.', width: 100 },
    {
      field: 'actions',
      headerName: '',
      width: 140,
      renderCell: (p) => (
        <Button
          size="small"
          color="error"
          onClick={() => archive.mutate(p.row.id)}
        >
          Архівувати
        </Button>
      ),
    },
  ];

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        🧱 Матеріали
      </Typography>

      <DataGrid
        rows={data}
        columns={columns}
        autoHeight
      />
    </Paper>
  );
}
