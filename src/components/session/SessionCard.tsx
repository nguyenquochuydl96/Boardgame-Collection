import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, Clock, MapPin, Crown, ChevronRight, Dices, Check } from 'lucide-react';
import { PlaySession, Player } from '../../types';
import { formatDate, formatDuration } from '../../lib/utils';
import { PlayerAvatar } from '../player/PlayerAvatar';

export interface SessionCardProps {
  session: PlaySession;
  playersById?: Record<string, Player>;
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  playersById = {},
}) => {
  const [imageError, setImageError] = useState(false);
  const players = session.players || [];
  const winner = players.find(
    (p) => p.isWinner || p.playerId === session.winnerId
  );

  return (
    <motion.div
      whileHover={{ scale: 1.012, x: 4 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
    >
      <Link
        to={`/sessions/${session.id}`}
        className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-card)]/90 backdrop-blur-md border border-[var(--border-subtle)] hover:border-[var(--border-glow)] hover:shadow-xl hover:shadow-[var(--accent-glow)] transition-all duration-300 group"
      >
        <div className="w-16 h-20 rounded-xl overflow-hidden shrink-0 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] relative shadow-md">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-r from-black/40 to-transparent z-10" />
          {!imageError && session.gameThumbnail ? (
            <img
              src={session.gameThumbnail}
              alt={session.gameName}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[image:var(--gradient-card)]">
              <Dices className="w-6 h-6 text-[var(--accent-neon)]" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-display font-bold text-base sm:text-lg text-[var(--text-primary)] truncate group-hover:text-[var(--accent-neon)] transition-colors">
                {session.gameName}
              </h3>
              {session.status === 'draft' || session.status === 'in_progress' ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold shrink-0 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  In Progress
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                  Completed
                </span>
              )}
            </div>
            {winner && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-semibold shrink-0">
                <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="truncate max-w-[100px]">{winner.playerName}</span>
                {typeof winner.score === 'number' ? ` · ${winner.score}` : ''}
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-3 text-xs text-[var(--text-secondary)] flex-wrap tabular-nums font-medium">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[var(--accent-neon)]" />
              {formatDate(session.datePlayed)}
            </span>
            {session.durationMinutes ? (
              <>
                <span aria-hidden="true" className="opacity-40">·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
                  {formatDuration(session.durationMinutes)}
                </span>
              </>
            ) : null}
            {session.location ? (
              <>
                <span aria-hidden="true" className="opacity-40">·</span>
                <span className="inline-flex items-center gap-1 truncate max-w-[200px]">
                  <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="truncate">{session.location}</span>
                </span>
              </>
            ) : null}
          </div>

          {/* Player Avatar Chips Row */}
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            {players.map((p) => {
              const savedPlayer = playersById[p.playerId];
              return (
                <div
                  key={p.playerId}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs"
                >
                  <PlayerAvatar
                    player={savedPlayer}
                    name={p.playerName}
                    size="sm"
                    className="w-5 h-5 text-[10px]"
                  />
                  <span className="text-[var(--text-primary)] font-medium">
                    {p.playerName}
                  </span>
                  {typeof p.score === 'number' && (
                    <span className="font-mono text-[var(--text-secondary)] tabular-nums font-semibold">
                      {p.score}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--accent-neon)] group-hover:translate-x-1 transition-all shrink-0 hidden sm:block" />
      </Link>
    </motion.div>
  );
};

export default SessionCard;
