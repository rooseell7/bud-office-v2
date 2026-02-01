import React, { useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Popover,
} from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import { getComputedStyleForSelection } from '../engine/computedStyle';
import type { SheetState } from '../engine/state';
import type { StylePatch } from '../engine/types';

const FILL_COLORS = [
  '#ffffff', '#f5f5f5', '#e0e0e0', '#bdbdbd', '#9e9e9e', '#757575', '#424242', '#212121',
  '#ffcdd2', '#ef9a9a', '#e57373', '#ef5350', '#f44336',
  '#ffe0b2', '#ffcc80', '#ffb74d', '#ffa726', '#ff9800',
  '#fff9c4', '#fff59d', '#fff176', '#ffee58', '#ffeb3b',
  '#c8e6c9', '#a5d6a7', '#81c784', '#66bb6a', '#4caf50',
  '#b3e5fc', '#81d4fa', '#4fc3f7', '#29b6f6', '#03a9f4',
  '#bbdefb', '#90caf9', '#64b5f6', '#42a5f5', '#2196f3',
  '#c5cae9', '#9fa8da', '#7986cb', '#5c6bc0', '#3f51b5',
  '#e1bee7', '#ce93d8', '#ba68c8', '#ab47bc', '#9c27b0',
  '#f8bbd0', '#f48fb1', '#f06292', '#ec407a', '#e91e63',
  '#ffecb3', '#ffe082', '#ffd54f', '#ffca28', '#ffc107',
];

export type ToolbarProps = {
  state: SheetState;
  onApplyStyles: (patch: StylePatch) => void;
  readonly?: boolean;
};

export const Toolbar: React.FC<ToolbarProps> = ({
  state,
  onApplyStyles,
  readonly = false,
}) => {
  const computed = getComputedStyleForSelection(state);

  const handleBold = () => {
    const bold = computed.bold === 'on' ? false : true;
    onApplyStyles({ bold });
  };

  const handleItalic = () => {
    const italic = computed.italic === 'on' ? false : true;
    onApplyStyles({ italic });
  };

  const handleAlign = (align: 'left' | 'center' | 'right') => {
    onApplyStyles({ align });
  };

  const handleFormat = (numberFormat: 'plain' | 'number' | 'uah' | 'percent') => {
    onApplyStyles({ numberFormat });
  };

  const handleFill = (fill: string) => {
    onApplyStyles({ fill });
    setFillAnchor(null);
  };

  const [fillAnchor, setFillAnchor] = useState<HTMLButtonElement | null>(null);

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'nowrap',
        gap: 0.5,
        alignItems: 'center',
        p: 0.5,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'action.hover',
      }}
    >
      <Button
        size="small"
        variant={computed.bold === 'on' ? 'contained' : 'outlined'}
        onClick={handleBold}
        disabled={readonly}
      >
        <FormatBoldIcon fontSize="small" />
      </Button>
      <Button
        size="small"
        variant={computed.italic === 'on' ? 'contained' : 'outlined'}
        onClick={handleItalic}
        disabled={readonly}
      >
        <FormatItalicIcon fontSize="small" />
      </Button>
      <ButtonGroup size="small" disabled={readonly}>
        <Button
          variant={computed.align === 'left' ? 'contained' : 'outlined'}
          onClick={() => handleAlign('left')}
        >
          <FormatAlignLeftIcon fontSize="small" />
        </Button>
        <Button
          variant={computed.align === 'center' ? 'contained' : 'outlined'}
          onClick={() => handleAlign('center')}
        >
          <FormatAlignCenterIcon fontSize="small" />
        </Button>
        <Button
          variant={computed.align === 'right' ? 'contained' : 'outlined'}
          onClick={() => handleAlign('right')}
        >
          <FormatAlignRightIcon fontSize="small" />
        </Button>
      </ButtonGroup>
      <ButtonGroup size="small" disabled={readonly}>
        {(['plain', 'number', 'uah', 'percent'] as const).map((fmt) => (
          <Button
            key={fmt}
            variant={computed.numberFormat === fmt ? 'contained' : 'outlined'}
            onClick={() => handleFormat(fmt)}
            sx={{ minWidth: 48, fontSize: 12 }}
          >
            {fmt === 'plain' ? 'Текст' : fmt === 'number' ? 'Число' : fmt === 'uah' ? 'грн' : '%'}
          </Button>
        ))}
      </ButtonGroup>
      <Button
        size="small"
        variant="outlined"
        onClick={(e) => !readonly && setFillAnchor(e.currentTarget)}
        disabled={readonly}
        title="Заливка"
      >
        <FormatColorFillIcon fontSize="small" />
      </Button>
      <Popover
        open={Boolean(fillAnchor)}
        anchorEl={fillAnchor}
        onClose={() => setFillAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 0.25, p: 1 }}>
          {FILL_COLORS.map((color) => (
            <Box
              key={color}
              component="button"
              onClick={() => handleFill(color)}
              sx={{
                width: 28,
                height: 28,
                borderRadius: 0.5,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: color,
                cursor: 'pointer',
                '&:hover': { opacity: 0.9 },
              }}
            />
          ))}
        </Box>
      </Popover>
      <ButtonGroup size="small" disabled={readonly}>
        <Button
          variant="outlined"
          onClick={() => onApplyStyles({ decimalPlacesDelta: -1 })}
          title="Зменшити кількість десяткових"
          sx={{ minWidth: 40, fontSize: 12 }}
        >
          .0
        </Button>
        <Button
          variant="outlined"
          onClick={() => onApplyStyles({ decimalPlacesDelta: 1 })}
          title="Збільшити кількість десяткових"
          sx={{ minWidth: 40, fontSize: 12 }}
        >
          .00
        </Button>
      </ButtonGroup>
    </Box>
  );
};
