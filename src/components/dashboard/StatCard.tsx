import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
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
  href?: string;
  onClick?: () => void;
  tileIndex?: 1 | 2 | 3 | 4;
}

const StatCardComponent: React.FC<StatCardProps> = ({
  label,
  value,
  suffix = '',
  isCurrencyVND = false,
  icon,
  accentColor = 'var(--accent)',
  subtitle,
  className,
  href,
  onClick,
  tileIndex = 1,
}) => {
  const tileStyles: Record<1 | 2 | 3 | 4, string> = {
    1: 'bg-[var(--tile-1)] text-[var(--tile-ink)]',
    2: 'bg-[var(--tile-2)] text-[var(--tile-ink)]',
    3: 'bg-[var(--tile-3)] text-[var(--tile-ink)]',
    4: 'bg-[var(--tile-4)] text-[var(--tile-ink)]',
  };

  const cardContent = (
    <div
      className={cn(
        'p-5 rounded-[20px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] relative overflow-hidden flex flex-col justify-between min-h-[140px] transition-all duration-200 ease-out select-none group',
        tileStyles[tileIndex],
        href || onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg' : '',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold opacity-75 tracking-wide flex items-center gap-1.5">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {href && (
            <ArrowUpRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          )}
          <div className="w-8 h-8 rounded-lg bg-black/10 dark:bg-white/10 flex items-center justify-center shrink-0">
            {icon}
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight tabular-nums">
          {isCurrencyVND ? (
            <AnimatedNumber value={value} suffix=" ₫" thousandSeparator="." />
          ) : (
            <AnimatedNumber value={value} suffix={suffix} thousandSeparator="," />
          )}
        </div>
        {subtitle && (
          <p className="text-xs opacity-70 mt-1 truncate font-medium">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block h-full focus:outline-none">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
};

export const StatCard = memo(StatCardComponent);
export default StatCard;
