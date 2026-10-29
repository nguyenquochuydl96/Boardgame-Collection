import React, { useState, useMemo } from 'react';
import { BoardGame, SleeveSpec, UpgradeItem } from '../types/boardgame';
import {
  calculateSleeveSummary,
  getGameSleeveSpecs,
  getGameUpgrades,
} from '../utils/sleeveCatalog';
import {
  X,
  Shield,
  Layers,
  ShoppingCart,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Search,
  Check,
  ExternalLink,
  Package,
  Coins,
  Box,
} from 'lucide-react';

interface SleeveManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  games: BoardGame[];
  onUpdateGameSleeves: (gameId: string, specs: SleeveSpec[]) => void;
  onSelectGame: (game: BoardGame) => void;
}

export const SleeveManagerModal: React.FC<SleeveManagerModalProps> = ({
  isOpen,
  onClose,
  games,
  onUpdateGameSleeves,
  onSelectGame,
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'shopping' | 'upgrades'>(() => {
    try {
      if (typeof window !== 'undefined') {
        if (window.location.search.includes('sleeve=shopping')) return 'shopping';
        if (window.location.search.includes('sleeve=upgrades')) return 'upgrades';
      }
    } catch {}
    return 'inventory';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'fully' | 'missing'>('all');
  const [copied, setCopied] = useState(false);

  // Calculate summary metrics
  const summary = useMemo(() => {
    return calculateSleeveSummary(games);
  }, [games]);

  // Aggregate all upgrades across games
  const allUpgrades = useMemo(() => {
    const list: { game: BoardGame; upgrade: UpgradeItem }[] = [];
    games.forEach((game) => {
      const ups = getGameUpgrades(game);
      ups.forEach((u) => list.push({ game, upgrade: u }));
    });
    return list;
  }, [games]);

  // Filtered games for Inventory tab
  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const matchSearch =
        !searchQuery ||
        (game.name && game.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (game.vietnameseName && game.vietnameseName.toLowerCase().includes(searchQuery.toLowerCase()));

      const specs = getGameSleeveSpecs(game);
      const total = specs.reduce((s, x) => s + x.cardCount, 0);
      const sleeved = specs.reduce((s, x) => s + x.sleevedCount, 0);
      const isFullySleeved = total > 0 && sleeved >= total;

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'fully' && isFullySleeved) ||
        (statusFilter === 'missing' && !isFullySleeved);

      return matchSearch && matchStatus;
    });
  }, [games, searchQuery, statusFilter]);

  // Copy shopping list to clipboard
  const handleCopyShoppingList = () => {
    if (summary.shoppingList.length === 0) return;
    const lines = [
      '📋 DANH SÁCH MUA SẮM BỌC BÀI (BOARDGAME VAULT)',
      '=============================================',
      `Tổng số thẻ cần bọc: ${summary.missingTotal} lá`,
      '',
      ...summary.shoppingList.map((item, idx) => {
        return `${idx + 1}. Size ${item.size}: Cần ${item.missingCards} lá (~${item.packsNeeded50} pack 50 lá)\n   Dành cho: ${item.gamesAffected.join(', ')}`;
      }),
      '',
      'Được trích xuất từ BoardGame Vault Collection Manager',
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Quick toggle all sleeved for a game
  const handleToggleFullSleeve = (game: BoardGame) => {
    const specs = getGameSleeveSpecs(game);
    const total = specs.reduce((s, x) => s + x.cardCount, 0);
    const sleeved = specs.reduce((s, x) => s + x.sleevedCount, 0);
    const isFull = total > 0 && sleeved >= total;

    const updated = specs.map((s) => ({
      ...s,
      sleevedCount: isFull ? 0 : s.cardCount,
      brand: isFull ? 'Chưa bọc' : s.brand || 'Premium 90µ',
    }));

    onUpdateGameSleeves(game.id, updated);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[#08182B] border border-[#1B3E68] rounded-3xl shadow-2xl flex flex-col overflow-hidden my-auto animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#163558] bg-[#061424]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white font-display">
                  Quản Lý Bọc Bài & Phụ Kiện
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Sleeve & Upgrade Tracker
                </span>
              </div>
              <p className="text-xs text-[#8EADC8]">
                Tra cứu kích thước thẻ bài, quản lý tiến độ bọc bảo vệ và danh sách phụ kiện nâng cấp
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#0E2642] hover:bg-[#16385F] text-[#8EADC8] hover:text-white transition-colors border border-[#1A3F69]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 pb-2 bg-[#061424] border-b border-[#142C48] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-[#0C223A] p-1 rounded-full border border-[#1A3F69]">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === 'inventory'
                  ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/30'
                  : 'text-[#8EADC8] hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Tiến Độ Bọc Bài ({summary.sleevedPercentage}%)</span>
            </button>

            <button
              onClick={() => setActiveTab('shopping')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === 'shopping'
                  ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/30'
                  : 'text-[#8EADC8] hover:text-white'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Cần Mua Sắm ({summary.shoppingList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('upgrades')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === 'upgrades'
                  ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/30'
                  : 'text-[#8EADC8] hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Phụ Kiện Nâng Cấp ({allUpgrades.length})</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Stat Pills */}
        <div className="px-6 py-3.5 bg-[#091D33]/90 border-b border-[#142C48] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-[#0C223A] border border-[#163558]">
            <span className="text-[10px] text-[#8EADC8] uppercase block">Tổng Số Thẻ Bài</span>
            <span className="text-xl font-black text-white font-mono mt-0.5 block">
              {summary.totalCards.toLocaleString()} lá
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-[#0C223A] border border-[#163558]">
            <span className="text-[10px] text-emerald-400 uppercase block">Đã Bọc Bảo Vệ</span>
            <span className="text-xl font-black text-emerald-400 font-mono mt-0.5 block">
              {summary.totalSleeved.toLocaleString()} lá ({summary.sleevedPercentage}%)
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-[#0C223A] border border-[#163558]">
            <span className="text-[10px] text-amber-400 uppercase block">Còn Thiếu Bọc</span>
            <span className="text-xl font-black text-amber-400 font-mono mt-0.5 block">
              {summary.missingTotal.toLocaleString()} lá
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-[#0C223A] border border-[#163558]">
            <span className="text-[10px] text-sky-400 uppercase block">Game Đã Bọc 100%</span>
            <span className="text-xl font-black text-sky-400 font-mono mt-0.5 block">
              {summary.fullySleevedGamesCount} / {games.length} game
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-5">
          {/* TAB 1: INVENTORY & TRACKER */}
          {activeTab === 'inventory' && (
            <div className="space-y-4 animate-fade-in">
              {/* Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8EADC8]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm game theo tên để xem kích thước sleeve..."
                    className="w-full bg-[#0C223A] border border-[#163558] focus:border-[#FF6B00] rounded-xl pl-10 pr-4 py-2 text-white text-xs outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-[#0C223A] border border-[#163558] rounded-xl p-1 text-xs">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                      statusFilter === 'all'
                        ? 'bg-[#FF6B00] text-white'
                        : 'text-[#8EADC8] hover:text-white'
                    }`}
                  >
                    Tất cả ({games.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('fully')}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                      statusFilter === 'fully'
                        ? 'bg-emerald-500 text-white'
                        : 'text-[#8EADC8] hover:text-white'
                    }`}
                  >
                    Đã bọc 100%
                  </button>
                  <button
                    onClick={() => setStatusFilter('missing')}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                      statusFilter === 'missing'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-[#8EADC8] hover:text-white'
                    }`}
                  >
                    Còn thiếu ({summary.partiallyOrUnsleevedCount})
                  </button>
                </div>
              </div>

              {/* Games Sleeve List */}
              <div className="space-y-2.5">
                {filteredGames.map((game) => {
                  const specs = getGameSleeveSpecs(game);
                  const total = specs.reduce((s, x) => s + x.cardCount, 0);
                  const sleeved = specs.reduce((s, x) => s + x.sleevedCount, 0);
                  const pct = total > 0 ? Math.round((sleeved / total) * 100) : 100;
                  const isFull = pct === 100;

                  return (
                    <div
                      key={game.id}
                      className="p-3.5 rounded-2xl bg-[#091D33] hover:bg-[#0C223A] border border-[#163558] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors"
                    >
                      {/* Left: Thumbnail & Name */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                          src={game.imageUrl}
                          alt={game.name}
                          className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[#163558]"
                        />
                        <div className="min-w-0 flex-1">
                          <h4
                            onClick={() => {
                              onClose();
                              onSelectGame(game);
                            }}
                            className="text-xs sm:text-sm font-bold text-white hover:text-[#FF6B00] transition-colors cursor-pointer truncate"
                          >
                            {game.name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-[#8EADC8]">
                            {specs.length === 0 ? (
                              <span className="px-2 py-0.5 rounded-md bg-[#0E2642] text-[#8EADC8] border border-[#163558] text-[10px] italic">
                                Không có thẻ bài (Bộ cờ / Phụ kiện)
                              </span>
                            ) : (
                              specs.map((s, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-md bg-[#0E2642] text-white border border-[#163558] font-mono text-[10px]"
                                >
                                  {s.size}: {s.sleevedCount}/{s.cardCount} lá
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Progress & Quick Action */}
                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                        {total === 0 ? (
                          <span className="text-[11px] text-[#8EADC8] italic px-3 py-1.5 rounded-xl bg-[#0C223A] border border-[#163558]">
                            Không cần bọc
                          </span>
                        ) : (
                          <>
                            <div className="text-right">
                              <div className="flex items-center gap-1.5 font-mono text-xs">
                                <span className={isFull ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                                  {pct}%
                                </span>
                                <span className="text-[#6080A2]">({sleeved}/{total} lá)</span>
                              </div>
                              <div className="w-24 h-1.5 rounded-full bg-[#0E2642] overflow-hidden mt-1">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isFull ? 'bg-emerald-500' : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>

                            <button
                              onClick={() => handleToggleFullSleeve(game)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1 ${
                                isFull
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500 hover:text-white'
                                  : 'bg-[#FF6B00] text-white hover:bg-[#FF7A1A] shadow-md shadow-[#FF6B00]/30'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isFull ? 'Đã bọc đủ' : 'Đánh dấu đã bọc'}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: SMART SHOPPING LIST */}
          {activeTab === 'shopping' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#0C223A] p-4 rounded-2xl border border-[#163558]">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-[#FF6B00]" />
                    <span>Danh Sách Pack Bọc Bài Cần Mua Thêm</span>
                  </h3>
                  <p className="text-xs text-[#8EADC8] mt-0.5">
                    Tự động tính toán số pack 50 lá cần thiết cho các tựa game còn thiếu bọc
                  </p>
                </div>

                <button
                  onClick={handleCopyShoppingList}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF7A1A] text-white text-xs font-bold transition-all shadow-md shadow-[#FF6B00]/20 shrink-0"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Đã Sao Chép!' : 'Sao Chép Danh Sách'}</span>
                </button>
              </div>

              {summary.shoppingList.length === 0 ? (
                <div className="text-center py-12 rounded-3xl bg-[#091D33] border border-[#163558] p-6 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-sm font-bold text-white">Toàn bộ game trong bộ sưu tập đã được bọc đầy đủ!</p>
                  <p className="text-xs text-[#8EADC8]">Không còn thẻ bài nào bị thiếu bọc bảo vệ.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {summary.shoppingList.map((item, idx) => (
                    <div
                      key={item.size}
                      className="p-4 rounded-2xl bg-[#091D33] border border-[#163558] space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-[#FF6B00] uppercase tracking-wider bg-[#FF6B00]/15 px-2 py-0.5 rounded-md">
                            Size #{idx + 1}
                          </span>
                          <h4 className="text-sm font-bold text-white mt-1">{item.size}</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-amber-400 font-mono">
                            ~{item.packsNeeded50}
                          </span>
                          <span className="text-[11px] text-[#8EADC8] block">pack (50 lá)</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#0C223A] text-xs text-[#8EADC8] space-y-1 border border-[#142C48]">
                        <div className="flex justify-between">
                          <span>Thiếu bọc:</span>
                          <span className="font-bold text-amber-400">{item.missingCards} lá</span>
                        </div>
                        <div className="pt-1 border-t border-[#142C48]/60 text-[11px]">
                          <span className="text-slate-400">Dùng cho: </span>
                          <span className="text-white font-medium">{item.gamesAffected.join(', ')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: UPGRADES & ACCESSORIES */}
          {activeTab === 'upgrades' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-[#0C223A] p-4 rounded-2xl border border-[#163558]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Bộ Phụ Kiện Nâng Cấp Cao Cấp (Deluxe Components)</span>
                </h3>
                <p className="text-xs text-[#8EADC8] mt-0.5">
                  Insert in 3D, token acrylic, đồng xu kim loại Iron Clays giúp nâng tầm trải nghiệm
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allUpgrades.map(({ game, upgrade }) => (
                  <div
                    key={upgrade.id}
                    className="p-4 rounded-2xl bg-[#091D33] border border-[#163558] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                        {upgrade.category === 'Coins' ? (
                          <Coins className="w-5 h-5" />
                        ) : upgrade.category === 'Insert' ? (
                          <Box className="w-5 h-5" />
                        ) : (
                          <Package className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                          {upgrade.name}
                        </h4>
                        <p className="text-[11px] text-[#8EADC8] truncate">
                          Game: <span className="text-amber-300 font-semibold">{game.name}</span>
                        </p>
                        {upgrade.costVnd && (
                          <p className="text-[11px] text-emerald-400 font-mono font-bold mt-0.5">
                            {upgrade.costVnd.toLocaleString('vi-VN')} ₫
                          </p>
                        )}
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 shrink-0">
                      ✓ Đã Trang Bị
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
