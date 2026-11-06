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

const BAR_COLORS = [
  '#7c3aed',
  '#2563eb',
  '#22d3ee',
  '#10b981',
  '#ec4899',
];

export const MiniBarChart: React.FC<MiniBarChartProps> = ({
  items,
  unit = 'plays',
}) => {
  const maxVal = Math.max(...items.map((i) => i.value), 1);

  if (items.length === 0) {
    return (
      <p className="text-sm text-[#94a3b8] py-6 text-center">
        No play sessions recorded yet.
      </p>
    );
  }

  return (
    <div className="space-y-3.5">
      {items.map((item, idx) => {
        const widthPercent = Math.max(Math.round((item.value / maxVal) * 100), 8);
        const barColor = item.color || BAR_COLORS[idx % BAR_COLORS.length];

        const rowContent = (
          <div className="space-y-1.5 group">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="font-semibold text-[#f1f5f9] group-hover:text-[#a78bfa] transition-colors truncate pr-3">
                {idx + 1}. {item.label}
              </span>
              <span className="font-mono font-semibold text-[#94a3b8] tabular-nums shrink-0">
                {item.value} {unit}
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-[#16162a] overflow-hidden border border-white/[0.05]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${widthPercent}%` }}
                transition={{ duration: 0.6, delay: idx * 0.08, ease: 'easeOut' }}
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
