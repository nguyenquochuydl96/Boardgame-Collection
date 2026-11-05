import React from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from './cn';

export interface PoweredByBGGProps {
  variant?: 'badge' | 'sidebar' | 'footer' | 'inline';
  className?: string;
}

/**
 * Official BoardGameGeek Meeple / Silhouette SVG Icon (from Simple Icons)
 * Path: m19.7 4.44-2.38.64L19.65 0 4.53 5.56l.83 6.67-1.4 1.34L8.12 24l8.85-3.26 3.07-7.22-1.32-1.27.98-7.81Z
 */
export const BGGLogoIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'w-4 h-4',
  size,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={cn('shrink-0 text-[#ff5100]', className)}
    style={size ? { width: size, height: size } : undefined}
    aria-hidden="true"
  >
    <path d="m19.7 4.44-2.38.64L19.65 0 4.53 5.56l.83 6.67-1.4 1.34L8.12 24l8.85-3.26 3.07-7.22-1.32-1.27.98-7.81Z" />
  </svg>
);

export const PoweredByBGG: React.FC<PoweredByBGGProps> = ({
  variant = 'badge',
  className,
}) => {
  const bggUrl = 'https://boardgamegeek.com/';

  if (variant === 'inline') {
    return (
      <a
        href={bggUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Visit BoardGameGeek (BGG)"
        className={cn(
          'inline-flex items-center gap-1.5 text-xs font-semibold text-[#ff6700] hover:text-[#ff8533] transition-colors',
          className
        )}
      >
        <BGGLogoIcon className="w-3.5 h-3.5" />
        <span>Powered by BGG</span>
        <ExternalLink className="w-3 h-3 opacity-70" />
      </a>
    );
  }

  if (variant === 'sidebar') {
    return (
      <a
        href={bggUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Boardgame data provided by BoardGameGeek XML API"
        className={cn(
          'group flex items-center justify-between p-2.5 rounded-xl bg-[#ff5100]/10 hover:bg-[#ff5100]/15 border border-[#ff5100]/25 transition-all text-xs font-bold text-[var(--text-secondary)] hover:text-white',
          className
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-[#ff5100] flex items-center justify-center text-white shadow-sm shrink-0 group-hover:scale-105 transition-transform">
            <BGGLogoIcon className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0 text-left">
            <div className="text-[10px] uppercase font-mono tracking-wider text-[#ff7722] leading-none">
              Official Partner
            </div>
            <div className="text-xs font-extrabold text-[var(--text-primary)] truncate">
              Powered by BGG
            </div>
          </div>
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-[#ff7722] opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
      </a>
    );
  }

  if (variant === 'footer') {
    return (
      <footer
        className={cn(
          'w-full pt-8 pb-4 border-t border-[var(--border-subtle)] text-center space-y-2 mt-8 select-none',
          className
        )}
      >
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[var(--text-secondary)]">
          <span>Dữ liệu boardgame được cung cấp bởi</span>
          <a
            href={bggUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ff5100]/12 border border-[#ff5100]/30 text-[#ff6700] hover:text-white hover:bg-[#ff5100] transition-all font-bold group shadow-sm"
          >
            <BGGLogoIcon className="w-3.5 h-3.5 text-[#ff5100] group-hover:text-white transition-colors" />
            <span>Powered by BoardGameGeek</span>
            <ExternalLink className="w-3 h-3 opacity-75" />
          </a>
        </div>
        <p className="text-[11px] text-[var(--text-muted)] max-w-md mx-auto">
          BoardGame Vault sử dụng BGG XML API chính thức để tra cứu thông tin, điểm xếp hạng và bộ sưu tập.
        </p>
      </footer>
    );
  }

  // Default 'badge'
  return (
    <a
      href={bggUrl}
      target="_blank"
      rel="noopener noreferrer"
      title="Boardgame data provided by BoardGameGeek"
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ff5100]/12 hover:bg-[#ff5100]/20 border border-[#ff5100]/30 text-xs font-bold text-[#ff6700] hover:text-[#ff8533] transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]',
        className
      )}
    >
      <BGGLogoIcon className="w-4 h-4" />
      <span>Powered by BGG</span>
      <ExternalLink className="w-3 h-3 opacity-70" />
    </a>
  );
};

export default PoweredByBGG;
