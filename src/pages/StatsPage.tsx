import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Clock,
  Flame,
  BarChart3,
  Dices,
  Users,
  Swords,
} from 'lucide-react';
import { PageTransition } from '../components/layout/PageTransition';
import { Card } from '../components/ui/Card';
import { PlayerChip } from '../components/player/PlayerChip';
import { cn } from '../components/ui/cn';
import { useGameStore } from '../store/useGameStore';
import { useSessionStore } from '../store/useSessionStore';
import { usePlayerStore } from '../store/usePlayerStore';
import {
  calculateGameStats,
  calculateHeadToHead,
  calculateLongestWinStreak,
  formatDate,
  formatDuration,
} from '../lib/utils';

type StatsTab = 'overview' | 'by_game' | 'by_player';

export const StatsPage: React.FC = () => {
  const games = useGameStore((s) => s.games);
  const sessions = useSessionStore((s) => s.sessions);
  const players = usePlayerStore((s) => s.players);

  const [activeTab, setActiveTab] = useState<StatsTab>('overview');
  const [selectedGameId, setSelectedGameId] = useState<string>(
    games[0]?.id || ''
  );
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(() =>
    players.slice(0, 2).map((p) => p.id)
  );

  // Overview metrics
  const playCountByGame = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of games) map.set(g.id, 0);
    for (const s of sessions) {
      map.set(s.gameId, (map.get(s.gameId) || 0) + 1);
    }
    return map;
  }, [games, sessions]);

  const sortedGamesByPlays = useMemo(() => {
    return [...games].sort(
      (a, b) =>
        (playCountByGame.get(b.id) || 0) - (playCountByGame.get(a.id) || 0)
    );
  }, [games, playCountByGame]);

  const mostPlayedGame = sortedGamesByPlays[0];
  const leastPlayedGame =
    sortedGamesByPlays[sortedGamesByPlays.length - 1];

  const sortedByDuration = useMemo(() => {
    return [...sessions]
      .filter((s) => (s.durationMinutes || 0) > 0)
      .sort((a, b) => (b.durationMinutes || 0) - (a.durationMinutes || 0));
  }, [sessions]);

  const longestSession = sortedByDuration[0];
  const shortestSession = sortedByDuration[sortedByDuration.length - 1];

  const playerStreaks = useMemo(() => {
    return players
      .map((p) => ({
        player: p,
        streak: calculateLongestWinStreak(p.id, sessions),
      }))
      .sort((a, b) => b.streak - a.streak);
  }, [players, sessions]);

  // Monthly frequency chart
  const monthlyFrequency = useMemo(() => {
    const monthCounts = new Map<string, number>();
    const sortedChron = [...sessions].sort(
      (a, b) =>
        new Date(a.datePlayed).getTime() - new Date(b.datePlayed).getTime()
    );
    for (const s of sortedChron) {
      const d = new Date(s.datePlayed);
      const label = d.toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      });
      monthCounts.set(label, (monthCounts.get(label) || 0) + 1);
    }
    return Array.from(monthCounts.entries()).map(([month, count]) => ({
      month,
      count,
    }));
  }, [sessions]);

  // By Game stats
  const activeGame =
    games.find((g) => g.id === selectedGameId) || games[0];
  const activeGameSessions = useMemo(
    () =>
      activeGame
        ? sessions.filter((s) => s.gameId === activeGame.id)
        : [],
    [sessions, activeGame]
  );
  const activeGameStats = useMemo(
    () => calculateGameStats(activeGameSessions),
    [activeGameSessions]
  );

  // By Player comparison
  const activeComparisonPlayers = useMemo(
    () => players.filter((p) => selectedPlayerIds.includes(p.id)),
    [players, selectedPlayerIds]
  );
  const headToHead = useMemo(
    () => calculateHeadToHead(activeComparisonPlayers, sessions),
    [activeComparisonPlayers, sessions]
  );

  const togglePlayerSelection = (id: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const maxMonthCount = Math.max(
    ...monthlyFrequency.map((m) => m.count),
    1
  );

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
            Analytics & Vault Stats
          </h1>
          <p className="text-sm text-[#94a3b8]">
            Deep dive into tabletop trends, winning streaks, and player rivalries
          </p>
        </div>

        {/* Tabs: Overview | By Game | By Player */}
        <div
          role="tablist"
          aria-label="Stats views"
          className="inline-flex p-1.5 rounded-2xl bg-[#16162a] border border-white/10 max-w-full overflow-x-auto"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'overview'}
            type="button"
            onClick={() => setActiveTab('overview')}
            className={cn(
              'min-h-[42px] px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0',
              activeTab === 'overview'
                ? 'bg-[image:var(--gradient-hero)] text-white shadow-lg'
                : 'text-[#94a3b8] hover:text-white'
            )}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            Overview
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'by_game'}
            type="button"
            onClick={() => setActiveTab('by_game')}
            className={cn(
              'min-h-[42px] px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0',
              activeTab === 'by_game'
                ? 'bg-[image:var(--gradient-hero)] text-white shadow-lg'
                : 'text-[#94a3b8] hover:text-white'
            )}
          >
            <Dices className="w-4 h-4 shrink-0" />
            By Game
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'by_player'}
            type="button"
            onClick={() => setActiveTab('by_player')}
            className={cn(
              'min-h-[42px] px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0',
              activeTab === 'by_player'
                ? 'bg-[image:var(--gradient-hero)] text-white shadow-lg'
                : 'text-[#94a3b8] hover:text-white'
            )}
          >
            <Users className="w-4 h-4 shrink-0" />
            By Player
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
              {mostPlayedGame && (
                <Card className="p-5 flex gap-3.5 items-center">
                  <img
                    src={mostPlayedGame.thumbnail || mostPlayedGame.image}
                    alt={mostPlayedGame.name}
                    referrerPolicy="no-referrer"
                    className="w-16 h-20 rounded-xl object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-[#a78bfa]">
                      Most Played Game
                    </span>
                    <Link
                      to={`/collection/${mostPlayedGame.id}`}
                      className="font-display font-bold text-base text-white truncate block hover:underline"
                    >
                      {mostPlayedGame.name}
                    </Link>
                    <p className="text-xs text-[#94a3b8] mt-1">
                      {playCountByGame.get(mostPlayedGame.id) || 0} sessions
                    </p>
                  </div>
                </Card>
              )}

              {leastPlayedGame && (
                <Card className="p-5 flex flex-col justify-between">
                  <span className="text-xs font-semibold text-[#94a3b8]">
                    Least Played Game
                  </span>
                  <div>
                    <Link
                      to={`/collection/${leastPlayedGame.id}`}
                      className="font-display font-bold text-lg text-white truncate block hover:text-[#a78bfa]"
                    >
                      {leastPlayedGame.name}
                    </Link>
                    <p className="text-xs text-[#94a3b8] mt-1">
                      {playCountByGame.get(leastPlayedGame.id) || 0} sessions logged
                    </p>
                  </div>
                </Card>
              )}

              {longestSession && (
                <Card className="p-5 flex flex-col justify-between">
                  <span className="text-xs font-semibold text-[#22d3ee] inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Longest Session Ever
                  </span>
                  <div>
                    <p className="font-display font-extrabold text-2xl text-white">
                      {formatDuration(longestSession.durationMinutes)}
                    </p>
                    <p className="text-xs text-[#94a3b8] truncate mt-1">
                      {longestSession.gameName} ·{' '}
                      {formatDate(longestSession.datePlayed)}
                    </p>
                  </div>
                </Card>
              )}

              {shortestSession && (
                <Card className="p-5 flex flex-col justify-between">
                  <span className="text-xs font-semibold text-emerald-400 inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Shortest Session Ever
                  </span>
                  <div>
                    <p className="font-display font-extrabold text-2xl text-white">
                      {formatDuration(shortestSession.durationMinutes)}
                    </p>
                    <p className="text-xs text-[#94a3b8] truncate mt-1">
                      {shortestSession.gameName} ·{' '}
                      {formatDate(shortestSession.datePlayed)}
                    </p>
                  </div>
                </Card>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Monthly Play Frequency Bar Chart */}
              <Card className="lg:col-span-7 p-6 space-y-5">
                <div>
                  <h2 className="font-display font-bold text-xl text-white">
                    Monthly Play Frequency
                  </h2>
                  <p className="text-xs text-[#94a3b8]">
                    Sessions recorded per month
                  </p>
                </div>

                <div className="h-52 flex items-end gap-4 pt-6 pb-2 px-2 border-b border-white/10">
                  {monthlyFrequency.map((item) => {
                    const heightPct = Math.max(
                      Math.round((item.count / maxMonthCount) * 100),
                      12
                    );
                    return (
                      <div
                        key={item.month}
                        className="flex-1 flex flex-col items-center gap-2 h-full justify-end"
                      >
                        <span className="font-mono text-xs font-bold text-[#a78bfa] tabular-nums">
                          {item.count}
                        </span>
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-full max-w-[48px] rounded-t-xl bg-[image:var(--gradient-hero)] shadow-lg shadow-[#7c3aed]/25 transition-all duration-500"
                        />
                        <span className="text-xs text-[#94a3b8] font-medium whitespace-nowrap">
                          {item.month}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Best Winning Streak Per Player */}
              <Card className="lg:col-span-5 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-400" />
                  <div>
                    <h2 className="font-display font-bold text-xl text-white">
                      Best Winning Streaks
                    </h2>
                    <p className="text-xs text-[#94a3b8]">
                      Consecutive session victories per player
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 tabular-nums">
                  {playerStreaks.map(({ player, streak }) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-[#16162a] border border-white/[0.06]"
                    >
                      <span className="font-display font-bold text-sm text-white">
                        {player.avatar} {player.name}
                      </span>
                      <span className="font-mono font-bold text-sm text-orange-300">
                        {streak} {streak === 1 ? 'win' : 'wins'} in a row
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: BY GAME */}
        {activeTab === 'by_game' && activeGame && (
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
              <div className="flex items-center gap-4">
                <img
                  src={activeGame.thumbnail || activeGame.image}
                  alt={activeGame.name}
                  referrerPolicy="no-referrer"
                  className="w-16 h-20 rounded-xl object-cover"
                />
                <div>
                  <h2 className="font-display font-extrabold text-2xl text-white">
                    {activeGame.name}
                  </h2>
                  <p className="text-xs text-[#94a3b8]">
                    Select any game from the dropdown to inspect its records
                  </p>
                </div>
              </div>

              <select
                aria-label="Select boardgame for stats"
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#16162a] border border-white/15 text-sm font-semibold text-white focus:outline-none focus:border-[#7c3aed] cursor-pointer"
              >
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 tabular-nums">
              <div className="p-4 rounded-2xl bg-[#16162a] border border-white/[0.06]">
                <span className="text-xs text-[#94a3b8]">Total Plays</span>
                <p className="font-display font-extrabold text-2xl text-[#a78bfa] mt-1">
                  {activeGameStats.totalPlays}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[#16162a] border border-white/[0.06]">
                <span className="text-xs text-[#94a3b8]">Average Duration</span>
                <p className="font-display font-extrabold text-2xl text-[#22d3ee] mt-1">
                  {formatDuration(activeGameStats.averageDuration)}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[#16162a] border border-white/[0.06]">
                <span className="text-xs text-[#94a3b8]">Top Player</span>
                <p className="font-display font-extrabold text-lg text-amber-400 mt-1 truncate">
                  {activeGameStats.playerWinRates[0]?.playerName || '—'}
                </p>
                {activeGameStats.playerWinRates[0] && (
                  <span className="text-xs text-[#94a3b8]">
                    {activeGameStats.playerWinRates[0].winRate}% win rate
                  </span>
                )}
              </div>
              <div className="p-4 rounded-2xl bg-[#16162a] border border-white/[0.06]">
                <span className="text-xs text-[#94a3b8]">Score Record</span>
                <p className="font-mono font-extrabold text-2xl text-emerald-400 mt-1">
                  {activeGameStats.highestScore
                    ? activeGameStats.highestScore.score
                    : '—'}
                </p>
                {activeGameStats.highestScore && (
                  <span className="text-xs text-[#94a3b8]">
                    by {activeGameStats.highestScore.playerName}
                  </span>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* TAB 3: BY PLAYER (HEAD-TO-HEAD) */}
        {activeTab === 'by_player' && (
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="font-display font-bold text-xl text-white">
                Select Players for Head-to-Head Comparison
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Select 2 or more players to compare their shared games, win rates, and score records
              </p>
              <div className="flex flex-wrap gap-2.5 pt-2">
                {players.map((p) => (
                  <PlayerChip
                    key={p.id}
                    player={p}
                    selected={selectedPlayerIds.includes(p.id)}
                    onClick={() => togglePlayerSelection(p.id)}
                  />
                ))}
              </div>
            </div>

            {activeComparisonPlayers.length < 2 ? (
              <div className="p-8 rounded-2xl bg-[#16162a] border border-white/10 text-center">
                <p className="text-sm text-[#94a3b8]">
                  Please select at least 2 players above to view head-to-head comparison metrics.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-[#16162a] border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Swords className="w-5 h-5 text-[#22d3ee]" />
                    <span className="font-display font-bold text-sm sm:text-base text-white">
                      Total Plays Together
                    </span>
                  </div>
                  <span className="font-mono font-extrabold text-2xl text-[#22d3ee] tabular-nums">
                    {headToHead.sharedSessionsCount} sessions
                  </span>
                </div>

                {/* Head-to-Head Summary Table */}
                <div className="overflow-x-auto rounded-2xl border border-white/10">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#1e1e35] text-xs text-[#94a3b8]">
                      <tr>
                        <th className="py-3.5 px-4 font-semibold">Player</th>
                        <th className="py-3.5 px-4 font-semibold text-right">
                          Wins Together
                        </th>
                        <th className="py-3.5 px-4 font-semibold text-right">
                          Win Rate
                        </th>
                        <th className="py-3.5 px-4 font-semibold text-right">
                          Highest Score
                        </th>
                        <th className="py-3.5 px-4 font-semibold text-right">
                          Lowest Score
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06] bg-[#16162a] tabular-nums">
                      {headToHead.playerStats.map((st) => (
                        <tr key={st.player.id}>
                          <td className="py-3.5 px-4 font-display font-bold text-white">
                            {st.player.avatar} {st.player.name}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-300">
                            {st.winsInShared}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                            {st.winRateInShared}%
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-white">
                            {st.highestScore !== null ? st.highestScore : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-[#94a3b8]">
                            {st.lowestScore !== null ? st.lowestScore : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Per-game win breakdown */}
                {headToHead.perGameBreakdown.length > 0 && (
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
                      Per-Game Win Breakdown
                    </h3>
                    <div className="overflow-x-auto rounded-2xl border border-white/10">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[#1e1e35] text-xs text-[#94a3b8]">
                          <tr>
                            <th className="py-3 px-4 font-semibold">Game</th>
                            <th className="py-3 px-3 font-semibold text-right">
                              Shared Plays
                            </th>
                            {activeComparisonPlayers.map((p) => (
                              <th
                                key={p.id}
                                className="py-3 px-3 font-semibold text-right"
                              >
                                {p.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.06] bg-[#16162a] tabular-nums">
                          {headToHead.perGameBreakdown.map((row) => (
                            <tr key={row.gameId}>
                              <td className="py-3 px-4 font-semibold text-white">
                                {row.gameName}
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-[#94a3b8]">
                                {row.plays}
                              </td>
                              {activeComparisonPlayers.map((p) => {
                                const w = row.winsByPlayerId[p.id] || 0;
                                return (
                                  <td
                                    key={p.id}
                                    className="py-3 px-3 text-right font-mono text-white"
                                  >
                                    {w > 0 ? (
                                      <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
                                        <Trophy className="w-3.5 h-3.5" />
                                        {w}
                                      </span>
                                    ) : (
                                      '0'
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}
      </div>
    </PageTransition>
  );
};

export default StatsPage;
