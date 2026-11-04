import React from 'react';
import { Trophy, Swords } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Player, PlaySession } from '../../types';
import { calculateHeadToHead } from '../../lib/utils';
import { PlayerAvatar } from '../player/PlayerAvatar';

export interface PlayerCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  sessions: PlaySession[];
}

export const PlayerCompareModal: React.FC<PlayerCompareModalProps> = ({
  isOpen,
  onClose,
  players,
  sessions,
}) => {
  const summary = calculateHeadToHead(players, sessions);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Head-to-Head Player Comparison"
      maxWidthClass="max-w-3xl"
    >
      {players.length < 2 ? (
        <p className="text-sm text-[#94a3b8]">
          Select at least 2 players to compare head-to-head statistics.
        </p>
      ) : (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-[#1e1e35]/80 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Swords className="w-5 h-5 text-[#a78bfa]" />
              <div>
                <p className="text-sm font-bold text-white">
                  Shared Table Sessions
                </p>
                <p className="text-xs text-[#94a3b8]">
                  Games where all {players.length} selected players competed together
                </p>
              </div>
            </div>
            <span className="font-display font-extrabold text-2xl text-[#22d3ee] tabular-nums">
              {summary.sharedSessionsCount}
            </span>
          </div>

          {/* Player Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {summary.playerStats.map((st) => (
              <div
                key={st.player.id}
                className="p-4 rounded-2xl bg-[#1a1a2e] border border-white/10 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <PlayerAvatar player={st.player} size="md" />
                  <div className="min-w-0">
                    <p className="font-display font-bold text-base text-white truncate">
                      {st.player.name}
                    </p>
                    <p className="text-xs text-[#94a3b8] tabular-nums">
                      {st.winsInShared} wins ({st.winRateInShared}%)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06] text-xs tabular-nums">
                  <div>
                    <span className="text-[#94a3b8] block">Highest Score</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {st.highestScore !== null ? st.highestScore : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#94a3b8] block">Lowest Score</span>
                    <span className="font-mono font-bold text-rose-400">
                      {st.lowestScore !== null ? st.lowestScore : '—'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Per-game breakdown table */}
          {summary.perGameBreakdown.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
                Wins By Game Together
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#1e1e35] text-xs text-[#94a3b8]">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Boardgame</th>
                      <th className="py-3 px-3 font-semibold text-right">Plays</th>
                      {players.map((p) => (
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
                    {summary.perGameBreakdown.map((row) => (
                      <tr key={row.gameId}>
                        <td className="py-3 px-4 font-semibold text-white">
                          {row.gameName}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[#94a3b8]">
                          {row.plays}
                        </td>
                        {players.map((p) => {
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
    </Modal>
  );
};

export default PlayerCompareModal;
