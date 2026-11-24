import React, { useState, useEffect, useRef } from 'react';
import {
  Share2,
  Download,
  Copy,
  Check,
  Loader2,
  Sparkles,
  Moon,
  Sun,
  Image as ImageIcon,
  Camera,
  Layout,
  Ticket,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PlaySession, BoardGame } from '../../types';
import { buildSessionShareCardData } from '../../lib/shareCard';
import {
  renderSessionShareCard,
  ShareCardTheme,
  ShareCardStyle,
} from '../../lib/shareCardRenderer';
import { useSessionStore } from '../../store/useSessionStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useLocationStore } from '../../store/useLocationStore';

export interface SessionShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: PlaySession;
  game?: BoardGame | null;
}

export const SessionShareModal: React.FC<SessionShareModalProps> = ({
  isOpen,
  onClose,
  session,
  game,
}) => {
  const [style, setStyle] = useState<ShareCardStyle>('poster');
  const [theme, setTheme] = useState<ShareCardTheme>('dark');
  const [backdropSource, setBackdropSource] = useState<'cover' | 'photo'>('cover');
  const [isRendering, setIsRendering] = useState(false);
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeUrlRef = useRef<string | null>(null);

  const allSessions = useSessionStore((s) => s.sessions);
  const players = usePlayerStore((s) => s.players);
  const locations = useLocationStore((s) => s.locations);

  const hasPhotos = Array.isArray(session.photos) && session.photos.length > 0;

  // Clean up object URL when unmounting or regenerating
  const cleanupUrl = () => {
    if (activeUrlRef.current) {
      URL.revokeObjectURL(activeUrlRef.current);
      activeUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupUrl();
    };
  }, []);

  // Generate share card on open, style, theme, or backdrop source change
  useEffect(() => {
    if (!isOpen) {
      cleanupUrl();
      setPreviewUrl(null);
      setCardBlob(null);
      return;
    }

    let isCancelled = false;

    async function generateCard() {
      setIsRendering(true);
      setError(null);

      try {
        const useTablePhoto = backdropSource === 'photo' && hasPhotos;
        const cardData = buildSessionShareCardData(session, {
          game,
          allSessions,
          players,
          locations,
          useTablePhoto,
        });

        const blob = await renderSessionShareCard(cardData, {
          style,
          theme,
          useTablePhoto,
        });
        if (isCancelled) return;

        const newUrl = URL.createObjectURL(blob);
        cleanupUrl();
        activeUrlRef.current = newUrl;

        setCardBlob(blob);
        setPreviewUrl(newUrl);
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Failed to generate session share card:', err);
          setError('Failed to generate share card. Please try again.');
        }
      } finally {
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    }

    generateCard();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, style, theme, backdropSource, session, game, allSessions, players, locations, hasPhotos]);

  const fileNameSlug = (session.gameName || 'session')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const fileName = `heo-${style}-${fileNameSlug}-${session.datePlayed || 'play'}.png`;

  // Native share sheet support check
  const canNativeShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    cardBlob
      ? navigator.canShare({
          files: [new File([cardBlob], fileName, { type: 'image/png' })],
        })
      : false;

  const handleNativeShare = async () => {
    if (!cardBlob) return;
    try {
      const file = new File([cardBlob], fileName, { type: 'image/png' });
      await navigator.share({
        files: [file],
        title: `${session.gameName} — Play Session`,
        text: `Check out our play session of ${session.gameName}!`,
      });
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Error sharing image:', err);
      }
    }
  };

  const handleSavePng = () => {
    if (!cardBlob) return;
    const url = URL.createObjectURL(cardBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const canCopyImage =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.clipboard?.write) &&
    typeof ClipboardItem !== 'undefined';

  const handleCopyImage = async () => {
    if (!cardBlob || !navigator.clipboard) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': cardBlob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Session Share Card"
      maxWidthClass="max-w-xl"
    >
      <div className="space-y-3.5 pt-1">
        {/* Controls Row: Style, Palette & Optional Photo Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-[var(--border-subtle)]">
          {/* Style Selector Tabs */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1">
              <Layout className="w-3.5 h-3.5 text-[var(--accent)]" />
              Style:
            </span>
            <div className="inline-flex p-0.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setStyle('poster')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${
                  style === 'poster'
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                Poster
              </button>
              <button
                type="button"
                onClick={() => setStyle('ticket')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${
                  style === 'ticket'
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Ticket className="w-3 h-3" />
                Ticket
              </button>
            </div>
          </div>

          {/* Palette Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              Palette:
            </span>
            <div className="inline-flex p-0.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${
                  theme === 'dark'
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Moon className="w-3 h-3" />
                Espresso
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${
                  theme === 'light'
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Sun className="w-3 h-3" />
                Cream
              </button>
            </div>
          </div>

          {/* Optional Table Photo Toggle */}
          {hasPhotos && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-[var(--accent)]" />
                Backdrop:
              </span>
              <div className="inline-flex p-0.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setBackdropSource('cover')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${
                    backdropSource === 'cover'
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <ImageIcon className="w-3 h-3" />
                  Box Art
                </button>
                <button
                  type="button"
                  onClick={() => setBackdropSource('photo')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${
                    backdropSource === 'photo'
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Camera className="w-3 h-3" />
                  Table Photo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Card Preview Area with Anti-Flash Transition */}
        <div className="relative rounded-2xl overflow-hidden bg-[var(--bg-canvas)] border border-[var(--border-subtle)] p-2 sm:p-4 flex items-center justify-center min-h-[360px] max-h-[58vh]">
          {isRendering && !previewUrl ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--text-muted)]">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
              <p className="text-sm font-medium">
                {style === 'ticket' ? 'Crafting Game Night Ticket...' : 'Crafting Warm Editorial Poster...'}
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-12 px-4 text-[var(--bad)] text-sm">
              <p>{error}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
                className="mt-3"
              >
                Retry
              </Button>
            </div>
          ) : previewUrl ? (
            <div className="relative flex items-center justify-center max-h-[54vh] w-auto">
              <img
                src={previewUrl}
                alt="Session share card preview"
                className={`max-h-[54vh] w-auto max-w-full object-contain rounded-xl shadow-2xl transition-opacity duration-200 ${
                  isRendering ? 'opacity-40 filter blur-[1px]' : 'opacity-100'
                }`}
              />
              {isRendering && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 backdrop-blur-[2px] rounded-xl text-white">
                  <Loader2 className="w-7 h-7 animate-spin text-[var(--accent)]" />
                  <span className="text-xs font-semibold tracking-wide uppercase">
                    Updating {style === 'ticket' ? 'Ticket' : 'Poster'}...
                  </span>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Actions Row */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
          {canNativeShare && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleNativeShare}
              disabled={isRendering || !cardBlob}
              className="min-h-[40px] px-3.5 text-xs sm:text-sm bg-[var(--accent)] text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] font-bold shadow-md shadow-[var(--accent-glow)]"
            >
              <Share2 className="w-4 h-4 mr-1.5" />
              Share Image
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={handleSavePng}
            disabled={isRendering || !cardBlob}
            className="min-h-[40px] px-3.5 text-xs sm:text-sm border border-[var(--border-subtle)] font-medium"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Save PNG
          </Button>

          {canCopyImage && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyImage}
              disabled={isRendering || !cardBlob}
              className="min-h-[40px] px-3.5 text-xs sm:text-sm border border-[var(--border-subtle)] font-medium"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1.5 text-[var(--good)]" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1.5 text-[var(--text-muted)]" />
                  Copy Image
                </>
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="min-h-[40px] px-3 text-xs sm:text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
