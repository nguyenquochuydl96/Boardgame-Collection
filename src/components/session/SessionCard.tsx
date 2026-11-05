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
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Link
        to={`/sessions/${session.id}`}
        className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-card)] border-[1.5px] border-[var(--ink)] shadow-[var(--shadow-brutal-sm)] hover:shadow-[var(--shadow-brutal)] transition-all duration-200 group"
      >
        <div className="w-16 h-20 rounded-lg overflow-hidden shrink-0 bg-[var(--paper)] border border-[var(--ink)] relative shadow-sm">
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
            <div className="w-full h-full flex items-center justify-center bg-[var(--coral)] opacity-80">
              <Dices className="w-6 h-6 text-[var(--ink)]" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-display font-black text-base sm:text-lg text-[var(--text-primary)] truncate group-hover:text-[var(--coral)] transition-colors">
                {session.gameName}
              </h3>
              {session.status === 'draft' || session.status === 'in_progress' ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--coral)] border border-[var(--ink)] text-[var(--ink)] text-[10px] font-bold uppercase tracking-wider shrink-0 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink)]" />
                  In Progress
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--teal)] border border-[var(--ink)] text-[var(--cream)] text-[10px] font-bold uppercase tracking-wider shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                  Completed
                </span>
              )}
            </div>
            {winner && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--butter)] border border-[var(--ink)] text-[var(--ink)] shadow-[1px_1px_0_var(--ink)] text-xs font-bold font-display uppercase tracking-wide shrink-0">
                <Crown className="w-3.5 h-3.5 fill-[var(--ink)] text-[var(--ink)]" />
                <span className="truncate max-w-[100px]">{winner.playerName}</span>
                {typeof winner.score === 'number' ? ` · ${winner.score}` : ''}
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-3 text-xs text-[var(--text-secondary)] flex-wrap tabular-nums font-medium">
            <span className="inline-flex items-center gap-1 font-semibold">
              <Calendar className="w-3.5 h-3.5 text-[var(--coral)]" />
              {formatDate(session.datePlayed)}
            </span>
            {session.durationMinutes ? (
              <>
                <span aria-hidden="true" className="opacity-40">·</span>
                <span className="inline-flex items-center gap-1 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-[var(--teal)]" />
                  {formatDuration(session.durationMinutes)}
                </span>
              </>
            ) : null}
            {session.location ? (
              <>
                <span aria-hidden="true" className="opacity-40">·</span>
                <span className="inline-flex items-center gap-1 truncate max-w-[200px] font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-[var(--coral)] shrink-0" />
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
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--paper)] border border-[var(--ink)] text-xs font-medium"
                >
                  <PlayerAvatar
                    player={savedPlayer}
                    name={p.playerName}
                    size="sm"
                    className="w-5 h-5 text-[10px]"
                  />
                  <span className="text-[var(--text-primary)] font-bold">
                    {p.playerName}
                  </span>
                  {typeof p.score === 'number' && (
                    <span className="font-mono text-[var(--text-secondary)] tabular-nums font-bold">
                      {p.score}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--coral)] group-hover:translate-x-1 transition-all shrink-0 hidden sm:block" />
      </Link>
    </motion.div>
  );
};

export default SessionCard;
