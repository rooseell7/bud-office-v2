import React from 'react';
import { Box, Typography, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';

/** Compact block "Зв'язки" for document detail pages with clickable links. */

export const LinksBlockRequest: React.FC<{ linkedOrders?: { id: number; status?: string }[] }> = ({ linkedOrders }) => {
  const navigate = useNavigate();
  if (!linkedOrders?.length) return null;
  return (
    <Box sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>Зв'язки</Typography>
      <Typography variant="body2">
        Замовлення:{' '}
        {linkedOrders.map((o, i) => (
          <React.Fragment key={o.id}>
            {i > 0 && ', '}
            <Link component="button" variant="body2" onClick={() => navigate(`/supply/orders/${o.id}`)} sx={{ cursor: 'pointer' }}>
              №{o.id}
            </Link>
          </React.Fragment>
        ))}
      </Typography>
    </Box>
  );
};

export const LinksBlockOrder: React.FC<{
  sourceRequest?: { id: number } | null;
  linkedReceipts?: { id: number; status?: string }[];
}> = ({ sourceRequest, linkedReceipts }) => {
  const navigate = useNavigate();
  if (!sourceRequest && !linkedReceipts?.length) return null;
  return (
    <Box sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>Зв'язки</Typography>
      <Typography variant="body2" component="span" sx={{ display: 'block' }}>
        {sourceRequest && (
          <>
            Із заявки:{' '}
            <Link component="button" variant="body2" onClick={() => navigate(`/supply/requests/${sourceRequest.id}`)} sx={{ cursor: 'pointer' }}>
              №{sourceRequest.id}
            </Link>
          </>
        )}
      </Typography>
      {linkedReceipts && linkedReceipts.length > 0 && (
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          Приходи:{' '}
          {linkedReceipts.map((r, i) => (
            <React.Fragment key={r.id}>
              {i > 0 && ', '}
              <Link component="button" variant="body2" onClick={() => navigate(`/supply/receipts/${r.id}`)} sx={{ cursor: 'pointer' }}>
                №{r.id}
              </Link>
            </React.Fragment>
          ))}
        </Typography>
      )}
    </Box>
  );
};

export const LinksBlockReceipt: React.FC<{
  sourceOrder?: { id: number };
  linkedPayable?: { id: number; status?: string } | null;
}> = ({ sourceOrder, linkedPayable }) => {
  const navigate = useNavigate();
  if (!sourceOrder) return null;
  return (
    <Box sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>Зв'язки</Typography>
      <Typography variant="body2">
        З замовлення:{' '}
        <Link component="button" variant="body2" onClick={() => navigate(`/supply/orders/${sourceOrder.id}`)} sx={{ cursor: 'pointer' }}>
          №{sourceOrder.id}
        </Link>
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        До оплати: {linkedPayable
          ? <Link component="button" variant="body2" onClick={() => navigate(`/supply/payables/${linkedPayable.id}`)} sx={{ cursor: 'pointer' }}>№{linkedPayable.id}</Link>
          : '—'}
      </Typography>
    </Box>
  );
};

export const LinksBlockPayable: React.FC<{ sourceReceipt?: { id: number } }> = ({ sourceReceipt }) => {
  const navigate = useNavigate();
  if (!sourceReceipt) return null;
  return (
    <Box sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>Зв'язки</Typography>
      <Typography variant="body2">
        З приходу:{' '}
        <Link component="button" variant="body2" onClick={() => navigate(`/supply/receipts/${sourceReceipt.id}`)} sx={{ cursor: 'pointer' }}>
          №{sourceReceipt.id}
        </Link>
      </Typography>
    </Box>
  );
};
