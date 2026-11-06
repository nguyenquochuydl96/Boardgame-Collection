import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export interface MiniBarItem {
  id: string;
  label: string;
  value: number;
  href?: string;
  color?: string;
}

export interface MiniBarChartProps {
  items: MiniBarItem[];
  unit?: string;
}

const FITLO_BAR_COLORS = [
  'var(--accent)',
  '#1e7548',
  '#f08a5d',
  '#2c5d87',
  '#b42318',
];

export const MiniBarChart: React.FC<MiniBarChartProps> = ({
  items,
  unit = 'plays',
}) => {
  const maxVal = Math.max(...items.map((i) => i.value), 1);

  if (items.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)] py-6 text-center font-medium">
        No play sessions recorded yet.
      </p>
    );
  }

  return (
    <div className="space-y-3.5">
      {items.map((item, idx) => {
        const widthPercent = Math.max(Math.round((item.value / maxVal) * 100), 8);
        const barColor = item.color || FITLO_BAR_COLORS[idx % FITLO_BAR_COLORS.length];

        const rowContent = (
          <div className="space-y-1.5 group">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="font-semibold text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors truncate pr-3">
                {idx + 1}. {item.label}
              </span>
              <span className="font-mono font-bold text-[var(--muted)] tabular-nums shrink-0">
                {item.value} {unit}
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-[var(--card-3)] overflow-hidden shadow-[inset_0_0_0_1px_var(--line)]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${widthPercent}%` }}
                transition={{ duration: 0.6, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                style={{ backgroundColor: barColor }}
                className="h-full rounded-full"
              />
            </div>
          </div>
        );

        return item.href ? (
          <Link key={item.id} to={item.href} className="block">
            {rowContent}
          </Link>
        ) : (
          <div key={item.id}>{rowContent}</div>
        );
      })}
    </div>
  );
};

export default MiniBarChart;
