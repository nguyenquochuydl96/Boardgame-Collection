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
}

export const CabinetsView: React.FC<CabinetsViewProps> = ({
  games,
  onSelectGame,
  onToggleCabinet,
  onOpenAddModal,
  onOpenSyncModal,
}) => {
  const [cabinetFocus, setCabinetFocus] = useState<'both' | 'real' | 'fake'>('both');
  const [viewMode, setViewMode] = useState<'front' | 'spine'>('front');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [playerFilter, setPlayerFilter] = useState<string>('all');

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

      return matchSearch && matchCategory && matchPlayers;
    });
  }, [games, searchQuery, selectedCategory, playerFilter]);

  const realGames = useMemo(
    () => filteredGames.filter((g) => g.cabinetType === 'real'),
    [filteredGames]
  );
  const fakeGames = useMemo(
    () => filteredGames.filter((g) => g.cabinetType === 'fake'),
    [filteredGames]
  );

  // Group into shelf rows
  const chunkIntoShelves = (list: BoardGame[], size: number) => {
    const chunks: BoardGame[][] = [];
    for (let i = 0; i < list.length; i += size) {
      chunks.push(list.slice(i, i + size));
    }
    return chunks;
  };

  // Lưới Front: 2 tủ song song => mỗi tủ chỉ rộng ~nửa trang nên xếp 2 hộp/dòng;
  // mở riêng 1 tủ (full width) thì xếp 3-4 hộp/dòng. Giữ số hộp mỗi "kệ" khớp số cột
  // để hộp không bị bẻ dòng lệch khỏi tấm ván kệ bên dưới.
  const isBothCabinets = cabinetFocus === 'both';
  const shelfColumns = isBothCabinets
    ? 'grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3 md:gap-4'
    : 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4';
  const gamesPerRow = viewMode === 'spine' ? 8 : isBothCabinets ? 2 : 4;
  const realShelves = chunkIntoShelves(realGames, gamesPerRow);
  const fakeShelves = chunkIntoShelves(fakeGames, gamesPerRow);

  // Statistics
  const realTotalValue = useMemo(
    () => realGames.reduce((acc, g) => acc + g.price, 0),
    [realGames]
  );
  const fakeTotalValue = useMemo(
    () => fakeGames.reduce((acc, g) => acc + g.price, 0),
    [fakeGames]
  );

  const formatVnd = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
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
      {/* Control Bar & Filter Strip */}
      <div className="bg-[#12161f] border border-slate-800/80 rounded-xl p-4 shadow-lg flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 md:gap-4">
        {/* Left: Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tên game, NXB, dấu hiệu fake..."
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

        {/* Center: Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Players filter */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-lg p-1 text-xs">
            <span className="text-slate-400 px-2">Số người:</span>
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
                {opt === 'all' ? 'Tất cả' : opt === '6+' ? '6+ người' : `${opt} người`}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">Mọi thể loại ({games.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
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
              title="Xem 3D mặt trước hộp game"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>Mặt Hộp</span>
            </button>
            <button
              onClick={() => setViewMode('spine')}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                viewMode === 'spine'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Xếp gáy hộp game đứng như trên kệ sách"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Gáy Kệ</span>
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
              Song Song
            </button>
            <button
              onClick={() => setCabinetFocus('real')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                cabinetFocus === 'real'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tủ Real ({realGames.length})
            </button>
            <button
              onClick={() => setCabinetFocus('fake')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                cabinetFocus === 'fake'
                  ? 'bg-rose-700 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tủ Fake ({fakeGames.length})
            </button>
          </div>
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
        {/* ======================= TỦ GAME REAL ======================= */}
        {(cabinetFocus === 'both' || cabinetFocus === 'real') && (
          <div className="rounded-2xl overflow-hidden border border-amber-600/30 bg-[#16120e] shadow-2xl flex flex-col relative">
            {/* Top Cabinet Header with Rich Walnut & Brass Look */}
            <div className="bg-gradient-to-r from-[#29160d] via-[#3d1f11] to-[#29160d] border-b border-amber-600/30 p-4 md:p-5 relative overflow-hidden">
              {/* Subtle top spotlight beam */}
              <div className="absolute top-0 left-1/4 right-1/4 h-12 bg-gradient-to-b from-amber-400/10 to-transparent blur-md pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center shadow-inner text-amber-300">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg md:text-xl font-bold text-amber-100 font-display tracking-wide">
                        Phòng Trưng Bày Bản Quyền (Authentics)
                      </h2>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {realGames.length} Tựa Game
                      </span>
                    </div>
                    <p className="text-xs text-amber-300/80 mt-0.5">
                      Bộ sưu tập chính hãng NXB · First Edition & Collector's Grade · Bảo tồn trọn vẹn
                    </p>
                  </div>
                </div>

                {/* Right stats in cabinet header */}
                <div className="flex items-center gap-3 text-right">
                  <div className="bg-black/30 border border-amber-500/20 rounded-lg px-3 py-1.5">
                    <p className="text-[10px] text-amber-300/80 uppercase tracking-wider">
                      Tổng Giá Trị
                    </p>
                    <p className="text-sm md:text-base font-bold text-amber-400 font-mono tabular-nums">
                      {formatVnd(realTotalValue)}
                    </p>
                  </div>
                  <button
                    onClick={() => onOpenAddModal('real')}
                    className="p-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors"
                    title="Thêm game vào Tủ Real"
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
              {/* Backboard vertical panel lines */}
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
                    Chưa có boardgame nào trong Tủ Real
                  </p>
                  <p className="text-xs text-amber-400/60 mt-1 max-w-sm">
                    Hãy thêm game mới hoặc đồng bộ danh sách từ Google Sheet để lấp đầy kệ!
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={() => onOpenAddModal('real')}
                      className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-colors"
                    >
                      + Thêm Game Real
                    </button>
                    <button
                      onClick={onOpenSyncModal}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      Đồng Bộ Sheet
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 relative z-10">
                  {realShelves.map((shelf, sIdx) => (
                    <div key={`real-shelf-${sIdx}`} className="flex flex-col">
                      {/* Shelf Items (Boxes sitting on top of shelf plank) */}
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

            {/* Cabinet Bottom Plinth */}
            <div className="h-4 bg-[#140b06] border-t border-amber-900/40" />
          </div>
        )}

        {/* ======================= TỦ GAME FAKE ======================= */}
        {(cabinetFocus === 'both' || cabinetFocus === 'fake') && (
          <div className="rounded-2xl overflow-hidden border border-rose-800/40 bg-[#121214] shadow-2xl flex flex-col relative">
            {/* Top Cabinet Header with Distressed Industrial & Warning Look */}
            <div className="bg-gradient-to-r from-[#201517] via-[#2d1b1f] to-[#201517] border-b border-rose-700/40 p-4 md:p-5 relative overflow-hidden">
              {/* Subtle caution stripe bar */}
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
                        Kệ Lưu Trữ Đối Chứng (Replicas & Fakes)
                      </h2>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {fakeGames.length} Mẫu Lưu
                      </span>
                    </div>
                    <p className="text-xs text-rose-300/80 mt-0.5">
                      Bản reprint, in lậu F1 & mẫu đối chiếu chất lượng phục vụ thẩm định
                    </p>
                  </div>
                </div>

                {/* Right stats in cabinet header */}
                <div className="flex items-center gap-3 text-right">
                  <div className="bg-black/40 border border-rose-500/20 rounded-lg px-3 py-1.5">
                    <p className="text-[10px] text-rose-300/80 uppercase tracking-wider">
                      Tổng Chi Phí Mua
                    </p>
                    <p className="text-sm md:text-base font-bold text-rose-400 font-mono tabular-nums">
                      {formatVnd(fakeTotalValue)}
                    </p>
                  </div>
                  <button
                    onClick={() => onOpenAddModal('fake')}
                    className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors"
                    title="Thêm game vào Tủ Fake"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Cabinet Interior: Dark Distressed Backboard + Steel/Cedar Shelves */}
            <div
              className={`p-4 md:p-6 flex-1 flex flex-col justify-start bg-gradient-to-b from-[#141416] to-[#0a0a0c] relative ${
                viewMode === 'spine' ? 'min-h-[380px]' : 'min-h-[500px]'
              }`}
            >
              {/* Backboard industrial pattern */}
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
                    Chưa có boardgame nào trong Tủ Fake
                  </p>
                  <p className="text-xs text-rose-400/60 mt-1 max-w-sm">
                    Tủ này dành cho các bộ game in nhái, hàng F1 hoặc bản đối chứng để cảnh báo người chơi!
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={() => onOpenAddModal('fake')}
                      className="px-3 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-500 transition-colors"
                    >
                      + Thêm Game Fake
                    </button>
                    <button
                      onClick={onOpenSyncModal}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      Đồng Bộ Sheet
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 relative z-10">
                  {fakeShelves.map((shelf, sIdx) => (
                    <div key={`fake-shelf-${sIdx}`} className="flex flex-col">
                      {/* Shelf Items */}
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

            {/* Cabinet Bottom Plinth */}
            <div className="h-4 bg-[#09090b] border-t border-zinc-800/60" />
          </div>
        )}
      </div>
    </div>
  );
};
