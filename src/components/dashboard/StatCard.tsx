import React from 'react';
import { TiltCard } from '../ui/TiltCard';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { cn } from '../ui/cn';

export interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  isCurrencyVND?: boolean;
  icon: React.ReactNode;
  accentColor?: string;
  subtitle?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  suffix = '',
  isCurrencyVND = false,
  icon,
  accentColor = 'var(--accent-primary)',
  subtitle,
  className,
}) => {
  return (
    <TiltCard
      maxTilt={5}
      glare={true}
      className={cn(
        'p-5 relative overflow-hidden flex flex-col justify-between gap-3 bg-[var(--bg-card)]/90 backdrop-blur-md border border-[var(--border-subtle)] hover:border-[var(--border-glow)]',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-[var(--text-secondary)] tracking-wide">
          {label}
        </span>
        <div
          style={{
            backgroundColor: `${accentColor}20`,
            color: accentColor,
            borderColor: `${accentColor}40`,
          }}
          className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-sm"
        >
          {icon}
        </div>
      </div>

      <div>
        <div className="font-display font-extrabold text-2xl sm:text-3xl text-[var(--text-primary)] tabular-nums tracking-tight">
          {isCurrencyVND ? (
            <AnimatedNumber value={value} suffix=" ₫" thousandSeparator="." />
          ) : (
            <AnimatedNumber value={value} suffix={suffix} thousandSeparator="," />
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-[var(--text-secondary)] mt-1 truncate">{subtitle}</p>
        )}
      </div>
    </TiltCard>
  );
};

export default StatCard;
