import React, { useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import { Card } from '../ui/Card';
import { cn } from '../ui/cn';
import { PlaySession } from '../../types';

interface StatsYearsTabProps {
  sessions: PlaySession[];
  availableYears: string[];
}

export const StatsYearsTab: React.FC<StatsYearsTabProps> = React.memo(
  ({ sessions, availableYears }) => {
    const [selectedYear, setSelectedYear] = useState<string>('all');

    const yearFilteredSessions = useMemo(() => {
      if (selectedYear === 'all') return sessions;
      return sessions.filter((s) => s.datePlayed && s.datePlayed.startsWith(selectedYear));
    }, [sessions, selectedYear]);

    const yearStats = useMemo(() => {
      const totalSessions = yearFilteredSessions.length;
      const totalMinutes = yearFilteredSessions.reduce(
        (sum, s) => sum + (s.durationMinutes || 60),
        0
      );
      const hours = Math.round(totalMinutes / 60);

      // Top games of the year
      const gameMap = new Map<
        string,
        { id: string; name: string; thumbnail?: string; count: number }
      >();
      yearFilteredSessions.forEach((s) => {
        const entry = gameMap.get(s.gameId) || {
          id: s.gameId,
          name: s.gameName,
          thumbnail: s.gameThumbnail,
          count: 0,
        };
        entry.count += 1;
        gameMap.set(s.gameId, entry);
      });
      const topGames = Array.from(gameMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Top winners of the year
      const winnerMap = new Map<
        string,
        { playerId: string; playerName: string; wins: number }
      >();
      yearFilteredSessions.forEach((s) => {
        s.players.forEach((p) => {
          if (p.isWinner || s.winnerId === p.playerId) {
            const entry = winnerMap.get(p.playerId) || {
              playerId: p.playerId,
              playerName: p.playerName,
              wins: 0,
            };
            entry.wins += 1;
            winnerMap.set(p.playerId, entry);
          }
        });
      });
      const topWinners = Array.from(winnerMap.values())
        .sort((a, b) => b.wins - a.wins)
        .slice(0, 3);

      return {
        totalSessions,
        hours,
        topGames,
        topWinners,
      };
    }, [yearFilteredSessions]);

    return (
      <div className="space-y-6">
        {/* Year Selector Tabs with sliding spring pill */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] w-fit flex-wrap">
          <span className="text-xs font-extrabold text-[var(--ink)] px-2">Filter Year:</span>
          <button
            type="button"
            onClick={() => setSelectedYear('all')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer select-none active:scale-95',
              selectedYear === 'all'
                ? 'bg-[var(--accent)] text-[var(--accent-ink)] font-black shadow-sm'
                : 'text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--card-3)]'
            )}
          >
            <span>All Years</span>
          </button>
          {availableYears.map((yr) => (
            <button
              key={yr}
              type="button"
              onClick={() => setSelectedYear(yr)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer select-none active:scale-95',
                selectedYear === yr
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)] font-black shadow-sm'
                  : 'text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--card-3)]'
              )}
            >
              <span>{yr}</span>
            </button>
          ))}
        </div>

        {/* Year Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 flex items-center gap-4 bg-[var(--card)] border border-[var(--line)]">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl">
              🎲
            </div>
            <div>
              <span className="text-xs text-[var(--muted)]">
                Total Sessions ({selectedYear === 'all' ? 'All-Time' : selectedYear})
              </span>
              <p className="font-display font-black text-2xl text-[var(--ink)] mt-0.5">
                {yearStats.totalSessions} plays
              </p>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4 bg-[var(--card)] border border-[var(--line)]">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 flex items-center justify-center text-2xl">
              ⏱️
            </div>
            <div>
              <span className="text-xs text-[var(--muted)]">Tabletop Playtime</span>
              <p className="font-display font-black text-2xl text-[var(--ink)] mt-0.5">
                ~{yearStats.hours} hrs
              </p>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4 bg-[var(--card)] border border-[var(--line)]">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-700 dark:text-purple-400 flex items-center justify-center text-2xl">
              👑
            </div>
            <div>
              <span className="text-xs text-[var(--muted)]">Most Wins</span>
              <p className="font-display font-black text-xl text-[var(--ink)] mt-0.5 truncate">
                {yearStats.topWinners[0]?.playerName || '—'}
              </p>
              {yearStats.topWinners[0] && (
                <span className="text-[11px] text-amber-600 dark:text-amber-300 font-bold">
                  {yearStats.topWinners[0].wins} wins
                </span>
              )}
            </div>
          </Card>
        </div>

        {/* Top Games of the Year */}
        <Card className="p-6 space-y-4 bg-[var(--card)] border border-[var(--line)]">
          <h2 className="font-display font-bold text-xl text-[var(--ink)] flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            <span>Top Played Board Games ({selectedYear === 'all' ? 'All-Time' : selectedYear})</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {yearStats.topGames.map((g, idx) => (
              <div
                key={g.id}
                className="p-3.5 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] space-y-2 relative overflow-hidden"
              >
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 font-mono font-black text-xs flex items-center justify-center border border-amber-500/40">
                  #{idx + 1}
                </div>
                {g.thumbnail ? (
                  <img
                    src={g.thumbnail}
                    alt={g.name}
                    className="w-full aspect-[4/3] rounded-xl object-cover border border-[var(--line)]"
                  />
                ) : (
                  <div className="w-full aspect-[4/3] rounded-xl bg-[var(--card-3)] flex items-center justify-center text-3xl">
                    🎲
                  </div>
                )}
                <div>
                  <h4 className="font-display font-bold text-xs text-[var(--ink)] truncate">{g.name}</h4>
                  <p className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {g.count} plays
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }
);
