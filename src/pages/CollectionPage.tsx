import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  LayoutGrid,
  List,
  Plus,
  ArrowUpDown,
} from 'lucide-react';
import { PageTransition } from '../components/layout/PageTransition';
import { GameGrid } from '../components/game/GameGrid';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { cn } from '../components/ui/cn';
import { useGameStore } from '../store/useGameStore';
import { useSessionStore } from '../store/useSessionStore';
import { GameStatus } from '../types';

type FilterTab = 'all' | GameStatus;
type SortOption = 'name' | 'addedDate' | 'bggRating' | 'purchasePrice';

const FILTER_TABS: Array<{ id: FilterTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'own', label: 'Own' },
  { id: 'lent_out', label: 'Lent Out' },
  { id: 'borrowed', label: 'Borrowed' },
  { id: 'sold', label: 'Sold' },
  { id: 'wishlist', label: 'Wishlist' },
  { id: 'previously_owned', label: 'Previously Owned' },
];

export const CollectionPage: React.FC = () => {
  const games = useGameStore((s) => s.games);
  const sessions = useSessionStore((s) => s.sessions);

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('addedDate');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
              My Game Collection
            </h1>
            <p className="text-sm text-[#94a3b8] tabular-nums">
              Showing {filteredGames.length} of {games.length} boardgames
            </p>
          </div>

          <Link to="/collection/add">
            <Button variant="primary">
              <Plus className="w-4 h-4" />
              Add Game
            </Button>
          </Link>
        </div>

        {/* Status Filter Bar */}
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
                onClick={() => setActiveFilter(tab.id)}
                className={cn(
                  'min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2 border',
                  isActive
                    ? 'bg-[image:var(--gradient-hero)] text-white border-white/20 shadow-md shadow-[#7c3aed]/25'
                    : 'bg-[#16162a] text-[#94a3b8] border-white/[0.08] hover:text-white hover:border-white/20'
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'font-mono text-[11px] tabular-nums',
                    isActive ? 'text-white/90' : 'text-[#475569]'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search + Sort + View Mode Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search games by title or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
              aria-label="Search games by name"
            />
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="relative flex items-center">
              <ArrowUpDown className="w-4 h-4 text-[#94a3b8] absolute left-3 pointer-events-none" />
              <select
                aria-label="Sort games by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="min-h-[44px] pl-9 pr-8 py-2 rounded-xl bg-[#16162a] border border-white/10 text-xs sm:text-sm font-semibold text-[#f1f5f9] focus:outline-none focus:border-[#7c3aed] cursor-pointer"
              >
                <option value="addedDate">Sort: Date Added</option>
                <option value="name">Sort: Name A–Z</option>
                <option value="bggRating">Sort: BGG Rating</option>
                <option value="purchasePrice">Sort: Purchase Price</option>
              </select>
            </div>

            <div className="inline-flex rounded-xl bg-[#16162a] p-1 border border-white/10">
              <button
                type="button"
                aria-label="Grid view"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'min-h-[36px] min-w-[36px] rounded-lg flex items-center justify-center transition-colors cursor-pointer',
                  viewMode === 'grid'
                    ? 'bg-[#7c3aed] text-white'
                    : 'text-[#94a3b8] hover:text-white'
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="List view"
                onClick={() => setViewMode('list')}
                className={cn(
                  'min-h-[36px] min-w-[36px] rounded-lg flex items-center justify-center transition-colors cursor-pointer',
                  viewMode === 'list'
                    ? 'bg-[#7c3aed] text-white'
                    : 'text-[#94a3b8] hover:text-white'
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Game Grid or Empty State */}
        {filteredGames.length > 0 ? (
          <GameGrid
            games={filteredGames}
            playCountsByGameId={playCountsByGameId}
            viewMode={viewMode}
          />
        ) : (
          <div className="py-16 px-4 text-center rounded-3xl bg-[#16162a]/70 border border-white/[0.08] max-w-lg mx-auto space-y-4">
            <svg
              className="w-24 h-24 mx-auto"
              viewBox="0 0 120 120"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="18"
                y="24"
                width="84"
                height="72"
                rx="16"
                fill="#1e1e35"
                stroke="#7c3aed"
                strokeWidth="3"
              />
              <circle cx="44" cy="48" r="5" fill="#a78bfa" />
              <circle cx="60" cy="60" r="5" fill="#22d3ee" />
              <circle cx="76" cy="72" r="5" fill="#ec4899" />
            </svg>
            <div className="space-y-1">
              <h2 className="font-display font-bold text-xl text-white">
                No Boardgames Found
              </h2>
              <p className="text-sm text-[#94a3b8]">
                {searchQuery || activeFilter !== 'all'
                  ? 'Try clearing your active filter or searching for another title.'
                  : 'Your shelf is empty! Add your first boardgame from BoardGameGeek or manually.'}
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
          className="fixed right-5 bottom-20 lg:bottom-8 z-30 w-14 h-14 rounded-2xl bg-[image:var(--gradient-hero)] text-white shadow-xl shadow-[#7c3aed]/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </Link>
      </div>
    </PageTransition>
  );
};

export default CollectionPage;
