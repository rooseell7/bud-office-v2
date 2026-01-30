import React from 'react';

import { Box, Card, CardContent, Typography } from '@mui/material';

type Props = {
  title: string;
  description?: string;
};

const StubPage: React.FC<Props> = ({ title, description }) => {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
        {title}
      </Typography>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            В розробці
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {description ?? 'Цей розділ доданий у структуру меню, мінімальний функціонал буде реалізовано наступними кроками.'}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default StubPage;
