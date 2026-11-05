import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Trophy,
  Gamepad2,
  Sparkles,
  Trash2,
  Edit3,
  Heart,
  Skull,
  Swords,
  Search,
  Quote,
  Flame,
  CloudRain,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { PageTransition } from '../components/layout/PageTransition';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PlayerAvatar } from '../components/player/PlayerAvatar';
import { PlayerFormModal } from '../components/player/PlayerFormModal';
import { StreakDetailModal } from '../components/player/StreakDetailModal';
import { SessionCard } from '../components/session/SessionCard';
import { usePlayerStore } from '../store/usePlayerStore';
import { useSessionStore } from '../store/useSessionStore';
import { useGameStore } from '../store/useGameStore';
import { calculatePlayerStreaks, formatDate } from '../lib/utils';
import { getPlayStyleInfo } from '../lib/boardgameAvatars';
import { cn } from '../components/ui/cn';

export const PlayerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const player = usePlayerStore((s) => s.players.find((p) => p.id === id));
  const allPlayers = usePlayerStore((s) => s.players);
  const deletePlayer = usePlayerStore((s) => s.deletePlayer);
  const allSessions = useSessionStore((s) => s.sessions);
  const games = useGameStore((s) => s.games);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeStreakType, setActiveStreakType] = useState<'win' | 'loss' | null>(null);
  const [breakdownSearch, setBreakdownSearch] = useState('');
  const [breakdownSort, setBreakdownSort] = useState<'plays' | 'winRate' | 'wins' | 'name'>('plays');

  const gamesById = useMemo(() => new Map(games.map((g) => [g.id, g])), [games]);
  const playersById = useMemo(() => Object.fromEntries(allPlayers.map((p) => [p.id, p])), [allPlayers]);

  if (!player) {
    return (
      <PageTransition>
        <Card className="p-8 text-center space-y-4 max-w-md mx-auto my-12">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-400 mx-auto flex items-center justify-center text-3xl">
            👤
          </div>
          <h1 className="font-display font-bold text-2xl text-white">
            Không Tìm Thấy Người Chơi
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Người chơi này không tồn tại hoặc đã được xóa khỏi hệ thống.
          </p>
          <Link to="/players">
            <Button variant="primary">Quay Lại Danh Sách</Button>
          </Link>
        </Card>
      </PageTransition>
    );
  }

  // All sessions this player participated in
  const playerSessions = useMemo(() => {
    return allSessions
      .filter((s) => s.players?.some((p) => p.playerId === player.id))
      .sort(
        (a, b) =>
          new Date(b.datePlayed).getTime() - new Date(a.datePlayed).getTime()
      );
  }, [allSessions, player.id]);

  const totalPlays = playerSessions.length;
  const totalWins = playerSessions.filter((s) => {
    const entry = s.players?.find((p) => p.playerId === player.id);
    return Boolean(entry?.isWinner || s.winnerId === player.id);
  }).length;
  const overallWinRate =
    totalPlays > 0 ? Math.round((totalWins / totalPlays) * 100) : 0;

  // Complete streaks details (win streak & loss streak with full session list)
  const streaks = useMemo(() => {
    return calculatePlayerStreaks(player.id, allSessions);
  }, [player.id, allSessions]);

  // Per-game breakdown
  const perGameStats = useMemo(() => {
    const gameMap = new Map<
      string,
      { gameId: string; gameName: string; thumbnail?: string; plays: number; wins: number }
    >();

    for (const s of playerSessions) {
      const g = gamesById.get(s.gameId);
      const existing = gameMap.get(s.gameId) || {
        gameId: s.gameId,
        gameName: s.gameName || g?.name || 'Boardgame',
        thumbnail: g?.thumbnail,
        plays: 0,
        wins: 0,
      };
      existing.plays += 1;
      const entry = s.players?.find((p) => p.playerId === player.id);
      if (entry?.isWinner || s.winnerId === player.id) {
        existing.wins += 1;
      }
      gameMap.set(s.gameId, existing);
    }

    return Array.from(gameMap.values()).map((g) => ({
      ...g,
      winRate: g.plays > 0 ? Math.round((g.wins / g.plays) * 100) : 0,
    }));
  }, [playerSessions, player.id, gamesById]);

  // Favorite Game: Pinned or Highest Plays
  const favoriteGame = useMemo(() => {
    if (player.favoriteGameId) {
      const stat = perGameStats.find((g) => g.gameId === player.favoriteGameId);
      const storeGame = gamesById.get(player.favoriteGameId);
      if (stat) return { ...stat, isPinned: true };
      if (storeGame) {
        return {
          gameId: storeGame.id,
          gameName: storeGame.name,
          thumbnail: storeGame.thumbnail,
          plays: 0,
          wins: 0,
          winRate: 0,
          isPinned: true,
        };
      }
    }
    // Fallback: highest plays
    const sorted = [...perGameStats].sort((a, b) => b.plays - a.plays);
    return sorted[0] ? { ...sorted[0], isPinned: false } : null;
  }, [player.favoriteGameId, perGameStats, gamesById]);

  // Signature Game: Pinned or Highest Win Rate (minimum 5 plays to eliminate playtest noise)
  const signatureGame = useMemo(() => {
    if (player.specialtyGameId) {
      const stat = perGameStats.find((g) => g.gameId === player.specialtyGameId);
      const storeGame = gamesById.get(player.specialtyGameId);
      if (stat) return { ...stat, isPinned: true };
      if (storeGame) {
        return {
          gameId: storeGame.id,
          gameName: storeGame.name,
          thumbnail: storeGame.thumbnail,
          plays: 0,
          wins: 0,
          winRate: 0,
          isPinned: true,
        };
      }
    }
    // Candidate with highest win rate with at least 5 plays
    const eligible = perGameStats.filter((g) => g.plays >= 5);
    if (eligible.length > 0) {
      const sorted = [...eligible].sort((a, b) => b.winRate - a.winRate || b.plays - a.plays);
      return { ...sorted[0], isPinned: false };
    }
    return null;
  }, [player.specialtyGameId, perGameStats, gamesById]);

  // Nemesis Game: Pinned or Lowest Win Rate (minimum 5 plays, winRate <= 40%)
  const nemesisGame = useMemo(() => {
    if (player.weaknessGameId) {
      const stat = perGameStats.find((g) => g.gameId === player.weaknessGameId);
      const storeGame = gamesById.get(player.weaknessGameId);
      if (stat) return { ...stat, isPinned: true };
      if (storeGame) {
        return {
          gameId: storeGame.id,
          gameName: storeGame.name,
          thumbnail: storeGame.thumbnail,
          plays: 0,
          wins: 0,
          winRate: 0,
          isPinned: true,
        };
      }
    }
    // Candidate with lowest win rate with at least 5 plays
    const eligible = perGameStats.filter((g) => g.plays >= 5 && g.winRate <= 40);
    if (eligible.length > 0) {
      const sorted = [...eligible].sort((a, b) => a.winRate - b.winRate || b.plays - a.plays);
      return { ...sorted[0], isPinned: false };
    }
    return null;
  }, [player.weaknessGameId, perGameStats, gamesById]);

  // Arch-Rival Calculation: Top Opponent by Co-occurrence
  const rivalInfo = useMemo(() => {
    const opponentCounts = new Map<
      string,
      { plays: number; playerWins: number; opponentWins: number }
    >();

    for (const s of playerSessions) {
      const isPlayerWin =
        s.players?.find((p) => p.playerId === player.id)?.isWinner || s.winnerId === player.id;

      for (const p of s.players || []) {
        if (p.playerId === player.id) continue;
        const cur = opponentCounts.get(p.playerId) || {
          plays: 0,
          playerWins: 0,
          opponentWins: 0,
        };
        cur.plays += 1;
        if (isPlayerWin) cur.playerWins += 1;
        if (p.isWinner || s.winnerId === p.playerId) cur.opponentWins += 1;
        opponentCounts.set(p.playerId, cur);
      }
    }

    let topRivalId = '';
    let maxPlays = 0;
    for (const [pid, stat] of opponentCounts.entries()) {
      if (stat.plays > maxPlays) {
        maxPlays = stat.plays;
        topRivalId = pid;
      }
    }

    if (!topRivalId) return null;
    const rivalPlayer = allPlayers.find((p) => p.id === topRivalId);
    const rivalStat = opponentCounts.get(topRivalId);
    return {
      player: rivalPlayer,
      plays: maxPlays,
      playerWins: rivalStat?.playerWins || 0,
      rivalWins: rivalStat?.opponentWins || 0,
    };
  }, [playerSessions, player.id, allPlayers]);

  // Filtered & Sorted breakdown list
  const filteredBreakdown = useMemo(() => {
    return perGameStats
      .filter((item) => {
        if (!breakdownSearch.trim()) return true;
        return item.gameName.toLowerCase().includes(breakdownSearch.toLowerCase());
      })
      .sort((a, b) => {
        if (breakdownSort === 'winRate') return b.winRate - a.winRate || b.plays - a.plays;
        if (breakdownSort === 'wins') return b.wins - a.wins || b.plays - a.plays;
        if (breakdownSort === 'name') return a.gameName.localeCompare(b.gameName);
        return b.plays - a.plays || b.wins - a.wins;
      });
  }, [perGameStats, breakdownSearch, breakdownSort]);

  const handleDelete = () => {
    if (!player) return;
    if (window.confirm(`Bạn có chắc muốn xóa hồ sơ người chơi "${player.name}"?`)) {
      const playerId = player.id;
      navigate('/players', { replace: true });
      setTimeout(() => {
        deletePlayer(playerId);
      }, 50);
    }
  };

  const playStyleInfo = getPlayStyleInfo(player.playStyle);

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Navigation & Actions Bar */}
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/players"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[var(--text-secondary)] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Danh Sách Người Chơi</span>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 shadow-sm"
            >
              <Edit3 className="w-4 h-4 mr-1.5" />
              Chỉnh Sửa Hồ Sơ
            </Button>

            <Button variant="danger" size="sm" onClick={handleDelete} title="Xóa người chơi này">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* HERO PROFILE CARD */}
        <Card className="p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden border-2 border-[var(--border-subtle)]">
          {/* Subtle signature color background glow */}
          <div
            style={{
              background: `radial-gradient(circle at top left, ${player.color}20, transparent 70%)`,
            }}
            className="absolute inset-0 pointer-events-none -z-10"
          />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative">
              <PlayerAvatar player={player} size="xl" className="shadow-2xl border-4" />
              <div
                style={{ backgroundColor: player.color }}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-[var(--bg-card)] flex items-center justify-center text-[10px] text-slate-950 font-bold"
              >
                ★
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
                  {player.name}
                </h1>
                {player.nickname && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    "{player.nickname}"
                  </span>
                )}
              </div>

              {/* Play Style Badge */}
              {playStyleInfo && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-bold text-white shadow-sm">
                  <span className="text-base">{playStyleInfo.emoji}</span>
                  <span className="text-amber-300">{playStyleInfo.label}</span>
                  <span className="text-[var(--text-muted)] font-normal hidden sm:inline">
                    · {playStyleInfo.tagline}
                  </span>
                </div>
              )}

              {/* Bio / Quote */}
              {player.bio && (
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] italic flex items-center gap-1.5 max-w-md">
                  <Quote className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>"{player.bio}"</span>
                </p>
              )}

              <p className="text-xs text-[var(--text-muted)] inline-flex items-center gap-1.5 pt-0.5">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                Gia nhập bàn đấu từ {formatDate(player.createdAt)}
              </p>
            </div>
          </div>

          {/* 5 INTERACTIVE QUICK STAT BADGES */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5 w-full lg:w-auto tabular-nums">
            {/* 1. Số Ván */}
            <div className="p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center min-w-[95px]">
              <span className="text-[11px] text-[var(--text-secondary)] block">Số Ván</span>
              <p className="font-display font-extrabold text-xl text-white mt-0.5">
                {totalPlays}
              </p>
            </div>

            {/* 2. Tỉ Lệ Thắng */}
            <div className="p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center min-w-[95px]">
              <span className="text-[11px] text-[var(--text-secondary)] block">Tỉ Lệ Thắng</span>
              <p className="font-display font-extrabold text-xl text-emerald-400 mt-0.5">
                {overallWinRate}%
              </p>
              <span className="text-[10px] text-[var(--text-muted)]">({totalWins} thắng)</span>
            </div>

            {/* 3. Chuỗi Thắng Kỷ Lục (Clickable) */}
            <div
              onClick={() => setActiveStreakType('win')}
              className="p-3 rounded-2xl bg-[var(--bg-surface)] border border-amber-500/30 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/15 text-center min-w-[105px] cursor-pointer transition-all select-none group"
              title="Nhấp để xem chi tiết chuỗi thắng liên tiếp và ván bắt đầu"
            >
              <div className="flex items-center justify-center gap-1 text-[11px] text-amber-400 font-bold group-hover:text-amber-300">
                <Flame className="w-3.5 h-3.5 fill-current text-orange-400" />
                <span>Chuỗi Thắng</span>
              </div>
              <p className="font-display font-black text-xl text-white mt-0.5 group-hover:text-amber-300 transition-colors">
                {streaks.longestWinStreak.count}W
              </p>
              <span className="text-[10px] text-amber-400/90 group-hover:underline flex items-center justify-center gap-0.5 mt-0.5 font-medium">
                Chi tiết <ChevronRight className="w-2.5 h-2.5" />
              </span>
            </div>

            {/* 4. Chuỗi Thua Kỷ Lục (Clickable) */}
            <div
              onClick={() => setActiveStreakType('loss')}
              className="p-3 rounded-2xl bg-[var(--bg-surface)] border border-rose-500/30 hover:border-rose-400 hover:shadow-lg hover:shadow-rose-500/15 text-center min-w-[105px] cursor-pointer transition-all select-none group"
              title="Nhấp để xem chi tiết chuỗi thua liên tiếp và ván bắt đầu"
            >
              <div className="flex items-center justify-center gap-1 text-[11px] text-rose-400 font-bold group-hover:text-rose-300">
                <CloudRain className="w-3.5 h-3.5 text-rose-400" />
                <span>Chuỗi Thua</span>
              </div>
              <p className="font-display font-black text-xl text-white mt-0.5 group-hover:text-rose-300 transition-colors">
                {streaks.longestLossStreak.count}L
              </p>
              <span className="text-[10px] text-rose-400/90 group-hover:underline flex items-center justify-center gap-0.5 mt-0.5 font-medium">
                Chi tiết <ChevronRight className="w-2.5 h-2.5" />
              </span>
            </div>

            {/* 5. Đối Thủ / Thắng Trận */}
            {rivalInfo && rivalInfo.player ? (
              <div className="p-3 rounded-2xl bg-[var(--bg-surface)] border border-purple-500/30 text-center min-w-[105px]">
                <span className="text-[11px] text-purple-300 block flex items-center justify-center gap-1">
                  <Swords className="w-3 h-3" /> Đối Thủ
                </span>
                <p className="font-display font-bold text-xs text-white truncate mt-1">
                  {rivalInfo.player.name}
                </p>
                <span className="text-[10px] text-amber-300 font-mono">
                  {rivalInfo.playerWins} - {rivalInfo.rivalWins}
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center min-w-[95px]">
                <span className="text-[11px] text-[var(--text-secondary)] block">Thắng Trận</span>
                <p className="font-display font-extrabold text-xl text-amber-400 mt-0.5">
                  {totalWins}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* 3 GAME IDENTITIES: FAVORITE, SIGNATURE, NEMESIS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. FAVORITE GAME */}
          <Card className="p-5 flex flex-col justify-between space-y-4 border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-[var(--bg-surface)] to-[var(--bg-surface)]">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-400">
                  <Heart className="w-4 h-4 fill-current" />
                  Game Yêu Thích
                </span>
                {favoriteGame?.isPinned && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Đã ghim
                  </span>
                )}
              </div>

              {favoriteGame ? (
                <div className="flex items-center gap-3">
                  {favoriteGame.thumbnail ? (
                    <img
                      src={favoriteGame.thumbnail}
                      alt={favoriteGame.gameName}
                      className="w-14 h-16 rounded-xl object-cover bg-slate-900 border border-amber-400/30 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-16 rounded-xl bg-amber-500/20 flex items-center justify-center text-2xl shrink-0">
                      🎲
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/collection/${favoriteGame.gameId}`}
                      className="font-display font-bold text-base text-white hover:text-amber-300 transition-colors truncate block"
                    >
                      {favoriteGame.gameName}
                    </Link>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 tabular-nums">
                      Đã chơi <strong className="text-white">{favoriteGame.plays} ván</strong> · Thắng{' '}
                      <strong className="text-emerald-400">{favoriteGame.winRate}%</strong>
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-muted)] py-4">
                  Chưa ghi nhận ván đấu nào để xác định game yêu thích.
                </p>
              )}
            </div>

            <div className="text-[11px] text-[var(--text-muted)] border-t border-[var(--border-subtle)] pt-2.5 flex items-center justify-between">
              <span>{favoriteGame?.isPinned ? 'Tự chọn ghim yêu thích' : 'Game chơi nhiều nhất'}</span>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="text-amber-400 hover:underline cursor-pointer"
              >
                Đổi game →
              </button>
            </div>
          </Card>

          {/* 2. SIGNATURE / STRONGEST GAME */}
          <Card className="p-5 flex flex-col justify-between space-y-4 border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 via-[var(--bg-surface)] to-[var(--bg-surface)]">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                  <Trophy className="w-4 h-4" />
                  Game Sở Trường
                </span>
                {signatureGame?.isPinned && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Đã ghim
                  </span>
                )}
              </div>

              {signatureGame ? (
                <div className="flex items-center gap-3">
                  {signatureGame.thumbnail ? (
                    <img
                      src={signatureGame.thumbnail}
                      alt={signatureGame.gameName}
                      className="w-14 h-16 rounded-xl object-cover bg-slate-900 border border-emerald-400/30 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-16 rounded-xl bg-emerald-500/20 flex items-center justify-center text-2xl shrink-0">
                      🏆
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/collection/${signatureGame.gameId}`}
                      className="font-display font-bold text-base text-white hover:text-emerald-300 transition-colors truncate block"
                    >
                      {signatureGame.gameName}
                    </Link>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 tabular-nums">
                      Tỉ lệ thắng: <strong className="text-emerald-400 font-bold">{signatureGame.winRate}%</strong>{' '}
                      ({signatureGame.wins}/{signatureGame.plays} ván)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-4 px-3 text-center rounded-xl bg-[var(--bg-elevated)]/40 border border-white/5 space-y-1">
                  <p className="text-xs text-[var(--text-secondary)] font-medium">
                    Chưa đủ dữ liệu (cần tối thiểu trên 5 ván)
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Cần chơi từ 5 ván trở lên để tránh sai lệch từ playtest / thử game, hoặc bạn có thể tự ghim game sở trường.
                  </p>
                </div>
              )}
            </div>

            <div className="text-[11px] text-[var(--text-muted)] border-t border-[var(--border-subtle)] pt-2.5 flex items-center justify-between">
              <span>{signatureGame?.isPinned ? 'Tự chọn sở trường' : 'Tỉ lệ thắng cao nhất (≥ 5 ván)'}</span>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="text-emerald-400 hover:underline cursor-pointer"
              >
                Ghim sở trường →
              </button>
            </div>
          </Card>

          {/* 3. NEMESIS / WEAKNESS GAME */}
          <Card className="p-5 flex flex-col justify-between space-y-4 border-rose-500/30 bg-gradient-to-b from-rose-500/10 via-[var(--bg-surface)] to-[var(--bg-surface)]">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-rose-400">
                  <Skull className="w-4 h-4" />
                  Game Sở Đoản (Kỵ Rơ)
                </span>
                {nemesisGame?.isPinned && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Đã ghim
                  </span>
                )}
              </div>

              {nemesisGame ? (
                <div className="flex items-center gap-3">
                  {nemesisGame.thumbnail ? (
                    <img
                      src={nemesisGame.thumbnail}
                      alt={nemesisGame.gameName}
                      className="w-14 h-16 rounded-xl object-cover bg-slate-900 border border-rose-400/30 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-16 rounded-xl bg-rose-500/20 flex items-center justify-center text-2xl shrink-0">
                      💀
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/collection/${nemesisGame.gameId}`}
                      className="font-display font-bold text-base text-white hover:text-rose-300 transition-colors truncate block"
                    >
                      {nemesisGame.gameName}
                    </Link>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 tabular-nums">
                      Thắng {nemesisGame.winRate}% ({nemesisGame.wins}/{nemesisGame.plays} ván) · Cần phục thù!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-4 px-3 text-center rounded-xl bg-[var(--bg-elevated)]/40 border border-white/5 space-y-1">
                  <p className="text-xs text-[var(--text-secondary)] font-medium">
                    Chưa phát hiện game kỵ rơ (≥ 5 ván)
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Chưa có tựa game nào chơi từ 5 ván trở lên có tỉ lệ thắng thấp (≤ 40%), hoặc bạn có thể tự ghim game sợ nhất.
                  </p>
                </div>
              )}
            </div>

            <div className="text-[11px] text-[var(--text-muted)] border-t border-[var(--border-subtle)] pt-2.5 flex items-center justify-between">
              <span>{nemesisGame?.isPinned ? 'Tự chọn sở đoản' : 'Tỉ lệ thắng thấp nhất (≥ 5 ván)'}</span>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="text-rose-400 hover:underline cursor-pointer"
              >
                Ghim sở đoản →
              </button>
            </div>
          </Card>
        </div>

        {/* PER-GAME BREAKDOWN TABLE WITH SEARCH & SORT */}
        <Card className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display font-bold text-lg text-white">
                Thống Kê Chi Tiết Từng Tựa Game
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Đã tham gia {perGameStats.length} tựa game khác nhau
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Input
                placeholder="Tìm game trong lịch sử..."
                value={breakdownSearch}
                onChange={(e) => setBreakdownSearch(e.target.value)}
                leftIcon={<Search className="w-3.5 h-3.5 text-[var(--text-secondary)]" />}
                className="text-xs py-1.5 w-44 sm:w-56"
              />

              <select
                aria-label="Sắp xếp danh sách game"
                value={breakdownSort}
                onChange={(e) => setBreakdownSort(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-white cursor-pointer focus:outline-none"
              >
                <option value="plays">Nhiều ván nhất</option>
                <option value="winRate">Tỉ lệ thắng cao nhất</option>
                <option value="wins">Thắng nhiều nhất</option>
                <option value="name">Tên A-Z</option>
              </select>
            </div>
          </div>

          {filteredBreakdown.length > 0 ? (
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {filteredBreakdown.map((item) => (
                <div
                  key={item.gameId}
                  className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-amber-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors group"
                >
                  <Link
                    to={`/collection/${item.gameId}`}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.gameName}
                        className="w-10 h-10 rounded-lg object-cover bg-slate-900 border border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-lg shrink-0">
                        🎲
                      </div>
                    )}

                    <div className="min-w-0">
                      <h4 className="font-display font-bold text-sm text-white group-hover:text-amber-300 transition-colors truncate">
                        {item.gameName}
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)] tabular-nums">
                        {item.plays} ván · {item.wins} chiến thắng
                      </p>
                    </div>
                  </Link>

                  {/* Win Rate Progress Bar */}
                  <div className="flex items-center gap-3 sm:w-48 shrink-0">
                    <div className="flex-1">
                      <div className="w-full h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                        <div
                          style={{ width: `${item.winRate}%` }}
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            item.winRate >= 50
                              ? 'bg-emerald-400'
                              : item.winRate >= 30
                              ? 'bg-amber-400'
                              : 'bg-rose-400'
                          )}
                        />
                      </div>
                    </div>
                    <span
                      className={cn(
                        'text-xs font-mono font-bold w-12 text-right',
                        item.winRate >= 50
                          ? 'text-emerald-400'
                          : item.winRate >= 30
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      )}
                    >
                      {item.winRate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-[var(--text-muted)]">
              Không tìm thấy tựa game nào phù hợp với từ khóa tìm kiếm.
            </div>
          )}
        </Card>

        {/* RECENT SESSIONS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-xl text-white">
              Ván Đấu Gần Đây (5 Ván Mới Nhất)
            </h2>
            <Link
              to={`/sessions?playerId=${player.id}`}
              className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1"
            >
              Xem tất cả {playerSessions.length} ván <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {playerSessions.length > 0 ? (
            <div className="space-y-3">
              {playerSessions.slice(0, 5).map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  playersById={playersById}
                />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center text-xs text-[var(--text-muted)]">
              Chưa có ván đấu nào được ghi nhận cho người chơi này.
            </Card>
          )}
        </div>

        {/* EDIT PLAYER MODAL */}
        <PlayerFormModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          player={player}
        />

        {/* STREAK DETAIL MODAL (WIN & LOSS STREAKS DRILLDOWN) */}
        <StreakDetailModal
          isOpen={activeStreakType !== null}
          onClose={() => setActiveStreakType(null)}
          player={player}
          type={activeStreakType || 'win'}
          streakData={
            activeStreakType === 'loss'
              ? streaks.longestLossStreak
              : streaks.longestWinStreak
          }
        />
      </div>
    </PageTransition>
  );
};

export default PlayerDetailPage;
