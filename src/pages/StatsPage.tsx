import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Trophy,
  Clock,
  Flame,
  BarChart3,
  Dices,
  Users,
  Swords,
  MapPin,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Crown,
  Medal,
  Award,
  Play,
  Search,
  ArrowUpRight,
  ChevronRight,
  Filter,
  Check,
  RotateCcw,
} from 'lucide-react';
import { PageTransition } from '../components/layout/PageTransition';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PlayerChip } from '../components/player/PlayerChip';
import { PlayerAvatar } from '../components/player/PlayerAvatar';
import { StreakDetailModal } from '../components/player/StreakDetailModal';
import { cn } from '../components/ui/cn';
import { useGameStore } from '../store/useGameStore';
import { useSessionStore } from '../store/useSessionStore';
import { usePlayerStore } from '../store/usePlayerStore';
import {
  calculateGameStats,
  calculateHeadToHead,
  calculateLongestWinStreak,
  calculatePlayerStreaks,
  StreakData,
  formatDate,
  formatDuration,
} from '../lib/utils';
import { Player } from '../types';

const GameThumbBox: React.FC<{
  src?: string;
  alt: string;
  fallbackIcon: React.ReactNode;
  fallbackBg?: string;
}> = ({ src, alt, fallbackIcon, fallbackBg = 'bg-[var(--bg-elevated)]' }) => {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="w-16 h-20 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-md relative group-hover:scale-105 transition-transform bg-[var(--bg-elevated)]">
      {src && !hasError ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div
          className={cn(
            'w-full h-full flex flex-col items-center justify-center text-center p-1',
            fallbackBg
          )}
        >
          {fallbackIcon}
        </div>
      )}
    </div>
  );
};

type StatsTab = 'overview' | 'years' | 'locations' | 'by_player' | 'by_game';

export const StatsPage: React.FC = () => {
  const games = useGameStore((s) => s.games);
  const sessions = useSessionStore((s) => s.sessions);
  const players = usePlayerStore((s) => s.players);

  const [activeTab, setActiveTab] = useState<StatsTab>('overview');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedGameId, setSelectedGameId] = useState<string>(games[0]?.id || '');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(() =>
    players.slice(0, 2).map((p) => p.id)
  );

  // Time filter for Overview & deep insights
  // [] = all time
  // ['2026'] = year 2026
  // ['2025', '2026'] = range 2025 - 2026
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [isCustomMultiYearOpen, setIsCustomMultiYearOpen] = useState(false);

  // Available unique years from all sessions
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => {
      if (s.datePlayed && s.datePlayed.length >= 4) {
        const y = s.datePlayed.slice(0, 4);
        if (!isNaN(Number(y))) set.add(y);
      }
    });
    return Array.from(set).sort().reverse();
  }, [sessions]);

  // Overview sessions filtered by selectedYears
  const overviewSessions = useMemo(() => {
    if (selectedYears.length === 0) return sessions;
    return sessions.filter((s) => {
      if (!s.datePlayed || s.datePlayed.length < 4) return false;
      const y = s.datePlayed.slice(0, 4);
      return selectedYears.includes(y);
    });
  }, [sessions, selectedYears]);

  const timeFilterLabel = useMemo(() => {
    if (selectedYears.length === 0) return 'Toàn bộ thời gian';
    if (selectedYears.length === 1) return `Năm ${selectedYears[0]}`;
    const sorted = [...selectedYears].sort();
    return `Giai đoạn ${sorted.join(' - ')}`;
  }, [selectedYears]);

  const [showPlayedGamesModal, setShowPlayedGamesModal] = useState(false);
  const [playedGamesTab, setPlayedGamesTab] = useState<'played' | 'unplayed'>('played');
  const [playedGamesSearch, setPlayedGamesSearch] = useState('');

  const [selectedStreakPlayer, setSelectedStreakPlayer] = useState<Player | null>(null);
  const [selectedStreakData, setSelectedStreakData] = useState<StreakData | null>(null);

  // --- 1. OVERVIEW & H-INDEX METRICS ---
  const playCountByGame = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of overviewSessions) {
      map.set(s.gameId, (map.get(s.gameId) || 0) + 1);
    }
    return map;
  }, [overviewSessions]);

  // Ranked games by play count
  const sortedGamesByPlays = useMemo(() => {
    // Collect all games (from games store or from sessions directly if custom)
    const map = new Map<string, { id: string; name: string; thumbnail?: string; plays: number }>();

    for (const g of games) {
      map.set(g.id, {
        id: g.id,
        name: g.name,
        thumbnail: g.thumbnail || g.image,
        plays: playCountByGame.get(g.id) || 0,
      });
    }

    for (const s of overviewSessions) {
      if (!map.has(s.gameId)) {
        map.set(s.gameId, {
          id: s.gameId,
          name: s.gameName,
          thumbnail: s.gameThumbnail,
          plays: playCountByGame.get(s.gameId) || 0,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.plays - a.plays);
  }, [games, overviewSessions, playCountByGame]);

  const mostPlayedGame = sortedGamesByPlays.find((g) => g.plays > 0) || sortedGamesByPlays[0];
  const leastPlayedGame = sortedGamesByPlays.filter((g) => g.plays > 0).slice(-1)[0];

  // H-Index computation
  const { hIndex, hIndexClub, nextHIndexGame } = useMemo(() => {
    let h = 0;
    for (let i = 0; i < sortedGamesByPlays.length; i++) {
      if (sortedGamesByPlays[i].plays >= i + 1) {
        h = i + 1;
      } else {
        break;
      }
    }
    return {
      hIndex: h,
      hIndexClub: sortedGamesByPlays.slice(0, h),
      nextHIndexGame: sortedGamesByPlays[h], // index h is (h+1)-th game
    };
  }, [sortedGamesByPlays]);

  const playedGamesList = useMemo(() => {
    return sortedGamesByPlays.filter((g) => g.plays > 0);
  }, [sortedGamesByPlays]);

  const unplayedGamesList = useMemo(() => {
    return sortedGamesByPlays.filter((g) => g.plays === 0);
  }, [sortedGamesByPlays]);

  const filteredModalGames = useMemo(() => {
    const list = playedGamesTab === 'played' ? playedGamesList : unplayedGamesList;
    if (!playedGamesSearch.trim()) return list;
    const q = playedGamesSearch.toLowerCase();
    return list.filter((item) => item.name.toLowerCase().includes(q));
  }, [playedGamesTab, playedGamesList, unplayedGamesList, playedGamesSearch]);

  // Session duration extremes
  const sortedByDuration = useMemo(() => {
    return [...overviewSessions]
      .filter((s) => (s.durationMinutes || 0) > 0)
      .sort((a, b) => (b.durationMinutes || 0) - (a.durationMinutes || 0));
  }, [overviewSessions]);

  const longestSession = sortedByDuration[0];
  const shortestSession = sortedByDuration[sortedByDuration.length - 1];

  const longestSessionThumbnail = useMemo(() => {
    if (!longestSession) return undefined;
    if (longestSession.gameThumbnail) return longestSession.gameThumbnail;
    const g = games.find((item) => item.id === longestSession.gameId);
    return g?.thumbnail || g?.image;
  }, [longestSession, games]);

  const shortestSessionThumbnail = useMemo(() => {
    if (!shortestSession) return undefined;
    if (shortestSession.gameThumbnail) return shortestSession.gameThumbnail;
    const g = games.find((item) => item.id === shortestSession.gameId);
    return g?.thumbnail || g?.image;
  }, [shortestSession, games]);

  // Total play time in hours
  const totalHoursPlayed = useMemo(() => {
    const mins = overviewSessions.reduce((sum, s) => sum + (s.durationMinutes || 60), 0);
    return Math.round(mins / 60);
  }, [overviewSessions]);

  // Winning streaks per player
  const playerStreaks = useMemo(() => {
    return players
      .map((p) => ({
        player: p,
        streak: calculateLongestWinStreak(p.id, overviewSessions),
      }))
      .filter((x) => x.streak > 0)
      .sort((a, b) => b.streak - a.streak);
  }, [players, overviewSessions]);

  // Monthly play frequency (grouped chronologically)
  const monthlyFrequency = useMemo(() => {
    const monthCounts = new Map<string, number>();
    const sortedChron = [...overviewSessions].sort(
      (a, b) => new Date(a.datePlayed).getTime() - new Date(b.datePlayed).getTime()
    );
    for (const s of sortedChron) {
      const d = new Date(s.datePlayed);
      if (!isNaN(d.getTime())) {
        const label = d.toLocaleDateString('vi-VN', {
          month: 'short',
          year: '2-digit',
        });
        monthCounts.set(label, (monthCounts.get(label) || 0) + 1);
      }
    }
    return Array.from(monthCounts.entries()).map(([month, count]) => ({
      month,
      count,
    }));
  }, [overviewSessions]);

  const maxMonthCount = Math.max(...monthlyFrequency.map((m) => m.count), 1);

  // --- 2. YEAR IN REVIEW METRICS ---
  const yearFilteredSessions = useMemo(() => {
    if (selectedYear === 'all') return sessions;
    return sessions.filter((s) => s.datePlayed && s.datePlayed.startsWith(selectedYear));
  }, [sessions, selectedYear]);

  const yearStats = useMemo(() => {
    const totalSessions = yearFilteredSessions.length;
    const totalMinutes = yearFilteredSessions.reduce((sum, s) => sum + (s.durationMinutes || 60), 0);
    const hours = Math.round(totalMinutes / 60);

    // Top 3 games of the year
    const gameMap = new Map<string, { id: string; name: string; thumbnail?: string; count: number }>();
    yearFilteredSessions.forEach((s) => {
      const entry = gameMap.get(s.gameId) || {
        id: s.gameId,
        name: s.gameName,
        thumbnail: s.gameThumbnail,
        count: 0,
      };
      entry.count += 1;
      gameMap.set(s.gameId, entry);
    });
    const topGames = Array.from(gameMap.values()).sort((a, b) => b.count - a.count).slice(0, 5);

    // Top winner of the year
    const winnerMap = new Map<string, { playerId: string; playerName: string; wins: number }>();
    yearFilteredSessions.forEach((s) => {
      s.players.forEach((p) => {
        if (p.isWinner || s.winnerId === p.playerId) {
          const entry = winnerMap.get(p.playerId) || {
            playerId: p.playerId,
            playerName: p.playerName,
            wins: 0,
          };
          entry.wins += 1;
          winnerMap.set(p.playerId, entry);
        }
      });
    });
    const topWinners = Array.from(winnerMap.values()).sort((a, b) => b.wins - a.wins).slice(0, 3);

    return {
      totalSessions,
      hours,
      topGames,
      topWinners,
    };
  }, [yearFilteredSessions]);

  // --- 3. LOCATION & VENUE STATS ---
  const locationStats = useMemo(() => {
    const map = new Map<string, { count: number; userWins: number }>();

    sessions.forEach((s) => {
      const loc = s.location || 'Chưa ghi nhận địa điểm';
      const entry = map.get(loc) || { count: 0, userWins: 0 };
      entry.count += 1;
      const isUserWin = s.players.some(
        (p) => (p.isWinner || s.winnerId === p.playerId) && (p.playerName === 'Heo' || p.playerId === 'player-3')
      );
      if (isUserWin) entry.userWins += 1;
      map.set(loc, entry);
    });

    return Array.from(map.entries())
      .map(([location, data]) => ({
        location,
        count: data.count,
        percentage: Math.round((data.count / sessions.length) * 100),
        userWins: data.userWins,
        winRate: Math.round((data.userWins / data.count) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [sessions]);

  // --- 4. PLAYER LEADERBOARD & HEAD-TO-HEAD ---
  const playerLeaderboard = useMemo(() => {
    const statsMap = new Map<string, { player: Player; plays: number; wins: number }>();

    players.forEach((p) => {
      statsMap.set(p.id, { player: p, plays: 0, wins: 0 });
    });

    sessions.forEach((s) => {
      s.players.forEach((p) => {
        const entry = statsMap.get(p.playerId);
        if (entry) {
          entry.plays += 1;
          if (p.isWinner || s.winnerId === p.playerId) {
            entry.wins += 1;
          }
        }
      });
    });

    return Array.from(statsMap.values())
      .filter((x) => x.plays > 0)
      .map((x) => ({
        ...x,
        winRate: Math.round((x.wins / x.plays) * 100),
      }))
      .sort((a, b) => b.plays - a.plays);
  }, [players, sessions]);

  // Head-to-Head calculation
  const activeComparisonPlayers = useMemo(
    () => players.filter((p) => selectedPlayerIds.includes(p.id)),
    [players, selectedPlayerIds]
  );

  const headToHead = useMemo(
    () => calculateHeadToHead(activeComparisonPlayers, sessions),
    [activeComparisonPlayers, sessions]
  );

  const togglePlayerSelection = (id: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // --- 5. BY GAME STATS ---
  const activeGame = games.find((g) => g.id === selectedGameId) || games[0];
  const activeGameSessions = useMemo(
    () => (activeGame ? sessions.filter((s) => s.gameId === activeGame.id) : []),
    [sessions, activeGame]
  );
  const activeGameStats = useMemo(
    () => calculateGameStats(activeGameSessions),
    [activeGameSessions]
  );

  return (
    <PageTransition>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Title & Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[var(--text-primary)] flex items-center gap-2.5">
              <span>📈</span>
              Thống Kê Chuyên Sâu &amp; Insights
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
              Phân tích toàn diện chỉ số H-Index, kỷ lục ván đấu, quán quen và đối đầu giữa các người chơi
            </p>
          </div>

          <div className="text-xs font-mono px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--accent-neon)] w-fit">
            Tổng cộng: <strong>{sessions.length}</strong> ván đấu · <strong>{totalHoursPlayed}h</strong> chơi
          </div>
        </div>

        {/* Navigation Tabs (5 Tabs with sliding spring pill) */}
        <div
          role="tablist"
          className="flex p-1.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] max-w-full overflow-x-auto gap-1"
        >
          {[
            { id: 'overview', label: 'Tổng Quan & H-Index', icon: BarChart3, iconColor: '' },
            { id: 'years', label: 'Theo Năm & Xu Hướng', icon: Calendar, iconColor: 'text-amber-400' },
            { id: 'locations', label: 'Địa Điểm & Quán Quen', icon: MapPin, iconColor: 'text-rose-400' },
            { id: 'by_player', label: 'Bảng Xếp Hạng & Đối Đầu', icon: Users, iconColor: 'text-cyan-400' },
            { id: 'by_game', label: 'Chi Tiết Từng Game', icon: Dices, iconColor: 'text-emerald-400' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as StatsTab)}
                className={cn(
                  'relative min-h-[40px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 select-none',
                  isActive
                    ? 'text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="stats-nav-pill"
                    className="absolute inset-0 rounded-xl bg-[image:var(--gradient-hero)] shadow-lg shadow-[var(--accent-glow)] -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  />
                )}
                <Icon className={cn('w-4 h-4 shrink-0 relative z-10', isActive ? 'text-white' : tab.iconColor)} />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW & H-INDEX */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* TIME FILTER BAR */}
            <div className="p-4 rounded-2xl bg-[var(--bg-card)]/90 border border-[var(--border-subtle)] space-y-3 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5 mr-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    Lọc Thời Gian:
                  </span>

                  {/* Preset: All time */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedYears([]);
                      setIsCustomMultiYearOpen(false);
                    }}
                    className={cn(
                      'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border select-none',
                      selectedYears.length === 0
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white hover:border-white/20'
                    )}
                  >
                    Tất Cả ({sessions.length})
                  </button>

                  {/* Preset: Individual available years (e.g. 2026, 2025) */}
                  {availableYears.map((yr) => {
                    const isSelected = selectedYears.length === 1 && selectedYears[0] === yr;
                    const count = sessions.filter((s) => s.datePlayed && s.datePlayed.startsWith(yr)).length;
                    return (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => {
                          setSelectedYears([yr]);
                          setIsCustomMultiYearOpen(false);
                        }}
                        className={cn(
                          'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border select-none',
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                            : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white hover:border-white/20'
                        )}
                      >
                        Năm {yr} ({count})
                      </button>
                    );
                  })}

                  {/* Preset: Multi-year range (e.g. 2025 - 2026) if >= 2 years */}
                  {availableYears.length >= 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedYears([availableYears[1], availableYears[0]]);
                        setIsCustomMultiYearOpen(false);
                      }}
                      className={cn(
                        'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border select-none',
                        selectedYears.length === 2 &&
                          selectedYears.includes(availableYears[0]) &&
                          selectedYears.includes(availableYears[1])
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                          : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white hover:border-white/20'
                      )}
                    >
                      {availableYears[1]} - {availableYears[0]} (2 Năm Gần Nhất)
                    </button>
                  )}

                  {/* Multi-select toggle button */}
                  {availableYears.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setIsCustomMultiYearOpen((v) => !v)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border select-none flex items-center gap-1.5',
                        isCustomMultiYearOpen || selectedYears.length > 2
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white'
                      )}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span>Tùy Chọn Năm...</span>
                    </button>
                  )}
                </div>

                {/* Current Filter Status */}
                <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                  <span>Đang xem:</span>
                  <span className="font-bold text-white px-2 py-0.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                    {timeFilterLabel}
                  </span>
                  <span className="font-mono text-amber-400 font-bold">
                    ({overviewSessions.length} ván)
                  </span>
                </div>
              </div>

              {/* Custom Multi-Year Selection Drawer */}
              {isCustomMultiYearOpen && (
                <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-2 animate-in fade-in duration-150">
                  <span className="text-xs text-[var(--text-muted)] font-medium mr-1">
                    Tích chọn các năm muốn gộp dữ liệu:
                  </span>
                  {availableYears.map((yr) => {
                    const isChecked = selectedYears.includes(yr);
                    const yrCount = sessions.filter((s) => s.datePlayed && s.datePlayed.startsWith(yr)).length;
                    return (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => {
                          setSelectedYears((prev) =>
                            prev.includes(yr)
                              ? prev.filter((x) => x !== yr)
                              : [...prev, yr]
                          );
                        }}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition-colors',
                          isChecked
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                            : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white'
                        )}
                      >
                        <div
                          className={cn(
                            'w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px]',
                            isChecked
                              ? 'bg-amber-500 border-amber-500 text-slate-950 font-bold'
                              : 'border-white/30'
                          )}
                        >
                          {isChecked && '✓'}
                        </div>
                        <span>{yr} ({yrCount} ván)</span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setSelectedYears([...availableYears])}
                    className="text-[11px] font-bold text-amber-400 hover:underline ml-2 cursor-pointer"
                  >
                    Chọn tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedYears([])}
                    className="text-[11px] font-bold text-rose-400 hover:underline ml-1 cursor-pointer"
                  >
                    Xóa chọn
                  </button>
                </div>
              )}
            </div>

            {/* H-INDEX SPECIAL HERO BANNER */}
            <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-purple-600/20 border-2 border-amber-500/40 shadow-2xl overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3 max-w-xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
                    <Award className="w-3.5 h-3.5 fill-current" />
                    BoardGame Geek Standard Metric · {timeFilterLabel}
                  </div>
                  <h2 className="font-display font-black text-3xl sm:text-4xl text-white">
                    Chỉ Số H-Index:{' '}
                    <span className="text-amber-400 underline decoration-amber-400/50">
                      H-{hIndex}
                    </span>
                  </h2>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    Trong {timeFilterLabel.toLowerCase()}, bạn đã chơi tối thiểu <strong>{hIndex} tựa game khác nhau</strong>, mỗi game ít nhất{' '}
                    <strong>{hIndex} lần</strong>!
                  </p>

                  {/* Progress towards next H-Index */}
                  {nextHIndexGame && (
                    <div className="pt-2">
                      <div className="flex justify-between text-xs font-bold text-white mb-1.5">
                        <span>Tiến trình mở khóa H-{hIndex + 1}:</span>
                        <span className="text-amber-300 font-mono">
                          {nextHIndexGame.name} ({nextHIndexGame.plays}/{hIndex + 1} ván)
                        </span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-black/40 overflow-hidden border border-white/10">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(100, Math.round((nextHIndexGame.plays / (hIndex + 1)) * 100))}%`,
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                        Chỉ cần thêm <strong>{(hIndex + 1) - nextHIndexGame.plays} ván nữa</strong> cho {nextHIndexGame.name} là bạn sẽ thăng cấp lên <strong>H-{hIndex + 1}</strong>!
                      </p>
                    </div>
                  )}
                </div>

                {/* H-Index Club Games Preview */}
                <div className="bg-[var(--bg-elevated)]/80 border border-[var(--border-subtle)] rounded-2xl p-4 lg:w-80 space-y-2.5">
                  <span className="text-xs font-bold text-[var(--accent-neon)] uppercase tracking-wider block">
                    Danh Sách Game Trong CLB H-{hIndex} ({hIndexClub.length})
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {hIndexClub.length > 0 ? (
                      hIndexClub.map((g, i) => (
                        <div
                          key={g.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs"
                        >
                          <span className="font-bold text-[var(--text-primary)] truncate max-w-[170px]">
                            #{i + 1}. {g.name}
                          </span>
                          <span className="font-mono font-black text-amber-400 shrink-0">
                            {g.plays} ván
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[var(--text-muted)] italic py-2 text-center">
                        Chưa có game nào đạt H-{hIndex} trong khoảng thời gian này
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            {overviewSessions.length === 0 ? (
              <Card className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center text-2xl mx-auto">
                  📅
                </div>
                <h3 className="font-display font-bold text-lg text-white">
                  Không Có Ván Chơi Nào
                </h3>
                <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                  Không tìm thấy ván chơi nào được ghi nhận trong {timeFilterLabel.toLowerCase()}.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setSelectedYears([]);
                    setIsCustomMultiYearOpen(false);
                  }}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Xem Toàn Bộ Lịch Sử ({sessions.length} ván)
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
                {/* 1. Most Played Game Card */}
                {mostPlayedGame && (
                  <Link
                    to={`/collection/${mostPlayedGame.id}`}
                    className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-card)]/90 border border-amber-500/30 hover:border-amber-400/60 hover:shadow-xl hover:shadow-amber-500/10 transition-all group cursor-pointer flex gap-3.5 items-center select-none"
                  >
                    <GameThumbBox
                      src={mostPlayedGame.thumbnail}
                      alt={mostPlayedGame.name}
                      fallbackIcon={<Trophy className="w-7 h-7 text-amber-400" />}
                      fallbackBg="bg-amber-500/15 border-amber-500/30"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[var(--accent-neon)] inline-flex items-center gap-1">
                          <Trophy className="w-3.5 h-3.5" />
                          Game Cày Nhiều Nhất
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </div>
                      <h3 className="font-display font-bold text-base text-white truncate block mt-0.5 group-hover:text-amber-300 transition-colors">
                        {mostPlayedGame.name}
                      </h3>
                      <p className="text-xs text-amber-300 font-mono font-bold mt-0.5">
                        {mostPlayedGame.plays} ván đã chơi
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">
                        {((mostPlayedGame.plays / Math.max(1, overviewSessions.length)) * 100).toFixed(0)}% ván trong {timeFilterLabel.toLowerCase()}
                      </p>
                    </div>
                  </Link>
                )}

                {/* 2. Total Games Played from Collection */}
                <Card
                  onClick={() => setShowPlayedGamesModal(true)}
                  className="p-4 sm:p-5 flex gap-3.5 items-center cursor-pointer hover:border-amber-400/60 hover:shadow-xl hover:shadow-amber-500/10 transition-all group select-none"
                >
                  <div className="w-16 h-20 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex flex-col items-center justify-center shrink-0">
                    <Dices className="w-7 h-7" />
                    <span className="text-[9px] font-extrabold uppercase mt-1 tracking-wider">Kho Game</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#94a3b8] group-hover:text-amber-300 transition-colors">
                        Tựa Game Đã Chơi
                      </span>
                      <span className="text-xs font-bold text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                        Xem <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                    <p className="font-display font-black text-2xl text-white mt-0.5">
                      {sortedGamesByPlays.filter((g) => g.plays > 0).length} / {games.length}
                    </p>
                    <p className="text-[11px] text-[#94a3b8] mt-0.5 group-hover:text-[var(--text-secondary)] transition-colors truncate">
                      {(
                        (sortedGamesByPlays.filter((g) => g.plays > 0).length /
                          Math.max(1, games.length)) *
                        100
                      ).toFixed(0)}
                      % kho đã chơi · {sortedGamesByPlays.filter((g) => g.plays === 0).length} chưa chơi
                    </p>
                  </div>
                </Card>

                {/* 3. Longest Session Card with Game Thumbnail */}
                {longestSession ? (
                  <Link
                    to={`/sessions/${longestSession.id}`}
                    className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-card)]/90 border border-[var(--border-subtle)] hover:border-[#22d3ee]/60 hover:shadow-xl hover:shadow-[#22d3ee]/10 transition-all group cursor-pointer flex gap-3.5 items-center select-none"
                  >
                    <GameThumbBox
                      src={longestSessionThumbnail}
                      alt={longestSession.gameName}
                      fallbackIcon={<Clock className="w-7 h-7 text-[#22d3ee]" />}
                      fallbackBg="bg-cyan-500/15 border-cyan-500/30"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#22d3ee] inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Ván Chơi Dài Nhất
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#22d3ee] group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </div>
                      <p className="font-display font-black text-2xl text-white mt-0.5">
                        {formatDuration(longestSession.durationMinutes)}
                      </p>
                      <h4 className="font-display font-bold text-sm text-white truncate group-hover:text-[#22d3ee] transition-colors">
                        {longestSession.gameName}
                      </h4>
                      <p className="text-[11px] text-[#94a3b8] truncate mt-0.5">
                        {formatDate(longestSession.datePlayed)}
                        {longestSession.location ? ` · ${longestSession.location}` : ''}
                      </p>
                    </div>
                  </Link>
                ) : (
                  <div className="p-4 rounded-2xl bg-[var(--bg-card)]/50 border border-[var(--border-subtle)] flex items-center justify-center text-xs text-[var(--text-muted)] italic">
                    Chưa có ván đấu nào có ghi nhận thời gian
                  </div>
                )}

                {/* 4. Shortest Session Card with Game Thumbnail */}
                {shortestSession ? (
                  <Link
                    to={`/sessions/${shortestSession.id}`}
                    className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-card)]/90 border border-[var(--border-subtle)] hover:border-emerald-400/60 hover:shadow-xl hover:shadow-emerald-500/10 transition-all group cursor-pointer flex gap-3.5 items-center select-none"
                  >
                    <GameThumbBox
                      src={shortestSessionThumbnail}
                      alt={shortestSession.gameName}
                      fallbackIcon={<Clock className="w-7 h-7 text-emerald-400" />}
                      fallbackBg="bg-emerald-500/15 border-emerald-500/30"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-400 inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Ván Chơi Nhanh Nhất
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </div>
                      <p className="font-display font-black text-2xl text-white mt-0.5">
                        {formatDuration(shortestSession.durationMinutes)}
                      </p>
                      <h4 className="font-display font-bold text-sm text-white truncate group-hover:text-emerald-300 transition-colors">
                        {shortestSession.gameName}
                      </h4>
                      <p className="text-[11px] text-[#94a3b8] truncate mt-0.5">
                        {formatDate(shortestSession.datePlayed)}
                        {shortestSession.location ? ` · ${shortestSession.location}` : ''}
                      </p>
                    </div>
                  </Link>
                ) : (
                  <div className="p-4 rounded-2xl bg-[var(--bg-card)]/50 border border-[var(--border-subtle)] flex items-center justify-center text-xs text-[var(--text-muted)] italic">
                    Chưa có ván đấu nào có ghi nhận thời gian
                  </div>
                )}
              </div>
            )}

            {/* Monthly Play Frequency & Winning Streaks */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Monthly Play Frequency Bar Chart */}
              <Card className="lg:col-span-8 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display font-bold text-xl text-white">
                      Tần Suất Chơi Theo Tháng
                    </h2>
                    <p className="text-xs text-[#94a3b8]">
                      Lịch sử ghi nhận qua các tháng (cuộn ngang để xem toàn bộ)
                    </p>
                  </div>
                  <span className="text-xs font-mono text-amber-400 font-bold bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                    Đỉnh: {maxMonthCount} ván/tháng
                  </span>
                </div>

                <div className="overflow-x-auto pb-2">
                  <div className="h-56 min-w-[700px] flex items-end gap-3 pt-6 pb-2 px-2 border-b border-white/10">
                    {monthlyFrequency.map((item) => {
                      const heightPct = Math.max(
                        Math.round((item.count / maxMonthCount) * 100),
                        8
                      );
                      return (
                        <div
                          key={item.month}
                          className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer"
                        >
                          <span className="font-mono text-[10px] font-bold text-[var(--accent-neon)] group-hover:scale-125 transition-transform tabular-nums">
                            {item.count}
                          </span>
                          <div
                            style={{ height: `${heightPct}%` }}
                            className="w-full min-w-[16px] max-w-[32px] rounded-t-lg bg-[image:var(--gradient-hero)] shadow-md group-hover:brightness-125 transition-all duration-300"
                          />
                          <span className="text-[10px] text-[#94a3b8] font-medium whitespace-nowrap">
                            {item.month}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>

              {/* Best Winning Streaks */}
              <Card className="lg:col-span-4 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-400" />
                  <div>
                    <h2 className="font-display font-bold text-lg text-white">
                      Chuỗi Thắng Dài Nhất
                    </h2>
                    <p className="text-xs text-[#94a3b8]">Số ván thắng liên tiếp</p>
                  </div>
                </div>

                <div className="space-y-2 tabular-nums">
                  {playerStreaks.slice(0, 6).map(({ player, streak }) => (
                    <div
                      key={player.id}
                      onClick={() => {
                        const sDetails = calculatePlayerStreaks(player.id, sessions);
                        setSelectedStreakPlayer(player);
                        setSelectedStreakData(sDetails.longestWinStreak);
                      }}
                      className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-surface)] border border-white/[0.06] hover:border-amber-400/50 hover:shadow-md transition-all cursor-pointer group select-none"
                      title="Nhấp để xem chi tiết chuỗi thắng và ván bắt đầu"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <PlayerAvatar player={player} size="sm" />
                        <span className="font-display font-bold text-xs text-white truncate group-hover:text-amber-300 transition-colors">
                          {player.name}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-xs text-orange-300 shrink-0 flex items-center gap-1 group-hover:underline">
                        🔥 {streak} ván liên tiếp <ChevronRight className="w-3 h-3 opacity-60" />
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: YEAR IN REVIEW & TRENDS */}
        {/* ========================================================= */}
        {activeTab === 'years' && (
          <div className="space-y-6">
            {/* Year Selector Tabs with sliding spring pill */}
            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] w-fit flex-wrap">
              <span className="text-xs font-bold text-[var(--text-secondary)] px-2">Chọn năm:</span>
              <button
                type="button"
                onClick={() => setSelectedYear('all')}
                className={cn(
                  'relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer select-none',
                  selectedYear === 'all'
                    ? 'text-white'
                    : 'text-[var(--text-secondary)] hover:text-white'
                )}
              >
                {selectedYear === 'all' && (
                  <motion.span
                    layoutId="stats-year-pill"
                    className="absolute inset-0 rounded-xl bg-[image:var(--gradient-hero)] shadow-md -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  />
                )}
                <span className="relative z-10">Tất Cả Các Năm</span>
              </button>
              {availableYears.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(yr)}
                  className={cn(
                    'relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer select-none',
                    selectedYear === yr
                      ? 'text-white'
                      : 'text-[var(--text-secondary)] hover:text-white'
                  )}
                >
                  {selectedYear === yr && (
                    <motion.span
                      layoutId="stats-year-pill"
                      className="absolute inset-0 rounded-xl bg-[image:var(--gradient-hero)] shadow-md -z-10"
                      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    />
                  )}
                  <span className="relative z-10">Năm {yr}</span>
                </button>
              ))}
            </div>

            {/* Year Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl">
                  🎲
                </div>
                <div>
                  <span className="text-xs text-[var(--text-secondary)]">Tổng Ván Chơi ({selectedYear === 'all' ? 'Toàn bộ' : selectedYear})</span>
                  <p className="font-display font-black text-2xl text-white mt-0.5">
                    {yearStats.totalSessions} ván
                  </p>
                </div>
              </Card>

              <Card className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-2xl">
                  ⏱️
                </div>
                <div>
                  <span className="text-xs text-[var(--text-secondary)]">Thời Gian Bàn Chơi</span>
                  <p className="font-display font-black text-2xl text-white mt-0.5">
                    ~{yearStats.hours} giờ
                  </p>
                </div>
              </Card>

              <Card className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-2xl">
                  👑
                </div>
                <div>
                  <span className="text-xs text-[var(--text-secondary)]">Người Thắng Nhiều Nhất</span>
                  <p className="font-display font-black text-xl text-white mt-0.5 truncate">
                    {yearStats.topWinners[0]?.playerName || '—'}
                  </p>
                  {yearStats.topWinners[0] && (
                    <span className="text-[11px] text-amber-300 font-bold">
                      {yearStats.topWinners[0].wins} ván thắng
                    </span>
                  )}
                </div>
              </Card>
            </div>

            {/* Top Games of the Year */}
            <Card className="p-6 space-y-4">
              <h2 className="font-display font-bold text-xl text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>Top Board Game Được Cày Nhiều Nhất ({selectedYear === 'all' ? 'Toàn bộ' : selectedYear})</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {yearStats.topGames.map((g, idx) => (
                  <div
                    key={g.id}
                    className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2 relative overflow-hidden"
                  >
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-mono font-black text-xs flex items-center justify-center border border-amber-500/40">
                      #{idx + 1}
                    </div>
                    {g.thumbnail ? (
                      <img
                        src={g.thumbnail}
                        alt={g.name}
                        className="w-full aspect-[4/3] rounded-xl object-cover border border-white/10"
                      />
                    ) : (
                      <div className="w-full aspect-[4/3] rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center text-3xl">
                        🎲
                      </div>
                    )}
                    <div>
                      <h4 className="font-display font-bold text-xs text-white truncate">{g.name}</h4>
                      <p className="font-mono text-xs font-bold text-amber-400 mt-1">
                        {g.count} ván chơi
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: LOCATIONS & VENUES */}
        {/* ========================================================= */}
        {activeTab === 'locations' && (
          <div className="space-y-6">
            <Card className="p-6 space-y-6">
              <div>
                <h2 className="font-display font-bold text-xl text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-rose-400" />
                  <span>Bảng Xếp Hạng Quán Quen &amp; Địa Điểm Tụ Tập</span>
                </h2>
                <p className="text-xs text-[#94a3b8] mt-1">
                  Thống kê các địa điểm bạn và hội bạn bè đã chơi qua 1.417 ván đấu
                </p>
              </div>

              <div className="space-y-3">
                {locationStats.map((loc, idx) => (
                  <div
                    key={loc.location}
                    className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-xl bg-[var(--bg-elevated)] text-[var(--accent-neon)] font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="font-display font-extrabold text-sm sm:text-base text-white">
                          {loc.location}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs tabular-nums font-mono">
                        <span className="text-amber-400 font-bold">
                          {loc.count} ván ({loc.percentage}%)
                        </span>
                        {loc.userWins > 0 && (
                          <span className="text-emerald-400 font-bold">
                            Heo thắng: {loc.userWins} ván ({loc.winRate}%)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Percentage Bar */}
                    <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-[image:var(--gradient-hero)] rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(4, loc.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: PLAYER LEADERBOARD & HEAD-TO-HEAD */}
        {/* ========================================================= */}
        {activeTab === 'by_player' && (
          <div className="space-y-6">
            {/* ALL-TIME PLAYER LEADERBOARD TABLE */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-bold text-xl text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <span>Bảng Vinh Danh Bạn Bè (All-Time Leaderboard)</span>
                  </h2>
                  <p className="text-xs text-[#94a3b8]">
                    Xếp hạng tổng số ván tham gia và tỷ lệ thắng của từng người chơi
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] text-[#94a3b8]">
                    <tr>
                      <th className="py-3 px-4 font-bold">Hạng</th>
                      <th className="py-3 px-4 font-bold">Người Chơi</th>
                      <th className="py-3 px-3 font-bold text-right">Số Ván Tham Gia</th>
                      <th className="py-3 px-3 font-bold text-right">Số Ván Thắng</th>
                      <th className="py-3 px-3 font-bold text-right">Tỷ Lệ Thắng (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] tabular-nums bg-[var(--bg-surface)]">
                    {playerLeaderboard.map((item, idx) => (
                      <tr key={item.player.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-mono font-bold text-[#94a3b8]">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </td>
                        <td className="py-3 px-4 font-display font-bold text-white">
                          <div className="flex items-center gap-2.5">
                            <PlayerAvatar player={item.player} size="sm" />
                            <span>{item.player.name}</span>
                            {item.player.name === 'Hằng' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                👑 Cao nhất (45%)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-white">
                          {item.plays} ván
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-amber-400">
                          {item.wins}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-emerald-400">
                          {item.winRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* HEAD-TO-HEAD COMPARISON SECTION */}
            <Card className="p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Swords className="w-5 h-5 text-cyan-400" />
                  <h2 className="font-display font-bold text-xl text-white">
                    So Sánh Đối Đầu Trực Diện (Head-to-Head)
                  </h2>
                </div>
                <p className="text-xs text-[#94a3b8]">
                  Chọn 2 hoặc nhiều người chơi để so sánh thành tích khi ngồi chung bàn
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {players.map((p) => (
                    <PlayerChip
                      key={p.id}
                      player={p}
                      selected={selectedPlayerIds.includes(p.id)}
                      onClick={() => togglePlayerSelection(p.id)}
                    />
                  ))}
                </div>
              </div>

              {activeComparisonPlayers.length < 2 ? (
                <div className="p-8 rounded-2xl bg-[var(--bg-surface)] border border-white/10 text-center">
                  <p className="text-sm text-[#94a3b8]">
                    Vui lòng chọn ít nhất 2 người chơi ở trên để xem đối đầu trực tiếp.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Swords className="w-5 h-5 text-cyan-400" />
                      <span className="font-display font-bold text-sm text-white">
                        Số Ván Chơi Cùng Nhau
                      </span>
                    </div>
                    <span className="font-mono font-black text-2xl text-cyan-300 tabular-nums">
                      {headToHead.sharedSessionsCount} ván
                    </span>
                  </div>

                  {/* Head-to-Head Summary Table */}
                  <div className="overflow-x-auto rounded-2xl border border-white/10">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[var(--bg-elevated)] text-xs text-[#94a3b8]">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Người Chơi</th>
                          <th className="py-3 px-4 font-semibold text-right">Thắng Khi Chơi Chung</th>
                          <th className="py-3 px-4 font-semibold text-right">Tỷ Lệ Thắng (%)</th>
                          <th className="py-3 px-4 font-semibold text-right">Điểm Cao Nhất</th>
                          <th className="py-3 px-4 font-semibold text-right">Điểm Thấp Nhất</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06] bg-[var(--bg-surface)] tabular-nums">
                        {headToHead.playerStats.map((st) => (
                          <tr key={st.player.id}>
                            <td className="py-3 px-4 font-display font-bold text-white">
                              <div className="flex items-center gap-2">
                                <PlayerAvatar player={st.player} size="sm" />
                                <span>{st.player.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-amber-300">
                              {st.winsInShared}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                              {st.winRateInShared}%
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-white">
                              {st.highestScore !== null ? st.highestScore : '—'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-[#94a3b8]">
                              {st.lowestScore !== null ? st.lowestScore : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Per-Game Win Breakdown */}
                  {headToHead.perGameBreakdown.length > 0 && (
                    <div className="space-y-2.5 pt-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
                        Chi Tiết Từng Game Chơi Cùng Nhau
                      </h3>
                      <div className="overflow-x-auto rounded-2xl border border-white/10 max-h-64 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[var(--bg-elevated)] text-[#94a3b8] sticky top-0">
                            <tr>
                              <th className="py-2.5 px-4 font-semibold">Tựa Game</th>
                              <th className="py-2.5 px-3 font-semibold text-right">Số Ván Chung</th>
                              {activeComparisonPlayers.map((p) => (
                                <th key={p.id} className="py-2.5 px-3 font-semibold text-right">
                                  {p.name} Thắng
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.06] bg-[var(--bg-surface)] tabular-nums">
                            {headToHead.perGameBreakdown.map((row) => (
                              <tr key={row.gameId}>
                                <td className="py-2.5 px-4 font-bold text-white">{row.gameName}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-[#94a3b8]">
                                  {row.plays}
                                </td>
                                {activeComparisonPlayers.map((p) => {
                                  const w = row.winsByPlayerId[p.id] || 0;
                                  return (
                                    <td key={p.id} className="py-2.5 px-3 text-right font-mono text-white">
                                      {w > 0 ? (
                                        <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
                                          <Trophy className="w-3 h-3" />
                                          {w}
                                        </span>
                                      ) : (
                                        '0'
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: BY GAME DEEP DIVE */}
        {/* ========================================================= */}
        {activeTab === 'by_game' && activeGame && (
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
              <div className="flex items-center gap-4">
                <img
                  src={activeGame.thumbnail || activeGame.image}
                  alt={activeGame.name}
                  referrerPolicy="no-referrer"
                  className="w-16 h-20 rounded-xl object-cover border border-white/10"
                />
                <div>
                  <h2 className="font-display font-extrabold text-2xl text-white">
                    {activeGame.name}
                  </h2>
                  <p className="text-xs text-[#94a3b8]">
                    Chọn bất kỳ boardgame nào trong kho để xem kỷ lục điểm &amp; người chơi xuất sắc nhất
                  </p>
                </div>
              </div>

              <select
                aria-label="Chọn boardgame để xem thống kê"
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[var(--bg-surface)] border border-white/15 text-sm font-semibold text-white focus:outline-none focus:border-[var(--accent-primary)] cursor-pointer"
              >
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 tabular-nums">
              <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-white/[0.06]">
                <span className="text-xs text-[#94a3b8]">Tổng Ván Đã Chơi</span>
                <p className="font-display font-black text-2xl text-[var(--accent-neon)] mt-1">
                  {activeGameStats.totalPlays}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-white/[0.06]">
                <span className="text-xs text-[#94a3b8]">Thời Lượng Trung Bình</span>
                <p className="font-display font-black text-2xl text-[#22d3ee] mt-1">
                  {formatDuration(activeGameStats.averageDuration)}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-white/[0.06]">
                <span className="text-xs text-[#94a3b8]">Kỷ Lục Điểm Số</span>
                <p className="font-mono font-black text-2xl text-emerald-400 mt-1">
                  {activeGameStats.highestScore ? activeGameStats.highestScore.score : '—'}
                </p>
                {activeGameStats.highestScore && (
                  <span className="text-xs text-[#94a3b8]">
                    bởi {activeGameStats.highestScore.playerName}
                  </span>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-white/[0.06]">
                <span className="text-xs text-[#94a3b8]">Trùm Game Này (Top Win)</span>
                <p className="font-display font-bold text-base text-amber-400 mt-1 truncate">
                  {activeGameStats.playerWinRates[0]?.playerName || '—'}
                </p>
                {activeGameStats.playerWinRates[0] && (
                  <span className="text-xs text-[#94a3b8]">
                    {activeGameStats.playerWinRates[0].winRate}% tỉ lệ thắng
                  </span>
                )}
              </div>
            </div>

            {/* Win rates for this game */}
            {activeGameStats.playerWinRates.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-white/[0.08]">
                <h3 className="font-bold text-sm text-white">Thành Tích Bạn Bè Ở Game Này</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeGameStats.playerWinRates.map((pw) => (
                    <div
                      key={pw.playerName}
                      className="p-3 rounded-xl bg-[var(--bg-surface)] border border-white/5 flex items-center justify-between"
                    >
                      <span className="font-bold text-xs text-white">{pw.playerName}</span>
                      <div className="text-xs font-mono">
                        <span className="text-amber-400 font-bold">{pw.wins} thắng</span>
                        <span className="text-[#94a3b8] ml-2">({pw.winRate}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Played & Unplayed Games Drilldown Modal */}
        <Modal
          isOpen={showPlayedGamesModal}
          onClose={() => setShowPlayedGamesModal(false)}
          title="Kho Game Đã &amp; Chưa Trải Nghiệm"
          maxWidthClass="max-w-2xl"
        >
          <div className="space-y-4">
            {/* Modal Tabs */}
            <div className="flex p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] gap-1">
              <button
                type="button"
                onClick={() => setPlayedGamesTab('played')}
                className={cn(
                  'flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 select-none',
                  playedGamesTab === 'played'
                    ? 'bg-[var(--accent-primary)] text-white shadow-md'
                    : 'text-[var(--text-secondary)] hover:text-white'
                )}
              >
                <span>Đã Trải Nghiệm</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 tabular-nums">
                  {playedGamesList.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPlayedGamesTab('unplayed')}
                className={cn(
                  'flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 select-none',
                  playedGamesTab === 'unplayed'
                    ? 'bg-[var(--accent-primary)] text-white shadow-md'
                    : 'text-[var(--text-secondary)] hover:text-white'
                )}
              >
                <span>Chưa Chơi (Pile of Shame)</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 tabular-nums">
                  {unplayedGamesList.length}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <Input
              placeholder="Tìm kiếm tựa game..."
              value={playedGamesSearch}
              onChange={(e) => setPlayedGamesSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-[var(--text-secondary)]" />}
              className="text-xs"
            />

            {/* Games List */}
            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              {filteredModalGames.length === 0 ? (
                <div className="text-center py-8 text-xs text-[var(--text-muted)]">
                  Không tìm thấy tựa game phù hợp
                </div>
              ) : (
                filteredModalGames.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-glow)] flex items-center justify-between gap-3 transition-colors group"
                  >
                    <Link
                      to={`/collection/${item.id}`}
                      onClick={() => setShowPlayedGamesModal(false)}
                      className="flex items-center gap-3 min-w-0 flex-1"
                    >
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.name}
                          className="w-12 h-14 rounded-lg object-cover border border-white/10 shrink-0 bg-[var(--bg-elevated)]"
                        />
                      ) : (
                        <div className="w-12 h-14 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-xl shrink-0">
                          🎲
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-display font-bold text-sm text-white group-hover:text-[var(--accent-neon)] transition-colors truncate">
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--text-secondary)] tabular-nums">
                          {item.plays > 0 ? (
                            <span className="text-amber-400 font-bold font-mono">
                              {item.plays} ván đã chơi
                            </span>
                          ) : (
                            <span className="text-rose-400 font-medium">
                              Chưa ghi nhận ván nào
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/sessions/new?gameId=${item.id}`}
                        onClick={() => setShowPlayedGamesModal(false)}
                      >
                        <Button size="sm" variant="secondary" className="text-xs px-2.5 py-1">
                          <Play className="w-3.5 h-3.5 mr-1 fill-current" />
                          Chơi ván mới
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>

        {/* Player Streak Detail Modal */}
        <StreakDetailModal
          isOpen={selectedStreakPlayer !== null && selectedStreakData !== null}
          onClose={() => {
            setSelectedStreakPlayer(null);
            setSelectedStreakData(null);
          }}
          player={selectedStreakPlayer}
          type="win"
          streakData={selectedStreakData}
        />
      </div>
    </PageTransition>
  );
};

export default StatsPage;
