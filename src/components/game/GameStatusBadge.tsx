import React from 'react';
import { motion } from 'motion/react';
import { GameStatus } from '../../types';
import { STATUS_CONFIG } from '../../lib/utils';
import { cn } from '../ui/cn';

export interface GameStatusBadgeProps {
  status: GameStatus;
  className?: string;
}

export const GameStatusBadge: React.FC<GameStatusBadgeProps> = ({
  status,
  className,
}) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.own;

  return (
    <motion.span
      key={status}
      initial={{ opacity: 0.7, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      style={{
        backgroundColor: cfg.bg,
        borderColor: cfg.border,
        color: cfg.color,
      }}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap shrink-0 backdrop-blur-md transition-colors duration-300',
        className
      )}
    >
      {cfg.label}
    </motion.span>
  );
};

export default GameStatusBadge;
