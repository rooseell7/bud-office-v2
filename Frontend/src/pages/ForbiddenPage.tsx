import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';

const ForbiddenPage: React.FC = () => (
  <Box sx={{ p: 4, textAlign: 'center' }}>
    <Typography variant="h5" sx={{ mb: 2 }}>
      403 — Немає доступу
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      У вас недостатньо прав для перегляду цієї сторінки.
    </Typography>
    <Button component={Link} to="/home" variant="contained">
      На головну
    </Button>
  </Box>
);

export default ForbiddenPage;
