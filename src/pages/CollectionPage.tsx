import React, { useMemo, useState, useEffect, useDeferredValue, Suspense } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import { getPlayCountsByGameId } from '../lib/utils';

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

const PAGE_SIZE = 20;

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
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [sortBy, setSortBy] = useState<SortOption>('addedDate');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [quickEditGame, setQuickEditGame] = useState<BoardGame | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importModalTab, setImportModalTab] = useState<'import' | 'export'>('import');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isWhatToPlayOpen, setIsWhatToPlayOpen] = useState(false);

  // Status counts memoized once across [games]
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: games.length };
    for (const g of games) {
      counts[g.status] = (counts[g.status] || 0) + 1;
    }
    return counts;
  }, [games]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeFilter, deferredSearchQuery, sortBy]);

  const playCountsByGameId = useMemo(() => {
    return getPlayCountsByGameId(sessions);
  }, [sessions]);

  const filteredGames = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase();
    return games
      .filter((g) => {
        if (activeFilter !== 'all' && g.status !== activeFilter) {
          return false;
        }
        if (q) {
          const matchName = g.name.toLowerCase().includes(q);
          const matchTags = g.tags?.some((t) => t.toLowerCase().includes(q));
          if (!matchName && !matchTags) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
        if (sortBy === 'bggRating') return (b.bggRating || 0) - (a.bggRating || 0);
        if (sortBy === 'purchasePrice')
          return (b.purchasePrice || 0) - (a.purchasePrice || 0);
        // Default: addedDate descending (fast ISO string comparison)
        const dateA = a.addedDate || '';
        const dateB = b.addedDate || '';
        return dateB > dateA ? 1 : dateB < dateA ? -1 : 0;
      });
  }, [games, activeFilter, deferredSearchQuery, sortBy]);

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
              Board Game Collection
            </h1>
            <p className="text-sm text-[var(--muted)] tabular-nums font-medium">
              Showing {visibleGames.length < filteredGames.length ? `${visibleGames.length} of ` : ''}{filteredGames.length} tabletop games in your collection
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsWhatToPlayOpen(true)}
              className="px-4 py-2 rounded-full bg-[var(--card)] border border-[var(--line)] hover:bg-[var(--card-2)] text-amber-600 dark:text-amber-400 font-bold text-xs inline-flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>What to Play?</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setImportModalTab('import');
                setIsImportOpen(true);
              }}
              title="Import or Export collection data"
              className="px-4 py-2 rounded-full bg-[var(--card)] border border-[var(--line)] hover:bg-[var(--card-2)] text-[var(--ink)] font-semibold text-xs inline-flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer active:scale-95"
            >
              <ArrowDownUp className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Import / Export</span>
            </button>

            <Link to="/collection/add">
              <button
                type="button"
                className="px-4 py-2 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Game</span>
              </button>
            </Link>
          </div>
        </div>

        {/* Status Filter Bar with Warm Editorial Pill Chips */}
        <div
          role="tablist"
          aria-label="Filter collection by status"
          className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none"
        >
          {FILTER_TABS.map((tab) => {
            const count = statusCounts[tab.id] || 0;
            const isActive = activeFilter === tab.id;

            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'min-h-[36px] px-4 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all duration-150 cursor-pointer flex items-center gap-2 select-none active:scale-95 border',
                  isActive
                    ? 'bg-[#231F1D] text-white dark:bg-[#F4EFE6] dark:text-[#161311] border-transparent shadow-xs'
                    : 'bg-[var(--card)] text-[var(--muted)] border-[var(--line)] hover:bg-[var(--card-2)] hover:text-[var(--ink)]'
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-[10px] tabular-nums font-bold',
                    isActive
                      ? 'bg-white/20 dark:bg-black/20 text-current'
                      : 'bg-[var(--card-2)] text-[var(--muted)]'
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
              className="rounded-full bg-[var(--card)] border-[var(--line)] text-xs"
            />
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {/* Sort Dropdown */}
            <div className="relative inline-flex items-center">
              <ArrowUpDown className="w-3.5 h-3.5 text-[var(--muted)] absolute left-3 pointer-events-none" />
              <select
                aria-label="Sort collection by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="min-h-[38px] pl-8 pr-7 py-1.5 rounded-full bg-[var(--card)] border border-[var(--line)] text-xs font-semibold text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] cursor-pointer appearance-none shadow-xs"
              >
                <option value="addedDate">Date Added (Newest)</option>
                <option value="name">Name (A-Z)</option>
                <option value="bggRating">BGG Rating (Highest)</option>
                <option value="purchasePrice">Price (Highest)</option>
              </select>
            </div>

            {/* View Mode Switcher */}
            <div className="p-1 rounded-full bg-[var(--card)] border border-[var(--line)] flex items-center gap-1 shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded-full transition-all duration-150 cursor-pointer select-none active:scale-95',
                  viewMode === 'grid'
                    ? 'bg-[#231F1D] text-white dark:bg-[#F4EFE6] dark:text-[#161311] shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                )}
                aria-label="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 rounded-full transition-all duration-150 cursor-pointer select-none active:scale-95',
                  viewMode === 'list'
                    ? 'bg-[#231F1D] text-white dark:bg-[#F4EFE6] dark:text-[#161311] shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                )}
                aria-label="List view"
              >
                <List className="w-3.5 h-3.5" />
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
              onEdit={setQuickEditGame}
            />

            {/* Load More Button */}
            {visibleCount < filteredGames.length && (
              <div className="flex justify-center pt-4 pb-4">
                <Button
                  variant="secondary"
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                  className="px-6 py-2 text-xs font-bold rounded-full"
                >
                  Load More Games ({filteredGames.length - visibleCount} remaining)
                </Button>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="p-12 rounded-3xl bg-[var(--card)] border border-[var(--line)] text-center space-y-4 max-w-md mx-auto my-8">
            <div className="w-16 h-16 rounded-2xl bg-[var(--card-2)] text-[var(--accent)] border border-[var(--line)] flex items-center justify-center text-3xl mx-auto shadow-xs">
              🎲
            </div>
            <div className="space-y-1">
              <h3 className="font-display font-bold text-lg text-[var(--ink)]">
                No boardgames found
              </h3>
              <p className="text-sm text-[var(--muted)]">
                {searchQuery || activeFilter !== 'all'
                  ? 'No games match your current filter or search criteria.'
                  : 'Your collection is currently empty. Start adding games to your collection!'}
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
                  className="rounded-full"
                >
                  Reset Filters
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => setIsImportOpen(true)}
                className="rounded-full"
              >
                <ArrowDownUp className="w-4 h-4 mr-1 text-[var(--accent)]" />
                Import / Export
              </Button>
              <Link to="/collection/add">
                <Button variant="primary" className="rounded-full">
                  <Plus className="w-4 h-4 mr-1" />
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
