import React, { useState, useEffect } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import {
  listDocumentVersions,
  createDocumentVersion,
  restoreDocumentVersion,
  type DocumentVersionDto,
} from '../../api/documents';
import { serialize } from '../engine/serialize';
import type { SheetState } from '../engine/state';

export type VersionsButtonProps = {
  documentId: number | null;
  state: SheetState;
  onRestore: () => void;
  disabled?: boolean;
};

function fmtDate(s: string): string {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('uk-UA');
}

export const VersionsButton: React.FC<VersionsButtonProps> = ({
  documentId,
  state,
  onRestore,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<DocumentVersionDto[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && documentId) {
      setLoading(true);
      listDocumentVersions(documentId)
        .then((r) => setVersions(r.items ?? []))
        .catch(() => setVersions([]))
        .finally(() => setLoading(false));
    }
  }, [open, documentId]);

  const handleSaveVersion = async () => {
    if (!documentId) return;
    const snapshot = serialize(state);
    await createDocumentVersion(documentId, {
      type: 'manual',
      snapshot,
      note: 'Ручне збереження',
    });
    const r = await listDocumentVersions(documentId);
    setVersions(r.items ?? []);
  };

  const handleRestore = async (versionId: number) => {
    if (!documentId) return;
    await restoreDocumentVersion(documentId, versionId);
    onRestore();
    setOpen(false);
  };

  if (!documentId) return null;

  return (
    <>
      <Button size="small" onClick={() => setOpen(true)} disabled={disabled}>
        <HistoryIcon fontSize="small" sx={{ mr: 0.5 }} />
        Версії
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Історія версій</DialogTitle>
        <DialogContent>
          {loading ? (
            <div>Завантаження…</div>
          ) : (
            <List dense>
              {versions.map((v) => (
                <ListItem
                  key={v.id}
                  secondaryAction={
                    <Button size="small" onClick={() => handleRestore(v.id)}>
                      Відновити
                    </Button>
                  }
                >
                  <ListItemText
                    primary={fmtDate(v.createdAt)}
                    secondary={`${v.type}${v.note ? ` — ${v.note}` : ''}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSaveVersion} disabled={disabled}>
            Зберегти версію
          </Button>
          <Button onClick={() => setOpen(false)}>Закрити</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
