import React from 'react';
import { cn } from './cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'violet' | 'blue' | 'green' | 'orange' | 'pink' | 'cyan' | 'neutral';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  tone = 'violet',
  children,
  ...props
}) => {
  const tones: Record<NonNullable<BadgeProps['tone']>, string> = {
    violet: 'bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--accent)]/20',
    blue: 'bg-[var(--info-soft)] text-[var(--info)] border border-[var(--info)]/20',
    green: 'bg-[var(--good-soft)] text-[var(--good)] border border-[var(--good)]/20',
    orange: 'bg-[var(--warn-soft)] text-[var(--warn)] border border-[var(--warn)]/20',
    pink: 'bg-[var(--bad-soft)] text-[var(--bad)] border border-[var(--bad)]/20',
    cyan: 'bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--accent)]/20',
    neutral: 'bg-[var(--card-3)] text-[var(--ink-2)] border border-[var(--line-2)]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors duration-200',
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
