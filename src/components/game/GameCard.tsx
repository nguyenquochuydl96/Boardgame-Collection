import React, { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { Users, Clock, Star, Play, Dices, Edit3 } from 'lucide-react';
import { BoardGame } from '../../types';
import { GameStatusBadge } from './GameStatusBadge';
import { formatVND } from '../../lib/utils';

export interface GameCardProps {
  game: BoardGame;
  playCount?: number;
  viewMode?: 'grid' | 'list';
  onEdit?: (game: BoardGame) => void;
}

const GameCardComponent: React.FC<GameCardProps> = ({
  game,
  playCount = 0,
  viewMode = 'grid',
  onEdit,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (viewMode === 'list') {
    return (
      <div className="transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.99]">
        <Link
          to={`/collection/${game.id}`}
          className="flex items-center gap-4 p-3.5 rounded-[18px] bg-[var(--card)] shadow-[inset_0_0_0_1px_var(--line),var(--shadow)] hover:shadow-lg transition-all duration-200 group"
        >
          {/* Cover with spine accent */}
          <div className="relative w-16 h-20 rounded-[12px] overflow-hidden bg-[var(--card-2)] shrink-0 shadow-sm shadow-[inset_0_0_0_1px_var(--line)]">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-r from-black/40 to-transparent z-10" />
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 animate-shimmer bg-[var(--card-2)]" />
            )}
            {!imageError ? (
              <img
                src={game.thumbnail || game.image}
                alt={game.name}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[var(--accent)] text-[var(--accent-ink)]">
                <Dices className="w-6 h-6 text-current" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-display font-bold text-base text-[var(--ink)] truncate group-hover:text-[var(--accent)] transition-colors">
                {game.name}
              </h3>
              <span className="text-xs text-[var(--muted)] tabular-nums font-semibold">
                {game.yearPublished}
              </span>
            </div>

            <div className="mt-1.5 flex items-center gap-3 text-xs text-[var(--muted)] tabular-nums flex-wrap font-medium">
              <span className="inline-flex items-center gap-1 font-semibold text-[var(--ink-2)]">
                <Users className="w-3.5 h-3.5 text-[var(--accent)]" />
                {game.minPlayers}–{game.maxPlayers}p
              </span>
              <span aria-hidden="true" className="opacity-40">·</span>
              <span className="inline-flex items-center gap-1 font-semibold text-[var(--ink-2)]">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                {game.playingTime}m
              </span>
              {game.bggRating && (
                <>
                  <span aria-hidden="true" className="opacity-40">·</span>
                  <span className="inline-flex items-center gap-1 text-amber-500 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    {game.bggRating.toFixed(1)}
                  </span>
                </>
              )}
              {game.purchasePrice ? (
                <>
                  <span aria-hidden="true" className="opacity-40">·</span>
                  <span className="font-mono text-[var(--ink)] font-semibold">
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
                  className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--card-2)] transition-colors cursor-pointer"
                  title="Quick Edit Game"
                  aria-label={`Quick Edit ${game.name}`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <span className="text-xs font-semibold text-[var(--muted)] tabular-nums">
              {playCount} {playCount === 1 ? 'play' : 'plays'}
            </span>
          </div>
        </Link>
      </div>
    );
  }

  // Grid View (Fitlo authentic cover card with smooth spring hover)
  return (
    <div className="h-full group rounded-[20px] overflow-hidden transition-all duration-200 hover:-translate-y-1 bg-[var(--card)] shadow-[inset_0_0_0_1px_var(--line),var(--shadow)] hover:shadow-lg flex flex-col">
      <Link
        to={`/collection/${game.id}`}
        className="flex flex-col h-full focus:outline-none"
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--card-2)]">
          {/* Authentic physical box spine highlight */}
          <div
            aria-hidden="true"
            className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-black/40 via-black/15 to-transparent z-20 pointer-events-none"
          />

          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 animate-shimmer bg-[var(--card-2)]" />
          )}
          {!imageError ? (
            <img
              src={game.image || game.thumbnail}
              alt={game.name}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-[var(--card-2)] text-center">
              <Dices className="w-10 h-10 text-[var(--accent)] mb-2" />
              <span className="font-display font-bold text-sm text-[var(--ink)]">
                {game.name}
              </span>
            </div>
          )}

          {/* Smooth gradient scrim for high-contrast legible text */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent opacity-95 pointer-events-none" />

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
          <div className="absolute inset-0 z-15 flex items-center justify-center bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] font-display font-bold text-sm shadow-xl flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200">
              <Play className="w-4 h-4 fill-current" />
              <span>
                {playCount} {playCount === 1 ? 'Session' : 'Sessions'} Played
              </span>
            </div>
          </div>

          {/* Bottom title inside cover */}
          <div className="absolute bottom-3 left-3.5 right-3.5 z-10">
            <h3 className="font-display font-bold text-base sm:text-lg text-white leading-snug line-clamp-1 group-hover:text-teal-200 transition-colors">
              {game.name}
            </h3>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-200 tabular-nums font-semibold">
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
          <div className="px-3.5 py-2.5 flex items-center justify-between text-xs border-t border-[var(--line)] bg-[var(--card-2)]/50 mt-auto">
            <span className="text-[var(--muted)] font-medium">Valuation</span>
            <span className="font-mono font-bold text-[var(--ink)] tabular-nums">
              {formatVND(game.purchasePrice)}
            </span>
          </div>
        ) : null}
      </Link>
    </div>
  );
};

export const GameCard = memo(GameCardComponent);
export default GameCard;
