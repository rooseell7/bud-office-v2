import React from 'react';
import { Box, Typography } from '@mui/material';
import { Sheet, draftKey } from '../../sheet';

/** Smoke-test page for canonical sheet. */
const demoAdapter = {
  getDraftKey: () => draftKey('demo', 'smoke'),
};

export const SheetDemoPage: React.FC = () => (
  <Box sx={{ p: 2 }}>
    <Typography variant="h6" sx={{ mb: 2 }}>
      Sheet (F5 зберігає draft у localStorage)
    </Typography>
    <Sheet config={{ rowCount: 20, colCount: 10 }} adapter={demoAdapter} />
  </Box>
);
