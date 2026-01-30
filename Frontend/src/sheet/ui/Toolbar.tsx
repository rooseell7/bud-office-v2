import React from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import { getComputedStyleForSelection } from '../engine/computedStyle';
import type { SheetState } from '../engine/state';
import type { StylePatch } from '../engine/types';

const FILL_COLORS = [
  '#ffffff',
  '#fff3e0',
  '#ffe0b2',
  '#ffcc80',
  '#ffb74d',
  '#ffa726',
  '#e3f2fd',
  '#bbdefb',
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
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
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
      <FormControl size="small" sx={{ minWidth: 100 }}>
        <InputLabel>Format</InputLabel>
        <Select
          label="Format"
          defaultValue="plain"
          onChange={(e) => handleFormat(e.target.value as any)}
          disabled={readonly}
        >
          <MenuItem value="plain">Plain</MenuItem>
          <MenuItem value="number">Number</MenuItem>
          <MenuItem value="uah">UAH</MenuItem>
          <MenuItem value="percent">%</MenuItem>
        </Select>
      </FormControl>
      <Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center' }}>
        {FILL_COLORS.map((color) => (
          <Box
            key={color}
            component="button"
            onClick={() => !readonly && handleFill(color)}
            sx={{
              width: 24,
              height: 24,
              borderRadius: 0.5,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: color,
              cursor: readonly ? 'default' : 'pointer',
              opacity: readonly ? 0.5 : 1,
              '&:hover': readonly ? {} : { opacity: 0.9 },
            }}
          />
        ))}
      </Box>
    </Box>
  );
};
