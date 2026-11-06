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
    violet: 'bg-[#7c3aed]/20 text-[#a78bfa] border-[#7c3aed]/40',
    blue: 'bg-[#2563eb]/20 text-sky-300 border-[#2563eb]/40',
    green: 'bg-[#10b981]/20 text-emerald-300 border-[#10b981]/40',
    orange: 'bg-[#f97316]/20 text-orange-300 border-[#f97316]/40',
    pink: 'bg-[#ec4899]/20 text-pink-300 border-[#ec4899]/40',
    cyan: 'bg-[#22d3ee]/20 text-cyan-300 border-[#22d3ee]/40',
    neutral: 'bg-slate-800/70 text-[#94a3b8] border-white/10',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap shrink-0 transition-colors duration-300',
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
