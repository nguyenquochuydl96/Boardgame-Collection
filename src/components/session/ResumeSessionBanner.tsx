import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Play, X, Dices } from 'lucide-react';
import { SessionDraft } from '../../types';
import { useGameStore } from '../../store/useGameStore';
import { DRAFT_STORAGE_KEY, parseSessionDraft, removeDraftIfUnchanged } from '../../lib/draftSafety';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';

export const ResumeSessionBanner: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const getGameById = useGameStore((s) => s.getGameById);
  const [draft, setDraft] = useState<SessionDraft | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [discardRaw, setDiscardRaw] = useState<string | null>(null);

  const checkDraft = useCallback(() => {
    try {
      setDraft(parseSessionDraft(localStorage.getItem(DRAFT_STORAGE_KEY), Date.now()));
    } catch {
      setDraft(null);
    }
  }, []);

  useEffect(() => {
    checkDraft();

    const handleStorage = () => checkDraft();
    const handleCustomUpdate = () => checkDraft();

    window.addEventListener('storage', handleStorage);
    window.addEventListener('boardgame_draft_updated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('boardgame_draft_updated', handleCustomUpdate);
    };
  }, [checkDraft, location.pathname]);

  // Don't show if user is currently inside the new session creation wizard
  if (!draft || location.pathname === '/sessions/new' || location.pathname.startsWith('/new-session')) {
    return null;
  }

  const game = getGameById(draft.gameId);
  const gameName = game?.name || 'Untitled Session';
  const isPaused = !draft.isTimerRunning;

  const handleResume = () => {
    navigate('/sessions/new?resume=1');
  };

  const handleRequestDiscard = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDiscardRaw(localStorage.getItem(DRAFT_STORAGE_KEY));
    } catch {
      setDiscardRaw(null);
    }
    setShowDiscardConfirm(true);
  };

  const handleConfirmDiscard = () => {
    try {
      removeDraftIfUnchanged(localStorage, discardRaw);
    } catch {}
    setShowDiscardConfirm(false);
    setDiscardRaw(null);
    setDraft(null);
    window.dispatchEvent(new CustomEvent('boardgame_draft_updated'));
  };

  return (
    <>
      <div
        role="region"
        aria-label="Ongoing session draft"
        className="fixed z-40 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-6 right-3 left-3 sm:left-auto sm:right-6 sm:max-w-md animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto"
      >
        <div className="flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-[var(--card)] border-2 border-[var(--warn)]/40 shadow-xl">
          {/* Pulsing state icon */}
          <div className="relative shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--warn-soft)] text-[var(--warn)]">
            <Dices className="w-5 h-5" />
            <span
              className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--card)] ${
                isPaused ? 'bg-[var(--warn)]' : 'bg-[var(--good)] animate-pulse'
              }`}
              title={isPaused ? 'Timer paused' : 'Timer running'}
            />
          </div>

          {/* Info */}
          <button
            type="button"
            className="flex-1 min-w-0 text-left cursor-pointer"
            onClick={handleResume}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--warn)]">
                {isPaused ? 'Session Paused' : 'Session In Progress'}
              </span>
              <span className="text-xs text-[var(--muted)] opacity-60">·</span>
              <span className="text-xs font-semibold text-[var(--muted)]">Step {draft.currentStep || 1}/6</span>
            </div>
            <div className="font-display font-bold text-sm text-[var(--ink)] truncate mt-0.5">
              {gameName}
            </div>
          </button>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={handleResume}
              className="text-xs font-bold py-1.5 px-3.5 min-h-10 shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume</span>
            </Button>

            <button
              type="button"
              onClick={handleRequestDiscard}
              title="Discard ongoing session draft"
              aria-label="Discard ongoing session draft"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--muted)] hover:text-[var(--bad)] hover:bg-[var(--bad-soft)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDiscardConfirm}
        title="Discard Ongoing Session?"
        message={`Your unsaved draft for "${gameName}" (Step ${draft.currentStep || 1}/6) will be permanently cleared.`}
        confirmLabel="Discard Draft"
        cancelLabel="Keep Session"
        variant="warning"
        onConfirm={handleConfirmDiscard}
        onCancel={() => setShowDiscardConfirm(false)}
      />
    </>
  );
};

export default ResumeSessionBanner;
