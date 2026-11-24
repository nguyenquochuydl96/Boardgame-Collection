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
  /** Image sizing/fit mode: 'cover' (default, full-bleed 100% frame fill) or 'contain' (framed with padding) */
  fit?: 'cover' | 'contain';
  /** Padding inside the framing layer when fit='contain' (default: 'p-2' when contain, '' when cover) */
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
 * Distortion-free board game box cover renderer.
 * Defaults to full-bleed `object-cover object-center` filling 100% of the frame
 * with zero aspect-ratio distortion on WebKit/iOS Safari.
 * Supports optional `fit="contain"` for padded framing if explicitly requested.
 */
export const GameCoverImage: React.FC<GameCoverImageProps> = ({
  game,
  src,
  alt,
  className = '',
  fit = 'cover',
  paddingClassName,
  paddingClass,
  imgClassName = '',
  loading = 'lazy',
  fallbackIconClassName,
  fallbackIconSize,
  children,
}) => {
  const effectivePadding = paddingClassName ?? paddingClass ?? (fit === 'contain' ? 'p-2' : '');
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
      {resolvedSrc && !hasError ? (
        fit === 'contain' ? (
          <div className={`absolute inset-0 flex items-center justify-center ${effectivePadding}`}>
            <img
              src={resolvedSrc}
              alt={resolvedAlt}
              loading={loading}
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setHasError(true)}
              className={`max-w-full max-h-full w-auto h-auto object-contain select-none ${imgClassName}`}
            />
          </div>
        ) : (
          <img
            src={resolvedSrc}
            alt={resolvedAlt}
            loading={loading}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setHasError(true)}
            className={`absolute inset-0 w-full h-full object-cover object-center select-none ${imgClassName}`}
          />
        )
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--muted)]/50">
          <Dices className={effectiveFallbackIconClass} />
        </div>
      )}
      {children}
    </div>
  );
};
