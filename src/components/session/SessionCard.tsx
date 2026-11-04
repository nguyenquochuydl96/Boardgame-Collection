import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, Clock, MapPin, Crown, ChevronRight } from 'lucide-react';
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
  const winner = session.players.find(
    (p) => p.isWinner || p.playerId === session.winnerId
  );

  return (
    <motion.div
      whileHover={{ scale: 1.01, y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Link
        to={`/sessions/${session.id}`}
        className="flex items-center gap-4 p-4 rounded-2xl bg-[#1a1a2e]/85 backdrop-blur-md border border-white/[0.08] hover:border-[#7c3aed]/50 hover:shadow-lg hover:shadow-[#7c3aed]/15 transition-all duration-300 group"
      >
        <img
          src={session.gameThumbnail}
          alt={session.gameName}
          referrerPolicy="no-referrer"
          className="w-16 h-20 rounded-xl object-cover shrink-0 bg-[#1e1e35] border border-white/10"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display font-bold text-base sm:text-lg text-[#f1f5f9] truncate group-hover:text-[#a78bfa] transition-colors">
              {session.gameName}
            </h3>
            {winner && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-semibold shrink-0">
                <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {winner.playerName}
                {typeof winner.score === 'number' ? ` · ${winner.score}` : ''}
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-3 text-xs text-[#94a3b8] flex-wrap tabular-nums">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#a78bfa]" />
              {formatDate(session.datePlayed)}
            </span>
            {session.durationMinutes ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#22d3ee]" />
                  {formatDuration(session.durationMinutes)}
                </span>
              </>
            ) : null}
            {session.location ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 truncate max-w-[200px]">
                  <MapPin className="w-3.5 h-3.5 text-[#ec4899] shrink-0" />
                  <span className="truncate">{session.location}</span>
                </span>
              </>
            ) : null}
          </div>

          {/* Player Avatar Chips Row */}
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            {session.players.map((p) => {
              const savedPlayer = playersById[p.playerId];
              return (
                <div
                  key={p.playerId}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#16162a] border border-white/[0.06] text-xs"
                >
                  <PlayerAvatar
                    player={savedPlayer}
                    name={p.playerName}
                    size="sm"
                    className="w-5 h-5 text-[10px]"
                  />
                  <span className="text-[#f1f5f9] font-medium">
                    {p.playerName}
                  </span>
                  {typeof p.score === 'number' && (
                    <span className="font-mono text-[#94a3b8] tabular-nums">
                      {p.score}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-[#475569] group-hover:text-[#a78bfa] group-hover:translate-x-0.5 transition-all shrink-0 hidden sm:block" />
      </Link>
    </motion.div>
  );
};

export default SessionCard;
