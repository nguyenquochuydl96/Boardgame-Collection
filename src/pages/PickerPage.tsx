import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { GameStatus } from '../types';
import {
  Crown,
  Gamepad2,
  Users,
  Dices,
  RotateCcw,
  Shuffle,
  Plus,
  Play,
  Check,
  Filter,
  Sparkles,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { PageTransition } from '../components/layout/PageTransition';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LuckyWheel } from '../components/picker/LuckyWheel';
import { MysteryCardShuffle, PickerItem } from '../components/picker/MysteryCardShuffle';
import { usePlayerStore } from '../store/usePlayerStore';
import { useGameStore } from '../store/useGameStore';
import { cn } from '../components/ui/cn';
import { PlayerAvatar } from '../components/player/PlayerAvatar';
import { resolveAvatarImage, getSafeDisplayAvatar } from '../lib/utils';

type PickerMode = 'first_player' | 'what_to_play';
type AnimationStyle = 'wheel' | 'card_shuffle';

export const PickerPage: React.FC = () => {
  const navigate = useNavigate();
  const allPlayers = usePlayerStore((s) => s.players);
  const allGames = useGameStore((s) => s.games);

  const [mode, setMode] = useState<PickerMode>('first_player');
  const [animStyle, setAnimStyle] = useState<AnimationStyle>('wheel');

  // --- FIRST PLAYER STATE ---
  const [activePlayerIds, setActivePlayerIds] = useState<string[]>(() =>
    allPlayers.slice(0, 4).map((p) => p.id)
  );
  const [newGuestName, setNewGuestName] = useState('');
  const [guestPlayers, setGuestPlayers] = useState<PickerItem[]>([]);

  // --- WHAT TO PLAY STATE ---
  const [statusFilters, setStatusFilters] = useState<GameStatus[]>(['own']);
  const [playerCountFilter, setPlayerCountFilter] = useState<'all' | '2' | '3' | '4' | '5+'>('all');
  const [durationFilter, setDurationFilter] = useState<'all' | 'short' | 'medium' | 'long'>('all');
  const [gameSearch, setGameSearch] = useState('');
  const [selectedGameIds, setSelectedGameIds] = useState<string[]>(() =>
    allGames.filter((g) => g.status === 'own').map((g) => g.id)
  );

  // --- RESULT STATE ---
  const [chosenResult, setChosenResult] = useState<PickerItem | null>(null);

  // Pool for First Player
  const playerItems = useMemo<PickerItem[]>(() => {
    const list: PickerItem[] = allPlayers
      .filter((p) => activePlayerIds.includes(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        color: p.color,
      }));
    return [...list, ...guestPlayers];
  }, [allPlayers, activePlayerIds, guestPlayers]);

  // Pool for What to Play
  const filteredAvailableGames = useMemo(() => {
    return allGames.filter((g) => {
      // Status filter
      if (statusFilters.length > 0) {
        if (!statusFilters.includes(g.status)) return false;
      } else {
        // Exclude sold and wishlist from random game night selection by default
        if (g.status === 'sold' || g.status === 'wishlist') return false;
      }

      if (gameSearch.trim() && !g.name.toLowerCase().includes(gameSearch.toLowerCase())) {
        return false;
      }
      if (playerCountFilter !== 'all') {
        const target = playerCountFilter === '5+' ? 5 : Number(playerCountFilter);
        if (target === 5 && (g.maxPlayers || 0) < 5) return false;
        if (target < 5 && ((g.minPlayers || 1) > target || (g.maxPlayers || 99) < target)) {
          return false;
        }
      }
      if (durationFilter === 'short' && (g.playingTime || 0) > 45) return false;
      if (durationFilter === 'medium' && ((g.playingTime || 0) < 45 || (g.playingTime || 0) > 90)) {
        return false;
      }
      if (durationFilter === 'long' && (g.playingTime || 0) <= 90) return false;

      return true;
    });
  }, [allGames, statusFilters, gameSearch, playerCountFilter, durationFilter]);

  // Auto-select filtered games when filter changes
  useEffect(() => {
    setSelectedGameIds(filteredAvailableGames.map((g) => g.id));
  }, [statusFilters, playerCountFilter, durationFilter]);

  const gameItems = useMemo<PickerItem[]>(() => {
    return filteredAvailableGames
      .filter((g) => selectedGameIds.includes(g.id))
      .map((g) => ({
        id: g.id,
        name: g.name,
        subtitle: `${g.minPlayers}-${g.maxPlayers} người · ${g.playingTime} phút`,
        thumbnail: g.thumbnail || g.image,
      }));
  }, [filteredAvailableGames, selectedGameIds]);

  const currentPool = mode === 'first_player' ? playerItems : gameItems;

  // Toggle player
  const togglePlayer = (id: string) => {
    setActivePlayerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Add guest player
  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuestName.trim()) return;
    const guest: PickerItem = {
      id: `guest_${Date.now()}`,
      name: newGuestName.trim(),
      avatar: '🎲',
      color: '#f97316',
    };
    setGuestPlayers((prev) => [...prev, guest]);
    setNewGuestName('');
  };

  // Toggle game selection
  const toggleGame = (id: string) => {
    setSelectedGameIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllGames = () => {
    setSelectedGameIds(filteredAvailableGames.map((g) => g.id));
  };

  const deselectAllGames = () => {
    setSelectedGameIds([]);
  };

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[var(--text-primary)] flex items-center gap-2.5">
              <span>🎲</span>
              Bàn Chơi &amp; Vòng Quay May Mắn
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
              Chọn người đi đầu ngẫu nhiên hoặc quyết định tối nay cả nhóm chơi game gì!
            </p>
          </div>

          {/* Mode Switcher with sliding spring pill */}
          <div className="flex p-1.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] w-fit">
            <button
              type="button"
              onClick={() => {
                setMode('first_player');
                setChosenResult(null);
              }}
              className={cn(
                'relative px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 select-none',
                mode === 'first_player'
                  ? 'text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              {mode === 'first_player' && (
                <motion.span
                  layoutId="picker-mode-pill"
                  className="absolute inset-0 rounded-xl bg-[image:var(--gradient-hero)] shadow-md -z-10"
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                />
              )}
              <Crown className="w-4 h-4 text-amber-400 relative z-10" />
              <span className="relative z-10">Chọn Người Đi Đầu</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('what_to_play');
                setChosenResult(null);
              }}
              className={cn(
                'relative px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 select-none',
                mode === 'what_to_play'
                  ? 'text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              {mode === 'what_to_play' && (
                <motion.span
                  layoutId="picker-mode-pill"
                  className="absolute inset-0 rounded-xl bg-[image:var(--gradient-hero)] shadow-md -z-10"
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                />
              )}
              <Dices className="w-4 h-4 text-[var(--accent-neon)] relative z-10" />
              <span className="relative z-10">Hôm Nay Chơi Gì?</span>
            </button>
          </div>
        </div>

        {/* Animation Switcher Banner with sliding spring pill */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)]">
            <Sparkles className="w-4 h-4 text-[var(--accent-neon)]" />
            <span>Hiệu Ứng Trải Nghiệm:</span>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setAnimStyle('wheel')}
              className={cn(
                'relative px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 select-none',
                animStyle === 'wheel'
                  ? 'text-amber-300'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              {animStyle === 'wheel' && (
                <motion.span
                  layoutId="picker-anim-pill"
                  className="absolute inset-0 rounded-lg bg-amber-500/25 border border-amber-500/50 -z-10 shadow-sm"
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                />
              )}
              <span className="relative z-10">🎡 Vòng Quay May Mắn</span>
            </button>
            <button
              type="button"
              onClick={() => setAnimStyle('card_shuffle')}
              className={cn(
                'relative px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 select-none',
                animStyle === 'card_shuffle'
                  ? 'text-amber-300'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              {animStyle === 'card_shuffle' && (
                <motion.span
                  layoutId="picker-anim-pill"
                  className="absolute inset-0 rounded-lg bg-amber-500/25 border border-amber-500/50 -z-10 shadow-sm"
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                />
              )}
              <span className="relative z-10">🎴 Xáo &amp; Rút Thẻ Bí Ẩn</span>
            </button>
          </div>
        </div>

        {/* Main Grid: Left Stage (Animation) vs Right Pool (Selector) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: ANIMATION STAGE (7 COLS) */}
          <Card className="lg:col-span-7 p-6 flex flex-col items-center justify-center min-h-[440px] relative overflow-hidden">
            {currentPool.length === 0 ? (
              <div className="text-center p-8 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 mx-auto flex items-center justify-center text-xl">
                  ⚠️
                </div>
                <p className="font-bold text-[var(--text-primary)] text-sm">
                  Chưa có lựa chọn nào trong danh sách
                </p>
                <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
                  Vui lòng tích chọn ít nhất 2 người chơi hoặc 2 boardgame ở cột bên phải để bắt đầu quay!
                </p>
              </div>
            ) : animStyle === 'wheel' ? (
              <LuckyWheel items={currentPool} onSelect={setChosenResult} />
            ) : (
              <MysteryCardShuffle
                items={currentPool}
                onSelect={setChosenResult}
                onEnterGame={(gameId) => navigate(`/sessions/new?gameId=${gameId}`)}
                mode={mode}
              />
            )}

            {/* Chosen Result Spotlight Card (Floats over stage when chosen via Wheel) */}
            <AnimatePresence>
              {animStyle === 'wheel' && chosenResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-2 border-amber-400/50 w-full max-w-md shadow-2xl flex items-center justify-between gap-3 overflow-hidden"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {chosenResult.thumbnail ? (
                      <img
                        src={chosenResult.thumbnail}
                        alt={chosenResult.name}
                        className="w-12 h-12 rounded-xl object-cover border border-amber-400/40 shrink-0"
                      />
                    ) : (
                      <PlayerAvatar
                        avatar={chosenResult.avatar}
                        name={chosenResult.name}
                        color={chosenResult.color}
                        size="md"
                        className="border-amber-400/50 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono text-amber-300 font-bold uppercase tracking-wider">
                        {mode === 'first_player' ? '👑 Người Đi Đầu' : '🎯 Game Tối Nay'}
                      </div>
                      <h4 className="font-display font-extrabold text-sm sm:text-base text-white truncate">
                        {chosenResult.name}
                      </h4>
                      {chosenResult.subtitle && (
                        <p className="text-[11px] text-[#cbd5e1] truncate">{chosenResult.subtitle}</p>
                      )}
                    </div>
                  </div>

                  {mode === 'what_to_play' && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => navigate(`/sessions/new?gameId=${chosenResult.id}`)}
                      className="shrink-0 text-xs shadow-md"
                    >
                      <Play className="w-3.5 h-3.5 mr-1 fill-current" />
                      Vào Ván
                    </Button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* RIGHT: POOL SELECTOR & FILTERS (5 COLS) */}
          <Card className="lg:col-span-5 p-5 space-y-4">
            {mode === 'first_player' ? (
              /* --- FIRST PLAYER POOL --- */
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">
                      Bạn Bè Tại Bàn Chơi ({playerItems.length}/{allPlayers.length + guestPlayers.length})
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Tích chọn những người có mặt tối nay
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActivePlayerIds(allPlayers.map((p) => p.id))}
                      className="text-[11px] text-[var(--accent-neon)] font-bold hover:underline cursor-pointer"
                    >
                      Chọn hết
                    </button>
                    <span className="text-xs text-[var(--text-muted)]">|</span>
                    <button
                      type="button"
                      onClick={() => setActivePlayerIds([])}
                      className="text-[11px] text-[var(--text-secondary)] hover:text-white hover:underline cursor-pointer"
                    >
                      Bỏ chọn hết
                    </button>
                  </div>
                </div>

                {/* Player List */}
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {allPlayers.map((p) => {
                    const isSelected = activePlayerIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => togglePlayer(p.id)}
                        className={cn(
                          'flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer',
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/30 text-[var(--text-primary)]'
                            : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] opacity-50 hover:opacity-80'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <PlayerAvatar player={p} size="sm" />
                          <span className="font-bold text-xs truncate">{p.name}</span>
                        </div>
                        <div
                          className={cn(
                            'w-5 h-5 rounded-lg flex items-center justify-center text-xs font-bold',
                            isSelected
                              ? 'bg-amber-500 text-slate-950'
                              : 'border border-[var(--border-subtle)]'
                          )}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}

                  {/* Guest Players */}
                  {guestPlayers.map((g) => (
                    <div
                      key={g.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/15 text-[var(--text-primary)]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">{getSafeDisplayAvatar(g.avatar, '🎲')}</span>
                        <span className="font-bold text-xs truncate">{g.name} (Khách)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGuestPlayers((prev) => prev.filter((x) => x.id !== g.id))}
                        className="text-xs text-rose-400 font-bold hover:underline"
                      >
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Guest Form */}
                <form onSubmit={handleAddGuest} className="pt-2 border-t border-[var(--border-subtle)] flex gap-2">
                  <Input
                    placeholder="Tên bạn mới (khách)..."
                    value={newGuestName}
                    onChange={(e) => setNewGuestName(e.target.value)}
                    className="text-xs py-1.5"
                  />
                  <Button type="submit" size="sm" variant="secondary" disabled={!newGuestName.trim()}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Thêm
                  </Button>
                </form>
              </div>
            ) : (
              /* --- WHAT TO PLAY POOL --- */
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">
                      Kho Boardgame ({gameItems.length}/{filteredAvailableGames.length})
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Lọc game phù hợp số người &amp; thời gian
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllGames}
                      className="text-[11px] text-[var(--accent-neon)] font-bold hover:underline cursor-pointer"
                    >
                      Chọn hết
                    </button>
                    <span className="text-xs text-[var(--text-muted)]">|</span>
                    <button
                      type="button"
                      onClick={deselectAllGames}
                      className="text-[11px] text-[var(--text-secondary)] hover:text-white hover:underline cursor-pointer"
                    >
                      Bỏ chọn hết
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="space-y-2">
                  {/* Search */}
                  <Input
                    placeholder="Tìm tên game..."
                    value={gameSearch}
                    onChange={(e) => setGameSearch(e.target.value)}
                    className="text-xs py-1.5"
                  />

                  {/* Status Filter */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-[var(--text-muted)] font-bold shrink-0">Kho:</span>
                    {[
                      { id: 'own', label: 'Sở hữu (Có sẵn)' },
                      { id: 'borrowed', label: 'Đang mượn' },
                      { id: 'lent_out', label: 'Cho mượn' },
                      { id: 'all', label: 'Tất cả' },
                    ].map((st) => {
                      const isSelected =
                        st.id === 'all'
                          ? statusFilters.length === 0
                          : statusFilters.includes(st.id as GameStatus);

                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            if (st.id === 'all') {
                              setStatusFilters([]);
                            } else {
                              setStatusFilters((prev) =>
                                prev.includes(st.id as GameStatus)
                                  ? prev.filter((x) => x !== st.id)
                                  : [...prev, st.id as GameStatus]
                              );
                            }
                          }}
                          className={cn(
                            'px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer',
                            isSelected
                              ? 'bg-amber-500 text-slate-950 border-amber-500 font-extrabold shadow-sm'
                              : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-white/20'
                          )}
                        >
                          {st.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Player Count Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[var(--text-muted)] font-bold shrink-0">Người:</span>
                    {(['all', '2', '3', '4', '5+'] as const).map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setPlayerCountFilter(cnt)}
                        className={cn(
                          'px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer',
                          playerCountFilter === cnt
                            ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                            : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                        )}
                      >
                        {cnt === 'all' ? 'Tất cả' : `${cnt} người`}
                      </button>
                    ))}
                  </div>

                  {/* Duration Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[var(--text-muted)] font-bold shrink-0">Thời lượng:</span>
                    {(['all', 'short', 'medium', 'long'] as const).map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setDurationFilter(dur)}
                        className={cn(
                          'px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer',
                          durationFilter === dur
                            ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                            : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                        )}
                      >
                        {dur === 'all'
                          ? 'Tất cả'
                          : dur === 'short'
                          ? '< 45p'
                          : dur === 'medium'
                          ? '45-90p'
                          : '> 90p'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Games Check List */}
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 pt-1">
                  {filteredAvailableGames.map((g) => {
                    const isSelected = selectedGameIds.includes(g.id);
                    return (
                      <div
                        key={g.id}
                        onClick={() => toggleGame(g.id)}
                        className={cn(
                          'flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer',
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/30 text-[var(--text-primary)]'
                            : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] opacity-40 hover:opacity-75'
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {g.thumbnail ? (
                            <img
                              src={g.thumbnail}
                              alt={g.name}
                              className="w-7 h-7 rounded-lg object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-xs shrink-0">
                              🎲
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-bold text-xs truncate block">{g.name}</span>
                            <span className="text-[10px] text-[var(--text-secondary)] block">
                              {g.minPlayers}-{g.maxPlayers} người · {g.playingTime}p
                            </span>
                          </div>
                        </div>

                        <div
                          className={cn(
                            'w-4 h-4 rounded flex items-center justify-center text-xs font-bold shrink-0',
                            isSelected
                              ? 'bg-amber-500 text-slate-950'
                              : 'border border-[var(--border-subtle)]'
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default PickerPage;
