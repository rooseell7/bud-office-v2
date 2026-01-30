import type { ComponentProps } from 'react';
import { memo, useCallback, useEffect, useState } from 'react';

import { TextField } from '@mui/material';

export type CommitTextFieldProps = {
  value: string;
  onCommit: (v: string) => void;
  type?: string;
  textFieldProps?: Omit<ComponentProps<typeof TextField>, 'value' | 'onChange'> & Record<string, any>;
};

/**
 * PERF: локальний input state + commit на blur/Enter.
 * Так ми не перерендерюємо всю таблицю на кожен символ.
 */
export const CommitTextField = memo(function CommitTextField({
  value,
  onCommit,
  type = 'text',
  textFieldProps,
}: CommitTextFieldProps) {
  const [local, setLocal] = useState(value ?? '');
  const [focused, setFocused] = useState(false);

  // keep local in sync while not editing
  useEffect(() => {
    if (!focused) setLocal(value ?? '');
  }, [value, focused]);

  const forceCommit = useCallback(
    (next: string) => {
      onCommit(next);
    },
    [onCommit],
  );

  const {
    onFocus: extOnFocus,
    onBlur: extOnBlur,
    onChange: extOnChange,
    onKeyDown: extOnKeyDown,
    onPaste: extOnPaste,
    ...rest
  } = textFieldProps ?? {};

  const mergedSx = {
    ...(rest as any).sx,
    '& .MuiInputBase-input': {
      padding: '4px 6px',
      fontSize: 12,
      lineHeight: 1.2,
    },
    '& .MuiOutlinedInput-root': {
      minHeight: 30,
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: 'transparent',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: 'rgba(0,0,0,0.12)',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: 'rgba(25,118,210,0.6)',
    },
  };

  return (
    <TextField
      {...(rest as any)}
      sx={mergedSx}
      size={(rest as any).size ?? 'small'}
      value={local}
      type={type}
      onPaste={(e) => {
        extOnPaste?.(e as any);
      }}
      onFocus={(e) => {
        setFocused(true);
        extOnFocus?.(e as any);
      }}
      onBlur={(e) => {
        setFocused(false);
        extOnBlur?.(e as any);
        // commit on blur
        forceCommit(local);
      }}
      onChange={(e) => {
        extOnChange?.(e as any);
        setLocal((e.target as HTMLInputElement).value);
      }}
      onKeyDown={(e) => {
        extOnKeyDown?.(e as any);
        if ((e as any).defaultPrevented) return;

        if (e.key === 'Enter') {
          // by default: commit and blur (outer handler can preventDefault to keep focus)
          e.preventDefault();
          forceCommit(local);
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
});
