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
      whileHover={{ scale: 1.01, x: 3 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
    >
      <Link
        to={`/sessions/${session.id}`}
        className="flex items-center gap-4 p-4 rounded-[18px] bg-[var(--card)] shadow-[inset_0_0_0_1px_var(--line),var(--shadow)] hover:shadow-lg transition-all duration-200 group"
      >
        <div className="w-16 h-20 rounded-[12px] overflow-hidden shrink-0 bg-[var(--card-2)] shadow-[inset_0_0_0_1px_var(--line)] relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-r from-black/40 to-transparent z-10" />
          {!imageError && session.gameThumbnail ? (
            <img
              src={session.gameThumbnail}
              alt={session.gameName}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[var(--card-2)] text-[var(--accent)]">
              <Dices className="w-6 h-6 text-current" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-display font-bold text-base sm:text-lg text-[var(--ink)] truncate group-hover:text-[var(--accent)] transition-colors">
                {session.gameName}
              </h3>
              {session.status === 'draft' || session.status === 'in_progress' ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                  In Progress
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                  Completed
                </span>
              )}
            </div>
            {winner && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold shrink-0">
                <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span className="truncate max-w-[100px]">{winner.playerName}</span>
                {typeof winner.score === 'number' ? ` · ${winner.score}` : ''}
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-3 text-xs text-[var(--muted)] flex-wrap tabular-nums font-medium">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
              {formatDate(session.datePlayed)}
            </span>
            {session.durationMinutes ? (
              <>
                <span aria-hidden="true" className="opacity-40">·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  {formatDuration(session.durationMinutes)}
                </span>
              </>
            ) : null}
            {session.location ? (
              <>
                <span aria-hidden="true" className="opacity-40">·</span>
                <span className="inline-flex items-center gap-1 truncate max-w-[200px]">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="truncate">{session.location}</span>
                </span>
              </>
            ) : null}
          </div>

          {/* Players Facepile */}
          {players.length > 0 && (
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex -space-x-1.5 overflow-hidden">
                {players.slice(0, 5).map((p, idx) => {
                  const fullPlayer = playersById[p.playerId];
                  return (
                    <PlayerAvatar
                      key={p.playerId || idx}
                      name={p.playerName}
                      avatar={fullPlayer?.avatar}
                      size="sm"
                      className="ring-2 ring-[var(--card)]"
                    />
                  );
                })}
              </div>
              <span className="text-xs text-[var(--muted)] font-medium">
                {players.length} {players.length === 1 ? 'player' : 'players'}
              </span>
            </div>
          )}
        </div>

        <ChevronRight className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all shrink-0" />
      </Link>
    </motion.div>
  );
};

export default SessionCard;
