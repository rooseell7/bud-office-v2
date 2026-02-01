import React, { useEffect, useRef } from 'react';

export type CellEditorProps = {
  value: string;
  onChange: (value: string) => void;
  rowHeight: number;
  colWidth: number;
};

export const CellEditor: React.FC<CellEditorProps> = ({
  value,
  onChange,
  rowHeight,
  colWidth,
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
      style={{
        position: 'absolute',
        inset: 0,
        width: colWidth - 2,
        height: rowHeight - 2,
        margin: 1,
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
