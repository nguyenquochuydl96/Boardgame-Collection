import React, { useEffect, useState } from 'react';
import { Dices } from 'lucide-react';
import { BoardGame } from '../../types';
import { getGameThumbnail } from '../../lib/utils';
import { useResolvedMedia } from '../../hooks/useResolvedMedia';

export interface GameCoverImageProps {
  /** BoardGame object (preferred: automatically runs getGameThumbnail upgrade) */
  game?: Partial<BoardGame> | null;
  /** Direct image URL/idb ref when a BoardGame object is not available */
  src?: string | null;
  /** Alt text (defaults to game.name or 'Board game cover') */
  alt?: string;
  /** Classes applied to the outer relative container (e.g. aspect-[3/4] w-full rounded-2xl, w-16 h-20 rounded-xl) */
  className?: string;
  /** Image sizing/fit mode: 'cover' (default, authentic full-bleed matching commit 74573f9) or 'contain' */
  fit?: 'cover' | 'contain';
  /** Optional padding class (deprecated, kept for interface compatibility) */
  paddingClassName?: string;
  /** Shorthand alias for paddingClassName */
  paddingClass?: string;
  /** Additional classes applied to the <img> element */
  imgClassName?: string;
  /** Loading strategy for the image */
  loading?: 'lazy' | 'eager';
  /** Fallback icon sizing class */
  fallbackIconClassName?: string;
  /** Shorthand alias for fallbackIconClassName */
  fallbackIconSize?: string;
  /** Optional overlays rendered above the cover layer */
  children?: React.ReactNode;
}

/**
 * Authentic board game box cover renderer matching the visual presentation of commit 74573f9.
 * Uses full-bleed `w-full h-full object-cover` on the aspect-constrained container
 * with zero padding and zero border framing insets.
 * Preserves useResolvedMedia + referrerPolicy="no-referrer" for reliable idb:// and BGG image loading.
 */
export const GameCoverImage: React.FC<GameCoverImageProps> = ({
  game,
  src,
  alt,
  className = '',
  fit = 'cover',
  paddingClassName: _paddingClassName,
  paddingClass: _paddingClass,
  imgClassName = '',
  loading = 'lazy',
  fallbackIconClassName,
  fallbackIconSize,
  children,
}) => {
  const effectiveFallbackIconClass = fallbackIconClassName ?? fallbackIconSize ?? 'w-6 h-6';
  const rawSrc = game
    ? getGameThumbnail(game) || src || ''
    : src || '';
  const resolvedSrc = useResolvedMedia(rawSrc);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [resolvedSrc]);

  const resolvedAlt = alt || game?.name || 'Board game cover';
  const objectFitClass = fit === 'contain' ? 'object-contain' : 'object-cover';

  return (
    <div className={`relative overflow-hidden bg-[var(--card-2)] ${className}`}>
      {resolvedSrc && !hasError ? (
        <img
          src={resolvedSrc}
          alt={resolvedAlt}
          loading={loading}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className={`w-full h-full ${objectFitClass} select-none ${imgClassName}`}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-[var(--muted)]/50">
          <Dices className={effectiveFallbackIconClass} />
        </div>
      )}
      {children}
    </div>
  );
};
