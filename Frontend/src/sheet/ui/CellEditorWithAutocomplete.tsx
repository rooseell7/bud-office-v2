/**
 * Cell editor with autocomplete from works/materials dict.
 * Used for "Найменування" column in КП stage sheets.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { searchWorkItems } from '../../api/workItems';
import { searchMaterials } from '../../api/materials';

export type CellEditorWithAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onCommit?: () => void;
  onSelectWithUnit?: (name: string, unit?: string | null, materialId?: number) => void;
  rowHeight: number;
  colWidth: number;
  type: 'works' | 'materials';
};

export const CellEditorWithAutocomplete: React.FC<CellEditorWithAutocompleteProps> = ({
  value,
  onChange,
  onBlur,
  onCommit,
  onSelectWithUnit,
  rowHeight,
  colWidth,
  type,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [options, setOptions] = useState<{ id: number; name: string; unit?: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const fetchOptions = async (q: string) => {
    if (!q.trim()) {
      setOptions([]);
      return;
    }
    setLoading(true);
    try {
      const items = type === 'works'
        ? await searchWorkItems(q)
        : await searchMaterials(q);
      setOptions(items);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleInputChange = (_: unknown, v: string) => {
    setInputValue(v);
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchOptions(v), 250);
  };

  const handleChange = (_: unknown, opt: { id: number; name: string; unit?: string | null } | null) => {
    if (opt) {
      setInputValue(opt.name);
      onChange(opt.name);
      onSelectWithUnit?.(opt.name, opt.unit ?? null, opt.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      onChange(inputValue);
      onCommit?.();
    }
  };

  return (
    <Autocomplete
      freeSolo
      value={null}
      options={options}
      getOptionLabel={(o) => (typeof o === 'string' ? o : o.name)}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onChange={handleChange}
      onBlur={onBlur}
      loading={loading}
      autoSelect={false}
      autoHighlight={false}
      renderInput={(params) => (
        <TextField
          {...params}
          inputRef={inputRef}
          size="small"
          variant="standard"
          InputProps={{
            ...params.InputProps,
            disableUnderline: true,
            onKeyDown: handleKeyDown,
            style: {
              fontSize: 13,
              padding: '0 8px',
              height: '100%',
              boxSizing: 'border-box',
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              padding: 0,
              height: rowHeight - 2,
            },
          }}
        />
      )}
      sx={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'stretch',
        '& .MuiAutocomplete-root': { width: '100%', height: '100%' },
        '& .MuiFormControl-root': { width: '100%', height: '100%' },
        '& .MuiInputBase-root': {
          width: '100%',
          height: '100%',
          background: 'var(--sheet-cell-bg)',
          color: 'var(--sheet-cell-text)',
          border: '2px solid var(--sheet-active-border)',
          borderRadius: 0,
          boxSizing: 'border-box',
        },
      }}
    />
  );
};
