import React from 'react';
import { BoardGame } from '../types/boardgame';
import {
  X,
  SlidersHorizontal,
  RotateCcw,
  Check,
  ShieldCheck,
  AlertTriangle,
  Users,
  Clock,
  Star,
  DollarSign,
  Layers,
  Sparkles,
} from 'lucide-react';

export interface FilterState {
  cabinet: 'all' | 'real' | 'fake';
  playerCount: 'all' | '1' | '2' | '3-4' | '5-6' | '7+';
  playtime: 'all' | 'quick' | 'medium' | 'standard' | 'long';
  status: 'all' | 'On Hand' | 'OOS';
  gameType: 'all' | 'base' | 'expansion';
  minRating: number;
  category: string;
  sortBy: 'default' | 'rating-desc' | 'price-desc' | 'price-asc' | 'name-asc' | 'year-desc';
}

export const DEFAULT_FILTER_STATE: FilterState = {
  cabinet: 'all',
  playerCount: 'all',
  playtime: 'all',
  status: 'all',
  gameType: 'all',
  minRating: 0,
  category: 'all',
  sortBy: 'default',
};

interface MultiFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onUpdateFilters: (newFilters: FilterState) => void;
  onResetFilters: () => void;
  totalFilteredCount: number;
}

export const MultiFilterModal: React.FC<MultiFilterModalProps> = ({
  isOpen,
  onClose,
  filters,
  onUpdateFilters,
  onResetFilters,
  totalFilteredCount,
}) => {
  if (!isOpen) return null;

  const isFiltered =
    filters.cabinet !== 'all' ||
    filters.playerCount !== 'all' ||
    filters.playtime !== 'all' ||
    filters.status !== 'all' ||
    filters.gameType !== 'all' ||
    filters.minRating > 0 ||
    filters.category !== 'all' ||
    filters.sortBy !== 'default';

  const update = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onUpdateFilters({
      ...filters,
      [key]: value,
    });
  };

  const categories = [
    { id: 'all', label: 'Tất cả thể loại' },
    { id: 'strategy', label: 'Strategy / Economic' },
    { id: 'deck', label: 'Deck Building' },
    { id: 'party', label: 'Social Deduction / Party' },
    { id: 'coop', label: 'Cooperative' },
    { id: 'worker', label: 'Worker Placement' },
    { id: 'thematic', label: 'Thematic / Adventure' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#091D33] border border-[#1E3F66] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#163558] bg-[#071628]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF6B00]/15 border border-[#FF6B00]/30 flex items-center justify-center text-[#FF6B00]">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white font-display">Bộ Lọc Đa Tiêu Chí</h3>
                {isFiltered && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF6B00] text-white font-bold">
                    Đang lọc
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8EADC8]">
                Kết hợp nhiều tiêu chí để tìm chính xác hộp game cho buổi chơi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isFiltered && (
              <button
                onClick={onResetFilters}
                className="text-xs font-semibold text-[#8EADC8] hover:text-[#FF6B00] flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-[#0E2642] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-[#0E2642] hover:bg-[#16385F] text-[#8EADC8] hover:text-white flex items-center justify-center transition-colors border border-[#1A3F69]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body - Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* 1. Kệ Game (Real vs Fake) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#FF6B00]" />
              <span>Phân loại Kệ Game:</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => update('cabinet', 'all')}
                className={`py-2.5 px-3 rounded-xl font-bold border transition-all text-center ${
                  filters.cabinet === 'all'
                    ? 'bg-white text-slate-950 border-white shadow-md'
                    : 'bg-[#0C223A] text-[#8EADC8] border-[#163558] hover:border-[#1E4570]'
                }`}
              >
                Tất cả (2 Kệ)
              </button>
              <button
                onClick={() => update('cabinet', 'real')}
                className={`py-2.5 px-3 rounded-xl font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  filters.cabinet === 'real'
                    ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20'
                    : 'bg-[#0C223A] text-emerald-400 border-[#163558] hover:border-emerald-500/40'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Real Collection</span>
              </button>
              <button
                onClick={() => update('cabinet', 'fake')}
                className={`py-2.5 px-3 rounded-xl font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  filters.cabinet === 'fake'
                    ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20'
                    : 'bg-[#0C223A] text-rose-400 border-[#163558] hover:border-rose-500/40'
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Replicas & Fake</span>
              </button>
            </div>
          </div>

          {/* 2. Số Lượng Người Chơi (Player Count) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#FF6B00]" />
              <span>Số Người Chơi (Players):</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { id: 'all', label: 'Bất kỳ' },
                { id: '1', label: 'Solo (1)' },
                { id: '2', label: 'Duo (2)' },
                { id: '3-4', label: '3 - 4 người' },
                { id: '5-6', label: '5 - 6 người' },
                { id: '7+', label: 'Party (7+)' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => update('playerCount', p.id as any)}
                  className={`py-2 px-2.5 rounded-xl font-semibold border text-center transition-all ${
                    filters.playerCount === p.id
                      ? 'bg-[#FF6B00] text-white border-[#FFA154] font-bold shadow-md shadow-[#FF6B00]/20'
                      : 'bg-[#0C223A] text-[#8EADC8] border-[#163558] hover:border-[#1E4570]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Thời Lượng Chơi (Playtime) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#FF6B00]" />
              <span>Thời Lượng Ván Chơi (Playtime):</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'all', label: 'Bất kỳ' },
                { id: 'quick', label: '< 30 phút' },
                { id: 'medium', label: '30 - 60 phút' },
                { id: 'standard', label: '60 - 90 phút' },
                { id: 'long', label: '> 90 phút' },
              ].map((pt) => (
                <button
                  key={pt.id}
                  onClick={() => update('playtime', pt.id as any)}
                  className={`py-2 px-2 rounded-xl font-semibold border text-center transition-all ${
                    filters.playtime === pt.id
                      ? 'bg-[#FF6B00] text-white border-[#FFA154] font-bold shadow-md shadow-[#FF6B00]/20'
                      : 'bg-[#0C223A] text-[#8EADC8] border-[#163558] hover:border-[#1E4570]'
                  }`}
                >
                  {pt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Trạng Thái Kho & Loại Hộp Game */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status (On Hand / OOS) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white uppercase tracking-wider block">
                Tình Trạng Kho:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => update('status', 'all')}
                  className={`py-2 rounded-xl font-semibold border text-center transition-all ${
                    filters.status === 'all'
                      ? 'bg-white text-slate-950 border-white font-bold'
                      : 'bg-[#0C223A] text-[#8EADC8] border-[#163558]'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => update('status', 'On Hand')}
                  className={`py-2 rounded-xl font-semibold border text-center transition-all ${
                    filters.status === 'On Hand'
                      ? 'bg-emerald-500 text-white border-emerald-400 font-bold'
                      : 'bg-[#0C223A] text-emerald-400 border-[#163558]'
                  }`}
                >
                  On Hand
                </button>
                <button
                  onClick={() => update('status', 'OOS')}
                  className={`py-2 rounded-xl font-semibold border text-center transition-all ${
                    filters.status === 'OOS'
                      ? 'bg-zinc-700 text-white border-zinc-600 font-bold'
                      : 'bg-[#0C223A] text-zinc-400 border-[#163558]'
                  }`}
                >
                  OOS
                </button>
              </div>
            </div>

            {/* Game Type (Base / Expansion) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white uppercase tracking-wider block">
                Loại Hộp Game:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => update('gameType', 'all')}
                  className={`py-2 rounded-xl font-semibold border text-center transition-all ${
                    filters.gameType === 'all'
                      ? 'bg-white text-slate-950 border-white font-bold'
                      : 'bg-[#0C223A] text-[#8EADC8] border-[#163558]'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => update('gameType', 'base')}
                  className={`py-2 rounded-xl font-semibold border text-center transition-all ${
                    filters.gameType === 'base'
                      ? 'bg-purple-600 text-white border-purple-400 font-bold'
                      : 'bg-[#0C223A] text-purple-300 border-[#163558]'
                  }`}
                >
                  Base Game
                </button>
                <button
                  onClick={() => update('gameType', 'expansion')}
                  className={`py-2 rounded-xl font-semibold border text-center transition-all ${
                    filters.gameType === 'expansion'
                      ? 'bg-amber-600 text-white border-amber-400 font-bold'
                      : 'bg-[#0C223A] text-amber-300 border-[#163558]'
                  }`}
                >
                  Expansion
                </button>
              </div>
            </div>
          </div>

          {/* 5. Điểm BGG Rating Tối Thiểu */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Điểm Đánh Giá BGG Tối Thiểu:</span>
              </span>
              <span className="text-[#FF6B00] font-mono font-bold">
                {filters.minRating > 0 ? `>= ${filters.minRating} ★` : 'Không giới hạn'}
              </span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { val: 0, label: 'Mọi điểm' },
                { val: 7.0, label: '7.0+ ★' },
                { val: 7.5, label: '7.5+ ★' },
                { val: 8.0, label: '8.0+ ★ (Siêu phẩm)' },
              ].map((r) => (
                <button
                  key={r.val}
                  onClick={() => update('minRating', r.val)}
                  className={`py-2 rounded-xl font-semibold border text-center transition-all ${
                    filters.minRating === r.val
                      ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold'
                      : 'bg-[#0C223A] text-[#8EADC8] border-[#163558]'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Thể Loại & Sắp Xếp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white uppercase tracking-wider block">
                Chủ Đề / Thể Loại:
              </label>
              <select
                value={filters.category}
                onChange={(e) => update('category', e.target.value)}
                className="w-full bg-[#0C223A] border border-[#163558] focus:border-[#FF6B00] rounded-xl px-3 py-2.5 text-white outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort by */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white uppercase tracking-wider block">
                Thứ Tự Sắp Xếp:
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => update('sortBy', e.target.value as any)}
                className="w-full bg-[#0C223A] border border-[#163558] focus:border-[#FF6B00] rounded-xl px-3 py-2.5 text-white outline-none"
              >
                <option value="default">Mặc định (Vị trí trên kệ)</option>
                <option value="rating-desc">BGG Rating cao nhất</option>
                <option value="price-desc">Giá trị cao nhất</option>
                <option value="price-asc">Giá tiết kiệm nhất</option>
                <option value="name-asc">Tên game (A → Z)</option>
                <option value="year-desc">Năm phát hành mới nhất</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#163558] bg-[#071628] flex items-center justify-between gap-3">
          <div className="text-xs text-[#8EADC8]">
            Tìm thấy{' '}
            <span className="font-bold text-[#FF6B00] text-sm">{totalFilteredCount}</span>{' '}
            hộp game phù hợp
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onResetFilters}
              className="px-4 py-2.5 rounded-xl bg-[#0E2642] hover:bg-[#153457] text-[#8EADC8] hover:text-white font-semibold transition-colors border border-[#1A3F69]"
            >
              Đặt lại
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7A1A] text-white font-bold shadow-lg shadow-[#FF6B00]/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Xem {totalFilteredCount} Game</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
