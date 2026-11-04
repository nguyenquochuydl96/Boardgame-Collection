import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  UserPlus,
  Swords,
  Trophy,
  Gamepad2,
  Check,
  Edit3,
  Quote,
  Sparkles,
} from 'lucide-react';
import { PageTransition } from '../components/layout/PageTransition';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PlayerAvatar } from '../components/player/PlayerAvatar';
import { PlayerFormModal } from '../components/player/PlayerFormModal';
import { PlayerCompareModal } from '../components/dashboard/PlayerCompareModal';
import { cn } from '../components/ui/cn';
import { usePlayerStore } from '../store/usePlayerStore';
import { useSessionStore } from '../store/useSessionStore';
import { getPlayStyleInfo } from '../lib/boardgameAvatars';
import { Player } from '../types';

export const PlayersPage: React.FC = () => {
  const players = usePlayerStore((s) => s.players);
  const sessions = useSessionStore((s) => s.sessions);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const [compareMode, setCompareMode] = useState(false);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  const toggleComparePlayer = (id: string) => {
    setSelectedCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedComparePlayers = players.filter((p) =>
    selectedCompareIds.includes(p.id)
  );

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
              Hội Đồng Bàn Chơi
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Quản lý danh sách thành viên, phong cách chơi và so sánh thành tích đối đầu
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant={compareMode ? 'outline' : 'secondary'}
              onClick={() => {
                if (compareMode && selectedCompareIds.length >= 2) {
                  setIsCompareModalOpen(true);
                } else {
                  setCompareMode((c) => !c);
                  setSelectedCompareIds(players.slice(0, 2).map((p) => p.id));
                }
              }}
            >
              <Swords className="w-4 h-4 text-[#22d3ee]" />
              {compareMode
                ? `So Sánh (${selectedCompareIds.length})`
                : 'So Sánh Đối Đầu'}
            </Button>

            <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
              <UserPlus className="w-4 h-4 mr-1.5" />
              Thêm Người Chơi
            </Button>
          </div>
        </div>

        {/* Compare Mode Banner */}
        {compareMode && (
          <div className="p-4 rounded-2xl bg-[var(--accent-primary)]/15 border border-[#a78bfa]/40 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
            <p className="text-xs sm:text-sm text-white">
              Tích chọn 2 hoặc nhiều người chơi dưới đây để soi lịch sử đối đầu (Head-to-Head).
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCompareMode(false);
                  setSelectedCompareIds([]);
                }}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={selectedCompareIds.length < 2}
                onClick={() => setIsCompareModalOpen(true)}
              >
                Mở Bảng So Sánh ({selectedCompareIds.length})
              </Button>
            </div>
          </div>
        )}

        {/* Players Grid */}
        {players.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {players.map((player) => {
              const playerSessions = sessions.filter((s) =>
                s.players?.some((p) => p.playerId === player.id)
              );
              const totalGames = playerSessions.length;
              const wins = playerSessions.filter((s) => {
                const entry = s.players?.find((p) => p.playerId === player.id);
                return Boolean(entry?.isWinner || s.winnerId === player.id);
              }).length;
              const winRate =
                totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

              const isSelectedForCompare = selectedCompareIds.includes(player.id);
              const playStyleInfo = getPlayStyleInfo(player.playStyle);

              return (
                <motion.div
                  key={player.id}
                  whileHover={{ scale: 1.02, y: -3 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className={cn(
                      'p-5 flex flex-col justify-between gap-4 relative h-full transition-all group border-2',
                      isSelectedForCompare
                        ? 'border-[#22d3ee] ring-2 ring-[#22d3ee]/30'
                        : 'hover:border-amber-400/40'
                    )}
                  >
                    {/* Top Right Actions */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
                      {compareMode ? (
                        <button
                          type="button"
                          aria-label={`Chọn ${player.name} để so sánh`}
                          onClick={() => toggleComparePlayer(player.id)}
                          className={cn(
                            'w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer transition-colors',
                            isSelectedForCompare
                              ? 'bg-[#22d3ee] border-[#22d3ee] text-slate-950'
                              : 'bg-[var(--bg-surface)] border-white/20 text-transparent'
                          )}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          aria-label={`Chỉnh sửa ${player.name}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingPlayer(player);
                          }}
                          className="w-7 h-7 rounded-lg bg-[var(--bg-surface)] hover:bg-amber-500/20 text-[var(--text-secondary)] hover:text-amber-300 border border-[var(--border-subtle)] flex items-center justify-center transition-colors cursor-pointer"
                          title="Chỉnh sửa hồ sơ"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Player Info Link */}
                    <Link
                      to={`/players/${player.id}`}
                      className="flex items-start gap-3.5 pr-8"
                    >
                      <div className="relative shrink-0">
                        <PlayerAvatar player={player} size="lg" />
                        <span
                          style={{ backgroundColor: player.color }}
                          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--bg-card)]"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h2 className="font-display font-bold text-base sm:text-lg text-white truncate group-hover:text-amber-300 transition-colors">
                          {player.name}
                        </h2>

                        {player.nickname && (
                          <p className="text-xs font-semibold text-amber-400/90 truncate">
                            "{player.nickname}"
                          </p>
                        )}

                        {playStyleInfo ? (
                          <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[11px] font-bold text-[var(--text-secondary)]">
                            <span>{playStyleInfo.emoji}</span>
                            <span className="truncate">{playStyleInfo.tagline}</span>
                          </div>
                        ) : (
                          <span
                            style={{ color: player.color }}
                            className="text-[11px] font-semibold mt-0.5 block"
                          >
                            Thành viên bàn chơi
                          </span>
                        )}
                      </div>
                    </Link>

                    {/* Bio Snippet if exists */}
                    {player.bio && (
                      <p className="text-xs text-[var(--text-muted)] italic line-clamp-1 flex items-center gap-1">
                        <Quote className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>"{player.bio}"</span>
                      </p>
                    )}

                    {/* Played & Win Rate Grid */}
                    <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-[var(--border-subtle)] tabular-nums">
                      <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] text-center">
                        <span className="text-[11px] text-[var(--text-secondary)] inline-flex items-center gap-1">
                          <Gamepad2 className="w-3 h-3 text-[var(--accent-neon)]" />
                          Đã Chơi
                        </span>
                        <p className="font-display font-extrabold text-lg text-white mt-0.5">
                          {totalGames}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] text-center">
                        <span className="text-[11px] text-[var(--text-secondary)] inline-flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-amber-400" />
                          Tỉ Lệ Thắng
                        </span>
                        <p className="font-display font-extrabold text-lg text-emerald-400 mt-0.5">
                          {winRate}%
                        </p>
                      </div>
                    </div>

                    <Link
                      to={`/players/${player.id}`}
                      className="text-xs font-semibold text-[var(--accent-neon)] group-hover:text-amber-300 transition-colors flex items-center justify-between"
                    >
                      <span>Xem Hồ Sơ Chi Tiết</span>
                      <span>→</span>
                    </Link>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center text-3xl mx-auto">
              👥
            </div>
            <h2 className="font-display font-bold text-xl text-white">
              Chưa Có Người Chơi Nào
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Hãy thêm bạn bè và người thân vào nhóm để bắt đầu ghi nhận điểm số và tỉ lệ thắng.
            </p>
            <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
              <UserPlus className="w-4 h-4 mr-1.5" />
              Thêm Người Chơi Đầu Tiên
            </Button>
          </Card>
        )}

        {/* Unified Player Form Modal (Add & Edit) */}
        <PlayerFormModal
          isOpen={isAddModalOpen || editingPlayer !== null}
          player={editingPlayer}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingPlayer(null);
          }}
        />

        {/* Player Compare Modal */}
        <PlayerCompareModal
          isOpen={isCompareModalOpen}
          onClose={() => setIsCompareModalOpen(false)}
          players={selectedComparePlayers}
          sessions={sessions}
        />
      </div>
    </PageTransition>
  );
};

export default PlayersPage;
