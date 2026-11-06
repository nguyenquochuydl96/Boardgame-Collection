import React, { useMemo, useState, useEffect, Suspense } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Search,
  LayoutGrid,
  List,
  Plus,
  ArrowUpDown,
  ArrowDownUp,
  Sparkles,
} from 'lucide-react';
import { PageTransition } from '../components/layout/PageTransition';
import { GameGrid } from '../components/game/GameGrid';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { cn } from '../components/ui/cn';
import { useGameStore } from '../store/useGameStore';
import { useSessionStore } from '../store/useSessionStore';
import { BoardGame, GameStatus } from '../types';

// Lazy-load heavy modals so the main collection loads instantly
const QuickEditGameModal = React.lazy(() =>
  import('../components/game/QuickEditGameModal').then((m) => ({ default: m.QuickEditGameModal }))
);
const CollectionImportModal = React.lazy(() =>
  import('../components/game/CollectionImportModal').then((m) => ({ default: m.CollectionImportModal }))
);
const BGGConfigModal = React.lazy(() =>
  import('../components/game/BGGConfigModal').then((m) => ({ default: m.BGGConfigModal }))
);
const WhatToPlayModal = React.lazy(() =>
  import('../components/game/WhatToPlayModal').then((m) => ({ default: m.WhatToPlayModal }))
);

type FilterTab = 'all' | GameStatus;
type SortOption = 'name' | 'addedDate' | 'bggRating' | 'purchasePrice';

const FILTER_TABS: Array<{ id: FilterTab; label: string }> = [
  { id: 'all', label: 'All Games' },
  { id: 'own', label: 'Owned' },
  { id: 'rented', label: 'Rented' },
  { id: 'lent_out', label: 'Lent Out' },
  { id: 'borrowed', label: 'Borrowed' },
  { id: 'sold', label: 'Sold' },
  { id: 'wishlist', label: 'Wishlist' },
  { id: 'previously_owned', label: 'Prev. Owned' },
];

const PAGE_SIZE = 36;

export const CollectionPage: React.FC = () => {
  const games = useGameStore((s) => s.games);
  const updateGame = useGameStore((s) => s.updateGame);
  const deleteGame = useGameStore((s) => s.deleteGame);
  const sessions = useSessionStore((s) => s.sessions);

  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get('status') as FilterTab | null;
  const [activeFilter, setActiveFilter] = useState<FilterTab>(() => {
    if (urlStatus && FILTER_TABS.some((t) => t.id === urlStatus)) {
      return urlStatus;
    }
    return 'all';
  });

  useEffect(() => {
    if (urlStatus && FILTER_TABS.some((t) => t.id === urlStatus)) {
      setActiveFilter(urlStatus);
    }
  }, [urlStatus]);

  const handleTabChange = (tabId: FilterTab) => {
    setActiveFilter(tabId);
    if (tabId === 'all') {
      searchParams.delete('status');
      setSearchParams(searchParams, { replace: true });
    } else {
      setSearchParams({ status: tabId }, { replace: true });
    }
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('addedDate');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [quickEditGame, setQuickEditGame] = useState<BoardGame | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importModalTab, setImportModalTab] = useState<'import' | 'export'>('import');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isWhatToPlayOpen, setIsWhatToPlayOpen] = useState(false);

  // Reset pagination when search or filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeFilter, searchQuery, sortBy]);

  const playCountsByGameId = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of sessions) {
      if (s.gameId) {
        counts[s.gameId] = (counts[s.gameId] || 0) + 1;
      }
    }
    return counts;
  }, [sessions]);

  const filteredGames = useMemo(() => {
    return games
      .filter((g) => {
        if (activeFilter !== 'all' && g.status !== activeFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = g.name.toLowerCase().includes(q);
          const matchTags = g.tags?.some((t) => t.toLowerCase().includes(q));
          if (!matchName && !matchTags) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'bggRating') return (b.bggRating || 0) - (a.bggRating || 0);
        if (sortBy === 'purchasePrice')
          return (b.purchasePrice || 0) - (a.purchasePrice || 0);
        // Default: addedDate descending (fast ISO string comparison)
        return (b.addedDate || '').localeCompare(a.addedDate || '');
      });
  }, [games, activeFilter, searchQuery, sortBy]);

  const visibleGames = useMemo(() => {
    return filteredGames.slice(0, visibleCount);
  }, [filteredGames, visibleCount]);

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[var(--ink)]">
              Boardgame Vault
            </h1>
            <p className="text-sm text-[var(--muted)] tabular-nums font-medium">
              Showing {visibleGames.length < filteredGames.length ? `${visibleGames.length} of ` : ''}{filteredGames.length} tabletop games in your vault
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsWhatToPlayOpen(true)}
              className="text-amber-600 dark:text-amber-400 font-semibold"
            >
              <Sparkles className="w-4 h-4 mr-1 text-amber-500" />
              What to Play?
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setImportModalTab('import');
                setIsImportOpen(true);
              }}
              title="Import or Export collection data"
            >
              <ArrowDownUp className="w-4 h-4 mr-1.5 text-[var(--accent)]" />
              Import / Export
            </Button>
            <Link to="/collection/add">
              <Button variant="primary">
                <Plus className="w-4 h-4 mr-1" />
                Add Game
              </Button>
            </Link>
          </div>
        </div>

        {/* Status Filter Bar with Fitlo sliding pill */}
        <div
          role="tablist"
          aria-label="Filter collection by status"
          className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none"
        >
          {FILTER_TABS.map((tab) => {
            const count =
              tab.id === 'all'
                ? games.length
                : games.filter((g) => g.status === tab.id).length;
            const isActive = activeFilter === tab.id;

            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'relative isolate min-h-[38px] px-3.5 py-1.5 rounded-[12px] text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-2 select-none',
                  isActive
                    ? 'text-[var(--accent-ink)] font-black'
                    : 'bg-[var(--card)] text-[var(--ink-2)] shadow-[inset_0_0_0_1px_var(--line)] hover:bg-[var(--card-2)] hover:text-[var(--ink)]'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="collection-tab-pill"
                    className="absolute inset-0 rounded-[12px] bg-[var(--accent)] shadow-sm pointer-events-none"
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
                <span
                  className={cn(
                    'relative z-10 px-1.5 py-0.5 rounded-full text-[10px] tabular-nums font-bold',
                    isActive ? 'bg-black/20 text-white' : 'bg-[var(--card-3)] text-[var(--ink-2)]'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search, Sort, and View Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search by title or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-[var(--muted)]" />}
            />
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {/* Sort Dropdown */}
            <div className="relative inline-flex items-center">
              <ArrowUpDown className="w-4 h-4 text-[var(--muted)] absolute left-3 pointer-events-none" />
              <select
                aria-label="Sort collection by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="min-h-[42px] pl-9 pr-8 py-2 rounded-xl bg-[var(--card)] shadow-[inset_0_0_0_1px_var(--line-2)] text-xs font-semibold text-[var(--ink)] focus:outline-none focus:shadow-[inset_0_0_0_1.5px_var(--accent)] cursor-pointer appearance-none"
              >
                <option value="addedDate">Date Added (Newest)</option>
                <option value="name">Name (A-Z)</option>
                <option value="bggRating">BGG Rating (Highest)</option>
                <option value="purchasePrice">Price (Highest)</option>
              </select>
            </div>

            {/* View Mode Switcher with sliding spring pill */}
            <div className="p-1 rounded-[12px] bg-[var(--card)] shadow-[inset_0_0_0_1px_var(--line)] flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'relative isolate p-2 rounded-[9px] transition-colors cursor-pointer select-none',
                  viewMode === 'grid'
                    ? 'text-[var(--accent-ink)] font-black'
                    : 'text-[var(--ink-2)] hover:text-[var(--ink)]'
                )}
                aria-label="Grid view"
              >
                {viewMode === 'grid' && (
                  <motion.span
                    layoutId="collection-view-pill"
                    className="absolute inset-0 rounded-[9px] bg-[var(--accent)] shadow-xs pointer-events-none z-0"
                    transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                  />
                )}
                <LayoutGrid className="w-4 h-4 relative z-10" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  'relative isolate p-2 rounded-[9px] transition-colors cursor-pointer select-none',
                  viewMode === 'list'
                    ? 'text-[var(--accent-ink)] font-black'
                    : 'text-[var(--ink-2)] hover:text-[var(--ink)]'
                )}
                aria-label="List view"
              >
                {viewMode === 'list' && (
                  <motion.span
                    layoutId="collection-view-pill"
                    className="absolute inset-0 rounded-[9px] bg-[var(--accent)] shadow-xs pointer-events-none z-0"
                    transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                  />
                )}
                <List className="w-4 h-4 relative z-10" />
              </button>
            </div>
          </div>
        </div>

        {/* Game List / Grid */}
        {filteredGames.length > 0 ? (
          <>
            <GameGrid
              games={visibleGames}
              viewMode={viewMode}
              playCountsByGameId={playCountsByGameId}
              onEdit={(game) => setQuickEditGame(game)}
            />

            {/* Load More Button */}
            {visibleCount < filteredGames.length && (
              <div className="flex justify-center pt-4 pb-4">
                <Button
                  variant="secondary"
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                  className="px-6 py-2 text-xs font-bold"
                >
                  Load More Games ({filteredGames.length - visibleCount} remaining)
                </Button>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="p-12 rounded-[24px] bg-[var(--card)] shadow-[inset_0_0_0_1px_var(--line)] text-center space-y-4 max-w-md mx-auto my-8">
            <div className="w-16 h-16 rounded-[18px] bg-[var(--accent)] text-[var(--accent-ink)] flex items-center justify-center text-3xl mx-auto shadow-md">
              🎲
            </div>
            <div className="space-y-1">
              <h3 className="font-display font-bold text-lg text-[var(--ink)]">
                No boardgames found
              </h3>
              <p className="text-sm text-[var(--muted)]">
                {searchQuery || activeFilter !== 'all'
                  ? 'No games match your current filter or search criteria.'
                  : 'Your collection is currently empty. Start adding games to your vault!'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              {(searchQuery || activeFilter !== 'all') && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setActiveFilter('all');
                    setSearchQuery('');
                  }}
                >
                  Reset Filters
                </Button>
              )}
              <Button variant="secondary" onClick={() => setIsImportOpen(true)}>
                <ArrowDownUp className="w-4 h-4 mr-1 text-[var(--accent)]" />
                Import / Export
              </Button>
              <Link to="/collection/add">
                <Button variant="primary">
                  <Plus className="w-4 h-4" />
                  Add New Game
                </Button>
              </Link>
            </div>
          </div>
        )}


        {/* Modals - Lazy loaded on-demand */}
        {quickEditGame && (
          <Suspense fallback={null}>
            <QuickEditGameModal
              game={quickEditGame}
              isOpen={Boolean(quickEditGame)}
              onClose={() => setQuickEditGame(null)}
              onSave={(updated) => updateGame(updated.id, updated)}
              onDelete={(id) => deleteGame(id)}
            />
          </Suspense>
        )}
        {isImportOpen && (
          <Suspense fallback={null}>
            <CollectionImportModal
              isOpen={isImportOpen}
              onClose={() => setIsImportOpen(false)}
              initialTab={importModalTab}
            />
          </Suspense>
        )}
        {isConfigOpen && (
          <Suspense fallback={null}>
            <BGGConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
          </Suspense>
        )}
        {isWhatToPlayOpen && (
          <Suspense fallback={null}>
            <WhatToPlayModal isOpen={isWhatToPlayOpen} onClose={() => setIsWhatToPlayOpen(false)} />
          </Suspense>
        )}
      </div>
    </PageTransition>
  );
};

export default CollectionPage;
