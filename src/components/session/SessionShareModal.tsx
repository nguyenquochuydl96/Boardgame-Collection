import React, { useDeferredValue, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Copy,
  Download,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Share2,
  Shuffle,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { BoardGame, PlaySession } from '../../types';
import { buildSessionShareCardData } from '../../lib/shareCard';
import { renderSessionShareCard } from '../../lib/shareCardRenderer';
import { useLocationStore } from '../../store/useLocationStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useSessionStore } from '../../store/useSessionStore';

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
  const [headline, setHeadline] = useState('');
  const deferredHeadline = useDeferredValue(headline);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [photoSource, setPhotoSource] = useState<'box' | 'table'>('box');
  const [isRendering, setIsRendering] = useState(false);
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renderNonce, setRenderNonce] = useState(0);
  const activeUrlRef = useRef<string | null>(null);

  const allSessions = useSessionStore((state) => state.sessions);
  const players = usePlayerStore((state) => state.players);
  const locations = useLocationStore((state) => state.locations);
  const hasPhotos = Array.isArray(session.photos) && session.photos.length > 0;

  const releasePreviewUrl = () => {
    if (activeUrlRef.current) {
      URL.revokeObjectURL(activeUrlRef.current);
      activeUrlRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setHeadline('');
    setShuffleSeed(0);
    setPhotoSource('box');
    setCopied(false);
    setError(null);
  }, [isOpen, session.id]);

  useEffect(() => () => releasePreviewUrl(), []);

  useEffect(() => {
    if (!isOpen) {
      releasePreviewUrl();
      setPreviewUrl(null);
      setCardBlob(null);
      return;
    }

    let cancelled = false;
    const generate = async () => {
      setIsRendering(true);
      setError(null);
      try {
        const useTablePhoto = photoSource === 'table' && hasPhotos;
        const data = buildSessionShareCardData(session, {
          game,
          allSessions,
          players,
          locations,
          useTablePhoto,
          shuffleSeed,
          customHeadline: deferredHeadline,
        });
        const blob = await renderSessionShareCard(data, { useTablePhoto });
        if (cancelled) return;
        const nextUrl = URL.createObjectURL(blob);
        releasePreviewUrl();
        activeUrlRef.current = nextUrl;
        setCardBlob(blob);
        setPreviewUrl(nextUrl);
      } catch (caught) {
        if (!cancelled) {
          console.error('Failed to render Session Share Card:', caught);
          setError('Unable to render the share image. Please try again.');
        }
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    };

    void generate();
    return () => {
      cancelled = true;
    };
  }, [
    allSessions,
    deferredHeadline,
    game,
    hasPhotos,
    isOpen,
    locations,
    photoSource,
    players,
    renderNonce,
    session,
    shuffleSeed,
  ]);

  const fileNameSlug = (session.gameName || 'session')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const fileName = `heo-chronicle-${fileNameSlug || 'session'}-${session.datePlayed || 'play'}.png`;

  const canNativeShare = Boolean(
    cardBlob &&
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [new File([cardBlob], fileName, { type: 'image/png' })] })
  );
  const browserClipboard = typeof navigator === 'undefined'
    ? undefined
    : (navigator as Navigator & { clipboard?: Clipboard }).clipboard;
  const canCopyImage = Boolean(
    cardBlob && typeof browserClipboard?.write === 'function' && typeof ClipboardItem !== 'undefined'
  );

  const shareImage = async () => {
    if (!cardBlob || !canNativeShare) return;
    try {
      await navigator.share({
        files: [new File([cardBlob], fileName, { type: 'image/png' })],
        title: `${session.gameName} — The Tabletop Chronicle`,
      });
    } catch (caught) {
      if ((caught as DOMException).name !== 'AbortError') console.error('Native image share failed:', caught);
    }
  };

  const savePng = () => {
    if (!cardBlob) return;
    const url = URL.createObjectURL(cardBlob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const copyImage = async () => {
    if (!cardBlob || !canCopyImage || !navigator.clipboard) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': cardBlob })]);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (caught) {
      console.error('Image clipboard write failed:', caught);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share session" maxWidthClass="max-w-xl">
      <div className="min-w-0 space-y-3.5 pt-1">
        <div className="space-y-3 border-b border-[var(--border-subtle)] pb-3.5">
          <div className="space-y-1.5">
            <label htmlFor="share-card-headline" className="text-xs font-semibold text-[var(--text-muted)]">
              Headline <span className="font-normal">(optional)</span>
            </label>
            <div className="flex min-w-0 gap-2">
              <input
                id="share-card-headline"
                value={headline}
                maxLength={120}
                onChange={(event) => setHeadline(event.target.value)}
                placeholder="Write your own front-page headline..."
                className="min-w-0 flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
              <button
                type="button"
                onClick={() => setShuffleSeed((seed) => seed + 1)}
                aria-label="Shuffle front-page headline"
                title="Shuffle front-page headline"
                className="inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                <Shuffle className="h-4 w-4" />
              </button>
            </div>
          </div>

          {hasPhotos && (
            <fieldset className="min-w-0 space-y-1.5">
              <legend className="text-xs font-semibold text-[var(--text-muted)]">Photo source</legend>
              <div className="grid grid-cols-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-1">
                <button
                  type="button"
                  onClick={() => setPhotoSource('box')}
                  className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
                    photoSource === 'box'
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <ImageIcon className="h-3.5 w-3.5" /> Game Box
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoSource('table')}
                  className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
                    photoSource === 'table'
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Camera className="h-3.5 w-3.5" /> Table Photo
                </button>
              </div>
            </fieldset>
          )}
        </div>

        <div className="relative flex min-h-[280px] max-h-[48vh] sm:max-h-[52vh] items-center justify-center overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2 sm:p-4">
          {isRendering && !previewUrl ? (
            <div className="flex flex-col items-center gap-3 py-12 text-[var(--text-muted)]">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
              <p className="text-sm font-medium">Setting the front page...</p>
            </div>
          ) : error ? (
            <div className="px-4 py-12 text-center text-sm text-[var(--bad)]">
              <p>{error}</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => setRenderNonce((value) => value + 1)}
              >
                <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
              </Button>
            </div>
          ) : previewUrl ? (
            <div className="relative flex max-h-[44vh] sm:max-h-[48vh] w-auto items-center justify-center">
              <img
                src={previewUrl}
                alt="The Tabletop Chronicle session share card"
                className={`max-h-[44vh] sm:max-h-[48vh] max-w-full rounded-xl object-contain shadow-2xl transition-opacity duration-200 ${
                  isRendering ? 'opacity-40 blur-[1px]' : 'opacity-100'
                }`}
              />
              {isRendering && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/40 text-white">
                  <Loader2 className="h-7 w-7 animate-spin text-[var(--accent)]" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Updating front page...</span>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border-subtle)] pt-2">
          {canNativeShare && (
            <Button
              variant="primary"
              size="sm"
              onClick={shareImage}
              disabled={isRendering || !cardBlob}
              className="min-h-10 px-3.5 text-xs font-bold sm:text-sm"
            >
              <Share2 className="mr-1.5 h-4 w-4" /> Share Image
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={savePng}
            disabled={isRendering || !cardBlob}
            className="min-h-10 px-3.5 text-xs sm:text-sm"
          >
            <Download className="mr-1.5 h-4 w-4" /> Save PNG
          </Button>
          {canCopyImage && (
            <Button
              variant="secondary"
              size="sm"
              onClick={copyImage}
              disabled={isRendering || !cardBlob}
              className="min-h-10 px-3.5 text-xs sm:text-sm"
            >
              {copied ? <Check className="mr-1.5 h-4 w-4 text-[var(--good)]" /> : <Copy className="mr-1.5 h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy Image'}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="min-h-10 px-3 text-xs text-[var(--text-muted)] sm:text-sm"
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
