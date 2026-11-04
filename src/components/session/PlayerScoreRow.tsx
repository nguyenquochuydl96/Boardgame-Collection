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
          ? 'bg-amber-500/10 border-amber-500/40 shadow-md shadow-amber-500/5'
          : 'bg-[#16162a] border-white/[0.08]'
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <PlayerAvatar
          player={player}
          name={playerScore.playerName}
          size="md"
        />
        <div className="min-w-0">
          <p className="font-display font-bold text-sm sm:text-base text-[#f1f5f9] truncate">
            {playerScore.playerName}
          </p>
          {playerScore.rank && (
            <p className="text-xs text-[#94a3b8] tabular-nums">
              Rank #{playerScore.rank}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-28">
          <input
            type="number"
            aria-label={`Score for ${playerScore.playerName}`}
            placeholder="Score"
            value={playerScore.score !== undefined ? playerScore.score : ''}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                onScoreChange(playerScore.playerId, undefined);
              } else {
                const parsed = Number(raw);
                if (!Number.isNaN(parsed)) {
                  onScoreChange(playerScore.playerId, parsed);
                }
              }
            }}
            className="w-full min-h-[42px] px-3 py-1.5 rounded-xl bg-[#1e1e35] border border-white/15 text-right font-mono font-bold text-base text-[#f1f5f9] tabular-nums focus:outline-none focus:border-[#7c3aed]"
          />
        </div>

        <button
          type="button"
          onClick={() => onToggleWinner(playerScore.playerId)}
          aria-label={`Mark ${playerScore.playerName} as winner`}
          className={cn(
            'min-h-[42px] min-w-[42px] px-3 rounded-xl border inline-flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer',
            playerScore.isWinner
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/25'
              : 'bg-[#1e1e35] text-[#94a3b8] border-white/10 hover:text-white hover:border-white/25'
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
