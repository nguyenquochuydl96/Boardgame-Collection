import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Dices, Sparkles, Play, Check, Filter, Search } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { LuckyWheel } from '../picker/LuckyWheel';
import { MysteryCardShuffle, PickerItem } from '../picker/MysteryCardShuffle';
import { useGameStore } from '../../store/useGameStore';
import { GameStatus } from '../../types';
import { cn } from '../ui/cn';

export interface WhatToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatToPlayModal: React.FC<WhatToPlayModalProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const allGames = useGameStore((s) => s.games);

  const [animStyle, setAnimStyle] = useState<'wheel' | 'card_shuffle'>('wheel');
  const [statusFilters, setStatusFilters] = useState<GameStatus[]>(['own']);
  const [playerCountFilter, setPlayerCountFilter] = useState<'all' | '2' | '3' | '4' | '5+'>('all');
  const [durationFilter, setDurationFilter] = useState<'all' | 'short' | 'medium' | 'long'>('all');
  const [gameSearch, setGameSearch] = useState('');
  const [selectedGameIds, setSelectedGameIds] = useState<string[]>(() =>
    allGames.filter((g) => g.status === 'own').map((g) => g.id)
  );
  const [chosenGame, setChosenGame] = useState<PickerItem | null>(null);

  // Filtered available games
  const filteredAvailableGames = useMemo(() => {
    return allGames.filter((g) => {
      if (statusFilters.length > 0) {
        if (!statusFilters.includes(g.status)) return false;
      } else {
        if (g.status === 'sold' || g.status === 'wishlist') return false;
      }

      if (gameSearch.trim() && !g.name.toLowerCase().includes(gameSearch.toLowerCase())) {
        return false;
      }
      if (playerCountFilter !== 'all') {
        const target = playerCountFilter === '5+' ? 5 : Number(playerCountFilter);
        if (target === 5 && (g.maxPlayers || 0) < 5) return false;
        if (target < 5 && ((g.minPlayers || 1) > target || (g.maxPlayers || 99) < target)) {
          return false;
        }
      }
      if (durationFilter === 'short' && (g.playingTime || 0) > 45) return false;
      if (durationFilter === 'medium' && ((g.playingTime || 0) < 45 || (g.playingTime || 0) > 90)) {
        return false;
      }
      if (durationFilter === 'long' && (g.playingTime || 0) <= 90) return false;

      return true;
    });
  }, [allGames, statusFilters, gameSearch, playerCountFilter, durationFilter]);

  // Sync selectedGameIds with filtered list
  useEffect(() => {
    setSelectedGameIds(filteredAvailableGames.map((g) => g.id));
  }, [statusFilters, playerCountFilter, durationFilter, gameSearch]);

  const gameItems = useMemo<PickerItem[]>(() => {
    return filteredAvailableGames
      .filter((g) => selectedGameIds.includes(g.id))
      .map((g) => ({
        id: g.id,
        name: g.name,
        subtitle: `${g.minPlayers}-${g.maxPlayers} players · ${g.playingTime}m`,
        thumbnail: g.thumbnail || g.image,
      }));
  }, [filteredAvailableGames, selectedGameIds]);

  const toggleGame = (id: string) => {
    setSelectedGameIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleStartSession = () => {
    if (!chosenGame) return;
    onClose();
    navigate(`/sessions/new?gameId=${chosenGame.id}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🎲 What to Play Tonight? (Random Game Picker)"
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Style Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)]">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Picker Mode:</span>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => {
                setAnimStyle('wheel');
                setChosenGame(null);
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                animStyle === 'wheel'
                  ? 'bg-amber-500/25 border border-amber-500/50 text-amber-300'
                  : 'text-[var(--text-secondary)] hover:text-[var(--ink)]'
              )}
            >
              <span>🎡 Lucky Wheel</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAnimStyle('card_shuffle');
                setChosenGame(null);
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                animStyle === 'card_shuffle'
                  ? 'bg-amber-500/25 border border-amber-500/50 text-amber-300'
                  : 'text-[var(--text-secondary)] hover:text-[var(--ink)]'
              )}
            >
              <span>🎴 Mystery Card Shuffle</span>
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search game title..."
                value={gameSearch}
                onChange={(e) => setGameSearch(e.target.value)}
                className="text-xs py-1.5"
                leftIcon={<Search className="w-3.5 h-3.5" />}
              />
            </div>
            {/* Player Count */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[var(--text-muted)] font-bold shrink-0">Players:</span>
              {(['all', '2', '3', '4', '5+'] as const).map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setPlayerCountFilter(cnt)}
                  className={cn(
                    'px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer',
                    playerCountFilter === cnt
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--ink)]'
                  )}
                >
                  {cnt === 'all' ? 'All' : `${cnt}p`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-1 border-t border-[var(--border-subtle)]">
            <span>Selected <strong>{gameItems.length}</strong> of {filteredAvailableGames.length} games</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedGameIds(filteredAvailableGames.map((g) => g.id))}
                className="text-[11px] text-[var(--accent-neon)] font-bold hover:underline cursor-pointer"
              >
                Select All
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setSelectedGameIds([])}
                className="text-[11px] text-[var(--text-secondary)] hover:underline cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Game Checklist Selection */}
          {filteredAvailableGames.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 pt-2 border-t border-[var(--border-subtle)]">
              {filteredAvailableGames.map((g) => {
                const isSelected = selectedGameIds.includes(g.id);
                return (
                  <div
                    key={g.id}
                    onClick={() => toggleGame(g.id)}
                    className={cn(
                      'flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer select-none',
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/30 text-[var(--text-primary)]'
                        : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] opacity-40 hover:opacity-75'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {g.thumbnail ? (
                        <img
                          src={g.thumbnail}
                          alt={g.name}
                          className="w-7 h-7 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-xs flex items-center justify-center shrink-0">
                          🎲
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate text-[var(--text-primary)]">{g.name}</p>
                        <p className="text-[10px] text-[var(--text-muted)] truncate">
                          {g.minPlayers}-{g.maxPlayers}p · {g.playingTime}m
                        </p>
                      </div>
                    </div>
                    <div
                      className={cn(
                        'w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 transition-colors',
                        isSelected
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'border border-[var(--border-subtle)] text-transparent'
                      )}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Animation Stage */}
        <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex flex-col items-center justify-center min-h-[380px] relative overflow-hidden">
          {gameItems.length < 2 ? (
            <div className="text-center p-6 space-y-2">
              <span className="text-3xl">⚠️</span>
              <p className="font-bold text-sm text-[var(--text-primary)]">
                Need at least 2 board games to pick
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Please loosen filters or select more games
              </p>
            </div>
          ) : animStyle === 'wheel' ? (
            <LuckyWheel
              items={gameItems}
              onSelect={(winner) => setChosenGame(winner)}
            />
          ) : (
            <MysteryCardShuffle
              items={gameItems}
              onSelect={(winner) => setChosenGame(winner)}
              onEnterGame={(gameId) => {
                onClose();
                navigate(`/sessions/new?gameId=${gameId}`);
              }}
              mode="what_to_play"
            />
          )}

          {/* Winner Spotlight Card */}
          <AnimatePresence>
            {chosenGame && (
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/25 to-amber-600/20 border-2 border-amber-400 shadow-2xl w-full max-w-lg flex flex-col sm:flex-row items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {chosenGame.thumbnail ? (
                    <img
                      src={chosenGame.thumbnail}
                      alt={chosenGame.name}
                      className="w-14 h-14 rounded-xl object-cover border border-amber-400/50 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-amber-500/20 text-2xl flex items-center justify-center border border-amber-400/50 shrink-0">
                      🎲
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300">
                      🎯 Tonight's Featured Tabletop Game!
                    </span>
                    <h4 className="font-display font-extrabold text-base sm:text-lg text-[var(--ink)] truncate">
                      {chosenGame.name}
                    </h4>
                    {chosenGame.subtitle && (
                      <p className="text-xs text-[#cbd5e1] truncate">{chosenGame.subtitle}</p>
                    )}
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleStartSession}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-lg shrink-0 w-full sm:w-auto"
                >
                  <Play className="w-4 h-4 fill-current mr-1" />
                  Start This Session
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Modal>
  );
};
