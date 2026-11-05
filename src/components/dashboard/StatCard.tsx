import React from 'react';
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
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  suffix = '',
  isCurrencyVND = false,
  icon,
  subtitle,
  className,
  href,
  onClick,
}) => {
  const cardContent = (
    <div
      className={cn(
        'p-5 relative rounded-xl bg-[var(--bg-card)] border-[1.5px] border-[var(--ink)] shadow-[var(--shadow-brutal)] hover:shadow-[var(--shadow-brutal-hover)] transition-all duration-300 ease-out flex flex-col justify-between gap-3 group select-none hover:-translate-y-1',
        href || onClick ? 'cursor-pointer' : '',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider font-display text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {href && (
            <div className="w-6 h-6 rounded-full bg-[var(--paper)] border border-[var(--ink)] flex items-center justify-center text-[var(--ink)] group-hover:bg-[var(--coral)] group-hover:rotate-45 transition-all">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          )}
          <div className="w-10 h-10 rounded-xl bg-[var(--butter)] border-[1.5px] border-[var(--ink)] text-[var(--ink)] shadow-[2px_2px_0_var(--ink)] flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:rotate-3 transition-transform">
            {icon}
          </div>
        </div>
      </div>

      <div>
        <div className="font-display font-black text-2xl sm:text-3xl text-[var(--text-primary)] tabular-nums tracking-tight">
          {isCurrencyVND ? (
            <AnimatedNumber value={value} suffix=" ₫" thousandSeparator="." />
          ) : (
            <AnimatedNumber value={value} suffix={suffix} thousandSeparator="," />
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-[var(--text-secondary)] mt-1 truncate font-medium">
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

export default StatCard;
