'use client';

import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-cru-accent-garnet text-white hover:bg-[#5a1422] active:bg-[#4a1019] border border-transparent shadow-sm',
  secondary:
    'bg-cru-surface text-cru-text hover:bg-cru-surface-raised border border-cru-border shadow-sm',
  outline:
    'bg-transparent text-cru-text border border-cru-border hover:border-cru-accent-garnet hover:text-cru-accent-garnet',
  ghost:
    'bg-transparent text-cru-text-muted hover:text-cru-text hover:bg-cru-surface-raised border border-transparent',
  danger:
    'bg-transparent text-red-700 hover:bg-red-50 border border-red-200 hover:border-red-400',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-6 text-sm gap-2.5',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', loading = false, leftIcon, rightIcon, disabled, children, className, ...props },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={clsx(
          'inline-flex items-center justify-center font-ui font-medium rounded transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cru-accent-garnet focus-visible:ring-offset-2 focus-visible:ring-offset-cru-bg',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          isDisabled && 'opacity-50 cursor-not-allowed',
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
        ) : (
          leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
        )}
        {children}
        {rightIcon && !loading && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';
export default Button;
