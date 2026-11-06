import React, { memo } from 'react';
import { GameStatus } from '../../types';
import { STATUS_CONFIG } from '../../lib/utils';
import { cn } from '../ui/cn';

export interface GameStatusBadgeProps {
  status: GameStatus;
  className?: string;
}

export const GameStatusBadge: React.FC<GameStatusBadgeProps> = memo(({
  status,
  className,
}) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.own;

  return (
    <span
      style={{
        backgroundColor: cfg.bg,
        borderColor: cfg.border,
        color: cfg.color,
      }}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap shrink-0 transition-colors duration-200',
        className
      )}
    >
      {cfg.label}
    </span>
  );
});

export default GameStatusBadge;
