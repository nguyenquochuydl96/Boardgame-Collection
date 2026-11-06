import React from 'react';
import { motion } from 'motion/react';
import { cn } from './cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      primary:
        'bg-[var(--accent)] text-[var(--accent-ink)] shadow-md shadow-[var(--accent)]/20 hover:brightness-105 active:brightness-95 border-0 font-bold',
      secondary:
        'bg-[var(--card)] text-[var(--ink)] shadow-[inset_0_0_0_1px_var(--line-2)] hover:bg-[var(--card-2)] active:bg-[var(--card-3)] font-semibold',
      dark:
        'bg-[var(--ink)] text-[var(--bg)] hover:opacity-90 active:opacity-100 font-bold',
      outline:
        'bg-transparent text-[var(--ink)] shadow-[inset_0_0_0_1px_var(--line-2)] hover:bg-[var(--card-2)] font-semibold',
      ghost:
        'bg-transparent text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--card-2)] border-0 font-medium',
      danger:
        'bg-[var(--bad-soft)] text-[var(--bad)] hover:brightness-95 border-0 font-semibold',
    };

    const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: 'min-h-[34px] px-3 py-1.5 text-xs font-semibold rounded-xl gap-1.5',
      md: 'min-h-[42px] px-4 py-2 text-sm font-semibold rounded-xl gap-2',
      lg: 'min-h-[48px] px-6 py-2.5 text-base font-bold rounded-2xl gap-2.5',
      icon: 'min-h-[42px] min-w-[42px] p-2 rounded-xl justify-center',
    };

    return (
      <motion.button
        ref={ref}
        type={type}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.015 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.96 }}
        transition={{ type: 'spring', stiffness: 450, damping: 25 }}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap shrink-0 transition-all duration-200 ease-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-45 disabled:cursor-not-allowed select-none',
          variants[variant],
          sizes[size],
          className
        )}
        {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
