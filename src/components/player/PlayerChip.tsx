import React from 'react';
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
  const resolvedColor = player?.color || color || '#7c3aed';
  const resolvedAvatar = player?.avatar || avatar;

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      style={{
        borderColor: selected ? resolvedColor : 'rgba(255,255,255,0.1)',
        backgroundColor: selected ? `${resolvedColor}22` : 'rgba(30,30,53,0.75)',
      }}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl border transition-all duration-200 whitespace-nowrap shrink-0',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'min-h-[42px] px-3.5 py-1.5 text-sm',
        onClick && 'cursor-pointer hover:border-white/30 active:scale-95',
        selected && 'shadow-md',
        className
      )}
    >
      <PlayerAvatar
        name={resolvedName}
        avatar={resolvedAvatar}
        color={resolvedColor}
        size="sm"
      />
      <span className="font-semibold text-[#f1f5f9]">{resolvedName}</span>
      {typeof score === 'number' && (
        <span className="font-mono text-xs text-[#94a3b8] tabular-nums">
          ({score})
        </span>
      )}
      {isWinner && (
        <Crown
          className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0"
          aria-label="Winner"
        />
      )}
      {selected && onClick && (
        <Check
          className="w-4 h-4 shrink-0"
          style={{ color: resolvedColor }}
        />
      )}
    </Component>
  );
};

export default PlayerChip;
