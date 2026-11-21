import React, { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { Card } from '../ui/Card';
import { PlaySession, Player } from '../../types';

interface StatsLocationsTabProps {
  sessions: PlaySession[];
  players: Player[];
}

export const StatsLocationsTab: React.FC<StatsLocationsTabProps> = React.memo(
  ({ sessions, players }) => {
    const locationStats = useMemo(() => {
      const map = new Map<string, { count: number; playerWins: Map<string, number> }>();

      sessions.forEach((s) => {
        const loc = s.location || 'Unknown location';
        const entry = map.get(loc) || { count: 0, playerWins: new Map<string, number>() };
        entry.count += 1;
        s.players?.forEach((p) => {
          if (p.isWinner || s.winnerId === p.playerId) {
            entry.playerWins.set(p.playerId, (entry.playerWins.get(p.playerId) || 0) + 1);
          }
        });
        map.set(loc, entry);
      });

      return Array.from(map.entries())
        .map(([location, data]) => {
          let topWinnerId = '';
          let topWinnerWins = 0;
          data.playerWins.forEach((wins, pid) => {
            if (wins > topWinnerWins) {
              topWinnerWins = wins;
              topWinnerId = pid;
            }
          });
          const topPlayer = players.find((p) => p.id === topWinnerId);
          const topWinnerName = topPlayer?.name || (topWinnerId ? 'Player' : undefined);

          return {
            location,
            count: data.count,
            percentage: Math.round((data.count / (sessions.length || 1)) * 100),
            topWinnerName,
            topWinnerWins,
            topWinnerRate: Math.round((topWinnerWins / (data.count || 1)) * 100),
          };
        })
        .sort((a, b) => b.count - a.count);
    }, [sessions, players]);

    return (
      <div className="space-y-6">
        <Card className="p-6 space-y-6 bg-[var(--card)] border border-[var(--line)]">
          <div>
            <h2 className="font-display font-bold text-xl text-[var(--ink)] flex items-center gap-2">
              <MapPin className="w-5 h-5 text-rose-500 dark:text-rose-400" />
              <span>Favorite Venues &amp; Locations</span>
            </h2>
            <p className="text-xs text-[var(--muted)] mt-1">
              Tabletop gaming locations logged across {sessions.length.toLocaleString('en-US')} sessions
            </p>
          </div>

          <div className="space-y-3">
            {locationStats.map((loc, idx) => (
              <div
                key={loc.location}
                className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-[var(--card-3)] text-[var(--accent)] font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="font-display font-extrabold text-sm sm:text-base text-[var(--ink)]">
                      {loc.location}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs tabular-nums font-mono">
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      {loc.count} plays ({loc.percentage}%)
                    </span>
                    {loc.topWinnerWins > 0 && loc.topWinnerName && (
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <span>👑</span> {loc.topWinnerName}: {loc.topWinnerWins} wins ({loc.topWinnerRate}%)
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Percentage Bar */}
                <div className="w-full h-2 rounded-full bg-[var(--card-3)] overflow-hidden border border-[var(--line)]">
                  <div
                    className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(4, loc.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }
);
