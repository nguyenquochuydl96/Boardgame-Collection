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
        'bg-[var(--coral)] text-[var(--ink)] border-[1.5px] border-[var(--ink)] shadow-[var(--shadow-brutal-sm)] hover:bg-[var(--butter)] hover:shadow-[var(--shadow-brutal)] active:shadow-[var(--shadow-brutal-xs)]',
      secondary:
        'bg-[var(--teal)] text-[var(--cream)] border-[1.5px] border-[var(--ink)] shadow-[var(--shadow-brutal-sm)] hover:bg-[var(--ink)] hover:text-[var(--cream)] hover:shadow-[var(--shadow-brutal)] active:shadow-[var(--shadow-brutal-xs)]',
      butter:
        'bg-[var(--butter)] text-[var(--ink)] border-[1.5px] border-[var(--ink)] shadow-[var(--shadow-brutal-sm)] hover:bg-[var(--coral)] hover:shadow-[var(--shadow-brutal)] active:shadow-[var(--shadow-brutal-xs)]',
      outline:
        'bg-[var(--bg-card)] text-[var(--text-primary)] border-[1.5px] border-[var(--ink)] shadow-[var(--shadow-brutal-sm)] hover:bg-[var(--ink)] hover:text-[var(--cream)] hover:shadow-[var(--shadow-brutal)]',
      ghost:
        'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 border border-transparent',
      danger:
        'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-[1.5px] border-[var(--ink)] shadow-[var(--shadow-brutal-sm)] hover:bg-rose-500/30',
    };

    const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: 'min-h-[36px] px-3.5 py-1 text-xs font-bold rounded-full gap-1.5',
      md: 'min-h-[42px] px-4 py-2 text-sm font-bold rounded-full gap-2',
      lg: 'min-h-[48px] px-6 py-2.5 text-base font-extrabold rounded-full gap-2.5',
      icon: 'min-h-[40px] min-w-[40px] p-2 rounded-full justify-center',
    };

    return (
      <motion.button
        ref={ref}
        type={type}
        whileHover={{ translateY: disabled || isLoading ? 0 : -2 }}
        whileTap={{ translateY: disabled || isLoading ? 0 : 1 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap shrink-0 transition-all font-display duration-200 ease-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--coral)] disabled:opacity-50 disabled:cursor-not-allowed select-none group',
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
          <span className="w-5 h-5 rounded-full bg-[var(--coral)] text-[var(--ink)] flex items-center justify-center ml-1 border border-[var(--ink)] group-hover:rotate-45 transition-transform duration-300">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
