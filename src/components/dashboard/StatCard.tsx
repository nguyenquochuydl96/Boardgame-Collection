import React from 'react';
import { useAnimatedCounter } from '../../hooks/useAnimatedCounter';
import { formatVND } from '../../lib/utils';
import { Card } from '../ui/Card';
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
  accentColor = '#7c3aed',
  subtitle,
  className,
}) => {
  const animatedValue = useAnimatedCounter(value, 650);

  const formatted = isCurrencyVND
    ? formatVND(animatedValue)
    : `${animatedValue.toLocaleString('en-US')}${suffix}`;

  return (
    <Card
      className={cn(
        'p-5 relative overflow-hidden flex flex-col justify-between gap-3',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-[#94a3b8] tracking-wide">
          {label}
        </span>
        <div
          style={{
            backgroundColor: `${accentColor}20`,
            color: accentColor,
            borderColor: `${accentColor}40`,
          }}
          className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
        >
          {icon}
        </div>
      </div>

      <div>
        <p className="font-display font-extrabold text-2xl sm:text-3xl text-[#f1f5f9] tabular-nums tracking-tight">
          {formatted}
        </p>
        {subtitle && (
          <p className="text-xs text-[#94a3b8] mt-1 truncate">{subtitle}</p>
        )}
      </div>
    </Card>
  );
};

export default StatCard;
