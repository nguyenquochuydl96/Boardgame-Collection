import React from 'react';
import { cn } from './cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, id, ...props }, ref) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-[#94a3b8] tracking-wide"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#94a3b8]">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full min-h-[44px] rounded-xl bg-[#16162a] border border-white/10 px-3.5 py-2.5 text-sm text-[#f1f5f9] placeholder:text-[#475569] transition-all duration-300 ease-out focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/30',
              leftIcon && 'pl-10',
              error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
        {!error && helperText && (
          <p className="text-xs text-[#94a3b8]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
