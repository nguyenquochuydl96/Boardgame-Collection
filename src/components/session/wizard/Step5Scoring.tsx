import React from 'react';
import { Card } from '../../ui/Card';
import { ScoringSheetMatrix } from '../ScoringSheetMatrix';
import { PlayerScoreRow } from '../PlayerScoreRow';
import { cn } from '../../ui/cn';
import { Player, PlayerScore } from '../../../types';
import { GameScoringTemplate } from '../../../lib/scoringPresets';

interface Step5ScoringProps {
  lowScoreWins: boolean;
  setLowScoreWins: (val: boolean) => void;
  scoringMode: 'detailed' | 'quick';
  setScoringMode: (mode: 'detailed' | 'quick') => void;
  scoringTemplate: GameScoringTemplate;
  activeSessionPlayers: Player[];
  breakdownsByPlayerId: Record<string, Record<string, number>>;
  onScoresUpdate: (
    totals: Record<string, number | undefined>,
    breakdowns: Record<string, Record<string, number>>
  ) => void;
  computedPlayerScores: PlayerScore[];
  allAvailablePlayers: Player[];
  onScoreChange: (playerId: string, score: number | undefined) => void;
  onToggleManualWinner: (playerId: string) => void;
}

export const Step5Scoring: React.FC<Step5ScoringProps> = React.memo(
  ({
    lowScoreWins,
    setLowScoreWins,
    scoringMode,
    setScoringMode,
    scoringTemplate,
    activeSessionPlayers,
    breakdownsByPlayerId,
    onScoresUpdate,
    computedPlayerScores,
    allAvailablePlayers,
    onScoreChange,
    onToggleManualWinner,
  }) => {
    return (
      <Card className="p-4 sm:p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display font-extrabold text-2xl text-[var(--ink)]">
              Step 5 — Scores &amp; Scoring Sheet
            </h1>
            <p className="text-sm text-[var(--muted)]">
              {scoringTemplate.isCoop
                ? 'Cooperative mode — track team and player contributions'
                : 'Automatically calculate category scores and crown table champions'}
            </p>
          </div>

          {!scoringTemplate.isCoop && (
            <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--card-2)] border border-[var(--line)] text-xs font-semibold text-[var(--ink)] cursor-pointer">
              <input
                type="checkbox"
                checked={lowScoreWins}
                onChange={(e) => setLowScoreWins(e.target.checked)}
                className="rounded border-[var(--line)] bg-[var(--card)] text-[var(--accent)]"
              />
              Lowest score wins
            </label>
          )}
        </div>

        {/* Cooperative Game Banner */}
        {scoringTemplate.isCoop && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--good-soft)] border border-[var(--good)]/25 text-[var(--ink)]">
            <div className="flex items-center gap-3">
              <span className="text-2xl select-none">🤝</span>
              <div>
                <div className="font-display font-bold text-sm sm:text-base flex items-center gap-2">
                  <span>Cooperative Game</span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[var(--good-soft)] text-[var(--good)] font-extrabold border border-[var(--good)]/30">
                    Team Win / Loss
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)]">
                  All players win or lose together as a team rather than competing for individual rank.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const anyWon = activeSessionPlayers.some((p) =>
                  computedPlayerScores.find((ps) => ps.playerId === p.id)?.isWinner
                );
                // Toggle team victory: if any won, mark all defeat; if none won, mark all victory
                activeSessionPlayers.forEach((p) => {
                  const ps = computedPlayerScores.find((x) => x.playerId === p.id);
                  if (anyWon) {
                    if (ps?.isWinner) onToggleManualWinner(p.id);
                  } else {
                    if (!ps?.isWinner) onToggleManualWinner(p.id);
                  }
                });
              }}
              className={cn(
                'px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-sm shrink-0',
                activeSessionPlayers.some((p) => computedPlayerScores.find((ps) => ps.playerId === p.id)?.isWinner)
                  ? 'bg-[var(--good)] text-white border-[var(--good)] shadow-xs font-black'
                  : 'bg-[var(--card-2)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]'
              )}
            >
              <span>
                {activeSessionPlayers.some((p) => computedPlayerScores.find((ps) => ps.playerId === p.id)?.isWinner)
                  ? '🏆 Team Victory (Won)'
                  : '💀 Team Defeat'}
              </span>
            </button>
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[var(--card-2)] border border-[var(--line)] rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setScoringMode('quick')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              scoringMode === 'quick'
                ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-md'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            )}
          >
            <span>⚡ Quick Total Entry</span>
          </button>
          <button
            type="button"
            onClick={() => setScoringMode('detailed')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
              scoringMode === 'detailed'
                ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-md'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            )}
          >
            <span>📊 Scoring Sheet:</span>
            <span className="font-extrabold">{scoringTemplate.displayName}</span>
          </button>
        </div>

        {scoringMode === 'detailed' ? (
          <div className="space-y-4">
            <ScoringSheetMatrix
              players={activeSessionPlayers}
              initialCategories={scoringTemplate.categories}
              initialBreakdowns={breakdownsByPlayerId}
              lowScoreWins={lowScoreWins}
              isCoop={scoringTemplate.isCoop}
              computeTotal={scoringTemplate.computeTotal}
              onScoresUpdate={onScoresUpdate}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {computedPlayerScores.map((ps) => {
              const pl = allAvailablePlayers.find((x) => x.id === ps.playerId);
              return (
                <PlayerScoreRow
                  key={ps.playerId}
                  playerScore={ps}
                  player={pl}
                  isCoop={scoringTemplate.isCoop}
                  onScoreChange={onScoreChange}
                  onToggleWinner={(playerId) => {
                    if (scoringTemplate.isCoop) {
                      const anyWon = activeSessionPlayers.some((p) =>
                        computedPlayerScores.find((x) => x.playerId === p.id)?.isWinner
                      );
                      activeSessionPlayers.forEach((p) => {
                        const curr = computedPlayerScores.find((x) => x.playerId === p.id);
                        if (anyWon) {
                          if (curr?.isWinner) onToggleManualWinner(p.id);
                        } else {
                          if (!curr?.isWinner) onToggleManualWinner(p.id);
                        }
                      });
                    } else {
                      onToggleManualWinner(playerId);
                    }
                  }}
                />
              );
            })}
          </div>
        )}
      </Card>
    );
  }
);
