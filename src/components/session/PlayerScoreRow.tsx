import React from 'react';
import { Crown } from 'lucide-react';
import { Player, PlayerScore } from '../../types';
import { PlayerAvatar } from '../player/PlayerAvatar';
import { cn } from '../ui/cn';

export interface PlayerScoreRowProps {
  playerScore: PlayerScore;
  player?: Player;
  onScoreChange: (playerId: string, score: number | undefined) => void;
  onToggleWinner: (playerId: string) => void;
}

export const PlayerScoreRow: React.FC<PlayerScoreRowProps> = ({
  playerScore,
  player,
  onScoreChange,
  onToggleWinner,
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all duration-200',
        playerScore.isWinner
          ? 'bg-amber-500/15 border-amber-500/45 shadow-md shadow-amber-500/10'
          : 'bg-[var(--card)] border-[var(--line)]'
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <PlayerAvatar
          player={player}
          name={playerScore.playerName}
          size="md"
        />
        <div className="min-w-0">
          <p className="font-display font-bold text-sm sm:text-base text-[var(--ink)] truncate">
            {playerScore.playerName}
          </p>
          {playerScore.rank && (
            <p className="text-xs text-[var(--muted)] tabular-nums">
              Rank #{playerScore.rank}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <div className="w-20 sm:w-28">
          <input
            type="text"
            inputMode="numeric"
            aria-label={`Score for ${playerScore.playerName}`}
            placeholder="Score"
            value={playerScore.score !== undefined ? String(playerScore.score) : ''}
            onFocus={(e) => {
              e.target.select();
            }}
            onClick={(e) => {
              if (e.currentTarget.value === '0') {
                e.currentTarget.select();
              }
            }}
            onChange={(e) => {
              let raw = e.target.value.trim();
              if (raw === '' || raw === '-') {
                onScoreChange(playerScore.playerId, undefined);
                return;
              }
              if (!/^-?\d*$/.test(raw)) {
                return;
              }
              // Strip redundant leading zeros: e.g. "05" -> "5", "-05" -> "-5", "00" -> "0"
              if (/^0\d+$/.test(raw)) {
                raw = raw.replace(/^0+/, '') || '0';
              } else if (/^-0\d+$/.test(raw)) {
                raw = '-' + (raw.replace(/^-0+/, '') || '0');
              }
              const parsed = Number(raw);
              if (!Number.isNaN(parsed)) {
                onScoreChange(playerScore.playerId, parsed);
              }
            }}
            className="w-full min-h-[38px] sm:min-h-[42px] px-2 sm:px-3 py-1.5 rounded-xl bg-[var(--card-2)] border border-[var(--line-2)] text-right font-mono font-bold text-sm sm:text-base text-[var(--ink)] tabular-nums focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <button
          type="button"
          onClick={() => onToggleWinner(playerScore.playerId)}
          aria-label={`Mark ${playerScore.playerName} as winner`}
          className={cn(
            'min-h-[38px] sm:min-h-[42px] min-w-[38px] sm:min-w-[42px] px-2 sm:px-3 rounded-xl border inline-flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer select-none',
            playerScore.isWinner
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/25 font-black'
              : 'bg-[var(--card-2)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)] hover:border-[var(--line-2)]'
          )}
        >
          <Crown
            className={cn(
              'w-4 h-4',
              playerScore.isWinner ? 'fill-slate-950 text-slate-950' : ''
            )}
          />
          <span className="hidden sm:inline">Winner</span>
        </button>
      </div>
    </div>
  );
};

export default PlayerScoreRow;
