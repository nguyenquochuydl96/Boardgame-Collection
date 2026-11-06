import React from 'react';
import { cn } from './cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'violet' | 'blue' | 'green' | 'orange' | 'pink' | 'cyan' | 'neutral' | 'butter' | 'coral' | 'teal';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  tone = 'teal',
  children,
  ...props
}) => {
  const tones: Record<NonNullable<BadgeProps['tone']>, string> = {
    teal: 'bg-[var(--accent-soft)] text-[var(--accent-primary)] border-[var(--accent-primary)]/20',
    coral: 'bg-[var(--butter-soft)] text-[var(--accent-secondary)] border-[var(--accent-secondary)]/20',
    butter: 'bg-[var(--butter-soft)] text-[var(--accent-secondary)] border-[var(--accent-secondary)]/20',
    green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    orange: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    pink: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    blue: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    violet: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    neutral: 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--line-2)]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border whitespace-nowrap shrink-0 select-none',
        tones[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
