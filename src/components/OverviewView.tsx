import React, { useState, useMemo } from 'react';
import { BoardGame } from '../types/boardgame';
import {
  ShieldCheck,
  AlertTriangle,
  Search,
  SlidersHorizontal,
  Star,
  Clock,
  Users,
  Layers,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Bell,
  Sheet,
  Plus,
  Flame,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';
import { User } from 'firebase/auth';

interface OverviewViewProps {
  games: BoardGame[];
  onSelectGame: (game: BoardGame) => void;
  onOpenCabinets: (cabinetFocus?: 'both' | 'real' | 'fake') => void;
  onOpenAddModal: (cabinetType?: 'real' | 'fake') => void;
  onOpenSyncModal: () => void;
  currentUser?: User | null;
  onSignInWithGoogle?: () => Promise<void>;
  sheetConnected: boolean;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  games,
  onSelectGame,
  onOpenCabinets,
  onOpenAddModal,
  onOpenSyncModal,
  currentUser,
  onSignInWithGoogle,
  sheetConnected,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [showNotificationList, setShowNotificationList] = useState(false);

  // Filter games based on search and selected tag
  const filteredGames = useMemo(() => {
    return games.filter((g) => {
      const matchSearch =
        !searchQuery ||
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.vietnameseName && g.vietnameseName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        g.publisher.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchTag =
        selectedTag === 'all' ||
        (selectedTag === 'real' && g.cabinetType === 'real') ||
        (selectedTag === 'fake' && g.cabinetType === 'fake') ||
        (selectedTag === 'strategy' && (g.category.toLowerCase().includes('strategy') || g.category.toLowerCase().includes('economic') || g.category.toLowerCase().includes('worker'))) ||
        (selectedTag === 'party' && (g.category.toLowerCase().includes('deduction') || g.category.toLowerCase().includes('bluffing') || g.category.toLowerCase().includes('party'))) ||
        (selectedTag === 'coop' && g.category.toLowerCase().includes('coop')) ||
        (selectedTag === 'expansion' && g.gameType === 'Expansion');

      return matchSearch && matchTag;
    });
  }, [games, searchQuery, selectedTag]);

  // Real & Fake partition
  const realGames = useMemo(() => games.filter((g) => g.cabinetType === 'real'), [games]);
  const fakeGames = useMemo(() => games.filter((g) => g.cabinetType === 'fake'), [games]);

  const realOnHand = useMemo(() => realGames.filter((g) => (g.status || 'On Hand') === 'On Hand'), [realGames]);
  const realOOS = useMemo(() => realGames.filter((g) => g.status === 'OOS'), [realGames]);
  const fakeOnHand = useMemo(() => fakeGames.filter((g) => (g.status || 'On Hand') === 'On Hand'), [fakeGames]);

  // Valuation
  const realTotalValuation = useMemo(() => {
    return realOnHand.reduce((sum, g) => sum + (g.price || 0), 0);
  }, [realOnHand]);

  const fakeTotalCost = useMemo(() => {
    return fakeOnHand.reduce((sum, g) => sum + (g.price || 0), 0);
  }, [fakeOnHand]);

  // Top rated games (Call of Duty / PUBG style cards)
  const topGames = useMemo(() => {
    return [...games]
      .filter((g) => (g.status || 'On Hand') === 'On Hand')
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 6);
  }, [games]);

  // Recent / Popular additions for "My Games"
  const myGamesList = useMemo(() => {
    return [...games].slice(0, 4);
  }, [games]);

  const tags = [
    { id: 'all', label: 'All Games' },
    { id: 'real', label: `Real Vault (${realGames.length})` },
    { id: 'fake', label: `Replicas & Fake (${fakeGames.length})` },
    { id: 'strategy', label: 'Strategy' },
    { id: 'party', label: 'Social & Party' },
    { id: 'coop', label: 'Cooperative' },
    { id: 'expansion', label: 'Expansions' },
  ];

  return (
    <div className="space-y-8 pb-20 animate-fade-in max-w-7xl mx-auto">
      {/* 1. Header Profile & Status Ribbon (Rahul Sniper / Gamer Header Style) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
        {/* User Badge */}
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-13 h-13 rounded-full overflow-hidden border-2 border-[#1E3E66] shadow-lg shadow-black/40 bg-[#0E233C] flex items-center justify-center">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1A385C] to-[#0A1B2F] flex items-center justify-center text-white font-bold text-lg">
                  🎯
                </div>
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#071526]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
                {currentUser?.displayName || 'BoardGame Vault'}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#142C4C] text-[#8EADC8] border border-[#1F3F66]">
                Collector
              </span>
            </div>
            <p className="text-xs text-[#FF6B00] font-semibold flex items-center gap-1.5 mt-0.5">
              <span>⚡ Level: 80</span>
              <span className="text-[#4A6B8A]">·</span>
              <span className="text-[#8EADC8]">{games.length} Board Games Sourced</span>
            </p>
          </div>
        </div>

        {/* Right Actions: Notification Bell + Quick Actions */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotificationList(!showNotificationList)}
              className="w-11 h-11 rounded-full bg-[#0E233C] hover:bg-[#153252] border border-[#1B3B63] flex items-center justify-center text-[#8EADC8] hover:text-white transition-all shadow-md relative"
              title="Thông báo bộ sưu tập"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-[#FF6B00] ring-2 ring-[#071526] animate-pulse" />
            </button>

            {/* Notification Dropdown */}
            {showNotificationList && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#09182A] border border-[#193A5E] shadow-2xl p-4 z-50 animate-scale-in">
                <div className="flex items-center justify-between pb-3 border-b border-[#163354]">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#FF6B00]" />
                    <span>Cập Nhật Mới Nhất</span>
                  </h3>
                  <span className="text-[11px] text-[#FF6B00] font-semibold">Tất cả</span>
                </div>
                <div className="space-y-3 pt-3 text-xs">
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-[#0E233C]/80">
                    <div className="w-2 h-2 rounded-full bg-[#FF6B00] mt-1.5 shrink-0" />
                    <div>
                      <p className="text-white font-medium">Ảnh chuẩn Secret Hitler đã cập nhật</p>
                      <p className="text-[#8EADC8] text-[11px]">Đã thay thế bản PnP bằng ảnh bìa bán lẻ chuẩn BGG.</p>
                      <span className="text-[10px] text-[#4E7094] mt-1 block">Vừa xong</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-[#0E233C]/80">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-white font-medium">Đồng bộ 11 game OOS từ Google Sheet</p>
                      <p className="text-[#8EADC8] text-[11px]">Định giá kệ Real chỉ tính 17 game On Hand (19.880.000 ₫).</p>
                      <span className="text-[10px] text-[#4E7094] mt-1 block">Hôm nay</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Add Game Button */}
          <button
            onClick={() => onOpenAddModal('real')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#FF6B00] hover:bg-[#FF7A1A] text-white text-xs font-bold shadow-lg shadow-[#FF6B00]/30 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Game</span>
          </button>
        </div>
      </div>

      {/* 2. Search Bar & Filter Sliders (Exact Mockup Style) */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4.5 w-5 h-5 text-[#8EADC8] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search games, publishers, categories..."
            className="w-full bg-[#091D33] hover:bg-[#0C243E] focus:bg-[#0E2845] border border-[#163558] focus:border-[#FF6B00] text-white placeholder-[#6080A2] text-sm rounded-full pl-12 pr-12 py-3.5 shadow-inner transition-all outline-none"
          />
          <button
            onClick={() => setSelectedTag('all')}
            className="absolute right-3.5 p-1.5 rounded-full hover:bg-[#163558] text-[#8EADC8] hover:text-[#FF6B00] transition-colors"
            title="Bộ lọc nâng cao"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 3. Horizontal Pill Categories (Active White Pill / Sleek Dark Pills) */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        {tags.map((tag) => {
          const isActive = selectedTag === tag.id;
          return (
            <button
              key={tag.id}
              onClick={() => setSelectedTag(tag.id)}
              className={`px-4.5 py-2.2 rounded-full font-semibold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? 'bg-white text-slate-950 shadow-md shadow-white/10 scale-105 font-bold'
                  : 'bg-[#0E233C] text-[#8EADC8] hover:text-white hover:bg-[#142F4F] border border-[#18395E]'
              }`}
            >
              {tag.label}
            </button>
          );
        })}
      </div>

      {/* 4. DUAL CABINETS GATEWAY CARDS (Chuyển nhanh sang View Chi Tiết 2 Kệ Game) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#FF6B00]" />
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white font-display">
              Bộ Kệ Game Sưu Tầm
            </h2>
          </div>
          <button
            onClick={() => onOpenCabinets('both')}
            className="text-xs font-bold text-[#FF6B00] hover:text-[#FF8C33] flex items-center gap-1 transition-colors hover:underline"
          >
            <span>Mở Trọn Vẹn 2 Kệ (3D Shelves)</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Card 1: Real Collection Cabinet */}
          <div className="relative rounded-3xl bg-gradient-to-br from-[#0C223A] via-[#091A2E] to-[#061424] border border-[#1A3F69] hover:border-emerald-500/60 p-5 sm:p-6 shadow-xl transition-all duration-300 group hover:-translate-y-1">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                    Real Collection
                  </h3>
                  <p className="text-xs text-[#8EADC8]">
                    Kệ Chính Hãng · {realOnHand.length} On Hand {realOOS.length > 0 && `· ${realOOS.length} OOS`}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                100% Genuine
              </span>
            </div>

            {/* Valuation & Preview */}
            <div className="mt-4 pt-4 border-t border-[#163558] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-[#8EADC8] uppercase tracking-wider block">
                  Tổng Giá Trị (On Hand)
                </span>
                <span className="text-xl sm:text-2xl font-black text-amber-400 font-display">
                  {realTotalValuation.toLocaleString('vi-VN')} ₫
                </span>
              </div>

              {/* Mini Box Cover Previews */}
              <div className="flex -space-x-3 items-center">
                {realOnHand.slice(0, 4).map((g) => (
                  <img
                    key={g.id}
                    src={g.imageUrl}
                    alt={g.name}
                    className="w-10 h-10 rounded-lg object-cover border-2 border-[#0C223A] shadow-md"
                    title={g.name}
                  />
                ))}
              </div>
            </div>

            {/* Direct CTA */}
            <button
              onClick={() => onOpenCabinets('real')}
              className="mt-5 w-full py-2.5 px-4 rounded-xl bg-[#122E4E] hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md group-hover:shadow-emerald-900/30"
            >
              <span>Xem Chi Tiết Kệ Real (17 Hộp)</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 2: Replicas & Fake Cabinet */}
          <div className="relative rounded-3xl bg-gradient-to-br from-[#0C223A] via-[#091A2E] to-[#061424] border border-[#1A3F69] hover:border-rose-500/60 p-5 sm:p-6 shadow-xl transition-all duration-300 group hover:-translate-y-1">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-rose-300 transition-colors">
                    Replicas & Fake
                  </h3>
                  <p className="text-xs text-[#8EADC8]">
                    Kệ Replicas · {fakeOnHand.length} On Hand · Giá Tiết Kiệm
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-400 text-xs font-bold border border-rose-500/30">
                Replica Vault
              </span>
            </div>

            {/* Valuation & Preview */}
            <div className="mt-4 pt-4 border-t border-[#163558] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-[#8EADC8] uppercase tracking-wider block">
                  Tổng Chi Phí Mua (On Hand)
                </span>
                <span className="text-xl sm:text-2xl font-black text-rose-400 font-display">
                  {fakeTotalCost.toLocaleString('vi-VN')} ₫
                </span>
              </div>

              {/* Mini Box Cover Previews */}
              <div className="flex -space-x-3 items-center">
                {fakeOnHand.slice(0, 4).map((g) => (
                  <img
                    key={g.id}
                    src={g.imageUrl}
                    alt={g.name}
                    className="w-10 h-10 rounded-lg object-cover border-2 border-[#0C223A] shadow-md"
                    title={g.name}
                  />
                ))}
              </div>
            </div>

            {/* Direct CTA */}
            <button
              onClick={() => onOpenCabinets('fake')}
              className="mt-5 w-full py-2.5 px-4 rounded-xl bg-[#122E4E] hover:bg-rose-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md group-hover:shadow-rose-900/30"
            >
              <span>Xem Chi Tiết Kệ Replicas (18 Hộp)</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. TOP GAMES (Call of Duty / PUBG Style Vertical Cards) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#FF6B00]" />
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white font-display">
              Top Games Sưu Tầm
            </h2>
          </div>
          <button
            onClick={() => onOpenCabinets('both')}
            className="text-xs font-bold text-[#FF6B00] hover:text-[#FF8C33] transition-colors hover:underline"
          >
            see more
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {topGames.map((game) => (
            <div
              key={game.id}
              onClick={() => onSelectGame(game)}
              className="group relative rounded-2xl overflow-hidden bg-[#0C223A] border border-[#163558] hover:border-[#FF6B00] shadow-lg transition-all duration-300 hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between"
            >
              {/* Box Cover Image */}
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-900">
                <img
                  src={game.imageUrl}
                  alt={game.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071526] via-transparent to-black/40" />

                {/* Rating Badge Top Left (Like 4.3 ★ in mockup) */}
                <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-amber-400/30 flex items-center gap-1 text-[11px] font-bold text-amber-400">
                  <span>{game.rating?.toFixed(1) || '7.5'}</span>
                  <Star className="w-3 h-3 fill-amber-400" />
                </div>

                {/* Real / Fake indicator */}
                <div className="absolute top-2.5 right-2.5">
                  {game.cabinetType === 'real' ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-black/60 block" title="Real Collection" />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400 ring-2 ring-black/60 block" title="Replicas & Fake" />
                  )}
                </div>
              </div>

              {/* Title & Info Bottom */}
              <div className="p-3 bg-[#091D33] space-y-1">
                <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[#FF6B00] transition-colors">
                  {game.name}
                </h4>
                <p className="text-[11px] text-[#8EADC8] truncate">
                  {game.category}
                </p>

                {/* White/Orange Action Pill (Like "Install" in mockup) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectGame(game);
                  }}
                  className="mt-2 w-full py-1.5 px-3 rounded-full bg-white hover:bg-[#FF6B00] text-slate-950 hover:text-white text-[11px] font-bold transition-all shadow-sm flex items-center justify-center gap-1"
                >
                  <span>Chi Tiết</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. TWO COLUMNS: DISPLAY PLAY TIME / VALUATION CHART & RECENT ACTIVITY (Mockup Right Phone) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Display Play Time & Analytics Sparkline */}
        <div className="rounded-3xl bg-[#091D33] border border-[#163558] p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white font-display">
                Display Play Time & Valuation
              </h3>
              <p className="text-xs text-[#8EADC8]">Tổng tài sản & hoạt động sưu tập</p>
            </div>
            <span className="text-xs text-[#8EADC8] bg-[#0E2642] px-3 py-1 rounded-full border border-[#1A3F69]">
              Last 7 Days
            </span>
          </div>

          {/* Glowing Curved Chart (Mockup Style with Pulsing Dot) */}
          <div className="relative pt-4 pb-2">
            <svg viewBox="0 0 500 160" className="w-full h-36 overflow-visible">
              <defs>
                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#FF6B00" stop-opacity="0.35" />
                  <stop offset="100%" stop-color="#FF6B00" stop-opacity="0.0" />
                </linearGradient>
                <linearGradient id="lineGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#FF3838" />
                  <stop offset="50%" stop-color="#FF6B00" />
                  <stop offset="100%" stop-color="#FFA133" />
                </linearGradient>
              </defs>

              {/* Background Area Fill */}
              <path
                d="M 10 120 Q 70 115, 120 125 T 220 85 T 320 35 T 400 65 T 490 55 L 490 150 L 10 150 Z"
                fill="url(#chartGradient)"
              />

              {/* Glowing Curved Line */}
              <path
                d="M 10 120 Q 70 115, 120 125 T 220 85 T 320 35 T 400 65 T 490 55"
                fill="none"
                stroke="url(#lineGlow)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Peak Indicator Dot (Pulse Dot in Mockup) */}
              <circle cx="320" cy="35" r="5" fill="#FFFFFF" stroke="#FF6B00" strokeWidth="3" />
              <line x1="320" y1="35" x2="320" y2="150" stroke="#FF6B00" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
            </svg>

            {/* Month labels */}
            <div className="flex justify-between text-[10px] text-[#6080A2] font-semibold pt-2 px-2 uppercase tracking-wider">
              <span>JAN</span>
              <span>FEB</span>
              <span>MAR</span>
              <span>APR</span>
              <span className="text-[#FF6B00] font-bold">MAY (PEAK)</span>
              <span>JUN</span>
              <span>JUL</span>
              <span>AUG</span>
            </div>
          </div>

          {/* 3 Metric Pills */}
          <div className="grid grid-cols-3 gap-2.5 pt-2">
            <div className="p-3 rounded-2xl bg-[#0C223A] border border-[#163558] text-center">
              <span className="text-[10px] text-[#8EADC8] uppercase block">On Hand</span>
              <span className="text-base font-bold text-emerald-400">35 Games</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#0C223A] border border-[#163558] text-center">
              <span className="text-[10px] text-[#8EADC8] uppercase block">Valuation</span>
              <span className="text-base font-bold text-amber-400">19.8M ₫</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#0C223A] border border-[#163558] text-center">
              <span className="text-[10px] text-[#8EADC8] uppercase block">Avg Rating</span>
              <span className="text-base font-bold text-white">7.6 ★</span>
            </div>
          </div>
        </div>

        {/* Right Column: Notifications & Recent Activity (Mockup Style) */}
        <div className="rounded-3xl bg-[#091D33] border border-[#163558] p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white font-display">
                Notification
              </h3>
            </div>
            <button
              onClick={() => onOpenSyncModal()}
              className="text-xs font-bold text-[#FF6B00] hover:text-[#FF8C33] transition-colors hover:underline flex items-center gap-1"
            >
              <span>see more</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Notification Item 1: Secret Hitler Box Cover Updated */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0C223A] border border-[#163558] hover:border-[#1E4570] transition-colors">
              <div className="flex items-center gap-3">
                <img
                  src="/images/boxes/secret-hitler.png"
                  alt="Secret Hitler"
                  className="w-11 h-11 rounded-xl object-cover border border-slate-700 shadow-sm"
                />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Secret Hitler Box Art</h4>
                  <p className="text-[11px] text-[#8EADC8]">OFFICIAL RETAIL COVER UPDATED...</p>
                </div>
              </div>
              <span className="text-[11px] text-[#6080A2] font-medium shrink-0">Just now</span>
            </div>

            {/* Notification Item 2: On Hand Valuation Sync */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0C223A] border border-[#163558] hover:border-[#1E4570] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs">
                  ₫
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Valuation Formula Synced</h4>
                  <p className="text-[11px] text-[#8EADC8]">STRICTLY SUMMED FOR ON HAND (19.88M ₫)</p>
                </div>
              </div>
              <span className="text-[11px] text-[#6080A2] font-medium shrink-0">1h ago</span>
            </div>

            {/* Notification Item 3: 11 Games Marked OOS */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0C223A] border border-[#163558] hover:border-[#1E4570] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold text-xs">
                  OOS
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">11 OOS Games Positioned</h4>
                  <p className="text-[11px] text-[#8EADC8]">FORT, KEEP THE HEROES OUT, MARVEL U...</p>
                </div>
              </div>
              <span className="text-[11px] text-[#6080A2] font-medium shrink-0">3h ago</span>
            </div>

            {/* Notification Item 4: Google Sheet Status */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0C223A] border border-[#163558] hover:border-[#1E4570] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Sheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Google Sheet Connected</h4>
                  <p className="text-[11px] text-[#8EADC8]">BOARDGAME COLLECTION SYNC ACTIVE</p>
                </div>
              </div>
              <span className="text-[11px] text-[#6080A2] font-medium shrink-0">Today</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
