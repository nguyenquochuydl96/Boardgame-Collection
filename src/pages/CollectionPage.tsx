import React, { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Search,
  LayoutGrid,
  List,
  Plus,
  ArrowUpDown,
  Upload,
  Download,
  Settings,
  Sparkles,
} from 'lucide-react';
import { PageTransition } from '../components/layout/PageTransition';
import { GameGrid } from '../components/game/GameGrid';
import { QuickEditGameModal } from '../components/game/QuickEditGameModal';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { cn } from '../components/ui/cn';
import { useGameStore } from '../store/useGameStore';
import { useSessionStore } from '../store/useSessionStore';
import { BoardGame, GameStatus } from '../types';
import { CollectionImportModal } from '../components/game/CollectionImportModal';
import { BGGConfigModal } from '../components/game/BGGConfigModal';
import { WhatToPlayModal } from '../components/game/WhatToPlayModal';

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
  const [importModalTab, setImportModalTab] = useState<'file' | 'export' | 'bgg'>('file');
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
      .filter((game) => {
        if (activeFilter !== 'all' && game.status !== activeFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            game.name.toLowerCase().includes(q) ||
            (game.tags && game.tags.some((t) => t.toLowerCase().includes(q)))
          );
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'bggRating':
            return (b.bggRating || 0) - (a.bggRating || 0);
          case 'purchasePrice':
            return (b.purchasePrice || 0) - (a.purchasePrice || 0);
          case 'addedDate':
          default:
            return (b.addedDate || '').localeCompare(a.addedDate || '');
        }
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
            <h1 className="font-display font-bold text-2xl sm:text-4xl text-[var(--text-primary)] tracking-tight">
              Tabletop Vault
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium tabular-nums mt-0.5">
              Showing {visibleGames.length < filteredGames.length ? `${visibleGames.length} of ` : ''}{filteredGames.length} curated games in your archive
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="butter"
              size="sm"
              onClick={() => setIsWhatToPlayOpen(true)}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-[var(--ink)]" />
              What to Play?
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsConfigOpen(true)}>
              <Settings className="w-3.5 h-3.5 mr-1 text-[var(--coral)]" />
              BGG Sync
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setImportModalTab('file');
                setIsImportOpen(true);
              }}
              title="Import collection from ZIP/JSON backup or BGG"
            >
              <Upload className="w-3.5 h-3.5 mr-1 text-[var(--teal)]" />
              Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setImportModalTab('export');
                setIsImportOpen(true);
              }}
              title="Backup all collection data to JSON or CSV"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-[var(--coral)]" />
              Backup
            </Button>
            <Link to="/collection/add">
              <Button variant="primary" size="sm" withArrowDot>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Game
              </Button>
            </Link>
          </div>
        </div>

        {/* Status Filter Bar with Rayé Pill Tabs */}
        <div
          role="tablist"
          aria-label="Filter collection by status"
          className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none"
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
                  'relative min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-bold font-display uppercase tracking-wider shrink-0 transition-all duration-200 cursor-pointer flex items-center gap-2 border-[1.5px] select-none',
                  isActive
                    ? 'bg-[var(--ink)] text-[var(--cream)] border-[var(--ink)] shadow-[2px_2px_0_var(--coral)] -translate-y-0.5'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--ink)] shadow-[2px_2px_0_var(--ink)] hover:bg-[var(--butter-soft)] hover:text-[var(--text-primary)] hover:-translate-y-0.5'
                )}
              >
                <span className="relative z-10">{tab.label}</span>
                <span
                  className={cn(
                    'relative z-10 px-1.5 py-0.2 rounded-full text-[10px] tabular-nums font-bold border border-[var(--ink)]',
                    isActive ? 'bg-[var(--coral)] text-[var(--ink)]' : 'bg-[var(--paper)] text-[var(--text-secondary)]'
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
              leftIcon={<Search className="w-4 h-4 text-[var(--text-secondary)]" />}
            />
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {/* Sort Dropdown */}
            <div className="relative inline-flex items-center">
              <ArrowUpDown className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 pointer-events-none" />
              <select
                aria-label="Sort collection by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="min-h-[42px] pl-9 pr-8 py-2 rounded-xl bg-[var(--bg-card)] border-[1.5px] border-[var(--ink)] shadow-[var(--shadow-brutal-xs)] text-xs font-bold font-display uppercase tracking-wider text-[var(--text-primary)] focus:outline-none focus:shadow-[var(--shadow-brutal-sm)] cursor-pointer appearance-none"
              >
                <option value="addedDate">Date Added (Newest)</option>
                <option value="name">Name (A-Z)</option>
                <option value="bggRating">BGG Rating (Highest)</option>
                <option value="purchasePrice">Price (Highest)</option>
              </select>
            </div>

            {/* View Mode Switcher with Rayé styling */}
            <div className="p-1 rounded-xl bg-[var(--bg-card)] border-[1.5px] border-[var(--ink)] shadow-[var(--shadow-brutal-xs)] flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'relative p-2 rounded-lg transition-all duration-200 cursor-pointer',
                  viewMode === 'grid'
                    ? 'bg-[var(--coral)] text-[var(--ink)] border border-[var(--ink)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
                aria-label="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  'relative p-2 rounded-lg transition-all duration-200 cursor-pointer',
                  viewMode === 'list'
                    ? 'bg-[var(--coral)] text-[var(--ink)] border border-[var(--ink)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
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
                  variant="butter"
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                  className="px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-wider"
                >
                  Load More Games ({filteredGames.length - visibleCount} remaining)
                </Button>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="p-12 rounded-2xl bg-[var(--bg-card)] border-2 border-[var(--ink)] shadow-[var(--shadow-brutal)] text-center space-y-4 max-w-md mx-auto my-8">
            <div className="w-16 h-16 rounded-2xl bg-[var(--coral)] border-2 border-[var(--ink)] shadow-[2px_2px_0_var(--ink)] flex items-center justify-center text-3xl mx-auto">
              🎲
            </div>
            <div className="space-y-1">
              <h3 className="font-display font-black text-xl text-[var(--text-primary)] uppercase">
                No boardgames found
              </h3>
              <p className="text-sm text-[var(--text-secondary)] font-medium">
                {searchQuery || activeFilter !== 'all'
                  ? 'No games match your current filter or search criteria.'
                  : 'Your collection is currently empty. Start adding games to your vault!'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              {(searchQuery || activeFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveFilter('all');
                    setSearchQuery('');
                  }}
                >
                  Reset Filters
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setIsImportOpen(true)}>
                <Upload className="w-4 h-4 mr-1" />
                Import File
              </Button>
              <Link to="/collection/add">
                <Button variant="primary" size="sm" withArrowDot>
                  <Plus className="w-4 h-4" />
                  Add New Game
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Floating Action Button (FAB) with Rayé styling */}
        <Link
          to="/collection/add"
          aria-label="Add new boardgame"
          className="fixed right-5 bottom-20 lg:bottom-8 z-30 w-14 h-14 rounded-full bg-[var(--coral)] text-[var(--ink)] border-2 border-[var(--ink)] shadow-[var(--shadow-brutal)] flex items-center justify-center hover:bg-[var(--butter)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-6 h-6" />
        </Link>

        {/* Modals */}
        <QuickEditGameModal
          game={quickEditGame}
          isOpen={Boolean(quickEditGame)}
          onClose={() => setQuickEditGame(null)}
          onSave={(updated) => updateGame(updated.id, updated)}
          onDelete={(id) => deleteGame(id)}
        />
        <CollectionImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          initialTab={importModalTab}
        />
        <BGGConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
        <WhatToPlayModal isOpen={isWhatToPlayOpen} onClose={() => setIsWhatToPlayOpen(false)} />
      </div>
    </PageTransition>
  );
};

export default CollectionPage;
