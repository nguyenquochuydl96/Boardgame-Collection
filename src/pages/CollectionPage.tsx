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
  const [quickEditGame, setQuickEditGame] = useState<BoardGame | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importModalTab, setImportModalTab] = useState<'file' | 'export' | 'bgg'>('file');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isWhatToPlayOpen, setIsWhatToPlayOpen] = useState(false);

  const playCountsByGameId = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of sessions) {
      counts[s.gameId] = (counts[s.gameId] || 0) + 1;
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
            return (
              new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime()
            );
        }
      });
  }, [games, activeFilter, searchQuery, sortBy]);

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[var(--text-primary)]">
              Boardgame Vault
            </h1>
            <p className="text-sm text-[var(--text-secondary)] tabular-nums">
              Showing {filteredGames.length} of {games.length} tabletop games in your vault
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsWhatToPlayOpen(true)}
              className="border-amber-500/30 text-amber-300 hover:border-amber-400"
            >
              <Sparkles className="w-4 h-4 mr-1 text-amber-400" />
              What to Play?
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsConfigOpen(true)}>
              <Settings className="w-4 h-4 mr-1 text-[var(--accent-neon)]" />
              BGG Sync
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setImportModalTab('file');
                setIsImportOpen(true);
              }}
              title="Import collection from ZIP/JSON backup or BGG"
            >
              <Upload className="w-4 h-4 mr-1 text-[var(--accent-secondary)]" />
              Import
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setImportModalTab('export');
                setIsImportOpen(true);
              }}
              title="Backup all collection data to JSON or CSV"
              className="border-emerald-500/30 text-emerald-300 hover:border-emerald-400"
            >
              <Download className="w-4 h-4 mr-1 text-emerald-400" />
              Backup &amp; Export
            </Button>
            <Link to="/collection/add">
              <Button variant="primary">
                <Plus className="w-4 h-4 mr-1" />
                Add Game
              </Button>
            </Link>
          </div>
        </div>

        {/* Status Filter Bar with sliding spring pill */}
        <div
          role="tablist"
          aria-label="Filter collection by status"
          className="flex items-center gap-2 overflow-x-auto pb-1.5"
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
                  'relative min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-2 border select-none',
                  isActive
                    ? 'text-white border-transparent'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-glow)] hover:text-[var(--text-primary)]'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="collection-filter-pill"
                    className="absolute inset-0 rounded-xl bg-[image:var(--gradient-hero)] shadow-lg shadow-[var(--accent-glow)] -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
                <span
                  className={cn(
                    'relative z-10 px-1.5 py-0.5 rounded-md text-[10px] tabular-nums font-semibold',
                    isActive ? 'bg-white/25 text-white' : 'bg-white/5 text-[var(--text-secondary)]'
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
                className="min-h-[42px] pl-9 pr-8 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] cursor-pointer appearance-none"
              >
                <option value="addedDate">Date Added (Newest)</option>
                <option value="name">Name (A-Z)</option>
                <option value="bggRating">BGG Rating (Highest)</option>
                <option value="purchasePrice">Price (Highest)</option>
              </select>
            </div>

            {/* View Mode Switcher with sliding spring pill */}
            <div className="p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'relative p-2 rounded-lg transition-colors cursor-pointer',
                  viewMode === 'grid'
                    ? 'text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
                aria-label="Grid view"
              >
                {viewMode === 'grid' && (
                  <motion.span
                    layoutId="collection-view-pill"
                    className="absolute inset-0 rounded-lg bg-[image:var(--gradient-hero)] shadow-md -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  />
                )}
                <LayoutGrid className="w-4 h-4 relative z-10" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  'relative p-2 rounded-lg transition-colors cursor-pointer',
                  viewMode === 'list'
                    ? 'text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
                aria-label="List view"
              >
                {viewMode === 'list' && (
                  <motion.span
                    layoutId="collection-view-pill"
                    className="absolute inset-0 rounded-lg bg-[image:var(--gradient-hero)] shadow-md -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  />
                )}
                <List className="w-4 h-4 relative z-10" />
              </button>
            </div>
          </div>
        </div>

        {/* Game List / Grid */}
        {filteredGames.length > 0 ? (
          <GameGrid
            games={filteredGames}
            viewMode={viewMode}
            playCountsByGameId={playCountsByGameId}
            onEdit={(game) => setQuickEditGame(game)}
          />
        ) : (
          /* Empty State */
          <div className="p-12 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center space-y-4 max-w-md mx-auto my-8">
            <div className="w-16 h-16 rounded-3xl bg-[image:var(--gradient-hero)] flex items-center justify-center text-3xl mx-auto shadow-xl shadow-[var(--accent-glow)]">
              🎲
            </div>
            <div className="space-y-1">
              <h3 className="font-display font-bold text-lg text-[var(--text-primary)]">
                No boardgames found
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
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
                <Upload className="w-4 h-4 mr-1" />
                Import File
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

        {/* Floating Action Button (FAB) */}
        <Link
          to="/collection/add"
          aria-label="Add new boardgame"
          className="fixed right-5 bottom-20 lg:bottom-8 z-30 w-14 h-14 rounded-2xl bg-[image:var(--gradient-hero)] text-[var(--text-primary)] shadow-xl shadow-[var(--accent-glow)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
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
