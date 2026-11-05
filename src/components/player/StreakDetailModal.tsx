import React from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  CloudRain,
  Calendar,
  MapPin,
  Trophy,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PlayerAvatar } from './PlayerAvatar';
import { Player, PlaySession } from '../../types';
import { StreakData, formatDate } from '../../lib/utils';
import { cn } from '../ui/cn';

export interface StreakDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  player?: Player | null;
  type: 'win' | 'loss';
  streakData?: StreakData | null;
}

export const StreakDetailModal: React.FC<StreakDetailModalProps> = ({
  isOpen,
  onClose,
  player,
  type,
  streakData,
}) => {
  if (!player || !streakData) return null;

  const isWin = type === 'win';
  const count = streakData.count;
  const sessions = streakData.sessions || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isWin
          ? `🔥 Winning Streak Record (${count} Games)`
          : `🌧️ Losing Streak Record (${count} Games)`
      }
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        {/* OVERVIEW HERO BANNER */}
        <div
          className={cn(
            'p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden',
            isWin
              ? 'bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-transparent border-amber-500/40'
              : 'bg-gradient-to-r from-rose-500/15 via-purple-500/10 to-transparent border-rose-500/40'
          )}
        >
          <div className="flex items-center gap-3.5">
            <PlayerAvatar player={player} size="lg" className="border-2" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-extrabold text-lg text-white">
                  {player.name}
                </h3>
                {player.nickname && (
                  <span className="text-xs font-semibold text-amber-300">
                    "{player.nickname}"
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {isWin
                  ? 'Golden era: undefeated consecutive winning streak!'
                  : 'Toughest tabletop run in logged gaming history.'}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right shrink-0 tabular-nums">
            <div
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-base font-display font-black border shadow-sm',
                isWin
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/50'
              )}
            >
              {isWin ? <Flame className="w-5 h-5 fill-current text-orange-400" /> : <CloudRain className="w-5 h-5 text-rose-400" />}
              <span>{count} Consecutive Games</span>
            </div>

            {sessions.length > 0 && (
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5 flex items-center sm:justify-end gap-1">
                <Calendar className="w-3 h-3 text-[var(--text-secondary)]" />
                <span>
                  {formatDate(streakData.startDate)} → {formatDate(streakData.endDate)}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* TIMELINE OF SESSIONS IN STREAK */}
        {count > 0 && sessions.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--text-secondary)] px-1">
              <span>Streak timeline from game 1 to game {sessions.length}:</span>
              <span className="text-[var(--text-muted)] font-mono">{sessions.length} sessions</span>
            </div>

            <div className="space-y-3 relative before:absolute before:top-4 before:bottom-4 before:left-[19px] before:w-0.5 before:bg-[var(--border-subtle)]">
              {sessions.map((session, index) => {
                const playerEntry = session.players?.find((p) => p.playerId === player.id);
                const isWinner = Boolean(playerEntry?.isWinner || session.winnerId === player.id);
                const opponents = session.players?.filter((p) => p.playerId !== player.id) || [];

                return (
                  <div
                    key={session.id}
                    className="relative pl-10 group"
                  >
                    {/* Step Timeline Indicator Node */}
                    <div
                      className={cn(
                        'absolute left-0 top-3.5 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-mono font-bold z-10 transition-transform group-hover:scale-110 shadow-md',
                        isWin
                          ? 'bg-amber-500 text-slate-950 border-amber-300'
                          : 'bg-rose-500 text-white border-rose-300'
                      )}
                    >
                      #{index + 1}
                    </div>

                    {/* Session Card Detail */}
                    <div className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-amber-400/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group-hover:bg-[var(--bg-elevated)]/60">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {session.gameThumbnail ? (
                          <img
                            src={session.gameThumbnail}
                            alt={session.gameName}
                            className="w-12 h-14 rounded-xl object-cover bg-slate-900 border border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-14 rounded-xl bg-[var(--bg-elevated)] border border-white/10 flex items-center justify-center text-xl shrink-0">
                            🎲
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-display font-bold text-sm text-white group-hover:text-amber-300 transition-colors truncate">
                              {session.gameName}
                            </h4>
                            {isWinner && (
                              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                                Winner 🏆
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-secondary)] mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[var(--text-muted)]" />
                              {formatDate(session.datePlayed)}
                            </span>
                            {session.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-[var(--text-muted)]" />
                                <span className="truncate max-w-[120px]">{session.location}</span>
                              </span>
                            )}
                            {playerEntry?.score !== undefined && (
                              <span className="text-white font-mono font-bold">
                                Score: {playerEntry.score}
                              </span>
                            )}
                            {playerEntry?.rank !== undefined && (
                              <span className="text-amber-300 font-mono font-bold">
                                Rank #{playerEntry.rank}
                              </span>
                            )}
                          </div>

                          {/* Opponents who played together */}
                          {opponents.length > 0 && (
                            <p className="text-[11px] text-[var(--text-muted)] mt-1.5 truncate">
                              With: {opponents.map((o) => o.playerName).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action Link */}
                      <Link
                        to={`/sessions/${session.id}`}
                        onClick={onClose}
                        className="shrink-0"
                      >
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-xs px-2.5 py-1 w-full sm:w-auto"
                        >
                          <span>View Session</span>
                          <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-12 text-center rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2">
            <p className="text-xs text-[var(--text-muted)]">
              No streak data recorded for this player yet.
            </p>
          </div>
        )}

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
          <Link
            to={`/sessions?playerId=${player.id}`}
            onClick={onClose}
            className="text-xs font-bold text-amber-400 hover:underline inline-flex items-center gap-1"
          >
            <span>View all match history for {player.name}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default StreakDetailModal;
