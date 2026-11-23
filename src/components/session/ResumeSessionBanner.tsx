import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Play, Pause, X, Dices } from 'lucide-react';
import { SessionDraft } from '../../types';
import { useGameStore } from '../../store/useGameStore';
import { useSessionStore } from '../../store/useSessionStore';
import { isDraftMatchingCompletedSession, formatDuration } from '../../lib/utils';
import { Button } from '../ui/Button';

export const ResumeSessionBanner: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const getGameById = useGameStore((s) => s.getGameById);
  const sessions = useSessionStore((s) => s.sessions);
  const [draft, setDraft] = useState<SessionDraft | null>(null);

  const checkDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem('boardgame_session_draft');
      if (!raw) {
        setDraft(null);
        return;
      }
      const parsed = JSON.parse(raw) as SessionDraft;
      if (
        !parsed ||
        !parsed.gameId ||
        (parsed.sessionStartTime && Date.now() - parsed.sessionStartTime > 36 * 60 * 60 * 1000) ||
        isDraftMatchingCompletedSession(parsed, sessions)
      ) {
        setDraft(null);
        return;
      }
      setDraft(parsed);
    } catch {
      setDraft(null);
    }
  }, [sessions]);

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
  const gameName = game?.name || 'Ván đấu chưa đặt tên';
  const isPaused = !draft.isTimerRunning;

  const handleResume = () => {
    navigate('/sessions/new?resume=1');
  };

  const handleDiscard = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      localStorage.removeItem('boardgame_session_draft');
    } catch {}
    setDraft(null);
    window.dispatchEvent(new CustomEvent('boardgame_draft_updated'));
  };

  return (
    <div
      role="region"
      aria-label="Ongoing session draft"
      className="fixed z-40 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-6 right-3 left-3 sm:left-auto sm:right-6 sm:max-w-md animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto"
    >
      <div className="flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-[var(--card)] border-2 border-amber-500/40 dark:border-amber-400/30 shadow-2xl backdrop-blur-md">
        {/* Pulsing state icon */}
        <div className="relative shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Dices className="w-5 h-5" />
          <span
            className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--card)] ${
              isPaused ? 'bg-amber-400' : 'bg-[var(--good)] animate-pulse'
            }`}
            title={isPaused ? 'Đang tạm dừng' : 'Đang tính giờ'}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0" onClick={handleResume} role="button" tabIndex={0}>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              {isPaused ? 'Ván đang tạm dừng' : 'Ván đang diễn ra'}
            </span>
            <span className="text-xs text-[var(--muted)] opacity-60">·</span>
            <span className="text-xs font-semibold text-[var(--muted)]">Bước {draft.currentStep || 1}/6</span>
          </div>
          <div className="font-display font-bold text-sm text-[var(--ink)] truncate mt-0.5">
            {gameName}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="primary"
            size="sm"
            onClick={handleResume}
            className="text-xs font-bold py-1.5 px-3 h-8 shadow-sm flex items-center gap-1 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Tiếp tục</span>
          </Button>

          <button
            type="button"
            onClick={handleDiscard}
            title="Hủy ván đang dở"
            aria-label="Hủy ván đang dở"
            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeSessionBanner;
