import { Box, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import WarehouseTabs from './WarehouseTabs';

export default function WarehousePage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <Typography color="error">
        Warehouse ID not found
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        📦 Склад #{id}
      </Typography>

      <WarehouseTabs warehouseId={id} />
    </Box>
  );
}
