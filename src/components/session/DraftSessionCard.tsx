import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Play,
  Trash2,
  Clock,
  MapPin,
  Calendar,
  Dices,
  AlertCircle,
  Pause,
} from 'lucide-react';
import { SessionDraft, Player } from '../../types';
import { useGameStore } from '../../store/useGameStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { PlayerAvatar } from '../player/PlayerAvatar';
import { Button } from '../ui/Button';
import { formatDate } from '../../lib/utils';

export interface DraftSessionCardProps {
  draft: SessionDraft;
  onDiscard: () => void;
}

export const DraftSessionCard: React.FC<DraftSessionCardProps> = ({
  draft,
  onDiscard,
}) => {
  const games = useGameStore((s) => s.games);
  const registeredPlayers = usePlayerStore((s) => s.players);
  const [isConfirmingDiscard, setIsConfirmingDiscard] = useState(false);

  const game = games.find((g) => g.id === draft.gameId);
  const gameName = game?.name || 'Board Game Session';
  const gameThumbnail = game?.thumbnail || game?.image;

  // Live timer calculation
  const [currentElapsedSec, setCurrentElapsedSec] = useState(() => {
    if (draft.isTimerRunning && draft.sessionStartTime) {
      const ms = Date.now() - draft.sessionStartTime - (draft.pausedDurationMs || 0);
      return Math.max(0, Math.floor(ms / 1000));
    }
    if (draft.pauseStartTime && draft.sessionStartTime) {
      const ms = draft.pauseStartTime - draft.sessionStartTime - (draft.pausedDurationMs || 0);
      return Math.max(0, Math.floor(ms / 1000));
    }
    return draft.elapsedSeconds || 0;
  });

  useEffect(() => {
    if (!draft.isTimerRunning || !draft.sessionStartTime) return;

    const interval = setInterval(() => {
      const ms = Date.now() - draft.sessionStartTime - (draft.pausedDurationMs || 0);
      setCurrentElapsedSec(Math.max(0, Math.floor(ms / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, [draft.isTimerRunning, draft.sessionStartTime, draft.pausedDurationMs]);

  const formatTimer = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hours > 0) {
      return `${hours}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Resolve participating players
  const allAvailablePlayers = [...registeredPlayers, ...(draft.oneOffPlayers || [])];
  const participants = (draft.selectedPlayerIds || [])
    .map((id) => allAvailablePlayers.find((p) => p.id === id))
    .filter(Boolean) as Player[];

  // Step label
  const getStepLabel = (step: number) => {
    switch (step) {
      case 1:
        return 'Step 1/6 · Pick Game';
      case 2:
        return 'Step 2/6 · Setup & Timer';
      case 3:
        return 'Step 3/6 · Choose Players';
      case 4:
        return 'Step 4/6 · Pick First Player';
      case 5:
        return 'Step 5/6 · Score Sheet';
      case 6:
        return 'Step 6/6 · Notes & Memories';
      default:
        return `Step ${step}/6 · In Progress`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="relative rounded-xl border-2 border-[var(--ink)] bg-[var(--butter-soft)] text-[var(--ink)] p-4 sm:p-5 shadow-[var(--shadow-brutal)] overflow-hidden"
    >
      {/* Top Banner Row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-[var(--ink)]">
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--coral)] opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--coral)]" />
          </span>
          <span className="text-xs font-black uppercase tracking-wider text-[var(--ink)] font-display flex items-center gap-1.5">
            Active Match In Progress
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-[var(--butter)] text-[var(--ink)] text-xs font-black border border-[var(--ink)] uppercase tracking-wider font-display shadow-[1px_1px_0_var(--ink)]">
            {getStepLabel(draft.currentStep || 1)}
          </span>
        </div>
      </div>

      {/* Main Content Info */}
      <div className="mt-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Game Thumbnail */}
          <div className="w-16 h-20 rounded-xl overflow-hidden shrink-0 bg-[var(--bg-elevated)] border border-amber-500/40 relative shadow-md">
            {gameThumbnail ? (
              <img
                src={gameThumbnail}
                alt={gameName}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-amber-500/20 text-amber-400">
                <Dices className="w-7 h-7" />
              </div>
            )}
          </div>

          {/* Game Title & Match Setup Details */}
          <div className="space-y-1.5 min-w-0">
            <h3 className="font-display font-extrabold text-lg sm:text-xl text-[var(--text-primary)] truncate">
              {gameName}
            </h3>

            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)] font-medium">
              <span className="inline-flex items-center gap-1 font-mono font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30">
                {draft.isTimerRunning ? (
                  <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
                ) : (
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                )}
                {formatTimer(currentElapsedSec)}
                <span className="text-[10px] font-normal text-amber-400/80">
                  {draft.isTimerRunning ? '(Running)' : '(Paused)'}
                </span>
              </span>

              {draft.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span className="truncate max-w-[200px]">{draft.location}</span>
                </span>
              )}

              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[var(--accent-neon)]" />
                {draft.datePlayed ? formatDate(draft.datePlayed) : 'Today'}
              </span>
            </div>

            {/* Participating Players */}
            {participants.length > 0 && (
              <div className="pt-1 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-[var(--text-muted)] font-semibold">
                  Players ({participants.length}):
                </span>
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
                  >
                    <PlayerAvatar player={p} name={p.name} size="sm" className="w-4 h-4 text-[9px]" />
                    <span>{p.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons: Resume & Discard */}
        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
          <button
            type="button"
            onClick={() => setIsConfirmingDiscard(true)}
            className="p-2.5 rounded-xl bg-[var(--bg-surface)] hover:bg-rose-500/20 text-[var(--text-secondary)] hover:text-rose-400 border border-[var(--border-subtle)] transition-colors cursor-pointer"
            title="Discard this draft session"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <Link to="/sessions/new">
            <Button variant="primary" className="shadow-lg shadow-amber-500/25">
              <Play className="w-4 h-4 mr-1.5 fill-current" />
              Resume Session
            </Button>
          </Link>
        </div>
      </div>

      {/* Discard Confirmation Dialog */}
      {isConfirmingDiscard && (
        <div className="absolute inset-0 bg-[var(--bg-card)]/95 backdrop-blur-md p-4 flex flex-col justify-center items-center text-center space-y-3 z-30 animate-in fade-in duration-150 border-2 border-rose-500/50 rounded-2xl">
          <AlertCircle className="w-8 h-8 text-rose-400" />
          <div>
            <h4 className="font-bold text-sm text-[var(--text-primary)]">
              Are you sure you want to discard this in-progress session?
            </h4>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              All current elapsed time, player assignments, and draft scores will be cleared.
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsConfirmingDiscard(false)}
            >
              Keep Session
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                onDiscard();
                setIsConfirmingDiscard(false);
              }}
            >
              Discard Draft
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
