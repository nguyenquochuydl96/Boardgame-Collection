import React, { useState, useDeferredValue, useMemo } from 'react';
import { Search, Check } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { cn } from '../../ui/cn';
import { BoardGame } from '../../../types';

interface Step1PickGameProps {
  selectedGame?: BoardGame;
  selectedGameId: string;
  onSelectGameId: (id: string) => void;
  games: BoardGame[];
}

export const Step1PickGame: React.FC<Step1PickGameProps> = React.memo(
  ({ selectedGame, selectedGameId, onSelectGameId, games }) => {
    const [gameSearch, setGameSearch] = useState('');
    const deferredGameSearch = useDeferredValue(gameSearch);

    const filteredGames = useMemo(() => {
      if (!deferredGameSearch.trim()) return games;
      const q = deferredGameSearch.toLowerCase();
      return games.filter((g) => g.name.toLowerCase().includes(q));
    }, [games, deferredGameSearch]);

    return (
      <Card className="p-4 sm:p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-2xl text-[var(--text-primary)]">
              Step 1 — Choose Boardgame
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Select the tabletop game to bring to the table
            </p>
          </div>

          {selectedGame ? (
            <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-glow)]">
              <img
                key={selectedGame.id}
                src={selectedGame.thumbnail || selectedGame.image}
                alt={selectedGame.name}
                referrerPolicy="no-referrer"
                loading="eager"
                decoding="async"
                className="w-12 h-16 rounded-lg object-cover"
              />
              <div>
                <span className="text-[11px] text-[var(--accent-neon)] font-semibold">
                  Selected Game
                </span>
                <p className="font-display font-bold text-sm text-[var(--text-primary)]">
                  {selectedGame.name}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-[var(--bg-elevated)] border border-dashed border-[var(--border-subtle)] text-xs text-[var(--text-tertiary)]">
              <span>💡 Tap a game below to choose</span>
            </div>
          )}
        </div>

        <Input
          placeholder="Filter your collection..."
          value={gameSearch}
          onChange={(e) => setGameSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-1">
          {filteredGames.map((game) => {
            const active = selectedGameId === game.id;
            return (
              <button
                key={game.id}
                type="button"
                onClick={() => onSelectGameId(game.id)}
                className={cn(
                  'group relative rounded-2xl overflow-hidden border text-left transition-all cursor-pointer flex flex-col select-none',
                  active
                    ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/40 bg-[var(--accent)]/15'
                    : 'border-[var(--line)] bg-[var(--card)] hover:border-[var(--line-2)] hover:bg-[var(--card-2)]'
                )}
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-[var(--card-2)] relative">
                  <img
                    src={game.thumbnail || game.image}
                    alt={game.name}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {active && (
                    <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] flex items-center justify-center shadow-lg">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-display font-bold text-sm text-[var(--ink)] truncate">
                    {game.name}
                  </p>
                  <p className="text-xs text-[var(--muted)] tabular-nums">
                    {game.minPlayers}–{game.maxPlayers}p · {game.playingTime}m
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </Card>
    );
  }
);
