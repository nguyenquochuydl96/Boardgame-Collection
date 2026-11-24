import React, { useState, useEffect, useRef } from 'react';
import { Share2, Download, Copy, Check, Loader2, Sparkles, Moon, Sun } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PlaySession, BoardGame } from '../../types';
import { buildSessionShareCardData } from '../../lib/shareCard';
import { renderSessionShareCard, ShareCardTheme } from '../../lib/shareCardRenderer';
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
  const [theme, setTheme] = useState<ShareCardTheme>('dark');
  const [isRendering, setIsRendering] = useState(false);
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeUrlRef = useRef<string | null>(null);

  const allSessions = useSessionStore((s) => s.sessions);
  const players = usePlayerStore((s) => s.players);
  const locations = useLocationStore((s) => s.locations);

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

  // Generate share card on open and theme change
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
        const cardData = buildSessionShareCardData(session, {
          game,
          allSessions,
          players,
          locations,
        });

        const blob = await renderSessionShareCard(cardData, { theme });
        if (isCancelled) return;

        cleanupUrl();
        const url = URL.createObjectURL(blob);
        activeUrlRef.current = url;

        setCardBlob(blob);
        setPreviewUrl(url);
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
  }, [isOpen, theme, session, game, allSessions, players, locations]);

  const fileNameSlug = (session.gameName || 'session')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const fileName = `heo-session-${fileNameSlug}-${session.datePlayed || 'play'}.png`;

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
      <div className="space-y-4 pt-1">
        {/* Theme Selector */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--text-muted)]">
            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
            <span>Card Palette:</span>
          </div>

          <div className="inline-flex p-1 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${
                theme === 'dark'
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              Deep Espresso
            </button>
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${
                theme === 'light'
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              Warm Cream
            </button>
          </div>
        </div>

        {/* Card Preview Area */}
        <div className="relative rounded-2xl overflow-hidden bg-[var(--bg-canvas)] border border-[var(--border-subtle)] p-2 sm:p-4 flex items-center justify-center min-h-[380px] max-h-[58vh]">
          {isRendering ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--text-muted)]">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
              <p className="text-sm font-medium">Rendering 1080 × 1350 editorial card...</p>
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
            <img
              src={previewUrl}
              alt="Session share card preview"
              className="max-h-[54vh] w-auto max-w-full object-contain rounded-xl shadow-2xl transition-opacity duration-200"
            />
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
