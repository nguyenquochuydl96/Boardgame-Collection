import React from 'react';
import { cn } from './cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-bold uppercase tracking-wider font-display text-[var(--text-secondary)]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--text-secondary)]">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full min-h-[44px] rounded-xl bg-[var(--bg-card)] border-[1.5px] border-[var(--ink)] shadow-[var(--shadow-brutal-xs)] px-3.5 py-2.5 text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all duration-200 ease-out focus:outline-none focus:shadow-[var(--shadow-brutal-sm)] focus:border-[var(--coral)]',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-rose-500 shadow-rose-500/20',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[var(--text-secondary)]">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs font-semibold text-rose-500">{error}</p>}
        {!error && helperText && (
          <p className="text-xs text-[var(--text-secondary)]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
