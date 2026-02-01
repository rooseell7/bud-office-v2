import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Sheet } from '../../sheet';
import { worksSheetConfig } from '../../sheet/configs/worksSheetConfig';
import { materialsSheetConfig } from '../../sheet/configs/materialsSheetConfig';
import { useStageSheetAdapter } from '../../sheet/hooks/useStageSheetAdapter';
import { useAuth } from '../../modules/auth/AuthContext';
import {
  getDocumentWithStages,
  createStage,
  updateStage,
  deleteStage,
  buildDocKey,
  type EstimateStage,
} from '../../api/estimates';
import { acquireEditSession, releaseEditSession } from '../../api/documents';

const HEARTBEAT_INTERVAL_MS = 25000;

export const EstimateEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = useAuth();
  const estimateId = id ? parseInt(id, 10) : NaN;
  const validId = Number.isFinite(estimateId) && estimateId > 0 ? estimateId : null;

  const [doc, setDoc] = useState<Awaited<ReturnType<typeof getDocumentWithStages>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [activeTabByStage, setActiveTabByStage] = useState<Record<string, number>>({});
  const [renameStageId, setRenameStageId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirmStage, setDeleteConfirmStage] = useState<EstimateStage | null>(null);
  const [addingStage, setAddingStage] = useState(false);

  const canWrite = can('estimates:write') || can('documents:write') || can('sheet:write');
  const canDeleteStage = canWrite;

  const loadDoc = useCallback(async () => {
    if (!validId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getDocumentWithStages(validId);
      setDoc(data);
      if (data.stages.length > 0 && !expandedStage) {
        setExpandedStage(data.stages[0].id);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Помилка завантаження');
    } finally {
      setLoading(false);
    }
  }, [validId]);

  useEffect(() => {
    if (!validId) {
      setLoading(false);
      return;
    }
    loadDoc();
  }, [validId, loadDoc]);

  useEffect(() => {
    if (!validId || !canWrite) return;
    let token: string | null = null;
    acquireEditSession(validId)
      .then((s) => {
        token = s.token;
      })
      .catch(() => {});
    const beat = () => {
      if (token) {
        import('../../api/documents').then(({ heartbeatEditSession }) =>
          heartbeatEditSession(validId!, token!).catch(() => {}),
        );
      }
    };
    const id_ = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    return () => {
      clearInterval(id_);
      if (token) releaseEditSession(validId!, token).catch(() => {});
    };
  }, [validId, canWrite]);

  const handleAddStage = async () => {
    if (!validId) return;
    setAddingStage(true);
    try {
      const stage = await createStage(validId, {
        name: `Етап ${(doc?.stages?.length ?? 0) + 1}`,
      });
      await loadDoc();
      setExpandedStage(stage.id);
      setActiveTabByStage((prev) => ({ ...prev, [stage.id]: 0 }));
    } finally {
      setAddingStage(false);
    }
  };

  const handleRenameStage = async () => {
    if (!validId || !renameStageId || !renameValue.trim()) {
      setRenameStageId(null);
      return;
    }
    try {
      await updateStage(validId, renameStageId, { name: renameValue.trim() });
      await loadDoc();
    } finally {
      setRenameStageId(null);
    }
  };

  const handleDeleteStage = async () => {
    if (!validId || !deleteConfirmStage) return;
    try {
      await deleteStage(validId, deleteConfirmStage.id);
      await loadDoc();
      setDeleteConfirmStage(null);
      if (expandedStage === deleteConfirmStage.id) {
        const remaining = doc?.stages?.filter((s) => s.id !== deleteConfirmStage.id) ?? [];
        setExpandedStage(remaining[0]?.id ?? null);
      }
    } finally {
      setDeleteConfirmStage(null);
    }
  };

  if (!validId) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/estimate')}>
          Назад
        </Button>
        <Typography color="error" sx={{ mt: 2 }}>
          Невірний ідентифікатор
        </Typography>
      </Box>
    );
  }

  if (loading && !doc) {
    return (
      <Box>
        <Typography>Завантаження…</Typography>
      </Box>
    );
  }

  if (error && !doc) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/estimate')}>
          Назад
        </Button>
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box className="estimate-editor-full" sx={{ width: '100%', maxWidth: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Button
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/estimate')}
        >
          Назад
        </Button>
        <Typography variant="h6" sx={{ flex: 1 }}>
          {doc?.title ?? `КП #${validId}`}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Етапи
        </Typography>
        {canWrite && (
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddStage}
            disabled={addingStage}
          >
            Додати етап
          </Button>
        )}
      </Box>

      {doc?.stages?.length === 0 ? (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Немає етапів. Додайте перший етап.
          </Typography>
          {canWrite && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddStage}
              disabled={addingStage}
            >
              Додати етап
            </Button>
          )}
        </Box>
      ) : (
        doc?.stages?.map((stage) => (
          <StageAccordion
            key={stage.id}
            stage={stage}
            estimateId={validId!}
            expanded={expandedStage === stage.id}
            onExpand={() => setExpandedStage(stage.id)}
            activeTab={activeTabByStage[stage.id] ?? 0}
            onTabChange={(v) =>
              setActiveTabByStage((prev) => ({ ...prev, [stage.id]: v }))
            }
            canDelete={canDeleteStage}
            onRenameClick={() => {
              setRenameStageId(stage.id);
              setRenameValue(stage.name);
            }}
            onDeleteClick={() => setDeleteConfirmStage(stage)}
          />
        ))
      )}

      <Dialog open={!!renameStageId} onClose={() => setRenameStageId(null)}>
        <DialogTitle>Перейменувати етап</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameStage();
              if (e.key === 'Escape') setRenameStageId(null);
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameStageId(null)}>Скасувати</Button>
          <Button variant="contained" onClick={handleRenameStage} disabled={!renameValue.trim()}>
            Зберегти
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteConfirmStage} onClose={() => setDeleteConfirmStage(null)}>
        <DialogTitle>Видалити етап</DialogTitle>
        <DialogContent>
          <Typography>
            Видалити етап &quot;{deleteConfirmStage?.name}&quot;? Дані робіт і матеріалів
            будуть втрачені.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmStage(null)}>Скасувати</Button>
          <Button color="error" variant="contained" onClick={handleDeleteStage}>
            Видалити
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

type StageAccordionProps = {
  stage: EstimateStage;
  estimateId: number;
  expanded: boolean;
  onExpand: () => void;
  activeTab: number;
  onTabChange: (v: number) => void;
  canDelete: boolean;
  onRenameClick: () => void;
  onDeleteClick: () => void;
};

function StageAccordion({
  stage,
  estimateId,
  expanded,
  onExpand,
  activeTab,
  onTabChange,
  canDelete,
  onRenameClick,
  onDeleteClick,
}: StageAccordionProps) {
  const sheetType = activeTab === 0 ? 'works' : 'materials';
  const docKey = buildDocKey(estimateId, stage.id, sheetType);
  const config = activeTab === 0 ? worksSheetConfig : materialsSheetConfig;
  const { adapter, initialSnapshot } = useStageSheetAdapter(estimateId, docKey);

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, isExp) => isExp && onExpand()}
      sx={{
        '&:before': { display: 'none' },
        boxShadow: 0,
        border: '1px solid',
        borderColor: 'divider',
        mb: 0.5,
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{ minHeight: 44, '& .MuiAccordionSummary-content': { my: 0.5 } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <Typography variant="body2" fontWeight={600}>
            {stage.name}
          </Typography>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); onRenameClick(); }} aria-label="Перейменувати">
            <EditIcon fontSize="small" />
          </IconButton>
          {canDelete && (
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClick();
              }}
              aria-label="Видалити"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, px: 0 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => onTabChange(v)}
          sx={{ minHeight: 36, borderBottom: 1, borderColor: 'divider', px: 1 }}
        >
          <Tab label="Роботи" sx={{ minHeight: 36, py: 0.5 }} />
          <Tab label="Матеріали" sx={{ minHeight: 36, py: 0.5 }} />
        </Tabs>
        <Box sx={{ pt: 0.5 }}>
          <Sheet
            config={config}
            adapter={adapter ?? undefined}
            documentId={null}
            initialSnapshot={initialSnapshot}
            readonly={false}
          />
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
