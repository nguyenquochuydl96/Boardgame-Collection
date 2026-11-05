import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, Sparkles, Plus, Play, RotateCcw, Users, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { LuckyWheel } from '../picker/LuckyWheel';
import { MysteryCardShuffle, PickerItem } from '../picker/MysteryCardShuffle';
import { PlayerAvatar } from '../player/PlayerAvatar';
import { usePlayerStore } from '../../store/usePlayerStore';
import { cn } from '../ui/cn';

export interface QuickFirstPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultGameId?: string;
}

export const QuickFirstPlayerModal: React.FC<QuickFirstPlayerModalProps> = ({
  isOpen,
  onClose,
  defaultGameId,
}) => {
  const navigate = useNavigate();
  const allPlayers = usePlayerStore((s) => s.players);

  const [animStyle, setAnimStyle] = useState<'wheel' | 'card_shuffle'>('wheel');
  const [activePlayerIds, setActivePlayerIds] = useState<string[]>(() =>
    allPlayers.slice(0, 4).map((p) => p.id)
  );
  const [guestPlayers, setGuestPlayers] = useState<PickerItem[]>([]);
  const [newGuestName, setNewGuestName] = useState('');
  const [chosenWinner, setChosenWinner] = useState<PickerItem | null>(null);

  // Pool for first player selection
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

  const togglePlayer = (id: string) => {
    setActivePlayerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newGuestName.trim();
    if (!trimmed) return;
    const guest: PickerItem = {
      id: `guest_${Date.now()}`,
      name: trimmed,
      avatar: '🎲',
      color: '#f97316',
    };
    setGuestPlayers((prev) => [...prev, guest]);
    setNewGuestName('');
  };

  const handleStartSession = () => {
    if (!chosenWinner) return;
    onClose();
    const query = new URLSearchParams();
    if (defaultGameId) query.set('gameId', defaultGameId);
    query.set('firstPlayerId', chosenWinner.id);
    if (activePlayerIds.length > 0) {
      query.set('playerIds', activePlayerIds.join(','));
    }
    query.set('step', '1');
    navigate(`/sessions/new?${query.toString()}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="👑 Chọn Người Đi Đầu Ván Đấu"
      size="xl"
    >
      <div className="space-y-6">
        {/* Style Selector Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)]">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Hình thức quay thưởng:</span>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => {
                setAnimStyle('wheel');
                setChosenWinner(null);
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                animStyle === 'wheel'
                  ? 'bg-amber-500/25 border border-amber-500/50 text-amber-300'
                  : 'text-[var(--text-secondary)] hover:text-white'
              )}
            >
              <span>🎡 Vòng Quay May Mắn</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAnimStyle('card_shuffle');
                setChosenWinner(null);
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                animStyle === 'card_shuffle'
                  ? 'bg-amber-500/25 border border-amber-500/50 text-amber-300'
                  : 'text-[var(--text-secondary)] hover:text-white'
              )}
            >
              <span>🎴 Xáo Bài Bí Ẩn</span>
            </button>
          </div>
        </div>

        {/* Players at the Table Selection */}
        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[var(--accent-neon)]" />
              Người ngồi tại bàn chơi ({playerItems.length} người)
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">
              Chạm để bật/tắt người tham gia
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {allPlayers.map((player) => {
              const isSelected = activePlayerIds.includes(player.id);
              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => togglePlayer(player.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none',
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-sm'
                      : 'bg-[var(--bg-elevated)] border-white/10 text-[var(--text-secondary)] opacity-60 hover:opacity-100'
                  )}
                >
                  <PlayerAvatar
                    avatar={player.avatar}
                    name={player.name}
                    color={player.color}
                    size="sm"
                  />
                  <span>{player.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />}
                </button>
              );
            })}

            {guestPlayers.map((guest) => (
              <div
                key={guest.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/15 border border-orange-500/50 text-white text-xs font-semibold"
              >
                <span>🎲</span>
                <span>{guest.name}</span>
                <span className="text-[10px] text-orange-300 font-mono">(Khách)</span>
              </div>
            ))}
          </div>

          {/* Quick Guest Input */}
          <form onSubmit={handleAddGuest} className="flex items-center gap-2 pt-2">
            <Input
              placeholder="Thêm nhanh bạn chơi ngoài (vd: Tuấn, Mai)..."
              value={newGuestName}
              onChange={(e) => setNewGuestName(e.target.value)}
              className="text-xs py-1.5"
            />
            <Button type="submit" size="sm" variant="secondary" disabled={!newGuestName.trim()}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Thêm
            </Button>
          </form>
        </div>

        {/* Animation Stage */}
        <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex flex-col items-center justify-center min-h-[380px] relative overflow-hidden">
          {playerItems.length < 2 ? (
            <div className="text-center p-6 space-y-2">
              <span className="text-3xl">⚠️</span>
              <p className="font-bold text-sm text-[var(--text-primary)]">
                Cần ít nhất 2 người chơi để quay
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Vui lòng tích chọn thêm bạn bè ở danh sách phía trên
              </p>
            </div>
          ) : animStyle === 'wheel' ? (
            <LuckyWheel
              items={playerItems}
              onSelect={(winner) => setChosenWinner(winner)}
            />
          ) : (
            <MysteryCardShuffle
              items={playerItems}
              onSelect={(winner) => setChosenWinner(winner)}
              mode="first_player"
            />
          )}

          {/* Winner Celebration Announcement */}
          <AnimatePresence>
            {chosenWinner && (
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/25 to-amber-600/20 border-2 border-amber-400 shadow-2xl w-full max-w-lg flex flex-col sm:flex-row items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <PlayerAvatar
                      avatar={chosenWinner.avatar}
                      name={chosenWinner.name}
                      color={chosenWinner.color}
                      size="lg"
                    />
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg font-bold">
                      👑
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300">
                      Người Đi Đầu Ván Đấu!
                    </span>
                    <h4 className="font-display font-extrabold text-base text-white truncate">
                      {chosenWinner.name}
                    </h4>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleStartSession}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-lg shrink-0 w-full sm:w-auto"
                >
                  <Play className="w-4 h-4 fill-current mr-1" />
                  Bắt Đầu Ván Mới Ngay
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Modal>
  );
};
