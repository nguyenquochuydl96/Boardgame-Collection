import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
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
  href?: string;
  onClick?: () => void;
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
  href,
  onClick,
}) => {
  const cardContent = (
    <TiltCard
      maxTilt={5}
      glare={true}
      className={cn(
        'p-5 relative overflow-hidden flex flex-col justify-between gap-3 bg-[var(--bg-card)]/90 backdrop-blur-md border border-[var(--border-subtle)] hover:border-[var(--border-glow)] transition-all duration-300 group select-none',
        href || onClick ? 'cursor-pointer hover:shadow-xl hover:shadow-[var(--accent-glow)]' : '',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-[var(--text-secondary)] tracking-wide group-hover:text-[var(--text-primary)] transition-colors">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {href && (
            <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent-neon)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          )}
          <div
            style={{
              backgroundColor: `${accentColor}20`,
              color: accentColor,
              borderColor: `${accentColor}40`,
            }}
            className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform"
          >
            {icon}
          </div>
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
          <p className="text-xs text-[var(--text-secondary)] mt-1 truncate group-hover:text-[var(--text-primary)] transition-colors">
            {subtitle}
          </p>
        )}
      </div>
    </TiltCard>
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
