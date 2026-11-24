import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Crown, Sparkles, AlertCircle } from 'lucide-react';
import { Player } from '../../types';
import { PlayerAvatar } from '../player/PlayerAvatar';
import { ScoringCategory, computeSheetPlayerTotal } from '../../lib/scoringPresets';
import { Button } from '../ui/Button';
import { cn } from '../ui/cn';

export interface ScoringSheetMatrixProps {
  players: Player[];
  initialCategories: ScoringCategory[];
  initialBreakdowns?: Record<string, Record<string, number>>;
  lowScoreWins?: boolean;
  isCoop?: boolean;
  computeTotal?: (values: Record<string, number>) => number;
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
  isCoop = false,
  computeTotal,
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

  // Synchronize breakdowns state when players list changes (adding new player doesn't wipe old players' scores)
  useEffect(() => {
    setBreakdowns((prev) => {
      let changed = false;
      const next = { ...prev };
      players.forEach((p) => {
        if (!next[p.id]) {
          next[p.id] = { ...(initialBreakdowns[p.id] || {}) };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [players, initialBreakdowns]);

  const initialCategoryIds = React.useMemo(
    () => initialCategories.map((c) => c.id),
    [initialCategories]
  );

  // Compute totals (includes any user-added custom categories even when computeTotal is defined)
  const playerTotals = React.useMemo(() => {
    const totals: Record<string, number> = {};

    players.forEach((p) => {
      const playerVals = breakdowns[p.id] || {};
      totals[p.id] = computeSheetPlayerTotal(
        playerVals,
        categories,
        computeTotal,
        initialCategoryIds
      );
    });

    return totals;
  }, [players, categories, breakdowns, computeTotal, initialCategoryIds]);

  const isMountedRef = React.useRef(false);
  const lastEmittedRef = React.useRef<string>('');

  // Notify parent on change only when totals or breakdowns actually change, and NEVER unconditionally on initial mount
  useEffect(() => {
    const serialized = JSON.stringify({ totals: playerTotals, breakdowns });
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      lastEmittedRef.current = serialized;
      return;
    }

    if (serialized !== lastEmittedRef.current) {
      lastEmittedRef.current = serialized;
      onScoresUpdate(playerTotals, breakdowns);
    }
  }, [playerTotals, breakdowns, onScoresUpdate]);

  // Handle cell value change (supports negative numbers e.g. -6 for Kansas City, disallows negative for penalty rows)
  const handleCellChange = (playerId: string, categoryId: string, valStr: string) => {
    const targetCat = categories.find((c) => c.id === categoryId);
    const isPenalty = (targetCat?.multiplier ?? 1) < 0;

    // For penalty categories, disallow minus signs completely (only positive numbers or empty)
    if (isPenalty) {
      if (valStr !== '' && !/^\d*$/.test(valStr)) {
        return;
      }
    } else {
      // Only allow numbers, minus sign, and empty string
      if (valStr !== '' && valStr !== '-' && !/^-?\d*$/.test(valStr)) {
        return;
      }
    }

    // Strip redundant leading zeros: e.g. "05" -> "5", "-05" -> "-5", "00" -> "0"
    let cleanVal = valStr.trim();
    if (/^0\d+$/.test(cleanVal)) {
      cleanVal = cleanVal.replace(/^0+/, '') || '0';
    } else if (/^-0\d+$/.test(cleanVal)) {
      cleanVal = '-' + (cleanVal.replace(/^-0+/, '') || '0');
    }

    setRawCellValues((prev) => ({
      ...prev,
      [playerId]: {
        ...(prev[playerId] || {}),
        [categoryId]: cleanVal,
      },
    }));

    const trimmed = cleanVal.trim();
    let val = 0;
    if (trimmed !== '' && trimmed !== '-' && !isNaN(Number(trimmed))) {
      val = isPenalty ? Math.abs(Number(trimmed)) : Number(trimmed);
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

  // Toggle positive/negative sign for a cell (especially helpful on mobile iOS)
  const handleToggleCellSign = (playerId: string, categoryId: string) => {
    const targetCat = categories.find((c) => c.id === categoryId);
    if ((targetCat?.multiplier ?? 1) < 0) return; // Prevent sign toggle on penalty rows

    const rawVal = breakdowns[playerId]?.[categoryId];
    const userTyping = rawCellValues[playerId]?.[categoryId];
    const displayVal =
      userTyping !== undefined
        ? userTyping
        : rawVal !== undefined && rawVal !== 0
        ? String(rawVal)
        : '';

    let current = displayVal.trim();
    if (current === '' || current === '0') {
      handleCellChange(playerId, categoryId, '-');
      return;
    }
    if (current.startsWith('-')) {
      handleCellChange(playerId, categoryId, current.slice(1));
    } else {
      handleCellChange(playerId, categoryId, '-' + current);
    }
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

  // Check if at least one player has entered any score
  const hasAnyScore = React.useMemo(() => {
    return players.some((p) => {
      const bd = breakdowns[p.id];
      if (bd && Object.values(bd).some((v) => typeof v === 'number' && v !== 0)) return true;
      const typing = rawCellValues[p.id];
      if (typing && Object.values(typing).some((v) => v !== '' && v !== '0')) return true;
      return (playerTotals[p.id] ?? 0) !== 0;
    });
  }, [players, breakdowns, rawCellValues, playerTotals]);

  // Determine current winner IDs (Set of player IDs sharing the best score)
  const winnerIds = React.useMemo(() => {
    if (isCoop) return new Set<string>(); // Cooperative mode: No individual competitive crowning
    if (players.length === 0 || !hasAnyScore) return new Set<string>();
    const scores = players.map((p) => playerTotals[p.id] ?? 0);
    const target = lowScoreWins ? Math.min(...scores) : Math.max(...scores);
    const winners = new Set<string>();
    players.forEach((p) => {
      if ((playerTotals[p.id] ?? 0) === target) {
        winners.add(p.id);
      }
    });
    return winners;
  }, [players, playerTotals, lowScoreWins, hasAnyScore, isCoop]);

  return (
    <div className="space-y-4">
      {/* Scoring Matrix Table */}
      <div className="overflow-x-auto overscroll-x-contain touch-pan-x rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-lg">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
              <th className="sticky left-0 bg-[var(--bg-elevated)] z-20 py-3 px-2 sm:px-4 font-bold text-[var(--text-secondary)] w-[125px] min-w-[115px] max-w-[130px] sm:w-[170px] sm:min-w-[160px] sm:max-w-[200px] shadow-[1px_0_0_0_var(--border-subtle)] truncate">
                {isCoop ? '🤝 Co-op Categories' : 'Scoring Categories'}
              </th>
              {players.map((p) => {
                const isLeader = winnerIds.has(p.id);
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
                          <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-amber-500 text-[#161311] flex items-center justify-center shadow-md">
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
                  <td className="sticky left-0 bg-[var(--bg-surface)] z-10 py-2.5 px-2 sm:px-4 font-medium text-[var(--text-primary)] w-[125px] min-w-[115px] max-w-[130px] sm:w-[170px] sm:min-w-[160px] sm:max-w-[200px] shadow-[1px_0_0_0_var(--border-subtle)]">
                    <div className="flex items-start gap-1.5 sm:gap-2.5 min-w-0">
                      <span className="text-base leading-none mt-0.5 shrink-0">{cat.icon || '🎲'}</span>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-semibold text-xs text-[var(--text-primary)] truncate block">{cat.name}</span>
                          {isPenalty && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bad-soft)] text-[var(--bad)] font-bold shrink-0">
                              -
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

                    const isCellNegative =
                      (rawVal !== undefined && rawVal < 0) ||
                      (userTyping !== undefined && userTyping.startsWith('-'));

                    return (
                      <td key={p.id} className="py-2 px-2 text-center">
                        <div className="inline-flex items-center rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] focus-within:border-[var(--accent-primary)] focus-within:ring-1 focus-within:ring-[var(--accent-primary)] overflow-hidden">
                          {isPenalty ? (
                            <span
                              className="px-2 py-1 text-[11px] font-mono font-extrabold border-r bg-[var(--bad-soft)] text-[var(--bad)] border-[var(--bad)]/30 select-none cursor-default"
                              title="Penalty points (subtracted automatically)"
                            >
                              -
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleToggleCellSign(p.id, cat.id);
                              }}
                              title="Toggle positive/negative sign (±)"
                              aria-label="Toggle negative score"
                              className={cn(
                                'px-1.5 py-1 text-[11px] font-mono font-extrabold border-r transition-colors cursor-pointer select-none',
                                isCellNegative
                                  ? 'bg-[var(--bad-soft)] text-[var(--bad)] border-[var(--bad)]/30'
                                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border-[var(--border-subtle)]'
                              )}
                            >
                              ±
                            </button>
                          )}
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={displayVal}
                            onFocus={(e) => {
                              e.target.select();
                            }}
                            onClick={(e) => {
                              if (e.currentTarget.value === '0') {
                                e.currentTarget.select();
                              }
                            }}
                            onChange={(e) => handleCellChange(p.id, cat.id, e.target.value)}
                            onBlur={() => handleCellBlur(p.id, cat.id)}
                            className={cn(
                              'w-14 sm:w-16 px-1.5 py-1.5 bg-transparent text-center font-mono font-bold text-xs focus:outline-none',
                              (isPenalty || isCellNegative) ? 'text-[var(--bad)]' : 'text-[var(--text-primary)]'
                            )}
                          />
                        </div>
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
              <td className="sticky left-0 bg-[var(--bg-elevated)] z-20 py-3.5 px-2 sm:px-4 text-xs sm:text-sm font-extrabold text-[var(--text-primary)] w-[125px] min-w-[115px] max-w-[130px] sm:w-[170px] sm:min-w-[160px] sm:max-w-[200px] shadow-[1px_0_0_0_var(--border-subtle)] truncate">
                <div>TOTAL SCORE</div>
                {isCoop && (
                  <div className="text-[10px] font-semibold text-[var(--good)] mt-0.5">
                    Team: {Object.values(playerTotals).reduce((a, b) => a + b, 0)}
                  </div>
                )}
              </td>
              {players.map((p) => {
                const total = playerTotals[p.id] ?? 0;
                const isLeader = winnerIds.has(p.id);
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
                      <span className={isLeader ? 'text-[var(--warn)]' : ''}>{total}</span>
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
