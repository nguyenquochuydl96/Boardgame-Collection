import React, { useState } from 'react';
import { cn } from '../ui/cn';

export interface BGGCardThumbnailProps {
  src?: string;
  name: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BGGCardThumbnail: React.FC<BGGCardThumbnailProps> = ({
  src,
  name,
  className = 'w-12 h-14',
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Generate 1-2 letter initials cleanly
  const initials =
    name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || '🎲';

  // Fallback badge when image is missing or failed to load
  if (!src || hasError) {
    return (
      <div
        className={cn(
          className,
          'rounded-xl shrink-0 bg-gradient-to-br from-[#7c3aed]/30 via-[#18182e] to-[#ff5100]/25 border border-white/10 flex flex-col items-center justify-center p-1 shadow-inner select-none transition-all group-hover:border-[#ff5100]/40'
        )}
        title={name}
      >
        <span className="font-display font-extrabold text-xs text-white tracking-wider">
          {initials}
        </span>
        <span className="text-[8px] font-mono uppercase text-[#ff7722] font-bold mt-0.5 tracking-tight">
          BGG
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        className,
        'relative rounded-xl overflow-hidden shrink-0 bg-[#16162a] border border-white/10 shadow-sm'
      )}
    >
      {!isLoaded && (
        <div className="absolute inset-0 bg-[#1e1e35] animate-pulse flex items-center justify-center text-[9px] text-[#94a3b8] font-mono">
          {initials}
        </div>
      )}
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-200',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );
};

export default BGGCardThumbnail;
