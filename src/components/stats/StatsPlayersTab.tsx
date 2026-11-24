import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Swords, Trophy } from 'lucide-react';
import { Card } from '../ui/Card';
import { PlayerChip } from '../player/PlayerChip';
import { PlayerAvatar } from '../player/PlayerAvatar';
import { PlayerLeaderboardSection } from '../dashboard/PlayerLeaderboardSection';
import { calculateHeadToHead, pluralize } from '../../lib/utils';
import { PlaySession, Player } from '../../types';

interface StatsPlayersTabProps {
  sessions: PlaySession[];
  players: Player[];
}

export const StatsPlayersTab: React.FC<StatsPlayersTabProps> = React.memo(
  ({ sessions, players }) => {
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(() =>
      players.slice(0, 2).map((p) => p.id)
    );
    const hasAutoInitializedRef = useRef(players.length > 0);

    useEffect(() => {
      const validIds = new Set(players.map((p) => p.id));
      setSelectedPlayerIds((prev) => {
        const filtered = prev.filter((id) => validIds.has(id));
        if (!hasAutoInitializedRef.current && players.length > 0) {
          hasAutoInitializedRef.current = true;
          return players.slice(0, 2).map((p) => p.id);
        }
        if (filtered.length !== prev.length) {
          return filtered;
        }
        return prev;
      });
    }, [players]);

    const togglePlayerSelection = (id: string) => {
      hasAutoInitializedRef.current = true;
      setSelectedPlayerIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    };

    const activeComparisonPlayers = useMemo(
      () => players.filter((p) => selectedPlayerIds.includes(p.id)),
      [players, selectedPlayerIds]
    );

    const headToHead = useMemo(
      () => calculateHeadToHead(activeComparisonPlayers, sessions),
      [activeComparisonPlayers, sessions]
    );

    return (
      <div className="space-y-6">
        {/* MULTI-DIMENSIONAL PLAYER LEADERBOARDS (POSITIVE & NEGATIVE) */}
        <PlayerLeaderboardSection players={players} sessions={sessions} />

        {/* HEAD-TO-HEAD COMPARISON SECTION */}
        <Card className="p-6 space-y-6 bg-[var(--card)] border border-[var(--line)]">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="font-display font-bold text-xl text-[var(--ink)]">
                Head-to-Head Comparison
              </h2>
            </div>
            <p className="text-xs text-[var(--muted)]">
              Select 2 or more players to compare head-to-head records at the same table
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
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
            <div className="p-8 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] text-center">
              <p className="text-sm text-[var(--muted)]">
                Please select at least 2 players above to compare head-to-head records.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Swords className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  <span className="font-display font-bold text-sm text-[var(--ink)]">
                    Shared Sessions Played
                  </span>
                </div>
                <span className="font-mono font-black text-2xl text-cyan-700 dark:text-cyan-400 tabular-nums">
                  {pluralize(headToHead.sharedSessionsCount, 'play')}
                </span>
              </div>

              {/* Head-to-Head Summary Table */}
              <div className="overflow-x-auto rounded-2xl border border-[var(--line)]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--card-2)] text-xs text-[var(--muted)]">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Player</th>
                      <th className="py-3 px-4 font-semibold text-right">Shared Wins</th>
                      <th className="py-3 px-4 font-semibold text-right">Win Rate (%)</th>
                      <th className="py-3 px-4 font-semibold text-right">High Score</th>
                      <th className="py-3 px-4 font-semibold text-right">Low Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)] bg-[var(--card)] tabular-nums">
                    {headToHead.playerStats.map((st) => (
                      <tr key={st.player.id}>
                        <td className="py-3 px-4 font-display font-bold text-[var(--ink)]">
                          <div className="flex items-center gap-2">
                            <PlayerAvatar player={st.player} size="sm" />
                            <span>{st.player.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                          {st.winsInShared}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[var(--good)]">
                          {st.winRateInShared}%
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[var(--ink)]">
                          {st.highestScore !== null ? st.highestScore : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[var(--muted)]">
                          {st.lowestScore !== null ? st.lowestScore : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Per-Game Win Breakdown */}
              {headToHead.perGameBreakdown.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                    Per-Game Shared Record
                  </h3>
                  <div className="overflow-x-auto rounded-2xl border border-[var(--line)] max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[var(--card-2)] text-[var(--muted)] sticky top-0">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">Board Game</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Shared Plays</th>
                          {activeComparisonPlayers.map((p) => (
                            <th key={p.id} className="py-2.5 px-3 font-semibold text-right">
                              {p.name} Wins
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--line)] bg-[var(--card)] tabular-nums">
                        {headToHead.perGameBreakdown.map((row) => (
                          <tr key={row.gameId}>
                            <td className="py-2.5 px-4 font-bold text-[var(--ink)]">{row.gameName}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-[var(--muted)]">
                              {row.plays}
                            </td>
                            {activeComparisonPlayers.map((p) => {
                              const w = row.winsByPlayerId[p.id] || 0;
                              return (
                                <td key={p.id} className="py-2.5 px-3 text-right font-mono text-[var(--ink)]">
                                  {w > 0 ? (
                                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                                      <Trophy className="w-3 h-3" />
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
      </div>
    );
  }
);
