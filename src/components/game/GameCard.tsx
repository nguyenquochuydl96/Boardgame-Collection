import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Users, Clock, Star, Play, Dices, Edit3 } from 'lucide-react';
import { BoardGame } from '../../types';
import { GameStatusBadge } from './GameStatusBadge';
import { formatVND } from '../../lib/utils';
import { TiltCard } from '../ui/TiltCard';

export interface GameCardProps {
  game: BoardGame;
  playCount?: number;
  viewMode?: 'grid' | 'list';
  onEdit?: (game: BoardGame) => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  playCount = 0,
  viewMode = 'grid',
  onEdit,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (viewMode === 'list') {
    return (
      <motion.div
        whileHover={{ scale: 1.012, x: 4 }}
        whileTap={{ scale: 0.985 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      >
        <Link
          to={`/collection/${game.id}`}
          className="flex items-center gap-4 p-3.5 rounded-2xl bg-[var(--bg-card)]/90 backdrop-blur-md border border-[var(--border-subtle)] hover:border-[var(--border-glow)] hover:shadow-xl hover:shadow-[var(--accent-glow)] transition-all duration-300 group"
        >
          {/* Cover with spine accent */}
          <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-[var(--bg-elevated)] shrink-0 shadow-md">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-r from-black/40 to-transparent z-10" />
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 animate-shimmer bg-[var(--bg-elevated)]" />
            )}
            {!imageError ? (
              <img
                src={game.thumbnail || game.image}
                alt={game.name}
                referrerPolicy="no-referrer"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[image:var(--gradient-hero)] opacity-70">
                <Dices className="w-6 h-6 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-display font-bold text-base text-[var(--text-primary)] truncate group-hover:text-[var(--accent-neon)] transition-colors">
                {game.name}
              </h3>
              <span className="text-xs text-[var(--text-secondary)] tabular-nums font-medium">
                {game.yearPublished}
              </span>
            </div>

            <div className="mt-1.5 flex items-center gap-3 text-xs text-[var(--text-secondary)] tabular-nums flex-wrap">
              <span className="inline-flex items-center gap-1 font-medium">
                <Users className="w-3.5 h-3.5 text-[var(--accent-neon)]" />
                {game.minPlayers}–{game.maxPlayers}p
              </span>
              <span aria-hidden="true" className="opacity-40">·</span>
              <span className="inline-flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
                {game.playingTime}m
              </span>
              {game.bggRating && (
                <>
                  <span aria-hidden="true" className="opacity-40">·</span>
                  <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    {game.bggRating.toFixed(1)}
                  </span>
                </>
              )}
              {game.purchasePrice ? (
                <>
                  <span aria-hidden="true" className="opacity-40">·</span>
                  <span className="font-mono text-[var(--text-primary)] font-semibold">
                    {formatVND(game.purchasePrice)}
                  </span>
                </>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <GameStatusBadge status={game.status} />
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEdit(game);
                  }}
                  className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Quick Edit Game"
                  aria-label={`Quick Edit ${game.name}`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <span className="text-xs font-semibold text-[var(--text-secondary)] tabular-nums">
              {playCount} {playCount === 1 ? 'play' : 'plays'}
            </span>
          </div>
        </Link>
      </motion.div>
    );
  }

  return (
    <TiltCard
      maxTilt={6}
      glare={true}
      className="h-full group border border-[var(--border-subtle)] hover:border-[var(--border-glow)] rounded-2xl overflow-hidden transition-all duration-300"
    >
      <Link
        to={`/collection/${game.id}`}
        className="flex flex-col h-full bg-[var(--bg-card)]/90 backdrop-blur-md"
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--bg-elevated)]">
          {/* Authentic physical box spine highlight (left edge shadow) */}
          <div
            aria-hidden="true"
            className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-black/50 via-black/20 to-transparent z-20 pointer-events-none"
          />

          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 animate-shimmer bg-[var(--bg-elevated)]" />
          )}
          {!imageError ? (
            <img
              src={game.image || game.thumbnail}
              alt={game.name}
              referrerPolicy="no-referrer"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-108"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-[image:var(--gradient-card)] text-center">
              <Dices className="w-10 h-10 text-[var(--accent-neon)] mb-2" />
              <span className="font-display font-bold text-sm text-[var(--text-primary)]">
                {game.name}
              </span>
            </div>
          )}

          {/* Smooth gradient scrim for high-contrast legible text */}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-base)] via-black/35 to-transparent opacity-90 pointer-events-none" />

          {/* Top bar: Status Badge + Rating + Quick Edit */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-20">
            <GameStatusBadge status={game.status} />
            <div className="flex items-center gap-1.5">
              {game.bggRating && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-xs font-bold text-amber-400 tabular-nums border border-white/10 shadow-sm">
                  <Star className="w-3 h-3 fill-amber-400" />
                  {game.bggRating.toFixed(1)}
                </span>
              )}
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEdit(game);
                  }}
                  className="p-1.5 rounded-lg bg-black/70 hover:bg-black/95 backdrop-blur-md text-white/80 hover:text-white border border-white/15 transition-colors shadow-sm cursor-pointer"
                  title="Quick Edit Game"
                  aria-label={`Quick Edit ${game.name}`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Hover Play Count Overlay */}
          <div className="absolute inset-0 z-15 flex items-center justify-center bg-[var(--bg-base)]/75 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="px-4 py-2 rounded-xl bg-[image:var(--gradient-hero)] text-white font-display font-bold text-sm shadow-xl flex items-center gap-2 transform translate-y-3 group-hover:translate-y-0 transition-transform duration-300">
              <Play className="w-4 h-4 fill-current" />
              <span>
                {playCount} {playCount === 1 ? 'Session' : 'Sessions'} Played
              </span>
            </div>
          </div>

          {/* Bottom title inside cover */}
          <div className="absolute bottom-3 left-3.5 right-3.5 z-10">
            <h3 className="font-display font-bold text-base sm:text-lg text-white leading-snug line-clamp-1 group-hover:text-[var(--accent-neon)] transition-colors">
              {game.name}
            </h3>
            <div className="mt-1 flex items-center gap-2 text-xs text-[#cbd5e1] tabular-nums font-medium">
              <span>{game.yearPublished}</span>
              <span aria-hidden="true" className="opacity-40">·</span>
              <span>
                {game.minPlayers}–{game.maxPlayers} players
              </span>
              <span aria-hidden="true" className="opacity-40">·</span>
              <span>{game.playingTime}m</span>
            </div>
          </div>
        </div>

        {game.purchasePrice ? (
          <div className="px-3.5 py-2.5 flex items-center justify-between text-xs border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]/80">
            <span className="text-[var(--text-secondary)] font-medium">Valuation</span>
            <span className="font-mono font-semibold text-[var(--text-primary)] tabular-nums">
              {formatVND(game.purchasePrice)}
            </span>
          </div>
        ) : null}
      </Link>
    </TiltCard>
  );
};

export default GameCard;
