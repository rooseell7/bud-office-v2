import { Box, Tabs, Tab } from '@mui/material';
import { useState } from 'react';
import StockTab from './tabs/StockTab';
import OperationsTab from './tabs/OperationsTab';
import MaterialsTab from './tabs/MaterialsTab';

interface Props {
  warehouseId: string;
}

export default function WarehouseTabs({ warehouseId }: Props) {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        sx={{ mb: 2 }}
      >
        <Tab label="📊 Залишки" />
        <Tab label="🔁 Операції" />
        <Tab label="🧱 Матеріали" />
      </Tabs>

      {tab === 0 && <StockTab warehouseId={warehouseId} />}
      {tab === 1 && <OperationsTab warehouseId={warehouseId} />}
      {tab === 2 && <MaterialsTab />}
    </Box>
  );
}
