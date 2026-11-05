import React from 'react';
import { motion } from 'motion/react';
import { GameStatus } from '../../types';
import { cn } from '../ui/cn';

export interface GameStatusBadgeProps {
  status: GameStatus;
  className?: string;
}

const STATUS_MAP: Record<GameStatus, { label: string; bg: string; text: string }> = {
  own: { label: 'Owned', bg: 'var(--teal)', text: 'var(--cream)' },
  rented: { label: 'Rented', bg: 'var(--butter)', text: 'var(--ink)' },
  lent_out: { label: 'Lent Out', bg: 'var(--coral)', text: 'var(--ink)' },
  borrowed: { label: 'Borrowed', bg: 'var(--teal-2)', text: 'var(--cream)' },
  sold: { label: 'Sold', bg: 'var(--paper)', text: 'var(--ink)' },
  wishlist: { label: 'Wishlist', bg: 'var(--butter-soft)', text: 'var(--ink)' },
  previously_owned: { label: 'Prev. Owned', bg: 'var(--paper)', text: 'var(--ink)' },
};

export const GameStatusBadge: React.FC<GameStatusBadgeProps> = ({
  status,
  className,
}) => {
  const cfg = STATUS_MAP[status] || STATUS_MAP.own;

  return (
    <motion.span
      key={status}
      initial={{ opacity: 0.8, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      style={{
        backgroundColor: cfg.bg,
        color: cfg.text,
      }}
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-display uppercase tracking-wider border border-[var(--ink)] shadow-[1px_1px_0_var(--ink)] whitespace-nowrap shrink-0 select-none',
        className
      )}
    >
      {cfg.label}
    </motion.span>
  );
};

export default GameStatusBadge;
