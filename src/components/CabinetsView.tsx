import React, { useState, useMemo } from 'react';
import { BoardGame } from '../types/boardgame';
import { GameBoxCard } from './GameBoxCard';
import {
  ShieldCheck,
  AlertTriangle,
  Search,
  Filter,
  Columns,
  Grid3X3,
  BookOpen,
  DollarSign,
  Layers,
  Sparkles,
  Plus,
  RefreshCw,
} from 'lucide-react';

interface CabinetsViewProps {
  games: BoardGame[];
  onSelectGame: (game: BoardGame) => void;
  onToggleCabinet: (game: BoardGame, e: React.MouseEvent) => void;
  onOpenAddModal: (cabinetType?: 'real' | 'fake') => void;
  onOpenSyncModal: () => void;
  onEnrichBgg?: () => void;
  isEnrichingBgg?: boolean;
  isDemoData?: boolean;
}

export const CabinetsView: React.FC<CabinetsViewProps> = ({
  games,
  onSelectGame,
  onToggleCabinet,
  onOpenAddModal,
  onOpenSyncModal,
  onEnrichBgg,
  isEnrichingBgg,
  isDemoData,
}) => {
  const [cabinetFocus, setCabinetFocus] = useState<'both' | 'real' | 'fake'>('both');
  const [viewMode, setViewMode] = useState<'front' | 'spine'>('front');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [playerFilter, setPlayerFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'base' | 'expansion'>('all');

  // Filter games based on search & filters
  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const matchSearch =
        game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (game.vietnameseName && game.vietnameseName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        game.publisher.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (game.authenticityNotes && game.authenticityNotes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory =
        selectedCategory === 'all' ||
        game.category.toLowerCase().includes(selectedCategory.toLowerCase());

      const matchPlayers =
        playerFilter === 'all' ||
        (playerFilter === '2' && game.minPlayers <= 2 && game.maxPlayers >= 2) ||
        (playerFilter === '4' && game.maxPlayers >= 4) ||
        (playerFilter === '6+' && game.maxPlayers >= 6);

      const matchType =
        typeFilter === 'all' ||
        (typeFilter === 'expansion' ? game.gameType === 'Expansion' : game.gameType !== 'Expansion');

      return matchSearch && matchCategory && matchPlayers && matchType;
    });
  }, [games, searchQuery, selectedCategory, playerFilter, typeFilter]);

  const realGames = useMemo(
    () => filteredGames.filter((g) => g.cabinetType === 'real'),
    [filteredGames]
  );
  const fakeGames = useMemo(
    () => filteredGames.filter((g) => g.cabinetType === 'fake'),
    [filteredGames]
  );

  // Sort games so that OOS games are always placed at the bottom/end of the shelves
  const sortedRealGames = useMemo(() => {
    const onHand = realGames.filter((g) => g.status !== 'OOS');
    const oos = realGames.filter((g) => g.status === 'OOS');
    return [...onHand, ...oos];
  }, [realGames]);

  const sortedFakeGames = useMemo(() => {
    const onHand = fakeGames.filter((g) => g.status !== 'OOS');
    const oos = fakeGames.filter((g) => g.status === 'OOS');
    return [...onHand, ...oos];
  }, [fakeGames]);

  // Group into shelf rows
  const chunkIntoShelves = (list: BoardGame[], size: number) => {
    const chunks: BoardGame[][] = [];
    for (let i = 0; i < list.length; i += size) {
      chunks.push(list.slice(i, i + size));
    }
    return chunks;
  };

  const isBothCabinets = cabinetFocus === 'both';
  const shelfColumns = isBothCabinets
    ? 'grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3 md:gap-4'
    : 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4';
  const gamesPerRow = viewMode === 'spine' ? 8 : isBothCabinets ? 2 : 4;
  const realShelves = chunkIntoShelves(sortedRealGames, gamesPerRow);
  const fakeShelves = chunkIntoShelves(sortedFakeGames, gamesPerRow);

  // Statistics
  const realTotalValue = useMemo(
    () => realGames.reduce((acc, g) => acc + g.price, 0),
    [realGames]
  );
  const fakeTotalValue = useMemo(
    () => fakeGames.reduce((acc, g) => acc + g.price, 0),
    [fakeGames]
  );

  const formatCurrency = (price: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
      .format(price)
      .replace('VND', '₫');
  };

  const categories = useMemo(() => {
    const cats = new Set<string>();
    games.forEach((g) => {
      g.category.split('/').forEach((c) => cats.add(c.trim()));
    });
    return Array.from(cats);
  }, [games]);

  return (
    <div className="space-y-6">
      {/* Demo Data Banner when not connected to user's real sheet */}
      {isDemoData && (
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-slate-900 border border-amber-500/30 rounded-xl p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                  Sample Collection (Demo)
                </span>
                <h4 className="text-sm font-bold text-white">Displaying sample board game catalog</h4>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                To load your live collection from Google Sheet (tab <strong>"Boardgame Collection"</strong>), click below to paste your sheet link or sign in with Google Drive.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenSyncModal}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold rounded-lg shadow-md transition-all shrink-0 flex items-center gap-2 hover:scale-[1.02] active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Connect Your Google Sheet</span>
          </button>
        </div>
      )}

      {/* Control Bar & Filter Strip */}
      <div className="bg-[#12161f] border border-slate-800/80 rounded-xl p-4 shadow-lg flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 md:gap-4">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, publisher, category, counterfeit signs..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/80 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Players filter */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-lg p-1 text-xs">
            <span className="text-slate-400 px-2">Players:</span>
            {(['all', '2', '4', '6+'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setPlayerFilter(opt)}
                className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                  playerFilter === opt
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt === 'all' ? 'All' : opt === '6+' ? '6+ Players' : `${opt} Players`}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Categories ({games.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Base Game vs Expansion Filter */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-lg p-1 text-xs">
            <span className="text-slate-400 px-2 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Type:</span>
            </span>
            {(['all', 'base', 'expansion'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setTypeFilter(opt)}
                className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                  typeFilter === opt
                    ? 'bg-purple-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt === 'all' ? 'All' : opt === 'base' ? 'Base Game' : 'Expansions'}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Cabinet Focus & View Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View mode (Front box vs Spine view) */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-1 text-xs">
            <button
              onClick={() => setViewMode('front')}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                viewMode === 'front'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Inspect 3D front box covers"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>Box Art</span>
            </button>
            <button
              onClick={() => setViewMode('spine')}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                viewMode === 'spine'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Shelf spine view (Kallax library style)"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Spines</span>
            </button>
          </div>

          {/* Cabinet Focus Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-1 text-xs">
            <button
              onClick={() => setCabinetFocus('both')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                cabinetFocus === 'both'
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dual
            </button>
            <button
              onClick={() => setCabinetFocus('real')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                cabinetFocus === 'real'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Authentic ({realGames.length})
            </button>
            <button
              onClick={() => setCabinetFocus('fake')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                cabinetFocus === 'fake'
                  ? 'bg-rose-700 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Counterfeits ({fakeGames.length})
            </button>
          </div>

          {/* BGG Auto-Enrich Button */}
          {onEnrichBgg && (
            <button
              onClick={onEnrichBgg}
              disabled={isEnrichingBgg}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50 whitespace-nowrap"
              title="Automatically find official retail box art & BGG ratings for all games"
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${isEnrichingBgg ? 'animate-spin' : ''}`} />
              <span>{isEnrichingBgg ? 'Fetching BGG...' : 'Enrich Box Art & BGG'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Cabinets Container */}
      <div
        className={`grid gap-6 transition-all ${
          cabinetFocus === 'both'
            ? 'grid-cols-1 xl:grid-cols-2'
            : 'grid-cols-1'
        }`}
      >
        {/* ======================= REAL COLLECTION ======================= */}
        {(cabinetFocus === 'both' || cabinetFocus === 'real') && (
          <div className="rounded-2xl overflow-hidden border border-amber-600/30 bg-[#16120e] shadow-2xl flex flex-col relative">
            {/* Top Cabinet Header with Rich Walnut & Brass Look */}
            <div className="bg-gradient-to-r from-[#29160d] via-[#3d1f11] to-[#29160d] border-b border-amber-600/30 p-4 md:p-5 relative overflow-hidden">
              <div className="absolute top-0 left-1/4 right-1/4 h-12 bg-gradient-to-b from-amber-400/10 to-transparent blur-md pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center shadow-inner text-amber-300">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg md:text-xl font-bold text-amber-100 font-display tracking-wide">
                        Real Collection
                      </h2>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {realGames.filter((g) => g.status !== 'OOS').length} On Hand
                        </span>
                        {realGames.filter((g) => g.status === 'OOS').length > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {realGames.filter((g) => g.status === 'OOS').length} OOS
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <div className="bg-black/30 border border-amber-500/20 rounded-lg px-3 py-1.5">
                    <p className="text-[10px] text-amber-300/80 uppercase tracking-wider">
                      Total Valuation
                    </p>
                    <p className="text-sm md:text-base font-bold text-amber-400 font-mono tabular-nums">
                      {formatCurrency(realTotalValue)}
                    </p>
                  </div>
                  <button
                    onClick={() => onOpenAddModal('real')}
                    className="p-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors"
                    title="Add game to Real Collection"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Cabinet Interior: Backboard + Realistic Shelves */}
            <div
              className={`p-4 md:p-6 flex-1 flex flex-col justify-start bg-gradient-to-b from-[#18110b] to-[#0f0b07] relative ${
                viewMode === 'spine' ? 'min-h-[380px]' : 'min-h-[500px]'
              }`}
            >
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, #000 0px, #000 1px, transparent 1px, transparent 120px)',
                }}
              />

              {realGames.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
                  <ShieldCheck className="w-12 h-12 text-amber-500/40 mb-3" />
                  <p className="text-sm font-semibold text-amber-200">
                    No board games in Real Collection yet
                  </p>
                  <p className="text-xs text-amber-400/60 mt-1 max-w-sm">
                    Add new titles or sync your live collection from Google Sheet to fill your shelves!
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={() => onOpenAddModal('real')}
                      className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-colors"
                    >
                      + Add to Real Collection
                    </button>
                    <button
                      onClick={onOpenSyncModal}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      Sync Sheet
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 relative z-10">
                  {realShelves.map((shelf, sIdx) => (
                    <div key={`real-shelf-${sIdx}`} className="flex flex-col">
                      <div
                        className={
                          viewMode === 'spine'
                            ? 'px-3 pb-1 flex items-end gap-1.5 overflow-x-auto justify-start py-2'
                            : `px-3 pb-1 ${shelfColumns}`
                        }
                      >
                        {shelf.map((game) => (
                          <GameBoxCard
                            key={game.id}
                            game={game}
                            viewMode={viewMode}
                            onSelect={onSelectGame}
                            onToggleCabinet={onToggleCabinet}
                          />
                        ))}
                      </div>

                      {/* Physical Wooden Shelf Plank & Shadow */}
                      <div className="relative mt-1">
                        <div className="h-4 shelf-wood-real rounded-sm" />
                        <div className="h-2.5 shelf-lip-real" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="h-4 bg-[#140b06] border-t border-amber-900/40" />
          </div>
        )}

        {/* ======================= REPLICAS & FAKE ======================= */}
        {(cabinetFocus === 'both' || cabinetFocus === 'fake') && (
          <div className="rounded-2xl overflow-hidden border border-rose-800/40 bg-[#121214] shadow-2xl flex flex-col relative">
            {/* Top Cabinet Header */}
            <div className="bg-gradient-to-r from-[#201517] via-[#2d1b1f] to-[#201517] border-b border-rose-700/40 p-4 md:p-5 relative overflow-hidden">
              <div
                className="absolute top-0 left-0 right-0 h-1 opacity-70"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, #e11d48, #e11d48 10px, #18181b 10px, #18181b 20px)',
                }}
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center shadow-inner text-rose-300">
                    <AlertTriangle className="w-6 h-6 text-rose-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg md:text-xl font-bold text-rose-100 font-display tracking-wide">
                        Replicas & Fake
                      </h2>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold">
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {fakeGames.filter((g) => g.status !== 'OOS').length} On Hand
                        </span>
                        {fakeGames.filter((g) => g.status === 'OOS').length > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {fakeGames.filter((g) => g.status === 'OOS').length} OOS
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <div className="bg-black/40 border border-rose-500/20 rounded-lg px-3 py-1.5">
                    <p className="text-[10px] text-rose-300/80 uppercase tracking-wider">
                      Total Cost Spent
                    </p>
                    <p className="text-sm md:text-base font-bold text-rose-400 font-mono tabular-nums">
                      {formatCurrency(fakeTotalValue)}
                    </p>
                  </div>
                  <button
                    onClick={() => onOpenAddModal('fake')}
                    className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors"
                    title="Add game to Replicas & Fake"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Cabinet Interior */}
            <div
              className={`p-4 md:p-6 flex-1 flex flex-col justify-start bg-gradient-to-b from-[#141416] to-[#0a0a0c] relative ${
                viewMode === 'spine' ? 'min-h-[380px]' : 'min-h-[500px]'
              }`}
            >
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, #000 0px, #000 1px, transparent 1px, transparent 80px)',
                }}
              />

              {fakeGames.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
                  <AlertTriangle className="w-12 h-12 text-rose-500/40 mb-3" />
                  <p className="text-sm font-semibold text-rose-200">
                    No board games in Replicas & Fake yet
                  </p>
                  <p className="text-xs text-rose-400/60 mt-1 max-w-sm">
                    This cabinet is reserved for counterfeit copies, bootlegs, or reference duplicates!
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={() => onOpenAddModal('fake')}
                      className="px-3 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-500 transition-colors"
                    >
                      + Add to Replicas & Fake
                    </button>
                    <button
                      onClick={onOpenSyncModal}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      Sync Sheet
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 relative z-10">
                  {fakeShelves.map((shelf, sIdx) => (
                    <div key={`fake-shelf-${sIdx}`} className="flex flex-col">
                      <div
                        className={
                          viewMode === 'spine'
                            ? 'px-3 pb-1 flex items-end gap-1.5 overflow-x-auto justify-start py-2'
                            : `px-3 pb-1 ${shelfColumns}`
                        }
                      >
                        {shelf.map((game) => (
                          <GameBoxCard
                            key={game.id}
                            game={game}
                            viewMode={viewMode}
                            onSelect={onSelectGame}
                            onToggleCabinet={onToggleCabinet}
                          />
                        ))}
                      </div>

                      {/* Physical Industrial Shelf Plank & Shadow */}
                      <div className="relative mt-1">
                        <div className="h-4 shelf-wood-fake rounded-sm" />
                        <div className="h-2.5 shelf-lip-fake" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="h-4 bg-[#09090b] border-t border-zinc-800/60" />
          </div>
        )}
      </div>
    </div>
  );
};
