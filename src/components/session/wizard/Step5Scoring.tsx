import React from 'react';
import { Card } from '../../ui/Card';
import { ScoringSheetMatrix } from '../ScoringSheetMatrix';
import { PlayerScoreRow } from '../PlayerScoreRow';
import { Input } from '../../ui/Input';
import { PlayerAvatar } from '../../player/PlayerAvatar';
import { cn } from '../../ui/cn';
import { Crown, Check, AlertCircle } from 'lucide-react';
import { GameScoringMode, Player, PlayerScore } from '../../../types';
import { GameScoringTemplate, ScoringCategory } from '../../../lib/scoringPresets';

interface Step5ScoringProps {
  gameScoringMode: GameScoringMode;
  onSetGameScoringMode: (mode: GameScoringMode) => void;
  lowScoreWins: boolean;
  setLowScoreWins: (val: boolean) => void;
  scoringMode: 'detailed' | 'quick';
  setScoringMode: (mode: 'detailed' | 'quick') => void;
  scoringTemplate: GameScoringTemplate;
  coopOutcome: 'won' | 'lost';
  onSetCoopOutcome: (outcome: 'won' | 'lost') => void;
  logTeamScore: boolean;
  setLogTeamScore: (val: boolean) => void;
  teamScore: number | undefined;
  setTeamScore: (val: number | undefined) => void;
  activeSessionPlayers: Player[];
  breakdownsByPlayerId: Record<string, Record<string, number>>;
  onScoresUpdate: (
    totals: Record<string, number>,
    breakdowns: Record<string, Record<string, number>>,
    categories: ScoringCategory[]
  ) => void;
  computedPlayerScores: PlayerScore[];
  allAvailablePlayers: Player[];
  onScoreChange: (playerId: string, score: number | undefined) => void;
  manualWinnerIds: string[];
  onToggleManualWinner: (playerId: string) => void;
}

export const Step5Scoring: React.FC<Step5ScoringProps> = React.memo(
  ({
    gameScoringMode,
    onSetGameScoringMode,
    lowScoreWins,
    setLowScoreWins,
    scoringMode,
    setScoringMode,
    scoringTemplate,
    coopOutcome,
    onSetCoopOutcome,
    logTeamScore,
    setLogTeamScore,
    teamScore,
    setTeamScore,
    activeSessionPlayers,
    breakdownsByPlayerId,
    onScoresUpdate,
    computedPlayerScores,
    allAvailablePlayers,
    onScoreChange,
    manualWinnerIds,
    onToggleManualWinner,
  }) => {
    return (
      <Card className="p-4 sm:p-6 md:p-8 space-y-6">
        {/* Header & Segmented Mode Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-2xl text-[var(--ink)]">
              Step 5 — Results &amp; Scoring
            </h1>
            <p className="text-sm text-[var(--muted)]">
              {gameScoringMode === 'coop'
                ? 'Co-op mode — record team victory or defeat without individual ranks'
                : gameScoringMode === 'win_only'
                ? 'Competitive win/loss mode — select one or multiple table champions'
                : 'Standard points mode — calculate total scores and ranks'}
            </p>
          </div>

          {/* Segmented Mode Selector (Touch target >= 40px) */}
          <div className="flex items-center p-1 bg-[var(--card-2)] border border-[var(--line)] rounded-2xl w-full sm:w-auto self-start sm:self-auto">
            {(
              [
                { id: 'points', label: 'Points', icon: '🎯' },
                { id: 'win_only', label: 'Win / Loss', icon: '🏆' },
                { id: 'coop', label: 'Co-op', icon: '🤝' },
              ] as const
            ).map((tab) => {
              const isActive = gameScoringMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSetGameScoringMode(tab.id)}
                  className={cn(
                    'flex-1 sm:flex-initial min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 select-none',
                    isActive
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-xs'
                      : 'text-[var(--muted)] hover:text-[var(--ink)]'
                  )}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            MODE 1: CO-OP MODE (TEAM VICTORY / DEFEAT)
           ========================================================================= */}
        {gameScoringMode === 'coop' && (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--accent)]">
                Team Outcome
              </span>
              <p className="text-xs text-[var(--muted)]">
                In cooperative games, all players share victory or defeat together.
              </p>
            </div>

            {/* Big Dual Touch Target Buttons for Victory / Defeat */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={() => onSetCoopOutcome('won')}
                className={cn(
                  'min-h-[58px] p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center gap-3 font-display font-extrabold text-base select-none',
                  coopOutcome === 'won'
                    ? 'bg-[var(--good)] border-[var(--good)] text-white shadow-md'
                    : 'bg-[var(--card)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--line-2)]'
                )}
              >
                <span className="text-2xl">🏆</span>
                <span>Team Victory</span>
                {coopOutcome === 'won' && <Check className="w-5 h-5 ml-1 stroke-[3]" />}
              </button>

              <button
                type="button"
                onClick={() => onSetCoopOutcome('lost')}
                className={cn(
                  'min-h-[58px] p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center gap-3 font-display font-extrabold text-base select-none',
                  coopOutcome === 'lost'
                    ? 'bg-[var(--bad)] border-[var(--bad)] text-white shadow-md'
                    : 'bg-[var(--card)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--line-2)]'
                )}
              >
                <span className="text-2xl">💀</span>
                <span>Team Defeat</span>
                {coopOutcome === 'lost' && <Check className="w-5 h-5 ml-1 stroke-[3]" />}
              </button>
            </div>

            {/* Optional Team Score Entry Toggle */}
            <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] space-y-3">
              <label className="inline-flex items-center gap-2.5 text-xs font-semibold text-[var(--ink)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={logTeamScore}
                  onChange={(e) => setLogTeamScore(e.target.checked)}
                  className="rounded border-[var(--line)] bg-[var(--card-2)] text-[var(--accent)]"
                />
                <span>Log Team Score (optional for games like Dorfromantik or Hanabi)</span>
              </label>

              {logTeamScore && (
                <div className="max-w-xs pt-1">
                  <Input
                    type="number"
                    label="Team Total Score"
                    placeholder="e.g. 182"
                    value={teamScore !== undefined ? String(teamScore) : ''}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setTeamScore(val === '' ? undefined : Number(val));
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            MODE 2: WIN-ONLY COMPETITIVE MODE (NO POINTS)
           ========================================================================= */}
        {gameScoringMode === 'win_only' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--accent)]">
                  Select Winner(s)
                </span>
                <p className="text-xs text-[var(--muted)]">
                  Tap player cards below to crown one or multiple winners (supports 1-vs-Many and team matches).
                </p>
              </div>
              <span className="text-xs font-bold font-mono text-[var(--ink)] shrink-0">
                {manualWinnerIds.length} {manualWinnerIds.length === 1 ? 'winner' : 'winners'} selected
              </span>
            </div>

            {/* Warning if no winner is selected */}
            {manualWinnerIds.length === 0 && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2.5 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Please select at least 1 winner to record this match outcome.</span>
              </div>
            )}

            {/* Player Selection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeSessionPlayers.map((player) => {
                const isSelected = manualWinnerIds.includes(player.id);
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => onToggleManualWinner(player.id)}
                    className={cn(
                      'min-h-[50px] p-3 sm:p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 select-none',
                      isSelected
                        ? 'border-[#E5734F] bg-[#E5734F]/15 text-[var(--ink)] shadow-xs ring-1 ring-[#E5734F]/50'
                        : 'border-[var(--line)] bg-[var(--card)] hover:bg-[var(--card-2)] text-[var(--muted)]'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <PlayerAvatar player={player} size="sm" />
                      <div className="min-w-0">
                        <p className="font-display font-bold text-sm text-[var(--ink)] truncate">
                          {player.name}
                        </p>
                        <p className="text-[10px] text-[var(--muted)] truncate">
                          {isSelected ? 'Winner · Rank #1' : 'Tap to mark as winner'}
                        </p>
                      </div>
                    </div>

                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E5734F] text-white text-xs font-extrabold shrink-0 shadow-xs">
                        <Crown className="w-3.5 h-3.5 fill-current" />
                        Winner
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--muted)] shrink-0 font-medium px-2 py-0.5 rounded-lg border border-[var(--line)]">
                        Runner
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            MODE 3: POINTS MODE (QUICK OR DETAILED SCORING SHEET)
           ========================================================================= */}
        {gameScoringMode === 'points' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Scoring Mode Sub-tabs (Quick vs Sheet) */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[var(--card-2)] border border-[var(--line)] rounded-2xl w-fit">
                <button
                  type="button"
                  onClick={() => setScoringMode('quick')}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none',
                    scoringMode === 'quick'
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-xs'
                      : 'text-[var(--muted)] hover:text-[var(--ink)]'
                  )}
                >
                  <span>⚡ Quick Total</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScoringMode('detailed')}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none',
                    scoringMode === 'detailed'
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-xs'
                      : 'text-[var(--muted)] hover:text-[var(--ink)]'
                  )}
                >
                  <span>📊 Score Sheet</span>
                  {scoringTemplate.displayName && (
                    <span className="hidden sm:inline opacity-80 truncate max-w-[140px]">
                      ({scoringTemplate.displayName})
                    </span>
                  )}
                </button>
              </div>

              {/* Lowest Score Wins Checkbox */}
              <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--card-2)] border border-[var(--line)] text-xs font-semibold text-[var(--ink)] cursor-pointer select-none self-start sm:self-auto">
                <input
                  type="checkbox"
                  checked={lowScoreWins}
                  onChange={(e) => setLowScoreWins(e.target.checked)}
                  className="rounded border-[var(--line)] bg-[var(--card)] text-[var(--accent)]"
                />
                Lowest score wins (Golf style)
              </label>
            </div>

            {scoringMode === 'detailed' ? (
              <div className="space-y-4 pt-1">
                <ScoringSheetMatrix
                  players={activeSessionPlayers}
                  initialCategories={scoringTemplate.categories}
                  initialBreakdowns={breakdownsByPlayerId}
                  lowScoreWins={lowScoreWins}
                  isCoop={false}
                  computeTotal={scoringTemplate.computeTotal}
                  onScoresUpdate={onScoresUpdate}
                />
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {computedPlayerScores.map((ps) => {
                  const pl = allAvailablePlayers.find((x) => x.id === ps.playerId);
                  return (
                    <PlayerScoreRow
                      key={ps.playerId}
                      playerScore={ps}
                      player={pl}
                      isCoop={false}
                      winnerReadOnly={true}
                      onScoreChange={onScoreChange}
                      onToggleWinner={onToggleManualWinner}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Card>
    );
  }
);

export default Step5Scoring;
