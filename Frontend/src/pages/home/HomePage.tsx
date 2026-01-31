import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Головна сторінка після логіну.
 */
const HomePage: React.FC = () => {
  return (
    <Box
      sx={{
        height: 'calc(100vh - 64px - 24px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
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
        BUD Office
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Головна сторінка
      </Typography>
    </Box>
  );
};

export default HomePage;
