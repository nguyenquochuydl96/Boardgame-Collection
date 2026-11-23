import React, { useState, useEffect, memo } from 'react';
import { Link } from 'react-router-dom';
import { Users, Clock, Star, Dices, Edit3 } from 'lucide-react';
import { BoardGame } from '../../types';
import { GameStatusBadge } from './GameStatusBadge';
import { formatVND, getGameThumbnail } from '../../lib/utils';
import { useResolvedMedia } from '../../hooks/useResolvedMedia';

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
  const [imageError, setImageError] = useState(false);
  const ratingNum = Number(game.bggRating);
  const hasValidRating = !Number.isNaN(ratingNum) && ratingNum > 0;
  const rawThumbnail = getGameThumbnail(game);
  const resolvedCover = useResolvedMedia(rawThumbnail, game.thumbnail || game.image || undefined);

  useEffect(() => {
    setImageError(false);
  }, [game.id, rawThumbnail]);

  if (viewMode === 'list') {
    return (
      <div
        className="transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.99]"
        style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 96px' }}
      >
        <Link
          to={`/collection/${game.id}`}
          className="flex items-center gap-4 p-3.5 rounded-2xl bg-[var(--card)] border border-[var(--line)] hover:border-[var(--line-2)] hover:shadow-md transition-all duration-200 group"
        >
          {/* Cover thumbnail */}
          <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-[var(--card-2)] shrink-0 border border-[var(--line)] flex items-center justify-center">
            {!imageError && resolvedCover ? (
              <>
                <img
                  src={resolvedCover}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover blur-md scale-110 opacity-35 pointer-events-none"
                />
                <img
                  src={resolvedCover}
                  alt={game.name}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                  className="relative z-0 w-full h-full object-contain p-0.5 group-hover:scale-105 transition-transform duration-300"
                />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[var(--card-2)] text-[var(--accent)]">
                <Dices className="w-6 h-6 text-current" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-display font-bold text-base text-[var(--ink)] truncate group-hover:text-[var(--accent)] transition-colors">
                {game.name}
              </h3>
              {game.yearPublished && (
                <span className="text-xs text-[var(--muted)] tabular-nums font-medium">
                  {game.yearPublished}
                </span>
              )}
            </div>

            <div className="mt-1.5 flex items-center gap-3 text-xs text-[var(--muted)] tabular-nums flex-wrap font-medium">
              <span className="inline-flex items-center gap-1 font-semibold text-[var(--ink-2)]">
                <Users className="w-3.5 h-3.5 text-[var(--accent)]" />
                {game.minPlayers === game.maxPlayers ? `${game.minPlayers}p` : `${game.minPlayers}–${game.maxPlayers}p`}
              </span>
              <span aria-hidden="true" className="opacity-40">·</span>
              <span className="inline-flex items-center gap-1 font-semibold text-[var(--ink-2)]">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                {game.playingTime}m
              </span>
              {hasValidRating && (
                <>
                  <span aria-hidden="true" className="opacity-40">·</span>
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {ratingNum.toFixed(1)}
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
              <div className="min-w-0 shrink">
                <GameStatusBadge status={game.status} />
              </div>
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

  // Grid View (Warm Editorial Minimalist Album Cover)
  return (
    <div
      className="h-full group rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1 bg-[var(--card)] border border-[var(--line)] shadow-xs hover:shadow-md flex flex-col p-2.5"
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 300px' }}
    >
      <Link
        to={`/collection/${game.id}`}
        className="flex flex-col h-full focus:outline-none"
      >
        {/* Album Cover Art */}
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-[var(--card-2)] border border-[var(--line)] flex items-center justify-center">
          {/* Authentic physical box spine highlight */}
          <div
            aria-hidden="true"
            className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-black/25 via-black/10 to-transparent z-10 pointer-events-none"
          />

          {!imageError && resolvedCover ? (
            <>
              {/* Ambient blurred cover backdrop for wide/narrow physical boxes like Iron Clays */}
              <img
                src={resolvedCover}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-35 pointer-events-none"
              />
              <img
                src={resolvedCover}
                alt={game.name}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
                className="relative z-0 w-full h-full object-contain p-1.5 transition-transform duration-300 ease-out group-hover:scale-105"
              />
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-[var(--card-2)] text-center">
              <Dices className="w-10 h-10 text-[var(--accent)] mb-2" />
              <span className="font-display font-bold text-sm text-[var(--ink)]">
                {game.name}
              </span>
            </div>
          )}

          {/* Hover / Touch Quick Controls (Sleek overlay fades in on hover; zero clutter by default) */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto">
            <div className="min-w-0 shrink">
              <GameStatusBadge status={game.status} />
            </div>
            <div className="shrink-0 flex items-center gap-1">
              {hasValidRating && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-sm text-[11px] font-bold text-amber-400 tabular-nums border border-white/10 shadow-xs">
                  <Star className="w-2.5 h-2.5 fill-amber-400" />
                  {ratingNum.toFixed(1)}
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
                  className="p-1.5 rounded-full bg-black/75 hover:bg-black text-white/90 hover:text-white backdrop-blur-sm border border-white/15 transition-colors shadow-xs cursor-pointer"
                  title="Quick Edit Game"
                  aria-label={`Quick Edit ${game.name}`}
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Album Typography: Bold Title + 1 Clean Meta Line Beneath Cover */}
        <div className="pt-2.5 pb-0.5 px-0.5 flex flex-col flex-1 justify-between">
          <div>
            <h3 className="font-display font-bold text-sm sm:text-base text-[var(--ink)] leading-snug line-clamp-1 group-hover:text-[var(--accent)] transition-colors">
              {game.name}
            </h3>

            <div className="mt-1 flex flex-wrap items-center gap-x-1.5 sm:gap-x-2 gap-y-0.5 text-xs text-[var(--muted)] tabular-nums font-medium">
              {game.yearPublished && <span>{game.yearPublished}</span>}
              {game.yearPublished && (game.minPlayers || game.maxPlayers || game.playingTime) && (
                <span aria-hidden="true" className="opacity-40">·</span>
              )}
              <span>
                {game.minPlayers === game.maxPlayers
                  ? `${game.minPlayers} ${game.minPlayers === 1 ? 'player' : 'players'}`
                  : `${game.minPlayers}–${game.maxPlayers} players`}
              </span>
              {game.playingTime && (
                <>
                  <span aria-hidden="true" className="opacity-40">·</span>
                  <span>{game.playingTime}m</span>
                </>
              )}
            </div>
          </div>

          {game.purchasePrice ? (
            <div className="mt-2 pt-2 border-t border-[var(--line)] flex items-center justify-between text-[11px] text-[var(--muted)] font-medium">
              <span>Valuation</span>
              <span className="font-mono font-bold text-[var(--ink)] tabular-nums">
                {formatVND(game.purchasePrice)}
              </span>
            </div>
          ) : null}
        </div>
      </Link>
    </div>
  );
};

export const GameCard = memo(GameCardComponent);
export default GameCard;
