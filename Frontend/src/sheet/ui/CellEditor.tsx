import React, { useEffect, useRef } from 'react';

export type CellEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  rowHeight: number;
  colWidth: number;
};

export const CellEditor: React.FC<CellEditorProps> = ({
  value,
  onChange,
  onBlur,
  rowHeight: _rowHeight,
  colWidth: _colWidth,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        padding: '0 8px',
        fontSize: 13,
        border: '2px solid var(--sheet-active-border)',
        outline: 'none',
        boxSizing: 'border-box',
        background: 'var(--sheet-cell-bg)',
        color: 'var(--sheet-cell-text)',
      }}
    />
  );
};
