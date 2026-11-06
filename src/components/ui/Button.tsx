import React from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from './cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'butter';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  withArrowDot?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      withArrowDot = false,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      primary:
        'bg-[var(--accent-primary)] text-[var(--accent-ink)] hover:bg-[var(--accent-hi)] shadow-sm shadow-[var(--accent-primary)]/20 active:scale-[0.98]',
      secondary:
        'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--line-2)] hover:bg-[var(--bg-elevated)] shadow-xs active:scale-[0.98]',
      butter:
        'bg-[var(--accent-secondary)] text-white hover:opacity-90 shadow-sm shadow-[var(--accent-secondary)]/20 active:scale-[0.98]',
      outline:
        'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--line-2)] hover:bg-[var(--bg-surface)] shadow-xs active:scale-[0.98]',
      ghost:
        'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border border-transparent',
      danger:
        'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 active:scale-[0.98]',
    };

    const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: 'min-h-[34px] px-3 py-1 text-xs font-semibold rounded-xl gap-1.5',
      md: 'min-h-[40px] px-4 py-2 text-sm font-semibold rounded-xl gap-2',
      lg: 'min-h-[46px] px-5 py-2.5 text-base font-bold rounded-xl gap-2.5',
      icon: 'min-h-[38px] min-w-[38px] p-2 rounded-xl justify-center',
    };

    return (
      <motion.button
        ref={ref}
        type={type}
        whileHover={{ translateY: disabled || isLoading ? 0 : -1.5 }}
        whileTap={{ translateY: disabled || isLoading ? 0 : 0.5 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap shrink-0 transition-all font-sans duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] disabled:opacity-50 disabled:cursor-not-allowed select-none group',
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
        {withArrowDot && (
          <span className="w-5 h-5 rounded-full bg-[var(--accent-secondary)] text-white flex items-center justify-center ml-1 group-hover:rotate-45 transition-transform duration-300">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
