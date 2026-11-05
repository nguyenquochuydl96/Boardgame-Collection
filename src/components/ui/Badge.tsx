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
    teal: 'bg-[var(--teal)] text-[var(--cream)] border-[var(--ink)]',
    coral: 'bg-[var(--coral)] text-[var(--ink)] border-[var(--ink)]',
    butter: 'bg-[var(--butter)] text-[var(--ink)] border-[var(--ink)]',
    green: 'bg-emerald-600 text-white border-[var(--ink)]',
    orange: 'bg-[var(--coral)] text-[var(--ink)] border-[var(--ink)]',
    pink: 'bg-rose-400 text-[var(--ink)] border-[var(--ink)]',
    cyan: 'bg-[var(--teal-2)] text-[var(--cream)] border-[var(--ink)]',
    blue: 'bg-[var(--teal)] text-[var(--cream)] border-[var(--ink)]',
    violet: 'bg-[var(--coral-deep)] text-white border-[var(--ink)]',
    neutral: 'bg-[var(--paper)] text-[var(--ink)] border-[var(--ink)]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border-[1.5px] shadow-[var(--shadow-brutal-xs)] whitespace-nowrap shrink-0 transition-transform duration-200 select-none',
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
