import React from 'react';
import { motion } from 'motion/react';
import { cn } from './cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
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
        'bg-[image:var(--gradient-hero)] text-white shadow-lg shadow-[#7c3aed]/25 hover:shadow-[#7c3aed]/40 border border-white/15',
      secondary:
        'bg-[#1e1e35] text-[#f1f5f9] hover:bg-[#272746] border border-white/10',
      outline:
        'bg-transparent text-[#f1f5f9] border border-[#7c3aed]/50 hover:bg-[#7c3aed]/15 hover:border-[#a78bfa]',
      ghost:
        'bg-transparent text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-white/5 border border-transparent',
      danger:
        'bg-rose-500/15 text-rose-300 border border-rose-500/35 hover:bg-rose-500/25',
    };

    const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: 'min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-xl gap-1.5',
      md: 'min-h-[44px] px-4 py-2.5 text-sm font-semibold rounded-xl gap-2',
      lg: 'min-h-[50px] px-6 py-3 text-base font-bold rounded-2xl gap-2.5',
      icon: 'min-h-[44px] min-w-[44px] p-2.5 rounded-xl justify-center',
    };

    return (
      <motion.button
        ref={ref}
        type={type}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.95 }}
        transition={{ duration: 0.15 }}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap shrink-0 transition-all duration-300 ease-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa] disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
      >
        {isLoading && (
          <span
            className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0"
            aria-hidden="true"
          />
        )}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
