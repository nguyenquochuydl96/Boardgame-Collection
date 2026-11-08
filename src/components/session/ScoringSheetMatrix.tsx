import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Crown, Sparkles, AlertCircle } from 'lucide-react';
import { Player } from '../../types';
import { PlayerAvatar } from '../player/PlayerAvatar';
import { ScoringCategory } from '../../lib/scoringPresets';
import { Button } from '../ui/Button';
import { cn } from '../ui/cn';

export interface ScoringSheetMatrixProps {
  players: Player[];
  initialCategories: ScoringCategory[];
  initialBreakdowns?: Record<string, Record<string, number>>;
  lowScoreWins?: boolean;
  onScoresUpdate: (
    totalScores: Record<string, number>,
    breakdowns: Record<string, Record<string, number>>
  ) => void;
}

export const ScoringSheetMatrix: React.FC<ScoringSheetMatrixProps> = ({
  players,
  initialCategories,
  initialBreakdowns = {},
  lowScoreWins = false,
  onScoresUpdate,
}) => {
  const [categories, setCategories] = useState<ScoringCategory[]>(initialCategories);
  const [rawCellValues, setRawCellValues] = useState<Record<string, Record<string, string>>>({});
  const [breakdowns, setBreakdowns] = useState<Record<string, Record<string, number>>>(
    () => {
      const initial: Record<string, Record<string, number>> = {};
      players.forEach((p) => {
        initial[p.id] = { ...(initialBreakdowns[p.id] || {}) };
      });
      return initial;
    }
  );

  const [newCatName, setNewCatName] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);

  // Sync when initialCategories change (e.g. changing game)
  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  // Compute totals
  const playerTotals = React.useMemo(() => {
    const totals: Record<string, number> = {};

    players.forEach((p) => {
      const playerVals = breakdowns[p.id] || {};
      let sum = 0;
      categories.forEach((cat) => {
        const raw = playerVals[cat.id];
        if (typeof raw === 'number' && !isNaN(raw)) {
          const mult = cat.multiplier ?? 1;
          sum += raw * mult;
        }
      });
      totals[p.id] = sum;
    });

    return totals;
  }, [players, categories, breakdowns]);

  // Notify parent on change
  useEffect(() => {
    onScoresUpdate(playerTotals, breakdowns);
  }, [playerTotals, breakdowns]);

  // Handle cell value change (supports negative numbers e.g. -6 for Kansas City)
  const handleCellChange = (playerId: string, categoryId: string, valStr: string) => {
    // Only allow numbers, minus sign, and empty string
    if (valStr !== '' && valStr !== '-' && !/^-?\d*$/.test(valStr)) {
      return;
    }

    setRawCellValues((prev) => ({
      ...prev,
      [playerId]: {
        ...(prev[playerId] || {}),
        [categoryId]: valStr,
      },
    }));

    const trimmed = valStr.trim();
    let val = 0;
    if (trimmed !== '' && trimmed !== '-' && !isNaN(Number(trimmed))) {
      val = Number(trimmed);
    }

    setBreakdowns((prev) => ({
      ...prev,
      [playerId]: {
        ...(prev[playerId] || {}),
        [categoryId]: val,
      },
    }));
  };

  const handleCellBlur = (playerId: string, categoryId: string) => {
    setRawCellValues((prev) => {
      const updated = { ...(prev[playerId] || {}) };
      delete updated[categoryId];
      return { ...prev, [playerId]: updated };
    });
  };

  // Add custom category
  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const newId = `custom_${Date.now()}`;
    const newCategory: ScoringCategory = {
      id: newId,
      name: newCatName.trim(),
      icon: '✨',
      multiplier: 1,
    };
    setCategories((prev) => [...prev, newCategory]);
    setNewCatName('');
    setIsAddingCat(false);
  };

  // Delete category
  const handleDeleteCategory = (catId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== catId));
  };

  // Determine current winner ID
  const winnerId = React.useMemo(() => {
    if (players.length === 0) return null;
    const scores = players.map((p) => playerTotals[p.id] ?? 0);
    const target = lowScoreWins ? Math.min(...scores) : Math.max(...scores);
    const winningPlayer = players.find((p) => (playerTotals[p.id] ?? 0) === target);
    return winningPlayer?.id || null;
  }, [players, playerTotals, lowScoreWins]);

  return (
    <div className="space-y-4">
      {/* Scoring Matrix Table */}
      <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-lg">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
              <th className="sticky left-0 bg-[var(--bg-elevated)] z-20 py-3 px-3 sm:px-4 font-bold text-[var(--text-secondary)] min-w-[140px] sm:min-w-[180px] shadow-[1px_0_0_0_var(--border-subtle)]">
                Scoring Categories
              </th>
              {players.map((p) => {
                const isLeader = p.id === winnerId;
                return (
                  <th
                    key={p.id}
                    className={cn(
                      'py-3 px-3 text-center min-w-[110px] transition-colors',
                      isLeader && 'bg-amber-500/10'
                    )}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className="relative">
                        <PlayerAvatar player={p} size="sm" />
                        {isLeader && (
                          <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-md">
                            <Crown className="w-2.5 h-2.5 fill-current" />
                          </div>
                        )}
                      </div>
                      <span className="font-bold text-[var(--text-primary)] truncate max-w-[90px]">
                        {p.name}
                      </span>
                    </div>
                  </th>
                );
              })}
              <th className="w-10 px-2"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border-subtle)]">
            {categories.map((cat) => {
              const isPenalty = (cat.multiplier ?? 1) < 0;
              return (
                <tr key={cat.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="sticky left-0 bg-[var(--bg-surface)] z-10 py-2.5 px-3 sm:px-4 font-medium text-[var(--text-primary)] shadow-[1px_0_0_0_var(--border-subtle)]">
                    <div className="flex items-start gap-2.5">
                      <span className="text-base leading-none mt-0.5">{cat.icon || '🎲'}</span>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-xs text-[var(--text-primary)] truncate">{cat.name}</span>
                          {isPenalty && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold shrink-0">
                              - penalty
                            </span>
                          )}
                        </div>
                        {cat.description && (
                          <span className="text-[10px] text-[var(--text-muted)] line-clamp-1 font-normal">
                            {cat.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {players.map((p) => {
                    const rawVal = breakdowns[p.id]?.[cat.id];
                    const userTyping = rawCellValues[p.id]?.[cat.id];
                    const displayVal =
                      userTyping !== undefined
                        ? userTyping
                        : rawVal !== undefined && rawVal !== 0
                        ? String(rawVal)
                        : '';

                    return (
                      <td key={p.id} className="py-2 px-2 text-center">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={displayVal}
                          onChange={(e) => handleCellChange(p.id, cat.id, e.target.value)}
                          onBlur={() => handleCellBlur(p.id, cat.id)}
                          className={cn(
                            'w-20 mx-auto px-2 py-1.5 rounded-lg text-center font-mono font-bold text-xs bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]',
                            (isPenalty || (rawVal !== undefined && rawVal < 0)) && 'text-rose-400'
                          )}
                        />
                      </td>
                    );
                  })}

                  <td className="py-2 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-[var(--text-muted)] hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                      title="Remove category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* TOTALS FOOTER */}
          <tfoot>
            <tr className="bg-[var(--bg-elevated)] border-t-2 border-[var(--border-glow)] font-bold">
              <td className="sticky left-0 bg-[var(--bg-elevated)] z-20 py-3.5 px-3 sm:px-4 text-sm font-extrabold text-[var(--text-primary)] shadow-[1px_0_0_0_var(--border-subtle)]">
                TOTAL SCORE
              </td>
              {players.map((p) => {
                const total = playerTotals[p.id] ?? 0;
                const isLeader = p.id === winnerId;
                return (
                  <td
                    key={p.id}
                    className={cn(
                      'py-3.5 px-3 text-center transition-colors',
                      isLeader && 'bg-amber-500/20'
                    )}
                  >
                    <div className="flex items-center justify-center gap-1.5 font-mono text-base font-extrabold text-[var(--text-primary)]">
                      {isLeader && <Crown className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />}
                      <span className={isLeader ? 'text-amber-300' : ''}>{total}</span>
                    </div>
                  </td>
                );
              })}
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Add Custom Category Control */}
      {!isAddingCat ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsAddingCat(true)}
          className="text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1 text-[var(--accent-neon)]" />
          Add Scoring Category
        </Button>
      ) : (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] max-w-md">
          <input
            type="text"
            placeholder="Category name (e.g. Leftover Coins, Special Cards)..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="flex-1 min-h-[36px] px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCategory();
              }
            }}
          />
          <Button variant="primary" size="sm" onClick={handleAddCategory}>
            Add
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsAddingCat(false)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

export default ScoringSheetMatrix;
