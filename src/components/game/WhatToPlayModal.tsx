import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Dices,
  Sparkles,
  Play,
  RotateCcw,
  Shuffle,
  Users,
  Clock,
  Ban,
  Package,
  Trophy,
  Flame,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useGameStore } from '../../store/useGameStore';
import { useSessionStore } from '../../store/useSessionStore';
import { BoardGame } from '../../types';
import { getScoringTemplateForGame } from '../../lib/scoringPresets';
import { formatPlayerRange, shuffleArray } from '../../lib/utils';
import { playTickSound, playFanfareSound, triggerConfetti } from '../../lib/soundEffects';
import { GameCoverImage } from './GameCoverImage';
import { cn } from '../ui/cn';

export type PlayerCountFilter = 'any' | '2' | '3' | '4' | '5+';
export type DurationFilter = 'any' | '<30m' | '30-60m' | '60-120m' | '120m+';
export type VibeFilter = 'all' | 'light' | 'mid' | 'heavy' | 'coop';
export type PickerFlowMode = 'quick' | 'veto';

export interface GamePlayMetrics {
  playCount: number;
  lastPlayedDate?: string;
  daysSinceLastPlayed?: number;
  isDusty: boolean;
}

export interface WhatToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Determine vibe / weight category of a game based on template, tags, playtime, description
 */
export function getGameVibe(game: BoardGame): 'light' | 'mid' | 'heavy' | 'coop' {
  const template = getScoringTemplateForGame(game.name);
  const textCorpus = `${game.name} ${game.tags?.join(' ') || ''} ${game.description || ''}`.toLowerCase();

  const isCoop =
    template.isCoop === true ||
    game.tags?.some((t) => /co-?op/i.test(t)) ||
    /co-?operative|co-?op\b/.test(textCorpus);

  if (isCoop) return 'coop';

  const isHeavy =
    (game.playingTime || 0) > 90 ||
    /heavy|economic|euro\b|brass|tiletum|ark nova|darwin|burgundy|great western trail|yokohama|scythe/.test(textCorpus);

  if (isHeavy) return 'heavy';

  const isLight =
    ((game.playingTime || 0) > 0 && (game.playingTime || 0) <= 30) ||
    game.tags?.some((t) => /party|bluff|card game|filler|casual/.test(t.toLowerCase())) ||
    /party game|filler\b|quick card/.test(textCorpus);

  if (isLight) return 'light';

  return 'mid';
}

const VIBE_CONFIG: Record<
  'light' | 'mid' | 'heavy' | 'coop',
  { label: string; badgeClass: string }
> = {
  light: {
    label: 'Light / Party',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30',
  },
  mid: {
    label: 'Mid-weight',
    badgeClass: 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30',
  },
  heavy: {
    label: 'Heavy Euro',
    badgeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30',
  },
  coop: {
    label: 'Co-op Adventure',
    badgeClass: 'bg-[var(--good-soft)] text-[var(--good)] border-[var(--good-soft)]',
  },
};

export function formatPlayHistoryBadge(metrics?: GamePlayMetrics): {
  text: string;
  isUnplayed: boolean;
  isDusty: boolean;
} {
  if (!metrics || metrics.playCount === 0) {
    return {
      text: '✨ Unplayed',
      isUnplayed: true,
      isDusty: true,
    };
  }

  const { playCount, daysSinceLastPlayed } = metrics;
  let timeStr = 'Recently';
  if (daysSinceLastPlayed !== undefined) {
    if (daysSinceLastPlayed === 0) timeStr = 'Today';
    else if (daysSinceLastPlayed === 1) timeStr = 'Yesterday';
    else if (daysSinceLastPlayed < 30) timeStr = `${daysSinceLastPlayed}d ago`;
    else if (daysSinceLastPlayed < 60) timeStr = '1 mo ago';
    else if (daysSinceLastPlayed < 365) timeStr = `${Math.floor(daysSinceLastPlayed / 30.4)} mos ago`;
    else timeStr = `${Math.floor(daysSinceLastPlayed / 365.25)}y ago`;
  }

  return {
    text: `${playCount} ${playCount === 1 ? 'play' : 'plays'} · Last: ${timeStr}`,
    isUnplayed: false,
    isDusty: metrics.isDusty,
  };
}

export interface WhatToPlayFilterOptions {
  shelfOnly?: boolean;
  ownedOnly?: boolean;
  searchQuery?: string;
  playerCountFilter?: PlayerCountFilter;
  durationFilter?: DurationFilter;
  vibeFilter?: VibeFilter;
  dustyOnly?: boolean;
  gameMetricsMap?: Record<string, GamePlayMetrics>;
}

/**
 * Pure filtering function for What to Play selection
 */
export function filterWhatToPlayGames(
  allGames: BoardGame[],
  options: WhatToPlayFilterOptions = {}
): BoardGame[] {
  const isOwnedOnly = options.ownedOnly ?? options.shelfOnly ?? true;
  const {
    searchQuery = '',
    playerCountFilter = 'any',
    durationFilter = 'any',
    vibeFilter = 'all',
    dustyOnly = false,
    gameMetricsMap,
  } = options;

  return allGames.filter((g) => {
    // 1. Ownership / Shelf availability:
    // When isOwnedOnly is true (default): ONLY keep games with status 'own' / 'owned'.
    // Strictly exclude 'rented', 'borrowed', 'sold', 'lent_out', 'wishlist', 'previously_owned'.
    if (isOwnedOnly) {
      if (g.status !== 'own' && (g.status as string) !== 'owned') {
        return false;
      }
    } else {
      // In All Games mode: exclude sold, wishlist, previously_owned
      if (
        g.status === 'sold' ||
        g.status === 'wishlist' ||
        g.status === 'previously_owned'
      ) {
        return false;
      }
    }

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = g.name.toLowerCase().includes(q);
      const matchTags = g.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchName && !matchTags) return false;
    }

    // 3. Player count filter
    if (playerCountFilter !== 'any') {
      if (playerCountFilter === '5+') {
        if (typeof g.maxPlayers !== 'number' || g.maxPlayers < 5) {
          return false;
        }
      } else {
        const target = Number(playerCountFilter);
        const min = g.minPlayers;
        const max = g.maxPlayers;
        // Skip games with missing or non-positive minPlayers or maxPlayers
        if (typeof min !== 'number' || typeof max !== 'number' || min <= 0 || max <= 0) {
          return false;
        }
        if (min > target || max < target) {
          return false;
        }
      }
    }

    // 4. Playtime filter (strictly non-overlapping buckets: <30, 30-60, 61-120, >120)
    if (durationFilter !== 'any') {
      const pt = g.playingTime || 0;
      if (durationFilter === '<30m' && (pt <= 0 || pt >= 30)) return false;
      if (durationFilter === '30-60m' && (pt < 30 || pt > 60)) return false;
      if (durationFilter === '60-120m' && (pt <= 60 || pt > 120)) return false;
      if (durationFilter === '120m+' && pt <= 120) return false;
    }

    // 5. Vibe / Weight filter
    if (vibeFilter !== 'all') {
      const gVibe = getGameVibe(g);
      if (gVibe !== vibeFilter) return false;
    }

    // 6. Dusty Gems mode
    if (dustyOnly) {
      const m = gameMetricsMap ? gameMetricsMap[g.id] : undefined;
      if (!m || !m.isDusty) return false;
    }

    return true;
  });
}

/**
 * Count Dusty Gems strictly within the active ownership scope (Owned Only vs All Games),
 * never counting sold / wishlist / previously_owned titles.
 */
export function countDustyGames(
  allGames: BoardGame[],
  shelfOnly: boolean,
  gameMetricsMap: Record<string, GamePlayMetrics>
): number {
  return filterWhatToPlayGames(allGames, {
    shelfOnly,
    dustyOnly: true,
    gameMetricsMap,
  }).length;
}

export const WhatToPlayModal: React.FC<WhatToPlayModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const allGames = useGameStore((s) => s.games);
  const sessions = useSessionStore((s) => s.sessions);

  // Mode Selection
  const [mode, setMode] = useState<PickerFlowMode>('quick');

  // Smart Filters
  const [shelfOnly, setShelfOnly] = useState<boolean>(true);
  const [playerCountFilter, setPlayerCountFilter] = useState<PlayerCountFilter>('any');
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('any');
  const [vibeFilter, setVibeFilter] = useState<VibeFilter>('all');
  const [dustyOnly, setDustyOnly] = useState<boolean>(false);

  // Quick Pick & Table Veto States
  const [quickPickGame, setQuickPickGame] = useState<BoardGame | null>(null);
  const [vetoPool, setVetoPool] = useState<BoardGame[]>([]);
  const [vetoedIds, setVetoedIds] = useState<string[]>([]);

  // Compute play metrics map
  const gameMetricsMap = useMemo<Record<string, GamePlayMetrics>>(() => {
    const map: Record<string, { count: number; lastDate?: string }> = {};
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      if (!s.gameId) continue;
      if (!map[s.gameId]) {
        map[s.gameId] = { count: 0, lastDate: undefined };
      }
      map[s.gameId].count += 1;
      const sDate = s.datePlayed || s.createdAt;
      if (sDate) {
        if (!map[s.gameId].lastDate || sDate > map[s.gameId].lastDate!) {
          map[s.gameId].lastDate = sDate;
        }
      }
    }

    const now = Date.now();
    const result: Record<string, GamePlayMetrics> = {};
    for (let i = 0; i < allGames.length; i++) {
      const g = allGames[i];
      const entry = map[g.id];
      const playCount = entry?.count || 0;
      const lastPlayedDate = entry?.lastDate;
      let daysSinceLastPlayed: number | undefined = undefined;
      if (lastPlayedDate) {
        const parsed = new Date(lastPlayedDate).getTime();
        if (!isNaN(parsed)) {
          daysSinceLastPlayed = Math.max(0, Math.floor((now - parsed) / (1000 * 60 * 60 * 24)));
        }
      }
      const isDusty = playCount === 0 || (daysSinceLastPlayed !== undefined && daysSinceLastPlayed > 60);
      result[g.id] = { playCount, lastPlayedDate, daysSinceLastPlayed, isDusty };
    }
    return result;
  }, [allGames, sessions]);

  // Count total dusty gems scoped to active ownership filter (Owned Only vs All Games)
  const totalDustyCount = useMemo(() => {
    return countDustyGames(allGames, shelfOnly, gameMetricsMap);
  }, [allGames, shelfOnly, gameMetricsMap]);

  // Filter available games based on smart criteria
  const filteredGames = useMemo(() => {
    return filterWhatToPlayGames(allGames, {
      shelfOnly,
      playerCountFilter,
      durationFilter,
      vibeFilter,
      dustyOnly,
      gameMetricsMap,
    });
  }, [
    allGames,
    shelfOnly,
    playerCountFilter,
    durationFilter,
    vibeFilter,
    dustyOnly,
    gameMetricsMap,
  ]);

  // Pick random game helper (guaranteed 100% from pool)
  const pickRandomGame = useCallback(
    (pool: BoardGame[], currentId?: string): BoardGame | null => {
      if (pool.length === 0) return null;
      if (pool.length === 1) return pool[0];
      const candidates = pool.filter((g) => g.id !== currentId);
      const list = candidates.length > 0 ? candidates : pool;
      const idx = Math.floor(Math.random() * list.length);
      return list[idx];
    },
    []
  );

  // Initialize Table Veto Pool with 2-5 unbiased candidate games (Fisher-Yates)
  const initVetoPool = useCallback((pool: BoardGame[]) => {
    if (pool.length < 2) {
      setVetoPool(pool);
      setVetoedIds([]);
      return;
    }
    const poolSize = Math.min(5, Math.max(2, pool.length));
    const shuffled = shuffleArray(pool);
    setVetoPool(shuffled.slice(0, poolSize));
    setVetoedIds([]);
  }, []);

  // When modal is newly opened, pick a fresh candidate game and fresh veto pool
  const prevIsOpenRef = React.useRef(isOpen);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      if (filteredGames.length > 0) {
        setQuickPickGame(pickRandomGame(filteredGames));
      } else {
        setQuickPickGame(null);
      }
      initVetoPool(filteredGames);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, filteredGames, pickRandomGame, initVetoPool]);

  // Sync Quick Pick whenever filters change or displayed game falls outside filteredGames
  useEffect(() => {
    if (!isOpen) return;
    if (filteredGames.length === 0) {
      setQuickPickGame(null);
    } else if (!quickPickGame || !filteredGames.some((g) => g.id === quickPickGame.id)) {
      setQuickPickGame(pickRandomGame(filteredGames));
    }
  }, [filteredGames, isOpen, pickRandomGame, quickPickGame]);

  // Sync Veto Pool when in veto mode and filters change
  useEffect(() => {
    if (!isOpen || mode !== 'veto') return;
    initVetoPool(filteredGames);
  }, [filteredGames, isOpen, mode, initVetoPool]);

  // Handle switching to another Quick Pick game
  const handleRerollQuickPick = () => {
    playTickSound(1.1);
    const nextGame = pickRandomGame(filteredGames, quickPickGame?.id);
    setQuickPickGame(nextGame);
  };

  // Handle Vetoing a candidate game in Table Veto
  const handleVetoGame = (gameId: string) => {
    playTickSound(0.85);
    setVetoedIds((prev) => {
      const next = [...prev, gameId];
      // If only 1 game remains, play fanfare & confetti celebration
      const remainingCount = vetoPool.length - next.length;
      if (remainingCount === 1) {
        playFanfareSound();
        triggerConfetti();
      }
      return next;
    });
  };

  // Direct start session with chosen game
  const handleStartSession = (gameId: string) => {
    onClose();
    navigate(`/sessions/new?gameId=${gameId}`);
  };

  // Reset all filters to default
  const handleResetFilters = () => {
    setShelfOnly(true);
    setPlayerCountFilter('any');
    setDurationFilter('any');
    setVibeFilter('all');
    setDustyOnly(false);
  };

  const isFilterActive =
    !shelfOnly ||
    playerCountFilter !== 'any' ||
    durationFilter !== 'any' ||
    vibeFilter !== 'all' ||
    dustyOnly;

  const activeVetoCandidates = useMemo(() => {
    return vetoPool.filter((g) => !vetoedIds.includes(g.id));
  }, [vetoPool, vetoedIds]);

  const vetoWinner = useMemo(() => {
    return activeVetoCandidates.length === 1 ? activeVetoCandidates[0] : null;
  }, [activeVetoCandidates]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🎲 What to Play Tonight?"
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Mode Selector & Quick Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setMode('quick');
                if (!quickPickGame && filteredGames.length > 0) {
                  setQuickPickGame(pickRandomGame(filteredGames));
                }
              }}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 select-none',
                mode === 'quick'
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-md font-black'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              )}
            >
              <span>⚡ Quick Pick</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('veto');
              }}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 select-none',
                mode === 'veto'
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-md font-black'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              )}
            >
              <span>🗳️ Table Veto</span>
            </button>
          </div>

          {/* Quick Filter Toggles */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {/* Dusty Gems Toggle */}
            <button
              type="button"
              onClick={() => setDustyOnly((prev) => !prev)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 select-none shadow-sm',
                dustyOnly
                  ? 'bg-amber-500/25 border-amber-400 text-amber-700 dark:text-amber-300 shadow-amber-500/20 font-black'
                  : 'bg-[var(--card-2)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'
              )}
              title="Filter unplayed games or games not played in 60+ days"
            >
              <Sparkles className={cn('w-3.5 h-3.5', dustyOnly && 'fill-current text-amber-500')} />
              <span>Dusty Gems</span>
              {totalDustyCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 font-mono">
                  {totalDustyCount}
                </span>
              )}
            </button>

            {/* Owned Only Toggle */}
            <button
              type="button"
              onClick={() => setShelfOnly((prev) => !prev)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 select-none shadow-sm',
                shelfOnly
                  ? 'bg-[var(--card-2)] border-[var(--line-2)] text-[var(--ink)] font-bold'
                  : 'bg-[var(--card)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'
              )}
              title="Show all collection games or only owned games"
            >
              <Package className="w-3.5 h-3.5 opacity-70" />
              <span>{shelfOnly ? 'Owned Only' : 'All Games'}</span>
            </button>
          </div>
        </div>

        {/* Smart Filter Chips Container */}
        <div className="p-3.5 rounded-2xl bg-[var(--card-2)]/60 border border-[var(--line)] space-y-2.5">
          {/* Row 1: Players Count */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
            <span className="text-[11px] font-bold text-[var(--muted)] shrink-0 w-14 flex items-center gap-1">
              <Users className="w-3 h-3" /> Players
            </span>
            {(['any', '2', '3', '4', '5+'] as const).map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => setPlayerCountFilter(cnt)}
                className={cn(
                  'px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer select-none shrink-0',
                  playerCountFilter === cnt
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)] font-bold shadow-sm'
                    : 'bg-[var(--card)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'
                )}
              >
                {cnt === 'any' ? 'Any' : `${cnt}p`}
              </button>
            ))}
          </div>

          {/* Row 2: Playtime Duration */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
            <span className="text-[11px] font-bold text-[var(--muted)] shrink-0 w-14 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Time
            </span>
            {([
              { id: 'any', label: 'Any' },
              { id: '<30m', label: '< 30m' },
              { id: '30-60m', label: '30–60m' },
              { id: '60-120m', label: '61–120m' },
              { id: '120m+', label: '> 120m' },
            ] as const).map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDurationFilter(d.id)}
                className={cn(
                  'px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer select-none shrink-0',
                  durationFilter === d.id
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)] font-bold shadow-sm'
                    : 'bg-[var(--card)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'
                )}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Row 3: Vibe / Weight */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
            <span className="text-[11px] font-bold text-[var(--muted)] shrink-0 w-14 flex items-center gap-1">
              <Flame className="w-3 h-3" /> Vibe
            </span>
            {([
              { id: 'all', label: 'All' },
              { id: 'light', label: 'Light / Party' },
              { id: 'mid', label: 'Mid-weight' },
              { id: 'heavy', label: 'Heavy Euro' },
              { id: 'coop', label: '🤝 Co-op' },
            ] as const).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVibeFilter(v.id)}
                className={cn(
                  'px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer select-none shrink-0',
                  vibeFilter === v.id
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)] font-bold shadow-sm'
                    : 'bg-[var(--card)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'
                )}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Status & Match Count Bar */}
          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-[var(--line)]">
            <span className="text-[var(--muted)]">
              {filteredGames.length > 0 ? (
                <>
                  <strong className="text-[var(--ink)] font-extrabold">{filteredGames.length}</strong>{' '}
                  {filteredGames.length === 1 ? 'game matches' : 'games match'} your criteria
                </>
              ) : (
                <span className="text-amber-500 font-bold">0 games match filters</span>
              )}
            </span>

            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-[var(--accent)] hover:underline inline-flex items-center gap-1 font-bold cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* ---------------- QUICK PICK MODE ---------------- */}
        {mode === 'quick' && (
          <div className="space-y-4">
            {filteredGames.length === 0 ? (
              <div className="text-center p-8 rounded-2xl border border-dashed border-[var(--line)] space-y-2">
                <span className="text-3xl block">⚠️</span>
                <p className="font-bold text-sm text-[var(--ink)]">No games match current filters</p>
                <p className="text-xs text-[var(--muted)]">
                  Try turning off Dusty Gems or broadening player count and duration
                </p>
                <Button variant="secondary" size="sm" onClick={handleResetFilters} className="mt-2 text-xs">
                  <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset All Filters
                </Button>
              </div>
            ) : quickPickGame ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={quickPickGame.id}
                  initial={{ opacity: 0, scale: 0.96, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -10 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  className="p-4 sm:p-5 rounded-3xl bg-[var(--card)] border border-[var(--line-2)] shadow-xl space-y-4"
                >
                  {/* Spotlight Game Header */}
                  <div className="flex items-start gap-3.5 sm:gap-4">
                    {/* Game Cover */}
                    <GameCoverImage
                      game={quickPickGame}
                      className="w-20 h-24 sm:w-24 sm:h-28 rounded-2xl shrink-0 border border-[var(--line)] shadow-md"
                      paddingClassName="p-1.5"
                      fallbackIconClassName="w-8 h-8"
                    />

                    {/* Game Details */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1">
                          <Dices className="w-3 h-3" /> Quick Pick Winner
                        </span>
                        {quickPickGame.yearPublished && (
                          <span className="text-[11px] text-[var(--muted)]">
                            · {quickPickGame.yearPublished}
                          </span>
                        )}
                      </div>

                      <h3 className="font-display font-extrabold text-lg sm:text-xl text-[var(--ink)] leading-snug line-clamp-2">
                        {quickPickGame.name}
                      </h3>

                      {/* Tag badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-[var(--card-2)] border border-[var(--line)] text-[var(--ink)]">
                          <Users className="w-3 h-3 opacity-70" />
                          {formatPlayerRange(quickPickGame.minPlayers, quickPickGame.maxPlayers, 'short')}
                        </span>

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-[var(--card-2)] border border-[var(--line)] text-[var(--ink)]">
                          <Clock className="w-3 h-3 opacity-70" />
                          {quickPickGame.playingTime}m
                        </span>

                        {(() => {
                          const v = getGameVibe(quickPickGame);
                          const cfg = VIBE_CONFIG[v];
                          return (
                            <span
                              className={cn(
                                'inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold border',
                                cfg.badgeClass
                              )}
                            >
                              {cfg.label}
                            </span>
                          );
                        })()}
                      </div>

                      {/* History & Dusty Badge */}
                      {(() => {
                        const m = gameMetricsMap[quickPickGame.id];
                        const hist = formatPlayHistoryBadge(m);
                        return (
                          <div className="pt-1">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg border',
                                hist.isUnplayed
                                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-300'
                                  : 'bg-[var(--card-2)] border-[var(--line)] text-[var(--muted)]'
                              )}
                            >
                              <span>{hist.text}</span>
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Description preview */}
                  {quickPickGame.description && (
                    <p className="text-xs text-[var(--muted)] line-clamp-2 leading-relaxed border-t border-[var(--line)] pt-3">
                      {quickPickGame.description}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => handleStartSession(quickPickGame.id)}
                      className="flex-1 bg-[var(--accent)] hover:opacity-95 text-white font-black text-sm shadow-lg shadow-[var(--accent)]/25 min-h-[44px] rounded-full"
                    >
                      <Play className="w-4 h-4 fill-current mr-2" />
                      Play This Game
                    </Button>

                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={handleRerollQuickPick}
                      className="min-h-[44px] text-xs sm:text-sm font-bold text-[var(--ink)]"
                    >
                      <Shuffle className="w-4 h-4 mr-2" />
                      Pick Another
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : null}
          </div>
        )}

        {/* ---------------- TABLE VETO MODE ---------------- */}
        {mode === 'veto' && (
          <div className="space-y-4">
            {filteredGames.length < 2 ? (
              <div className="text-center p-8 rounded-2xl border border-dashed border-[var(--line)] space-y-2">
                <span className="text-3xl block">⚠️</span>
                <p className="font-bold text-sm text-[var(--ink)]">Need at least 2 games for Table Veto</p>
                <p className="text-xs text-[var(--muted)]">
                  Please loosen your filters so there are at least 2–5 games to vote on
                </p>
                <Button variant="secondary" size="sm" onClick={handleResetFilters} className="mt-2 text-xs">
                  <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset All Filters
                </Button>
              </div>
            ) : vetoWinner ? (
              /* CONSENSUS WINNER CELEBRATION CARD */
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-amber-500/20 via-orange-500/15 to-transparent border-2 border-amber-400 shadow-2xl space-y-4 text-center"
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-[#161311] font-black text-xs uppercase tracking-wider shadow-md">
                  <Trophy className="w-3.5 h-3.5 fill-current" />
                  Table Consensus Winner!
                </div>

                <div className="space-y-1">
                  <h3 className="font-display font-black text-xl sm:text-2xl text-[var(--ink)]">
                    {vetoWinner.name}
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    The group eliminated all other choices. This game hits the table tonight!
                  </p>
                </div>

                {/* Cover and details */}
                <div className="flex items-center justify-center gap-4 py-2">
                  <GameCoverImage
                    game={vetoWinner}
                    className="w-24 h-32 rounded-2xl shrink-0 border-2 border-amber-400/60 shadow-xl"
                    paddingClassName="p-1.5"
                    fallbackIconClassName="w-9 h-9"
                  />

                  <div className="text-left space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-[var(--ink)]">
                      <Users className="w-3.5 h-3.5 text-amber-500" />
                      {formatPlayerRange(vetoWinner.minPlayers, vetoWinner.maxPlayers, 'full')}
                    </div>
                    <div className="flex items-center gap-1.5 font-bold text-[var(--ink)]">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      {vetoWinner.playingTime} minutes
                    </div>
                    {(() => {
                      const m = gameMetricsMap[vetoWinner.id];
                      const hist = formatPlayHistoryBadge(m);
                      return (
                        <div className="text-[11px] font-bold text-amber-600 dark:text-amber-300">
                          {hist.text}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Final Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-2">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => handleStartSession(vetoWinner.id)}
                    className="bg-[var(--accent)] hover:opacity-95 text-white font-black text-sm sm:text-base shadow-lg shadow-[var(--accent)]/30 min-h-[46px] px-8 rounded-full"
                  >
                    <Play className="w-4 h-4 fill-current mr-2" />
                    Play This Game Now
                  </Button>

                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => initVetoPool(filteredGames)}
                    className="min-h-[46px] text-xs sm:text-sm font-bold text-[var(--ink)]"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Start Another Veto
                  </Button>
                </div>
              </motion.div>
            ) : (
              /* ACTIVE VETO ELIMINATION STAGE */
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base select-none">🗳️</span>
                    <div>
                      <span className="font-extrabold text-[var(--ink)]">
                        {activeVetoCandidates.length} Candidates Remaining
                      </span>
                      <p className="text-[11px] text-[var(--muted)]">
                        Take turns tapping &quot;Veto&quot; on games you don&apos;t want until 1 remains.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => initVetoPool(filteredGames)}
                    className="px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--card)] hover:bg-[var(--card-3)] text-[11px] font-bold text-[var(--ink)] inline-flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                  >
                    <Shuffle className="w-3 h-3" /> Reshuffle
                  </button>
                </div>

                {/* Candidate Cards Grid */}
                <div className="grid grid-cols-1 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                  <AnimatePresence>
                    {activeVetoCandidates.map((g) => {
                      const m = gameMetricsMap[g.id];
                      const hist = formatPlayHistoryBadge(m);
                      const vibe = getGameVibe(g);
                      const vibeCfg = VIBE_CONFIG[vibe];

                      return (
                        <motion.div
                          key={g.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, x: -16, transition: { duration: 0.15 } }}
                          className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--card)] border border-[var(--line)] hover:border-[var(--line-2)] shadow-sm transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <GameCoverImage
                              game={g}
                              className="w-12 h-14 rounded-xl shrink-0 border border-[var(--line)] shadow-sm"
                              paddingClassName="p-1"
                              fallbackIconClassName="w-5 h-5"
                            />

                            <div className="min-w-0 space-y-0.5">
                              <h4 className="font-display font-bold text-sm text-[var(--ink)] truncate">
                                {g.name}
                              </h4>
                              <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted)] flex-wrap">
                                <span>
                                  {formatPlayerRange(g.minPlayers, g.maxPlayers, 'short')}
                                </span>
                                <span>·</span>
                                <span>{g.playingTime}m</span>
                                <span>·</span>
                                <span className={cn('px-1.5 py-0.2 rounded font-semibold border', vibeCfg.badgeClass)}>
                                  {vibeCfg.label}
                                </span>
                              </div>
                              <div className="text-[10px] text-[var(--muted)]">
                                <span className={hist.isUnplayed ? 'text-amber-500 font-bold' : ''}>
                                  {hist.text}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* VETO BUTTON */}
                          <button
                            type="button"
                            onClick={() => handleVetoGame(g.id)}
                            className="px-3.5 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-500 dark:text-rose-400 font-extrabold text-xs inline-flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-sm min-h-[38px] active:scale-95"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Veto</span>
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default WhatToPlayModal;
