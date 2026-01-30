import { Box, Typography, Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const nav = useNavigate();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Сторінку не знайдено (404)
      </Typography>
      <Typography sx={{ mb: 2 }}>
        Перевір шлях або повернись у систему.
      </Typography>

      <Stack direction="row" spacing={2}>
        <Button variant="contained" onClick={() => nav('/delivery')}>
          До Delivery
        </Button>
        <Button variant="outlined" onClick={() => nav('/login')}>
          На Login
        </Button>
      </Stack>
    </Box>
  );
}
