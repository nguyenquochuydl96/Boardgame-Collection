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
            className="block text-xs font-semibold text-[var(--ink-2)] tracking-wide"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--muted)]">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full min-h-[42px] rounded-xl bg-[var(--card)] text-[var(--ink)] placeholder:text-[var(--muted)] transition-all duration-200 ease-out focus:outline-none shadow-[inset_0_0_0_1px_var(--line-2)] focus:shadow-[inset_0_0_0_1.5px_var(--accent),0_0_0_4px_var(--accent-soft)] px-3.5 py-2 text-sm font-medium',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'shadow-[inset_0_0_0_1.5px_var(--bad)] focus:shadow-[inset_0_0_0_1.5px_var(--bad),0_0_0_4px_var(--bad-soft)]',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[var(--muted)]">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-[var(--bad)] font-medium">{error}</p>}
        {!error && helperText && (
          <p className="text-xs text-[var(--muted)]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
