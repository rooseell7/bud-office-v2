import React, { useState } from 'react';
import { Button, Menu, MenuItem } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { exportSheetXlsx, exportSheetPdf } from '../../api/documents';

export type ExportButtonProps = {
  documentId: number | null;
  disabled?: boolean;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  documentId,
  disabled = false,
}) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    if (!documentId) return;
    setLoading(format);
    try {
      const fn = format === 'xlsx' ? exportSheetXlsx : exportSheetPdf;
      const blob = await fn(documentId);
      downloadBlob(blob, `sheet-${documentId}.${format}`);
    } catch {
      // ignore
    } finally {
      setLoading(null);
      setAnchor(null);
    }
  };

  if (!documentId) return null;

  return (
    <>
      <Button
        size="small"
        onClick={(e) => setAnchor(e.currentTarget)}
        disabled={disabled}
      >
        <DownloadIcon fontSize="small" sx={{ mr: 0.5 }} />
        Експорт
      </Button>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <MenuItem onClick={() => handleExport('xlsx')} disabled={!!loading}>
          {loading === 'xlsx' ? '…' : 'Excel (XLSX)'}
        </MenuItem>
        <MenuItem onClick={() => handleExport('pdf')} disabled={!!loading}>
          {loading === 'pdf' ? '…' : 'PDF'}
        </MenuItem>
      </Menu>
    </>
  );
};
