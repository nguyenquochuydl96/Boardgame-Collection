import React from 'react';
import { motion } from 'motion/react';
import { Check, Crown } from 'lucide-react';
import { Player } from '../../types';
import { PlayerAvatar } from './PlayerAvatar';
import { cn } from '../ui/cn';

export interface PlayerChipProps {
  player?: Player;
  name?: string;
  color?: string;
  avatar?: string;
  selected?: boolean;
  isWinner?: boolean;
  score?: number;
  onClick?: () => void;
  size?: 'sm' | 'md';
  className?: string;
}

export const PlayerChip: React.FC<PlayerChipProps> = ({
  player,
  name,
  color,
  avatar,
  selected = false,
  isWinner = false,
  score,
  onClick,
  size = 'md',
  className,
}) => {
  const resolvedName = player?.name || name || 'Player';
  const resolvedColor = player?.color || color || 'var(--accent-primary)';
  const resolvedAvatar = player?.avatar || avatar;

  const content = (
    <>
      <PlayerAvatar
        name={resolvedName}
        avatar={resolvedAvatar}
        color={resolvedColor}
        size="sm"
      />
      <span className="font-semibold text-[var(--text-primary)]">{resolvedName}</span>
      {typeof score === 'number' && (
        <span className="font-mono text-xs text-[var(--text-secondary)] tabular-nums">
          ({score})
        </span>
      )}
      {isWinner && (
        <Crown
          className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0 animate-bounce"
          aria-label="Winner"
        />
      )}
      {selected && onClick && (
        <Check
          className="w-4 h-4 shrink-0"
          style={{ color: resolvedColor }}
        />
      )}
    </>
  );

  const sharedStyle = {
    borderColor: selected ? resolvedColor : 'var(--border-subtle)',
    backgroundColor: selected ? `${resolvedColor}26` : 'var(--bg-surface)',
  };

  const sharedClasses = cn(
    'inline-flex items-center gap-2 rounded-xl border transition-all duration-200 whitespace-nowrap shrink-0 select-none',
    size === 'sm' ? 'px-2.5 py-1 text-xs' : 'min-h-[42px] px-3.5 py-1.5 text-sm',
    selected && 'shadow-md shadow-[var(--accent-glow)] font-bold',
    className
  );

  if (onClick) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ scale: 1.04, y: -1 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 420, damping: 25 }}
        style={sharedStyle}
        className={cn(sharedClasses, 'cursor-pointer hover:border-[var(--border-glow)]')}
      >
        {content}
      </motion.button>
    );
  }

  return (
    <div style={sharedStyle} className={sharedClasses}>
      {content}
    </div>
  );
};

export default PlayerChip;
