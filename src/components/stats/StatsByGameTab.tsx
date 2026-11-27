import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Filter, Search, ArrowUpRight, BarChart3 } from 'lucide-react';
import { Card } from '../ui/Card';
import { GameStatusBadge } from '../game/GameStatusBadge';
import { GameCoverImage } from '../game/GameCoverImage';
import { cn } from '../ui/cn';
import {
  calculateGameStats,
  formatDuration,
  formatPlayerRange,
  formatRecordTimeAgo,
  getTotalPlayDurationMinutes,
  formatNumber,
  pluralize,
  GameStatsSummary,
} from '../../lib/utils';
import { PlaySession, BoardGame, GameStatus } from '../../types';

const STATUS_FILTER_OPTIONS: Array<{ id: GameStatus | 'all'; label: string }> = [
  { id: 'all', label: 'All Statuses' },
  { id: 'own', label: 'Owned' },
  { id: 'rented', label: 'Rented' },
  { id: 'borrowed', label: 'Borrowed' },
  { id: 'previously_owned', label: 'Previously Owned' },
  { id: 'sold', label: 'Sold' },
  { id: 'wishlist', label: 'Wishlist' },
  { id: 'lent_out', label: 'Lent Out' },
];

interface StatsByGameTabProps {
  sessions: PlaySession[];
  games: BoardGame[];
  initialGameId?: string;
}

export const StatsByGameTab: React.FC<StatsByGameTabProps> = React.memo(
  ({ sessions, games, initialGameId }) => {
    const [selectedGameId, setSelectedGameId] = useState<string>(
      initialGameId || games[0]?.id || ''
    );
    const [gameStatusFilter, setGameStatusFilter] = useState<GameStatus | 'all'>('all');
    const [gameSearchQuery, setGameSearchQuery] = useState<string>('');

    useEffect(() => {
      if (initialGameId) {
        setSelectedGameId(initialGameId);
      }
    }, [initialGameId]);

    const gameStatusCounts = useMemo(() => {
      const counts: Record<string, number> = { all: games.length };
      games.forEach((g) => {
        counts[g.status] = (counts[g.status] || 0) + 1;
      });
      return counts;
    }, [games]);

    const filteredGamesByStatus = useMemo(() => {
      let list =
        gameStatusFilter === 'all'
          ? games
          : games.filter((g) => g.status === gameStatusFilter);

      if (gameSearchQuery.trim()) {
        const q = gameSearchQuery.toLowerCase().trim();
        list = list.filter((g) => g.name.toLowerCase().includes(q));
      }
      return list;
    }, [games, gameStatusFilter, gameSearchQuery]);

    const activeGame = useMemo(() => {
      const match = filteredGamesByStatus.find((g) => g.id === selectedGameId);
      if (match) return match;
      return filteredGamesByStatus[0] || games[0];
    }, [filteredGamesByStatus, selectedGameId, games]);

    const gamesById = useMemo(
      () => new Map(games.map((g) => [g.id, g])),
      [games]
    );

    const activeGameSessions = useMemo(
      () => (activeGame ? sessions.filter((s) => s.gameId === activeGame.id) : []),
      [sessions, activeGame]
    );

    const activeGameStats: GameStatsSummary = useMemo(
      () => calculateGameStats(activeGameSessions, 5, gamesById),
      [activeGameSessions, gamesById]
    );

    const allGamesBreakdownList = useMemo(() => {
      const gameSessionsMap = new Map<string, PlaySession[]>();
      for (const s of sessions) {
        const list = gameSessionsMap.get(s.gameId) || [];
        list.push(s);
        gameSessionsMap.set(s.gameId, list);
      }

      return games
        .map((g) => {
          const gSessions = gameSessionsMap.get(g.id) || [];
          const stats = calculateGameStats(gSessions, 5, gamesById);
          const totalDuration = getTotalPlayDurationMinutes(gSessions);

          return {
            game: g,
            totalPlays: stats.totalPlays,
            totalDuration,
            averageDuration: stats.averageDuration,
            highestScore: stats.highestScore,
            lowestScore: stats.lowestScore,
            topWinner: stats.mostWinsPlayer || stats.playerWinRates[0] || null,
            topLoser: stats.mostLossesPlayer || null,
          };
        })
        .sort((a, b) => b.totalPlays - a.totalPlays);
    }, [games, sessions, gamesById]);

    const gamesBreakdownList = useMemo(() => {
      let list = allGamesBreakdownList;
      if (gameStatusFilter !== 'all') {
        list = list.filter((item) => item.game.status === gameStatusFilter);
      }
      if (gameSearchQuery.trim()) {
        const q = gameSearchQuery.toLowerCase().trim();
        list = list.filter((item) => item.game.name.toLowerCase().includes(q));
      }
      return list;
    }, [allGamesBreakdownList, gameStatusFilter, gameSearchQuery]);

    return (
      <div className="space-y-6">
        {/* OWNERSHIP STATUS FILTER PILLS & SEARCH */}
        <Card className="p-4 sm:p-5 space-y-3.5 bg-[var(--card)] border border-[var(--line)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[var(--accent)]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                Filter by Ownership Status:
              </span>
            </div>
            <div className="relative sm:w-64">
              <Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search game title..."
                value={gameSearchQuery}
                onChange={(e) => setGameSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[var(--card-2)] border border-[var(--line)] text-xs font-semibold text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
              />
              {gameSearchQuery && (
                <button
                  type="button"
                  onClick={() => setGameSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {STATUS_FILTER_OPTIONS.map((opt) => {
              const count = gameStatusCounts[opt.id] ?? 0;
              if (count === 0 && opt.id !== 'all' && opt.id !== 'own') return null;
              const isSelected = gameStatusFilter === opt.id;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setGameStatusFilter(opt.id);
                    const matching =
                      opt.id === 'all'
                        ? games
                        : games.filter((g) => g.status === opt.id);
                    if (
                      matching.length > 0 &&
                      !matching.some((g) => g.id === selectedGameId)
                    ) {
                      setSelectedGameId(matching[0].id);
                    }
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer select-none border',
                    isSelected
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)] shadow-sm'
                      : 'bg-[var(--card-2)] text-[var(--ink-2)] border-[var(--line)] hover:bg-[var(--card-3)] hover:text-[var(--ink)]'
                  )}
                >
                  <span>{opt.label}</span>
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold',
                      isSelected
                        ? 'bg-black/20 text-current'
                        : 'bg-[var(--card-3)] text-[var(--muted)]'
                    )}
                  >
                    {formatNumber(count)}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* GAME DEEP DIVE CARD */}
        {activeGame ? (
          <Card className="p-6 sm:p-8 space-y-6 bg-[var(--card)] border border-[var(--line)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-5">
              <div className="flex items-center gap-4 min-w-0">
                <GameCoverImage
                  game={activeGame}
                  className="w-16 h-20 rounded-xl border border-[var(--line)] shrink-0 shadow-md"
                  fallbackIconSize="text-2xl"
                />
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[var(--ink)] truncate">
                      {activeGame.name}
                    </h2>
                    <GameStatusBadge status={activeGame.status} />
                    {activeGame.yearPublished && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--card-2)] border border-[var(--line)] text-[var(--muted)] font-mono font-bold">
                        {activeGame.yearPublished}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--muted)] line-clamp-1">
                    {formatPlayerRange(activeGame.minPlayers, activeGame.maxPlayers, 'full')} · {activeGame.playingTime} min/play
                  </p>
                </div>
              </div>

              <select
                aria-label="Select board game to view analytics"
                value={activeGame.id}
                onChange={(e) => setSelectedGameId(e.target.value)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[var(--card-2)] border border-[var(--line-2)] text-sm font-semibold text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] cursor-pointer sm:max-w-xs shrink-0"
              >
                {filteredGamesByStatus.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {activeGameStats.coopOutcomes.coopPlays > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-[var(--good-soft)] border border-[var(--good)]/25 text-xs tabular-nums">
                <div>
                  <span className="block text-[var(--muted)] font-semibold">Co-op Plays</span>
                  <strong className="text-base text-[var(--good)]">{pluralize(activeGameStats.coopOutcomes.coopPlays, 'play')}</strong>
                </div>
                <div>
                  <span className="block text-[var(--muted)] font-semibold">Team Wins</span>
                  <strong className="text-base text-[var(--good)]">{pluralize(activeGameStats.coopOutcomes.teamWins, 'win')}</strong>
                </div>
                <div>
                  <span className="block text-[var(--muted)] font-semibold">Team Win Rate</span>
                  <strong className="text-base text-[var(--good)]">{formatNumber(activeGameStats.coopOutcomes.teamWinRate)}%</strong>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 tabular-nums">
              {/* 1. TOTAL PLAYS */}
              <Link
                to={`/sessions?gameId=${activeGame.id}`}
                className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] hover:border-[var(--accent)] hover:shadow-lg hover:shadow-[var(--accent)]/10 transition-all flex flex-col justify-between group cursor-pointer"
                title="View all logged sessions for this game"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--muted)] font-bold uppercase tracking-wider">Total Plays</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <p className="font-display font-black text-2xl text-[var(--accent)] mt-1">
                    {pluralize(activeGameStats.totalPlays, 'play')}
                  </p>
                </div>
                <div className="text-[10px] text-[var(--muted)] group-hover:text-[var(--ink-2)] transition-colors mt-1 flex items-center justify-between">
                  <span>{pluralize(activeGameSessions.length, 'logged session')}</span>
                  <span className="font-semibold text-[9px] text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity">
                    View all →
                  </span>
                </div>
              </Link>

              {/* 2. AVERAGE DURATION */}
              <div className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] flex flex-col justify-between">
                <div>
                  <span className="text-[11px] text-[var(--muted)] font-bold uppercase tracking-wider">Avg Duration</span>
                  <p className="font-display font-black text-2xl text-cyan-700 dark:text-cyan-400 mt-1">
                    {formatDuration(activeGameStats.averageDuration)}
                  </p>
                </div>
                <span className="text-[10px] text-[var(--muted)] mt-1">
                  Pacing for the group
                </span>
              </div>

              {/* 3. HIGHEST SCORE RECORD */}
              {activeGameStats.highestScore?.sessionId ? (
                <Link
                  to={`/sessions/${activeGameStats.highestScore.sessionId}`}
                  className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] hover:border-[var(--accent)] hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
                  title="View record session details"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[var(--accent)] font-bold uppercase tracking-wider flex items-center gap-1">
                        <span>🏆</span> High Score
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>
                    <p className="font-mono font-black text-2xl text-[var(--accent)] mt-1">
                      {formatNumber(activeGameStats.highestScore.score)} pts
                    </p>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    <span className="text-xs font-bold text-[var(--ink)] block truncate group-hover:text-[var(--accent)] transition-colors">
                      {activeGameStats.highestScore.playerName}
                    </span>
                    <div className="text-[10px] text-[var(--muted)] flex items-center justify-between gap-1">
                      <span className="truncate">{formatRecordTimeAgo(activeGameStats.highestScore.date)}</span>
                      <span className="text-[9px] text-[var(--accent)] font-medium shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        View session →
                      </span>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] text-[var(--accent)] font-bold uppercase tracking-wider flex items-center gap-1">
                      <span>🏆</span> High Score
                    </span>
                    <p className="font-mono font-black text-2xl text-[var(--accent)] mt-1">
                      {activeGameStats.highestScore ? `${formatNumber(activeGameStats.highestScore.score)} pts` : '—'}
                    </p>
                  </div>
                  {activeGameStats.highestScore ? (
                    <div className="mt-1 space-y-0.5">
                      <span className="text-xs font-bold text-[var(--ink)] block truncate">
                        {activeGameStats.highestScore.playerName}
                      </span>
                      <span className="text-[10px] text-[var(--muted)] block truncate">
                        {formatRecordTimeAgo(activeGameStats.highestScore.date)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-[var(--muted)]">No score logged</span>
                  )}
                </div>
              )}

              {/* 4. LOWEST SCORE RECORD */}
              {activeGameStats.lowestScore?.sessionId ? (
                <Link
                  to={`/sessions/${activeGameStats.lowestScore.sessionId}`}
                  className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] hover:border-rose-500/60 hover:shadow-lg hover:shadow-rose-500/10 transition-all flex flex-col justify-between group cursor-pointer"
                  title="View session details"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-rose-500 font-bold uppercase tracking-wider flex items-center gap-1">
                        <span>📉</span> Lowest Score
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-rose-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>
                    <p className="font-mono font-black text-2xl text-rose-500 mt-1">
                      {formatNumber(activeGameStats.lowestScore.score)} pts
                    </p>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    <span className="text-xs font-bold text-[var(--ink)] block truncate group-hover:text-rose-500 transition-colors">
                      {activeGameStats.lowestScore.playerName}
                    </span>
                    <div className="text-[10px] text-[var(--muted)] flex items-center justify-between gap-1">
                      <span className="truncate">{formatRecordTimeAgo(activeGameStats.lowestScore.date)}</span>
                      <span className="text-[9px] text-rose-500 font-medium shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        View session →
                      </span>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] text-rose-500 font-bold uppercase tracking-wider flex items-center gap-1">
                      <span>📉</span> Lowest Score
                    </span>
                    <p className="font-mono font-black text-2xl text-rose-500 mt-1">
                      {activeGameStats.lowestScore ? `${formatNumber(activeGameStats.lowestScore.score)} pts` : '—'}
                    </p>
                  </div>
                  {activeGameStats.lowestScore ? (
                    <div className="mt-1 space-y-0.5">
                      <span className="text-xs font-bold text-[var(--ink)] block truncate">
                        {activeGameStats.lowestScore.playerName}
                      </span>
                      <span className="text-[10px] text-[var(--muted)] block truncate">
                        {formatRecordTimeAgo(activeGameStats.lowestScore.date)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-[var(--muted)]">No score logged</span>
                  )}
                </div>
              )}

              {/* 5. CHAMPION (MOST WINS) */}
              {(() => {
                const topWin = activeGameStats.mostWinsPlayer || activeGameStats.playerWinRates[0];
                if (!topWin) {
                  return (
                    <div className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] flex flex-col justify-between">
                      <div>
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <span>👑</span> Most Wins
                        </span>
                        <p className="font-display font-bold text-base text-amber-600 dark:text-amber-400 mt-1 truncate">—</p>
                      </div>
                      <span className="text-[10px] text-[var(--muted)]">No wins recorded</span>
                    </div>
                  );
                }

                const cardContent = (
                  <>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <span>👑</span> Most Wins
                        </span>
                        {topWin.lastWonSessionId && (
                          <ArrowUpRight className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                        )}
                      </div>
                      <p className="font-display font-bold text-base text-amber-600 dark:text-amber-400 mt-1 truncate">
                        {topWin.playerName}
                      </p>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      <span className="text-xs font-mono font-bold text-[var(--ink)] block">
                        {pluralize(topWin.wins, 'win')} ({topWin.winRate}%)
                      </span>
                      {topWin.lastWonDate && (
                        <div className="text-[10px] text-[var(--muted)] flex items-center justify-between gap-1">
                          <span className="truncate">Won: {formatRecordTimeAgo(topWin.lastWonDate)}</span>
                          {topWin.lastWonSessionId && (
                            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              View session →
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                );

                return topWin.lastWonSessionId ? (
                  <Link
                    to={`/sessions/${topWin.lastWonSessionId}`}
                    className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-500/10 transition-all flex flex-col justify-between group cursor-pointer"
                    title="View latest winning session"
                  >
                    {cardContent}
                  </Link>
                ) : (
                  <div className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] flex flex-col justify-between">
                    {cardContent}
                  </div>
                );
              })()}

              {/* 6. MOST LOSSES PLAYER */}
              {(() => {
                const topLoss = activeGameStats.mostLossesPlayer;
                if (!topLoss) {
                  return (
                    <div className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] flex flex-col justify-between">
                      <div>
                        <span className="text-[11px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <span>🥄</span> Most Losses
                          <span className="text-[10px] text-[var(--muted)] font-normal lowercase">(≥ 5 plays)</span>
                        </span>
                        <p className="font-display font-bold text-base text-rose-600 dark:text-rose-400 mt-1 truncate">—</p>
                      </div>
                      <span className="text-[10px] text-[var(--muted)]">No qualified record (≥ 5 plays)</span>
                    </div>
                  );
                }

                const cardContent = (
                  <>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <span>🥄</span> Most Losses
                          <span className="text-[10px] text-[var(--muted)] font-normal lowercase">(≥ 5 plays)</span>
                        </span>
                        {topLoss.lastPlayedSessionId && (
                          <ArrowUpRight className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-rose-600 dark:group-hover:text-rose-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                        )}
                      </div>
                      <p className="font-display font-bold text-base text-rose-600 dark:text-rose-400 mt-1 truncate">
                        {topLoss.playerName}
                      </p>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      <span className="text-xs font-mono font-bold text-[var(--ink)] block">
                        {pluralize(topLoss.losses, 'loss', 'losses')} / {pluralize(topLoss.plays, 'play')} ({topLoss.lossRate}%)
                      </span>
                      {topLoss.lastPlayedDate && (
                        <div className="text-[10px] text-[var(--muted)] flex items-center justify-between gap-1">
                          <span className="truncate">Recent: {formatRecordTimeAgo(topLoss.lastPlayedDate)}</span>
                          {topLoss.lastPlayedSessionId && (
                            <span className="text-[9px] text-rose-600 dark:text-rose-400 font-medium shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              View session →
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                );

                return topLoss.lastPlayedSessionId ? (
                  <Link
                    to={`/sessions/${topLoss.lastPlayedSessionId}`}
                    className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] hover:border-rose-600/60 hover:shadow-lg hover:shadow-rose-600/10 transition-all flex flex-col justify-between group cursor-pointer"
                    title="View recent session"
                  >
                    {cardContent}
                  </Link>
                ) : (
                  <div className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] flex flex-col justify-between">
                    {cardContent}
                  </div>
                );
              })()}
            </div>

            {/* Win rates for this game */}
            {activeGameStats.playerWinRates.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-[var(--line)]">
                <h3 className="font-bold text-sm text-[var(--ink)]">Competitive Player Performance</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeGameStats.playerWinRates.map((pw) => (
                    <div
                      key={pw.playerId}
                      className="p-3 rounded-xl bg-[var(--card-2)] border border-[var(--line)] flex items-center justify-between"
                    >
                      <span className="font-bold text-xs text-[var(--ink)]">{pw.playerName}</span>
                      <div className="text-xs font-mono">
                        <span className="text-amber-600 dark:text-amber-400 font-bold">{pluralize(pw.wins, 'win')}</span>
                        <span className="text-[var(--muted)] ml-2">({pw.winRate}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ) : (
          <div className="p-8 text-center bg-[var(--card-2)] rounded-2xl border border-[var(--line)] text-sm text-[var(--muted)]">
            No games found matching the selected ownership filter.
          </div>
        )}

        {/* ALL GAMES BREAKDOWN TABLE FOR CURRENT STATUS */}
        {gamesBreakdownList.length > 0 && (
          <Card className="p-6 space-y-4 bg-[var(--card)] border border-[var(--line)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-display font-bold text-lg text-[var(--ink)] flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[var(--accent)]" />
                  <span>
                    All Games Breakdown ({pluralize(gamesBreakdownList.length, 'game')})
                  </span>
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  {gameStatusFilter === 'all'
                    ? 'All games in collection sorted by play count'
                    : `Games with status "${STATUS_FILTER_OPTIONS.find((o) => o.id === gameStatusFilter)?.label || gameStatusFilter}" sorted by play count`}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[var(--line)]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[var(--card-2)] border-b border-[var(--line)] text-[var(--muted)]">
                  <tr>
                    <th className="py-3 px-4 font-bold">Game</th>
                    <th className="py-3 px-3 font-bold text-center">Status</th>
                    <th className="py-3 px-3 font-bold text-right">Plays</th>
                    <th className="py-3 px-3 font-bold text-right">Total Time</th>
                    <th className="py-3 px-3 font-bold text-right">High Score</th>
                    <th className="py-3 px-3 font-bold text-right">Lowest Score</th>
                    <th className="py-3 px-3 font-bold text-right">Most Wins</th>
                    <th className="py-3 px-3 font-bold text-right" title="Player with highest loss rate (minimum 5 plays)">Most Losses (≥5)</th>
                    <th className="py-3 px-4 font-bold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)] tabular-nums bg-[var(--card)]">
                  {gamesBreakdownList.map((item) => {
                    const isSelected = activeGame && item.game.id === activeGame.id;
                    return (
                      <tr
                        key={item.game.id}
                        onClick={() => setSelectedGameId(item.game.id)}
                        className={cn(
                          'hover:bg-[var(--card-2)]/60 transition-colors cursor-pointer',
                          isSelected && 'bg-[var(--accent)]/10 font-medium'
                        )}
                      >
                        <td className="py-3 px-4 font-display font-bold text-[var(--ink)]">
                          <div className="flex items-center gap-3">
                            <GameCoverImage
                              game={item.game}
                              className="w-8 h-10 rounded-lg shrink-0 border border-[var(--line)] shadow-sm"
                              fallbackIconSize="text-sm"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-sm block truncate text-[var(--ink)]">
                                {item.game.name}
                              </span>
                              <span className="text-[10px] text-[var(--muted)] font-normal font-sans">
                                {formatPlayerRange(item.game.minPlayers, item.game.maxPlayers, 'full')} · {item.game.playingTime}m
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <GameStatusBadge status={item.game.status} />
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-sm">
                          {item.totalPlays > 0 ? (
                            <Link
                              to={`/sessions?gameId=${item.game.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-[var(--accent)] font-black hover:underline inline-flex items-center gap-0.5 justify-end group/plays"
                              title={`View all ${pluralize(item.totalPlays, 'session')} of ${item.game.name}`}
                            >
                              <span>{pluralize(item.totalPlays, 'play')}</span>
                              <ArrowUpRight className="w-3 h-3 opacity-0 group-hover/plays:opacity-100 transition-opacity" />
                            </Link>
                          ) : (
                            <span className="text-[var(--muted)]">0 plays</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-xs">
                          {item.totalDuration > 0 ? formatDuration(item.totalDuration) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-xs">
                          {item.highestScore ? (
                            item.highestScore.sessionId ? (
                              <Link
                                to={`/sessions/${item.highestScore.sessionId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="group/rec block text-right hover:opacity-90"
                                title={`View record session of ${item.highestScore.playerName} (${formatNumber(item.highestScore.score)} pts)`}
                              >
                                <span className="font-bold text-[var(--accent)] group-hover/rec:underline inline-flex items-center gap-0.5 justify-end">
                                  {formatNumber(item.highestScore.score)} pts
                                  <ArrowUpRight className="w-2.5 h-2.5 opacity-0 group-hover/rec:opacity-100 transition-opacity" />
                                </span>
                                <span className="text-[10px] text-[var(--muted)] block truncate max-w-[120px] ml-auto">
                                  {item.highestScore.playerName}
                                </span>
                                {item.highestScore.date && (
                                  <span
                                    className="text-[9px] text-[var(--muted)]/80 block truncate max-w-[130px] ml-auto group-hover/rec:text-[var(--accent)] transition-colors"
                                    title={formatRecordTimeAgo(item.highestScore.date)}
                                  >
                                    {formatRecordTimeAgo(item.highestScore.date)}
                                  </span>
                                )}
                              </Link>
                            ) : (
                              <div>
                                <span className="font-bold text-[var(--accent)]">
                                  {formatNumber(item.highestScore.score)} pts
                                </span>
                                <span className="text-[10px] text-[var(--muted)] block truncate max-w-[120px] ml-auto">
                                  {item.highestScore.playerName}
                                </span>
                                {item.highestScore.date && (
                                  <span className="text-[9px] text-[var(--muted)]/80 block truncate max-w-[130px] ml-auto" title={formatRecordTimeAgo(item.highestScore.date)}>
                                    {formatRecordTimeAgo(item.highestScore.date)}
                                  </span>
                                )}
                              </div>
                            )
                          ) : (
                            <span className="text-[var(--muted)]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-xs">
                          {item.lowestScore ? (
                            item.lowestScore.sessionId ? (
                              <Link
                                to={`/sessions/${item.lowestScore.sessionId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="group/rec block text-right hover:opacity-90"
                                title={`View session of ${item.lowestScore.playerName} (${formatNumber(item.lowestScore.score)} pts)`}
                              >
                                <span className="font-bold text-rose-500 group-hover/rec:underline inline-flex items-center gap-0.5 justify-end">
                                  {formatNumber(item.lowestScore.score)} pts
                                  <ArrowUpRight className="w-2.5 h-2.5 opacity-0 group-hover/rec:opacity-100 transition-opacity" />
                                </span>
                                <span className="text-[10px] text-[var(--muted)] block truncate max-w-[120px] ml-auto">
                                  {item.lowestScore.playerName}
                                </span>
                                {item.lowestScore.date && (
                                  <span
                                    className="text-[9px] text-[var(--muted)]/80 block truncate max-w-[130px] ml-auto group-hover/rec:text-rose-500 transition-colors"
                                    title={formatRecordTimeAgo(item.lowestScore.date)}
                                  >
                                    {formatRecordTimeAgo(item.lowestScore.date)}
                                  </span>
                                )}
                              </Link>
                            ) : (
                              <div>
                                <span className="font-bold text-rose-500">
                                  {formatNumber(item.lowestScore.score)} pts
                                </span>
                                <span className="text-[10px] text-[var(--muted)] block truncate max-w-[120px] ml-auto">
                                  {item.lowestScore.playerName}
                                </span>
                                {item.lowestScore.date && (
                                  <span className="text-[9px] text-[var(--muted)]/80 block truncate max-w-[130px] ml-auto" title={formatRecordTimeAgo(item.lowestScore.date)}>
                                    {formatRecordTimeAgo(item.lowestScore.date)}
                                  </span>
                                )}
                              </div>
                            )
                          ) : (
                            <span className="text-[var(--muted)]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-xs">
                          {item.topWinner ? (
                            item.topWinner.lastWonSessionId ? (
                              <Link
                                to={`/sessions/${item.topWinner.lastWonSessionId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="group/rec block text-right hover:opacity-90"
                                title={`View latest winning session of ${item.topWinner.playerName}`}
                              >
                                <span className="font-bold text-amber-600 dark:text-amber-400 max-w-[120px] ml-auto group-hover/rec:underline inline-flex items-center gap-0.5 justify-end">
                                  <span className="truncate">{item.topWinner.playerName}</span>
                                  <ArrowUpRight className="w-2.5 h-2.5 shrink-0 opacity-0 group-hover/rec:opacity-100 transition-opacity" />
                                </span>
                                <span className="text-[10px] text-[var(--muted)] block">
                                  {pluralize(item.topWinner.wins, 'win')} ({item.topWinner.winRate}%)
                                </span>
                                {item.topWinner.lastWonDate && (
                                  <span
                                    className="text-[9px] text-[var(--muted)]/80 block truncate max-w-[130px] ml-auto group-hover/rec:text-amber-600 dark:group-hover/rec:text-amber-400 transition-colors"
                                    title={`Won: ${formatRecordTimeAgo(item.topWinner.lastWonDate)}`}
                                  >
                                    {formatRecordTimeAgo(item.topWinner.lastWonDate)}
                                  </span>
                                )}
                              </Link>
                            ) : (
                              <div>
                                <span className="font-bold text-amber-600 dark:text-amber-400 block truncate max-w-[120px] ml-auto">
                                  {item.topWinner.playerName}
                                </span>
                                <span className="text-[10px] text-[var(--muted)] block">
                                  {pluralize(item.topWinner.wins, 'win')} ({item.topWinner.winRate}%)
                                </span>
                                {item.topWinner.lastWonDate && (
                                  <span className="text-[9px] text-[var(--muted)]/80 block truncate max-w-[130px] ml-auto" title={`Won: ${formatRecordTimeAgo(item.topWinner.lastWonDate)}`}>
                                    {formatRecordTimeAgo(item.topWinner.lastWonDate)}
                                  </span>
                                )}
                              </div>
                            )
                          ) : (
                            <span className="text-[var(--muted)]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-xs">
                          {item.topLoser ? (
                            item.topLoser.lastPlayedSessionId ? (
                              <Link
                                to={`/sessions/${item.topLoser.lastPlayedSessionId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="group/rec block text-right hover:opacity-90"
                                title={`View recent session of ${item.topLoser.playerName}`}
                              >
                                <span className="font-bold text-rose-600 dark:text-rose-400 max-w-[120px] ml-auto group-hover/rec:underline inline-flex items-center gap-0.5 justify-end">
                                  <span className="truncate">{item.topLoser.playerName}</span>
                                  <ArrowUpRight className="w-2.5 h-2.5 shrink-0 opacity-0 group-hover/rec:opacity-100 transition-opacity" />
                                </span>
                                <span className="text-[10px] text-[var(--muted)] block">
                                  {pluralize(item.topLoser.losses, 'loss', 'losses')} ({item.topLoser.lossRate}%)
                                </span>
                                {item.topLoser.lastPlayedDate && (
                                  <span
                                    className="text-[9px] text-[var(--muted)]/80 block truncate max-w-[130px] ml-auto group-hover/rec:text-rose-600 dark:group-hover/rec:text-rose-400 transition-colors"
                                    title={`Recent: ${formatRecordTimeAgo(item.topLoser.lastPlayedDate)}`}
                                  >
                                    {formatRecordTimeAgo(item.topLoser.lastPlayedDate)}
                                  </span>
                                )}
                              </Link>
                            ) : (
                              <div>
                                <span className="font-bold text-rose-600 dark:text-rose-400 block truncate max-w-[120px] ml-auto">
                                  {item.topLoser.playerName}
                                </span>
                                <span className="text-[10px] text-[var(--muted)] block">
                                  {pluralize(item.topLoser.losses, 'loss', 'losses')} ({item.topLoser.lossRate}%)
                                </span>
                                {item.topLoser.lastPlayedDate && (
                                  <span className="text-[9px] text-[var(--muted)]/80 block truncate max-w-[130px] ml-auto" title={`Recent: ${formatRecordTimeAgo(item.topLoser.lastPlayedDate)}`}>
                                    {formatRecordTimeAgo(item.topLoser.lastPlayedDate)}
                                  </span>
                                )}
                              </div>
                            )
                          ) : (
                            <span className="text-[var(--muted)]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedGameId(item.game.id);
                            }}
                            className={cn(
                              'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none',
                              isSelected
                                ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                                : 'bg-[var(--card-2)] text-[var(--ink-2)] hover:bg-[var(--card-3)] hover:text-[var(--ink)]'
                            )}
                          >
                            {isSelected ? 'Viewing' : 'View'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    );
  }
);
