import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Головна сторінка після логіну.
 * За вимогою: простий центрований напис "Bud office".
 */
const HomePage: React.FC = () => {
  return (
    <Box
      sx={{
        height: 'calc(100vh - 64px - 24px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Typography
        variant="h2"
        sx={{
          fontWeight: 900,
          letterSpacing: 0.5,
          textTransform: 'none',
          color: '#0b2923',
        }}
      >
        Bud office
      </Typography>
    </Box>
  );
};

export default HomePage;
