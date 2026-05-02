'use client';

import { forwardRef } from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftAdornment?: React.ReactNode;
  rightAdornment?: React.ReactNode;
  mono?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftAdornment,
      rightAdornment,
      mono = false,
      className,
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-2xs font-ui uppercase tracking-wider text-cru-text-muted"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftAdornment && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cru-text-muted">
              {leftAdornment}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'w-full h-9 px-3 text-sm transition-colors duration-150',
              'bg-cru-surface border border-cru-border rounded text-cru-text',
              'placeholder:text-cru-text-muted placeholder:opacity-60',
              'focus:outline-none focus:border-cru-accent-gold focus:shadow-gold-glow',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-red-800 focus:border-red-600',
              leftAdornment && 'pl-9',
              rightAdornment && 'pr-9',
              mono && 'font-mono',
              className,
            )}
            {...props}
          />
          {rightAdornment && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-cru-text-muted">
              {rightAdornment}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs font-ui text-red-400">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs font-ui text-cru-text-muted">{hint}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
