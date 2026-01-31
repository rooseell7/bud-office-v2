import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Card, CardContent, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getDocument } from '../../api/documents';
import { Sheet, useQuoteAdapter } from '../../sheet';

export const EstimateEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const docId = id ? parseInt(id, 10) : NaN;
  const validId = Number.isFinite(docId) && docId > 0 ? docId : null;

  const [loadError, setLoadError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const { adapter, mode, initialSnapshot } = useQuoteAdapter(validId);

  useEffect(() => {
    if (!validId) {
      setChecking(false);
      return;
    }
    setLoadError(null);
    getDocument(validId)
      .then((doc) => {
        if (!doc?.meta?.sheetSnapshot && typeof doc?.meta?.sheetSnapshot !== 'object') {
          setLoadError('Документ не містить таблиці');
        }
      })
      .catch((e: any) => {
        const status = e?.response?.status;
        if (status === 404) {
          setLoadError('Документ не знайдено');
        } else {
          setLoadError(e?.response?.data?.message || 'Помилка завантаження');
        }
      })
      .finally(() => setChecking(false));
  }, [validId]);

  if (!validId) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/estimate')}>
          Назад
        </Button>
        <Typography color="error" sx={{ mt: 2 }}>
          Невірний ідентифікатор документа
        </Typography>
      </Box>
    );
  }

  if (checking) {
    return (
      <Box>
        <Typography>Завантаження…</Typography>
      </Box>
    );
  }

  if (loadError) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/estimate')}>
          Назад
        </Button>
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography color="error">{loadError}</Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/estimate')}
        sx={{ mb: 1 }}
      >
        Назад
      </Button>
      <Sheet
        adapter={adapter ?? undefined}
        documentId={validId}
        initialSnapshot={initialSnapshot}
        readonly={mode === 'readonly'}
      />
    </Box>
  );
};
