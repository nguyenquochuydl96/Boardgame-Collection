import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Crown, ChevronRight, Check } from 'lucide-react';
import { PlaySession, Player } from '../../types';
import { formatDate, formatDuration, formatCount, isCoopSession, isWinOnlySession } from '../../lib/utils';
import { PlayerAvatar } from '../player/PlayerAvatar';
import { GameCoverImage } from '../game/GameCoverImage';

export interface SessionCardProps {
  session: PlaySession;
  playersById?: Record<string, Player>;
}

export const SessionCard: React.FC<SessionCardProps> = memo(({
  session,
  playersById = {},
}) => {
  const players = session.players || [];
  const isCoop = isCoopSession(session);
  const isWinOnly = isWinOnlySession(session);
  const winner = players.find(
    (p) => p.isWinner || p.playerId === session.winnerId
  );

  return (
    <div className="transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.99]">
      <Link
        to={`/sessions/${session.id}`}
        className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] hover:border-[var(--line-2)] hover:shadow-md transition-all duration-200 group"
      >
        <GameCoverImage
          game={{ name: session.gameName, thumbnail: session.gameThumbnail }}
          className="w-14 h-16 sm:w-16 sm:h-20 rounded-xl shrink-0 border border-[var(--line)]"
          imgClassName="group-hover:scale-105 transition-transform duration-300"
          fallbackIconSize="text-xl"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-display font-bold text-base sm:text-lg text-[var(--ink)] truncate group-hover:text-[var(--accent)] transition-colors">
                {session.gameName}
              </h3>
              {session.status === 'draft' || session.status === 'in_progress' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                  In Progress
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--good-soft)] text-[var(--good)] text-[10px] font-bold shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                  Completed
                </span>
              )}
            </div>
            {isCoop && winner ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--good-soft)] text-[var(--good)] border border-[var(--good)]/30 text-xs font-bold shrink-0">
                <span>🤝</span>
                <span>Team Win</span>
              </span>
            ) : isCoop && !winner ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--bad-soft)] text-[var(--bad)] border border-[var(--bad)]/30 text-xs font-bold shrink-0">
                <span>💀</span>
                <span>Team Defeat</span>
              </span>
            ) : winner ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E5734F]/15 text-[#E5734F] border border-[#E5734F]/30 text-xs font-semibold shrink-0">
                <Crown className="w-3.5 h-3.5 fill-[#E5734F] text-[#E5734F]" />
                <span className="truncate max-w-[100px]">{winner.playerName}</span>
                {typeof winner.score === 'number' && !isWinOnly ? ` · ${winner.score}` : ''}
              </span>
            ) : null}
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
                {formatCount(players.length, 'player')}
              </span>
            </div>
          )}
        </div>

        <ChevronRight className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all shrink-0" />
      </Link>
    </div>
  );
});

export default SessionCard;
