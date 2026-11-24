import React, { useEffect, useState } from 'react';
import { Dices } from 'lucide-react';
import { BoardGame } from '../../types';
import { getGameThumbnail } from '../../lib/utils';
import { useResolvedMedia } from '../../hooks/useResolvedMedia';

export interface GameCoverImageProps {
  /** BoardGame object (preferred: automatically runs getGameThumbnail upgrade & Iron Clays guard) */
  game?: Partial<BoardGame> | null;
  /** Direct image URL/idb ref when a BoardGame object is not available */
  src?: string | null;
  /** Alt text (defaults to game.name or 'Board game cover') */
  alt?: string;
  /** Classes applied to the outer relative container (e.g. aspect-square, w-12 h-12 rounded-xl) */
  className?: string;
  /** Padding inside the inner absolute framing layer (default: 'p-2') */
  paddingClassName?: string;
  /** Shorthand alias for paddingClassName */
  paddingClass?: string;
  /** Additional classes applied to the <img> element (never pass w-full h-full here) */
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
 * Distortion-free board game box cover renderer.
 * Uses a non-flex outer container with an absolute inset flex framing layer
 * and `max-w-full max-h-full w-auto h-auto object-contain` on `<img>`,
 * preventing iOS Safari/WebKit replaced-element aspect-ratio stretching
 * and avoiding blurred backdrops behind transparent PNG covers.
 */
export const GameCoverImage: React.FC<GameCoverImageProps> = ({
  game,
  src,
  alt,
  className = '',
  paddingClassName,
  paddingClass,
  imgClassName = '',
  loading = 'lazy',
  fallbackIconClassName,
  fallbackIconSize,
  children,
}) => {
  const effectivePadding = paddingClassName ?? paddingClass ?? 'p-2';
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

  return (
    <div className={`relative overflow-hidden bg-[var(--card-2)] ${className}`}>
      <div className={`absolute inset-0 flex items-center justify-center ${effectivePadding}`}>
        {resolvedSrc && !hasError ? (
          <img
            src={resolvedSrc}
            alt={resolvedAlt}
            loading={loading}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setHasError(true)}
            className={`max-w-full max-h-full w-auto h-auto object-contain select-none ${imgClassName}`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-[var(--muted)]/50">
            <Dices className={effectiveFallbackIconClass} />
          </div>
        )}
      </div>
      {children}
    </div>
  );
};
