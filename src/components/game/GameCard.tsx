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
      <div className="transition-all duration-200 hover:-translate-y-0.5">
        <Link
          to={`/collection/${game.id}`}
          className="flex items-center gap-4 p-3.5 rounded-xl bg-[var(--bg-card)] border-[1.5px] border-[var(--ink)] shadow-[var(--shadow-brutal-sm)] hover:shadow-[var(--shadow-brutal)] transition-all duration-200 group"
        >
          {/* Cover */}
          <div className="relative w-16 h-20 rounded-lg overflow-hidden bg-[var(--paper)] border border-[var(--ink)] shrink-0 shadow-sm">
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 animate-shimmer bg-[var(--paper)]" />
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
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[var(--coral)] opacity-80">
                <Dices className="w-6 h-6 text-[var(--ink)]" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-display font-black text-base text-[var(--text-primary)] truncate group-hover:text-[var(--coral)] transition-colors">
                {game.name}
              </h3>
              <span className="text-xs text-[var(--text-secondary)] tabular-nums font-bold">
                {game.yearPublished}
              </span>
            </div>

            <div className="mt-1.5 flex items-center gap-3 text-xs text-[var(--text-secondary)] tabular-nums flex-wrap">
              <span className="inline-flex items-center gap-1 font-semibold">
                <Users className="w-3.5 h-3.5 text-[var(--coral)]" />
                {game.minPlayers}–{game.maxPlayers}p
              </span>
              <span aria-hidden="true" className="opacity-40">·</span>
              <span className="inline-flex items-center gap-1 font-semibold">
                <Clock className="w-3.5 h-3.5 text-[var(--teal)]" />
                {game.playingTime}m
              </span>
              {game.bggRating && (
                <>
                  <span aria-hidden="true" className="opacity-40">·</span>
                  <span className="inline-flex items-center gap-1 font-bold text-[var(--text-primary)]">
                    <Star className="w-3.5 h-3.5 fill-[var(--butter)] text-[var(--ink)]" />
                    {game.bggRating.toFixed(1)}
                  </span>
                </>
              )}
              {game.purchasePrice ? (
                <>
                  <span aria-hidden="true" className="opacity-40">·</span>
                  <span className="font-mono text-[var(--text-primary)] font-bold">
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
                  className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--paper)] transition-colors cursor-pointer border border-transparent hover:border-[var(--ink)]"
                  title="Quick Edit Game"
                  aria-label={`Quick Edit ${game.name}`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-display uppercase tracking-wider bg-[var(--butter)] text-[var(--ink)] border border-[var(--ink)] shadow-[1px_1px_0_var(--ink)] tabular-nums">
              {playCount} {playCount === 1 ? 'play' : 'plays'}
            </span>
          </div>
        </Link>
      </div>
    );
  }

  // Grid View (Rayé Neobrutalist Editorial Card)
  return (
    <div className="h-full group border-[1.5px] border-[var(--ink)] rounded-xl overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 bg-[var(--bg-card)] shadow-[var(--shadow-brutal)] hover:shadow-[var(--shadow-brutal-hover)] flex flex-col">
      <Link
        to={`/collection/${game.id}`}
        className="flex flex-col h-full focus:outline-none"
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--paper)] border-b-[1.5px] border-[var(--ink)]">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 animate-shimmer bg-[var(--paper)]" />
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
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-[var(--paper)] text-center">
              <Dices className="w-10 h-10 text-[var(--coral)] mb-2" />
              <span className="font-display font-black text-sm text-[var(--ink)]">
                {game.name}
              </span>
            </div>
          )}

          {/* Top bar: Status Badge + Rating + Edit */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 z-20">
            <GameStatusBadge status={game.status} />
            <div className="flex items-center gap-1.5">
              {game.bggRating && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--butter)] text-[var(--ink)] text-[11px] font-black tabular-nums border border-[var(--ink)] shadow-[1px_1px_0_var(--ink)]">
                  <Star className="w-3 h-3 fill-[var(--ink)] text-[var(--ink)]" />
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
                  className="p-1 rounded-full bg-[var(--bg-card)] text-[var(--ink)] border border-[var(--ink)] shadow-[1px_1px_0_var(--ink)] hover:bg-[var(--coral)] transition-colors cursor-pointer"
                  title="Quick Edit Game"
                  aria-label={`Quick Edit ${game.name}`}
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Bottom Hover Pill on Image */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="px-3 py-1 rounded-full bg-[var(--teal)] text-[var(--cream)] border border-[var(--ink)] font-display font-bold text-xs uppercase tracking-wider shadow-[2px_2px_0_var(--ink)] flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200">
              <Play className="w-3 h-3 fill-current" />
              <span>{playCount} {playCount === 1 ? 'play' : 'plays'}</span>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-3.5 flex-1 flex flex-col justify-between bg-[var(--bg-card)]">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display font-black text-sm text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--coral)] transition-colors">
                {game.name}
              </h3>
              {game.yearPublished && (
                <span className="text-[11px] text-[var(--text-secondary)] font-bold tabular-nums shrink-0">
                  {game.yearPublished}
                </span>
              )}
            </div>
          </div>

          {/* Meta Specifications */}
          <div className="mt-3 pt-2.5 border-t border-[var(--border-divider)] flex items-center justify-between text-xs text-[var(--text-secondary)] font-medium tabular-nums">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1 font-bold">
                <Users className="w-3.5 h-3.5 text-[var(--coral)]" />
                {game.minPlayers}–{game.maxPlayers}
              </span>
              <span className="inline-flex items-center gap-1 font-bold">
                <Clock className="w-3.5 h-3.5 text-[var(--teal)]" />
                {game.playingTime}m
              </span>
            </div>

            {game.purchasePrice ? (
              <span className="font-mono text-[11px] font-bold text-[var(--text-primary)]">
                {formatVND(game.purchasePrice)}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </div>
  );
};

export const GameCard = memo(GameCardComponent);
export default GameCard;
