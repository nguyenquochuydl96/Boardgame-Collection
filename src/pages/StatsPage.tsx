import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  ArrowUpRight,
  ChevronRight,
  ChevronDown,
  Filter,
  Check,
  RotateCcw,
  Search,
} from 'lucide-react';
import { PageTransition } from '../components/layout/PageTransition';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PlayerChip } from '../components/player/PlayerChip';
import { PlayerAvatar } from '../components/player/PlayerAvatar';
import { PlayerLeaderboardSection } from '../components/dashboard/PlayerLeaderboardSection';
import { StreakDetailModal } from '../components/player/StreakDetailModal';
import { GameStatusBadge } from '../components/game/GameStatusBadge';
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
  GameStatsSummary,
  formatDate,
  formatDuration,
  formatRecordTimeAgo,
} from '../lib/utils';
import { Player, GameStatus, PlaySession } from '../types';

const GameThumbBox: React.FC<{
  src?: string;
  alt: string;
  fallbackIcon: React.ReactNode;
  fallbackBg?: string;
}> = React.memo(({ src, alt, fallbackIcon, fallbackBg = 'bg-[var(--card-3)]' }) => {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="w-16 h-20 rounded-xl overflow-hidden shrink-0 border border-[var(--line)] shadow-md relative group-hover:scale-105 transition-transform bg-[var(--card-3)]">
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
});

const STATUS_FILTER_OPTIONS: Array<{ id: GameStatus | 'all'; label: string }> = [
  { id: 'all', label: 'Tất Cả' },
  { id: 'own', label: 'Sở Hữu' },
  { id: 'rented', label: 'Đang Thuê' },
  { id: 'borrowed', label: 'Đang Mượn' },
  { id: 'previously_owned', label: 'Từng Sở Hữu' },
  { id: 'sold', label: 'Đã Bán' },
  { id: 'wishlist', label: 'Wishlist' },
  { id: 'lent_out', label: 'Cho Mượn' },
];

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

  // Time filter states for Overview & deep insights
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const yearPickerRef = useRef<HTMLDivElement>(null);

  // Close year picker popover on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (yearPickerRef.current && !yearPickerRef.current.contains(e.target as Node)) {
        setIsYearPickerOpen(false);
      }
    };
    if (isYearPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isYearPickerOpen]);

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

  // Overview sessions filtered by date range and selected years
  const overviewSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (!s.datePlayed) return false;
      const sDate = s.datePlayed.slice(0, 10);
      const sYear = s.datePlayed.slice(0, 4);

      // Check year filter
      if (selectedYears.length > 0 && !selectedYears.includes(sYear)) {
        return false;
      }

      // Check start date (inclusive)
      if (startDate && sDate < startDate) {
        return false;
      }

      // Check end date (inclusive)
      if (endDate && sDate > endDate) {
        return false;
      }

      return true;
    });
  }, [sessions, selectedYears, startDate, endDate]);

  const hasActiveTimeFilter = selectedYears.length > 0 || !!startDate || !!endDate;

  const resetTimeFilter = () => {
    setSelectedYears([]);
    setStartDate('');
    setEndDate('');
    setIsYearPickerOpen(false);
  };

  const timeFilterLabel = useMemo(() => {
    const parts: string[] = [];

    if (startDate && endDate) {
      parts.push(`${formatDate(startDate)} – ${formatDate(endDate)}`);
    } else if (startDate) {
      parts.push(`From ${formatDate(startDate)}`);
    } else if (endDate) {
      parts.push(`Until ${formatDate(endDate)}`);
    }

    if (selectedYears.length > 0) {
      const sorted = [...selectedYears].sort();
      if (sorted.length === 1) {
        parts.push(`Year ${sorted[0]}`);
      } else if (sorted.length === availableYears.length) {
        parts.push(`All Years (${sorted.length})`);
      } else {
        parts.push(`Years: ${sorted.join(', ')}`);
      }
    }

    if (parts.length === 0) return 'All Time';
    return parts.join(' · ');
  }, [selectedYears, startDate, endDate, availableYears]);

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

  // Winning streaks per player (only computed when on overview tab)
  const playerStreaks = useMemo(() => {
    if (activeTab !== 'overview') return [];
    return players
      .map((p) => ({
        player: p,
        streak: calculateLongestWinStreak(p.id, overviewSessions),
      }))
      .filter((x) => x.streak > 0)
      .sort((a, b) => b.streak - a.streak);
  }, [players, overviewSessions, activeTab]);

  // Monthly play frequency (grouped chronologically, fast string slice instead of toLocaleDateString)
  const monthlyFrequency = useMemo(() => {
    if (activeTab !== 'overview') return [];
    const monthCounts = new Map<string, number>();
    const sortedChron = [...overviewSessions].sort(
      (a, b) => (a.datePlayed || '').localeCompare(b.datePlayed || '')
    );
    for (const s of sortedChron) {
      if (!s.datePlayed || s.datePlayed.length < 7) continue;
      const y = s.datePlayed.slice(2, 4);
      const m = parseInt(s.datePlayed.slice(5, 7), 10);
      const label = `M${m}/${y}`;
      monthCounts.set(label, (monthCounts.get(label) || 0) + 1);
    }
    return Array.from(monthCounts.entries()).map(([month, count]) => ({
      month,
      count,
    }));
  }, [overviewSessions, activeTab]);

  const maxMonthCount = Math.max(...monthlyFrequency.map((m) => m.count), 1);

  // --- 2. YEAR IN REVIEW METRICS (only computed when on years tab) ---
  const yearFilteredSessions = useMemo(() => {
    if (activeTab !== 'years') return [];
    if (selectedYear === 'all') return sessions;
    return sessions.filter((s) => s.datePlayed && s.datePlayed.startsWith(selectedYear));
  }, [sessions, selectedYear, activeTab]);

  const yearStats = useMemo(() => {
    if (activeTab !== 'years') {
      return {
        totalSessions: 0,
        hours: 0,
        topGames: [],
        topWinners: [],
      };
    }
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
  }, [yearFilteredSessions, activeTab]);

  // --- 3. LOCATION & VENUE STATS (only computed when on locations tab) ---
  const locationStats = useMemo(() => {
    if (activeTab !== 'locations') return [];
    const map = new Map<string, { count: number; playerWins: Map<string, number> }>();

    sessions.forEach((s) => {
      const loc = s.location || 'Unknown location';
      const entry = map.get(loc) || { count: 0, playerWins: new Map<string, number>() };
      entry.count += 1;
      s.players?.forEach((p) => {
        if (p.isWinner || s.winnerId === p.playerId) {
          entry.playerWins.set(p.playerId, (entry.playerWins.get(p.playerId) || 0) + 1);
        }
      });
      map.set(loc, entry);
    });

    return Array.from(map.entries())
      .map(([location, data]) => {
        let topWinnerId = '';
        let topWinnerWins = 0;
        data.playerWins.forEach((wins, pid) => {
          if (wins > topWinnerWins) {
            topWinnerWins = wins;
            topWinnerId = pid;
          }
        });
        const topPlayer = players.find((p) => p.id === topWinnerId);
        const topWinnerName = topPlayer?.name || (topWinnerId ? 'Player' : undefined);

        return {
          location,
          count: data.count,
          percentage: Math.round((data.count / (sessions.length || 1)) * 100),
          topWinnerName,
          topWinnerWins,
          topWinnerRate: Math.round((topWinnerWins / (data.count || 1)) * 100),
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [sessions, players, activeTab]);

  // Head-to-Head calculation
  const activeComparisonPlayers = useMemo(
    () => players.filter((p) => selectedPlayerIds.includes(p.id)),
    [players, selectedPlayerIds]
  );

  const headToHead = useMemo(
    () => {
      if (activeTab !== 'by_player') {
        return { sharedSessionsCount: 0, playerStats: [], perGameBreakdown: [] };
      }
      return calculateHeadToHead(activeComparisonPlayers, sessions);
    },
    [activeComparisonPlayers, sessions, activeTab]
  );

  const togglePlayerSelection = (id: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // --- 5. BY GAME STATS (with ownership status filter) ---
  const [gameStatusFilter, setGameStatusFilter] = useState<GameStatus | 'all'>('all');
  const [gameSearchQuery, setGameSearchQuery] = useState<string>('');

  const gameStatusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: games.length };
    games.forEach((g) => {
      counts[g.status] = (counts[g.status] || 0) + 1;
    });
    return counts;
  }, [games]);

  const filteredGamesByStatus = useMemo(() => {
    let list = gameStatusFilter === 'all'
      ? games
      : games.filter((g) => g.status === gameStatusFilter);

    if (gameSearchQuery.trim()) {
      const q = gameSearchQuery.toLowerCase().trim();
      list = list.filter((g) => g.name.toLowerCase().includes(q));
    }
    return list;
  }, [games, gameStatusFilter, gameSearchQuery]);

  const activeGame = useMemo(() => {
    const match = filteredGamesByStatus.find((g) => g.id === selectedGameId);
    if (match) return match;
    return filteredGamesByStatus[0] || games[0];
  }, [filteredGamesByStatus, selectedGameId, games]);

  const activeGameSessions = useMemo(
    () => (activeTab === 'by_game' && activeGame ? sessions.filter((s) => s.gameId === activeGame.id) : []),
    [sessions, activeGame, activeTab]
  );

  const activeGameStats: GameStatsSummary = useMemo(
    () => (activeTab === 'by_game' ? calculateGameStats(activeGameSessions) : {
      totalPlays: 0,
      averageDuration: 0,
      highestScore: null,
      lowestScore: null,
      playerWinRates: [],
    }),
    [activeGameSessions, activeTab]
  );

  const gamesBreakdownList = useMemo(() => {
    if (activeTab !== 'by_game') return [];

    const gameSessionsMap = new Map<string, PlaySession[]>();
    sessions.forEach((s) => {
      const list = gameSessionsMap.get(s.gameId) || [];
      list.push(s);
      gameSessionsMap.set(s.gameId, list);
    });

    return filteredGamesByStatus
      .map((g) => {
        const gameSessions = gameSessionsMap.get(g.id) || [];
        const stats = calculateGameStats(gameSessions);
        const totalDuration = gameSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

        return {
          game: g,
          totalPlays: stats.totalPlays,
          totalDuration,
          averageDuration: stats.averageDuration,
          highestScore: stats.highestScore,
          lowestScore: stats.lowestScore,
          topWinner: stats.mostWinsPlayer || stats.playerWinRates[0] || null,
          topLoser: stats.mostLossesPlayer || null,
        };
      })
      .sort((a, b) => b.totalPlays - a.totalPlays);
  }, [filteredGamesByStatus, sessions, activeTab]);

  return (
    <PageTransition>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Title & Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[var(--ink)] flex items-center gap-2.5">
              <span>📈</span>
              Advanced Statistics &amp; Insights
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-1">
              Comprehensive breakdown of H-Index, game records, favorite venues, and player rivalries
            </p>
          </div>

          <div className="text-xs font-mono px-3 py-1.5 rounded-xl bg-[var(--card-2)] border border-[var(--line)] text-[var(--accent)] font-semibold w-fit">
            Total: <strong>{sessions.length}</strong> sessions · <strong>{totalHoursPlayed}h</strong> played
          </div>
        </div>

        {/* Navigation Tabs (5 Tabs with sliding spring pill) */}
        <div
          role="tablist"
          className="flex p-1.5 rounded-2xl bg-[var(--card)] shadow-[inset_0_0_0_1px_var(--line)] max-w-full overflow-x-auto gap-1"
        >
          {[
            { id: 'overview', label: 'Overview & H-Index', icon: BarChart3, iconColor: 'text-[var(--accent)]' },
            { id: 'years', label: 'Years & Trends', icon: Calendar, iconColor: 'text-amber-500' },
            { id: 'locations', label: 'Venues & Locations', icon: MapPin, iconColor: 'text-rose-500' },
            { id: 'by_player', label: 'Leaderboard & Rivalries', icon: Users, iconColor: 'text-cyan-500' },
            { id: 'by_game', label: 'Game Breakdown', icon: Dices, iconColor: 'text-emerald-500' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as StatsTab)}
                className={cn(
                  'min-h-[40px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 select-none active:scale-95',
                  isActive
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)] font-black shadow-sm'
                    : 'text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--card-2)]'
                )}
              >
                <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-current' : tab.iconColor)} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW & H-INDEX */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* TIME FILTER TOOLBAR (Compact, Calendar Range & Year Checkbox Popover) */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--card)] shadow-[inset_0_0_0_1px_var(--line)] space-y-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Left: Filter Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Filter Icon & Label */}
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--muted)] mr-1">
                    <Filter className="w-3.5 h-3.5 text-amber-500" />
                    <span>Filter:</span>
                  </div>

                  {/* 1. All Time Quick Button */}
                  <button
                    type="button"
                    onClick={resetTimeFilter}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none',
                      !hasActiveTimeFilter
                        ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm'
                        : 'bg-[var(--card-2)] shadow-[inset_0_0_0_1px_var(--line)] text-[var(--ink-2)] hover:bg-[var(--card-3)] hover:text-[var(--ink)]'
                    )}
                  >
                    All Time
                  </button>

                  {/* 2. Calendar Date Range Filter */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--card-2)] shadow-[inset_0_0_0_1px_var(--line)] text-xs">
                    <Calendar className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                    <span className="text-[11px] font-bold text-[var(--muted)]">From:</span>
                    <input
                      type="date"
                      aria-label="Start date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-transparent border-0 text-xs font-bold text-[var(--ink)] focus:outline-none p-0 cursor-pointer min-w-[100px] [color-scheme:light] dark:[color-scheme:dark]"
                    />
                    <span className="text-[var(--muted)] font-bold px-0.5">➔</span>
                    <span className="text-[11px] font-bold text-[var(--muted)]">To:</span>
                    <input
                      type="date"
                      aria-label="End date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-transparent border-0 text-xs font-bold text-[var(--ink)] focus:outline-none p-0 cursor-pointer min-w-[100px] [color-scheme:light] dark:[color-scheme:dark]"
                    />
                    {(startDate || endDate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setStartDate('');
                          setEndDate('');
                        }}
                        className="w-4 h-4 rounded-full bg-[var(--card-3)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center text-[10px] ml-1 cursor-pointer"
                        title="Clear date range"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* 3. Year Multi-Select Checkbox Popover */}
                  <div className="relative" ref={yearPickerRef}>
                    <button
                      type="button"
                      onClick={() => setIsYearPickerOpen((prev) => !prev)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none shadow-[inset_0_0_0_1px_var(--line)]',
                        selectedYears.length > 0
                          ? 'bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300 font-extrabold'
                          : 'bg-[var(--card-2)] text-[var(--ink-2)] hover:bg-[var(--card-3)] hover:text-[var(--ink)]'
                      )}
                      aria-expanded={isYearPickerOpen}
                    >
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      <span>
                        {selectedYears.length === 0
                          ? 'Year: All'
                          : selectedYears.length === 1
                          ? `Year: ${selectedYears[0]}`
                          : `Years: ${selectedYears.length} selected`}
                      </span>
                      {selectedYears.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-mono font-bold">
                          {selectedYears.length}
                        </span>
                      )}
                      <ChevronDown
                        className={cn(
                          'w-3.5 h-3.5 transition-transform duration-200',
                          isYearPickerOpen && 'rotate-180'
                        )}
                      />
                    </button>

                    {/* Popover Menu with Checkboxes */}
                    {isYearPickerOpen && (
                      <div className="absolute left-0 top-full mt-2 w-64 p-3 rounded-2xl bg-[var(--card)] border border-[var(--line-2)] shadow-2xl z-30 space-y-2 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between border-b border-[var(--line)] pb-2">
                          <span className="text-xs font-bold text-[var(--ink)]">Select Years</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedYears([...availableYears])}
                              className="text-[11px] font-bold text-[var(--accent)] hover:underline cursor-pointer"
                            >
                              All
                            </button>
                            <span className="text-[var(--muted)] text-[10px]">·</span>
                            <button
                              type="button"
                              onClick={() => setSelectedYears([])}
                              className="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                          {availableYears.map((yr) => {
                            const isChecked = selectedYears.includes(yr);
                            const count = sessions.filter(
                              (s) => s.datePlayed && s.datePlayed.startsWith(yr)
                            ).length;
                            return (
                              <label
                                key={yr}
                                className={cn(
                                  'flex items-center justify-between p-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors select-none',
                                  isChecked
                                    ? 'bg-amber-500/15 text-amber-800 dark:text-amber-200 font-bold'
                                    : 'hover:bg-[var(--card-2)] text-[var(--ink-2)]'
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      setSelectedYears((prev) =>
                                        prev.includes(yr)
                                          ? prev.filter((y) => y !== yr)
                                          : [...prev, yr]
                                      );
                                    }}
                                    className="w-4 h-4 rounded border-[var(--line-2)] text-amber-500 focus:ring-amber-400 cursor-pointer accent-amber-500"
                                  />
                                  <span>Year {yr}</span>
                                </div>
                                <span className="text-[11px] font-mono text-[var(--muted)]">
                                  {count} plays
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. Reset Button */}
                  {hasActiveTimeFilter && (
                    <button
                      type="button"
                      onClick={resetTimeFilter}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-1 cursor-pointer select-none"
                      title="Reset all filters"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* Right: Active Filter Status */}
                <div className="text-xs text-[var(--muted)] flex items-center gap-1.5 font-medium shrink-0">
                  <span>Viewing:</span>
                  <span className="font-bold text-[var(--ink)] px-2.5 py-0.5 rounded-md bg-[var(--card-2)] shadow-[inset_0_0_0_1px_var(--line-2)] max-w-[220px] truncate">
                    {timeFilterLabel}
                  </span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-extrabold">
                    ({overviewSessions.length} plays)
                  </span>
                </div>
              </div>
            </div>

            {/* H-INDEX SPECIAL HERO BANNER (High Contrast) */}
            <div className="relative rounded-[24px] p-6 sm:p-8 bg-amber-500/10 dark:bg-amber-950/30 border-2 border-amber-500/35 shadow-lg overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3 max-w-xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-800 dark:text-amber-200 text-xs font-bold uppercase tracking-wider">
                    <Award className="w-3.5 h-3.5 fill-current" />
                    BoardGame Geek Standard Metric · {timeFilterLabel}
                  </div>
                  <h2 className="font-display font-black text-3xl sm:text-4xl text-[var(--ink)]">
                    H-Index Rating:{' '}
                    <span className="text-amber-600 dark:text-amber-400 underline decoration-amber-500/50">
                      H-{hIndex}
                    </span>
                  </h2>
                  <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed font-medium">
                    In {timeFilterLabel.toLowerCase()}, you have played at least <strong className="text-[var(--ink)]">{hIndex} different games</strong>, each at least{' '}
                    <strong className="text-[var(--ink)]">{hIndex} times</strong>!
                  </p>

                  {/* Progress towards next H-Index */}
                  {nextHIndexGame && (
                    <div className="pt-2">
                      <div className="flex justify-between text-xs font-bold text-[var(--ink)] mb-1.5">
                        <span>Progress towards H-{hIndex + 1}:</span>
                        <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">
                          {nextHIndexGame.name} ({nextHIndexGame.plays}/{hIndex + 1} plays)
                        </span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-[var(--card-3)] overflow-hidden shadow-[inset_0_0_0_1px_var(--line)]">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(100, Math.round((nextHIndexGame.plays / (hIndex + 1)) * 100))}%`,
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-[var(--muted)] mt-1 font-medium">
                        Only <strong className="text-[var(--ink)]">{(hIndex + 1) - nextHIndexGame.plays} more {(hIndex + 1) - nextHIndexGame.plays === 1 ? 'play' : 'plays'}</strong> for {nextHIndexGame.name} to advance to <strong className="text-[var(--ink)]">H-{hIndex + 1}</strong>!
                      </p>
                    </div>
                  )}
                </div>

                {/* H-Index Club Games Preview */}
                <div className="bg-[var(--card)] shadow-[inset_0_0_0_1px_var(--line)] rounded-2xl p-4 lg:w-80 space-y-2.5">
                  <span className="text-xs font-bold text-[var(--accent)] uppercase tracking-wider block">
                    Games in H-{hIndex} Club ({hIndexClub.length})
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {hIndexClub.length > 0 ? (
                      hIndexClub.map((g, i) => (
                        <div
                          key={g.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-[var(--card-2)] shadow-[inset_0_0_0_1px_var(--line)] text-xs"
                        >
                          <span className="font-bold text-[var(--ink)] truncate max-w-[170px]">
                            #{i + 1}. {g.name}
                          </span>
                          <span className="font-mono font-extrabold text-amber-600 dark:text-amber-400 shrink-0">
                            {g.plays} plays
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[var(--muted)] italic py-2 text-center">
                        No games have reached H-{hIndex} in this period
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            {overviewSessions.length === 0 ? (
              <Card className="p-8 text-center space-y-3 bg-[var(--card)] border border-[var(--line)]">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl mx-auto">
                  📅
                </div>
                <h3 className="font-display font-bold text-lg text-[var(--ink)]">
                  No Sessions Found
                </h3>
                <p className="text-sm text-[var(--muted)] max-w-md mx-auto">
                  No play sessions recorded in {timeFilterLabel.toLowerCase()}.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={resetTimeFilter}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  View All Time ({sessions.length} sessions)
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 tabular-nums">
                {/* 1. Most Played Game Card */}
                {mostPlayedGame && (
                  <Link
                    to={`/collection/${mostPlayedGame.id}`}
                    className="p-4 sm:p-5 rounded-2xl bg-[var(--card)] border border-amber-500/30 dark:border-amber-500/20 hover:border-amber-500/60 hover:shadow-xl hover:shadow-amber-500/10 transition-all group cursor-pointer flex gap-3.5 items-center select-none"
                  >
                    <GameThumbBox
                      src={mostPlayedGame.thumbnail}
                      alt={mostPlayedGame.name}
                      fallbackIcon={<Trophy className="w-7 h-7 text-amber-500 dark:text-amber-400" />}
                      fallbackBg="bg-amber-500/15 border-amber-500/30"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400 inline-flex items-center gap-1">
                          <Trophy className="w-3.5 h-3.5" />
                          Most Played Game
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </div>
                      <h3 className="font-display font-bold text-base text-[var(--ink)] truncate block mt-0.5 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                        {mostPlayedGame.name}
                      </h3>
                      <p className="text-xs text-amber-700 dark:text-amber-300 font-mono font-bold mt-0.5">
                        {mostPlayedGame.plays} plays logged
                      </p>
                      <p className="text-[10px] text-[var(--muted)] truncate">
                        {((mostPlayedGame.plays / Math.max(1, overviewSessions.length)) * 100).toFixed(0)}% of sessions in {timeFilterLabel.toLowerCase()}
                      </p>
                    </div>
                  </Link>
                )}

                {/* 2. Longest Session Card with Game Thumbnail */}
                {longestSession ? (
                  <Link
                    to={`/sessions/${longestSession.id}`}
                    className="p-4 sm:p-5 rounded-2xl bg-[var(--card)] border border-[var(--line)] hover:border-cyan-500/60 hover:shadow-xl hover:shadow-cyan-500/10 transition-all group cursor-pointer flex gap-3.5 items-center select-none"
                  >
                    <GameThumbBox
                      src={longestSessionThumbnail}
                      alt={longestSession.gameName}
                      fallbackIcon={<Clock className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />}
                      fallbackBg="bg-cyan-500/15 border-cyan-500/30"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400 inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Longest Play Session
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </div>
                      <p className="font-display font-black text-2xl text-[var(--ink)] mt-0.5">
                        {formatDuration(longestSession.durationMinutes)}
                      </p>
                      <h4 className="font-display font-bold text-sm text-[var(--ink)] truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                        {longestSession.gameName}
                      </h4>
                      <p className="text-[11px] text-[var(--muted)] truncate mt-0.5">
                        {formatDate(longestSession.datePlayed)}
                        {longestSession.location ? ` · ${longestSession.location}` : ''}
                      </p>
                    </div>
                  </Link>
                ) : (
                  <div className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] flex items-center justify-center text-xs text-[var(--muted)] italic">
                    No play sessions with recorded duration
                  </div>
                )}

                {/* 4. Shortest Session Card with Game Thumbnail */}
                {shortestSession ? (
                  <Link
                    to={`/sessions/${shortestSession.id}`}
                    className="p-4 sm:p-5 rounded-2xl bg-[var(--card)] border border-[var(--line)] hover:border-emerald-500/60 hover:shadow-xl hover:shadow-emerald-500/10 transition-all group cursor-pointer flex gap-3.5 items-center select-none"
                  >
                    <GameThumbBox
                      src={shortestSessionThumbnail}
                      alt={shortestSession.gameName}
                      fallbackIcon={<Clock className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />}
                      fallbackBg="bg-emerald-500/15 border-emerald-500/30"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Shortest Play Session
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </div>
                      <p className="font-display font-black text-2xl text-[var(--ink)] mt-0.5">
                        {formatDuration(shortestSession.durationMinutes)}
                      </p>
                      <h4 className="font-display font-bold text-sm text-[var(--ink)] truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
                        {shortestSession.gameName}
                      </h4>
                      <p className="text-[11px] text-[var(--muted)] truncate mt-0.5">
                        {formatDate(shortestSession.datePlayed)}
                        {shortestSession.location ? ` · ${shortestSession.location}` : ''}
                      </p>
                    </div>
                  </Link>
                ) : (
                  <div className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] flex items-center justify-center text-xs text-[var(--muted)] italic">
                    No play sessions with recorded duration
                  </div>
                )}
              </div>
            )}

            {/* Monthly Play Frequency & Winning Streaks */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Monthly Play Frequency Bar Chart */}
              <Card className="lg:col-span-8 p-6 space-y-4 bg-[var(--card)] border border-[var(--line)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display font-bold text-xl text-[var(--ink)]">
                      Play Frequency by Month
                    </h2>
                    <p className="text-xs text-[var(--muted)]">
                      Session history by month (scroll horizontally to explore)
                    </p>
                  </div>
                  <span className="text-xs font-mono text-amber-700 dark:text-amber-400 font-bold bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                    Peak: {maxMonthCount} sessions/month
                  </span>
                </div>

                <div className="overflow-x-auto pb-2">
                  <div className="h-56 min-w-[700px] flex items-end gap-3 pt-6 pb-2 px-2 border-b border-[var(--line)]">
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
                          <span className="font-mono text-[10px] font-bold text-[var(--accent)] group-hover:scale-125 transition-transform tabular-nums">
                            {item.count}
                          </span>
                          <div
                            style={{ height: `${heightPct}%` }}
                            className="w-full min-w-[16px] max-w-[32px] rounded-t-lg bg-[var(--accent)] shadow-md group-hover:brightness-110 transition-all duration-300"
                          />
                          <span className="text-[10px] text-[var(--muted)] font-semibold whitespace-nowrap">
                            {item.month}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>

              {/* Best Winning Streaks */}
              <Card className="lg:col-span-4 p-6 space-y-4 bg-[var(--card)] border border-[var(--line)]">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                  <div>
                    <h2 className="font-display font-bold text-lg text-[var(--ink)]">
                      Longest Win Streak
                    </h2>
                    <p className="text-xs text-[var(--muted)]">Consecutive wins across all games</p>
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
                      className="flex items-center justify-between p-3 rounded-xl bg-[var(--card-2)] border border-[var(--line)] hover:border-amber-500/50 hover:shadow-md transition-all cursor-pointer group select-none"
                      title="Click to view winning streak history"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <PlayerAvatar player={player} size="sm" />
                        <span className="font-display font-bold text-xs text-[var(--ink)] truncate group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                          {player.name}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-xs text-orange-600 dark:text-orange-400 shrink-0 flex items-center gap-1 group-hover:underline">
                        🔥 {streak} in a row <ChevronRight className="w-3 h-3 opacity-60" />
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
            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] w-fit flex-wrap">
              <span className="text-xs font-extrabold text-[var(--ink)] px-2">Filter Year:</span>
              <button
                type="button"
                onClick={() => setSelectedYear('all')}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer select-none active:scale-95',
                  selectedYear === 'all'
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)] font-black shadow-sm'
                    : 'text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--card-3)]'
                )}
              >
                <span>All Years</span>
              </button>
              {availableYears.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(yr)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer select-none active:scale-95',
                    selectedYear === yr
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)] font-black shadow-sm'
                      : 'text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--card-3)]'
                  )}
                >
                  <span>{yr}</span>
                </button>
              ))}
            </div>

            {/* Year Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-5 flex items-center gap-4 bg-[var(--card)] border border-[var(--line)]">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl">
                  🎲
                </div>
                <div>
                  <span className="text-xs text-[var(--muted)]">Total Sessions ({selectedYear === 'all' ? 'All-Time' : selectedYear})</span>
                  <p className="font-display font-black text-2xl text-[var(--ink)] mt-0.5">
                    {yearStats.totalSessions} plays
                  </p>
                </div>
              </Card>

              <Card className="p-5 flex items-center gap-4 bg-[var(--card)] border border-[var(--line)]">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 flex items-center justify-center text-2xl">
                  ⏱️
                </div>
                <div>
                  <span className="text-xs text-[var(--muted)]">Tabletop Playtime</span>
                  <p className="font-display font-black text-2xl text-[var(--ink)] mt-0.5">
                    ~{yearStats.hours} hrs
                  </p>
                </div>
              </Card>

              <Card className="p-5 flex items-center gap-4 bg-[var(--card)] border border-[var(--line)]">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-700 dark:text-purple-400 flex items-center justify-center text-2xl">
                  👑
                </div>
                <div>
                  <span className="text-xs text-[var(--muted)]">Most Wins</span>
                  <p className="font-display font-black text-xl text-[var(--ink)] mt-0.5 truncate">
                    {yearStats.topWinners[0]?.playerName || '—'}
                  </p>
                  {yearStats.topWinners[0] && (
                    <span className="text-[11px] text-amber-600 dark:text-amber-300 font-bold">
                      {yearStats.topWinners[0].wins} wins
                    </span>
                  )}
                </div>
              </Card>
            </div>

            {/* Top Games of the Year */}
            <Card className="p-6 space-y-4 bg-[var(--card)] border border-[var(--line)]">
              <h2 className="font-display font-bold text-xl text-[var(--ink)] flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                <span>Top Played Board Games ({selectedYear === 'all' ? 'All-Time' : selectedYear})</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {yearStats.topGames.map((g, idx) => (
                  <div
                    key={g.id}
                    className="p-3.5 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] space-y-2 relative overflow-hidden"
                  >
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 font-mono font-black text-xs flex items-center justify-center border border-amber-500/40">
                      #{idx + 1}
                    </div>
                    {g.thumbnail ? (
                      <img
                        src={g.thumbnail}
                        alt={g.name}
                        className="w-full aspect-[4/3] rounded-xl object-cover border border-[var(--line)]"
                      />
                    ) : (
                      <div className="w-full aspect-[4/3] rounded-xl bg-[var(--card-3)] flex items-center justify-center text-3xl">
                        🎲
                      </div>
                    )}
                    <div>
                      <h4 className="font-display font-bold text-xs text-[var(--ink)] truncate">{g.name}</h4>
                      <p className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 mt-1">
                        {g.count} plays
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
            <Card className="p-6 space-y-6 bg-[var(--card)] border border-[var(--line)]">
              <div>
                <h2 className="font-display font-bold text-xl text-[var(--ink)] flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                  <span>Favorite Venues &amp; Locations</span>
                </h2>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Tabletop gaming locations logged across {sessions.length.toLocaleString('en-US')} sessions
                </p>
              </div>

              <div className="space-y-3">
                {locationStats.map((loc, idx) => (
                  <div
                    key={loc.location}
                    className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-xl bg-[var(--card-3)] text-[var(--accent)] font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="font-display font-extrabold text-sm sm:text-base text-[var(--ink)]">
                          {loc.location}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs tabular-nums font-mono">
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                          {loc.count} plays ({loc.percentage}%)
                        </span>
                        {loc.topWinnerWins > 0 && loc.topWinnerName && (
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <span>👑</span> {loc.topWinnerName}: {loc.topWinnerWins} wins ({loc.topWinnerRate}%)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Percentage Bar */}
                    <div className="w-full h-2 rounded-full bg-[var(--card-3)] overflow-hidden border border-[var(--line)]">
                      <div
                        className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
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
            {/* MULTI-DIMENSIONAL PLAYER LEADERBOARDS (POSITIVE & NEGATIVE) */}
            <PlayerLeaderboardSection players={players} sessions={sessions} />

            {/* HEAD-TO-HEAD COMPARISON SECTION */}
            <Card className="p-6 space-y-6 bg-[var(--card)] border border-[var(--line)]">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Swords className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  <h2 className="font-display font-bold text-xl text-[var(--ink)]">
                    Head-to-Head Comparison
                  </h2>
                </div>
                <p className="text-xs text-[var(--muted)]">
                  Select 2 or more players to compare head-to-head records at the same table
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
                <div className="p-8 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] text-center">
                  <p className="text-sm text-[var(--muted)]">
                    Please select at least 2 players above to compare head-to-head records.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Swords className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                      <span className="font-display font-bold text-sm text-[var(--ink)]">
                        Shared Sessions Played
                      </span>
                    </div>
                    <span className="font-mono font-black text-2xl text-cyan-700 dark:text-cyan-400 tabular-nums">
                      {headToHead.sharedSessionsCount} plays
                    </span>
                  </div>

                  {/* Head-to-Head Summary Table */}
                  <div className="overflow-x-auto rounded-2xl border border-[var(--line)]">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[var(--card-2)] text-xs text-[var(--muted)]">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Player</th>
                          <th className="py-3 px-4 font-semibold text-right">Shared Wins</th>
                          <th className="py-3 px-4 font-semibold text-right">Win Rate (%)</th>
                          <th className="py-3 px-4 font-semibold text-right">High Score</th>
                          <th className="py-3 px-4 font-semibold text-right">Low Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--line)] bg-[var(--card)] tabular-nums">
                        {headToHead.playerStats.map((st) => (
                          <tr key={st.player.id}>
                            <td className="py-3 px-4 font-display font-bold text-[var(--ink)]">
                              <div className="flex items-center gap-2">
                                <PlayerAvatar player={st.player} size="sm" />
                                <span>{st.player.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                              {st.winsInShared}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              {st.winRateInShared}%
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-[var(--ink)]">
                              {st.highestScore !== null ? st.highestScore : '—'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-[var(--muted)]">
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
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                        Per-Game Shared Record
                      </h3>
                      <div className="overflow-x-auto rounded-2xl border border-[var(--line)] max-h-64 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[var(--card-2)] text-[var(--muted)] sticky top-0">
                            <tr>
                              <th className="py-2.5 px-4 font-semibold">Board Game</th>
                              <th className="py-2.5 px-3 font-semibold text-right">Shared Plays</th>
                              {activeComparisonPlayers.map((p) => (
                                <th key={p.id} className="py-2.5 px-3 font-semibold text-right">
                                  {p.name} Wins
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--line)] bg-[var(--card)] tabular-nums">
                            {headToHead.perGameBreakdown.map((row) => (
                              <tr key={row.gameId}>
                                <td className="py-2.5 px-4 font-bold text-[var(--ink)]">{row.gameName}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-[var(--muted)]">
                                  {row.plays}
                                </td>
                                {activeComparisonPlayers.map((p) => {
                                  const w = row.winsByPlayerId[p.id] || 0;
                                  return (
                                    <td key={p.id} className="py-2.5 px-3 text-right font-mono text-[var(--ink)]">
                                      {w > 0 ? (
                                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
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
        {/* TAB 5: BY GAME DEEP DIVE WITH OWNERSHIP STATUS FILTER */}
        {/* ========================================================= */}
        {activeTab === 'by_game' && (
          <div className="space-y-6">
            {/* OWNERSHIP STATUS FILTER PILLS & SEARCH */}
            <Card className="p-4 sm:p-5 space-y-3.5 bg-[var(--card)] border border-[var(--line)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                    Lọc Theo Trạng Thái Sở Hữu:
                  </span>
                </div>
                <div className="relative sm:w-64">
                  <Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Tìm tên game..."
                    value={gameSearchQuery}
                    onChange={(e) => setGameSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[var(--card-2)] border border-[var(--line)] text-xs font-semibold text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
                  />
                  {gameSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setGameSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {STATUS_FILTER_OPTIONS.map((opt) => {
                  const count = gameStatusCounts[opt.id] ?? 0;
                  if (count === 0 && opt.id !== 'all' && opt.id !== 'own') return null;
                  const isSelected = gameStatusFilter === opt.id;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setGameStatusFilter(opt.id);
                        const matching = opt.id === 'all' ? games : games.filter((g) => g.status === opt.id);
                        if (matching.length > 0 && !matching.some((g) => g.id === selectedGameId)) {
                          setSelectedGameId(matching[0].id);
                        }
                      }}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer select-none border',
                        isSelected
                          ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)] shadow-sm'
                          : 'bg-[var(--card-2)] text-[var(--ink-2)] border-[var(--line)] hover:bg-[var(--card-3)] hover:text-[var(--ink)]'
                      )}
                    >
                      <span>{opt.label}</span>
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold',
                          isSelected
                            ? 'bg-black/20 text-current'
                            : 'bg-[var(--card-3)] text-[var(--muted)]'
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* GAME DEEP DIVE CARD */}
            {activeGame ? (
              <Card className="p-6 sm:p-8 space-y-6 bg-[var(--card)] border border-[var(--line)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-5">
                  <div className="flex items-center gap-4 min-w-0">
                    <img
                      src={activeGame.thumbnail || activeGame.image}
                      alt={activeGame.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-20 rounded-xl object-cover border border-[var(--line)] shrink-0 shadow-md"
                    />
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[var(--ink)] truncate">
                          {activeGame.name}
                        </h2>
                        <GameStatusBadge status={activeGame.status} />
                        {activeGame.yearPublished && (
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--card-2)] border border-[var(--line)] text-[var(--muted)] font-mono font-bold">
                            {activeGame.yearPublished}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--muted)] line-clamp-1">
                        {activeGame.minPlayers}-{activeGame.maxPlayers} người chơi · {activeGame.playingTime} phút/ván
                      </p>
                    </div>
                  </div>

                  <select
                    aria-label="Select board game to view analytics"
                    value={activeGame.id}
                    onChange={(e) => setSelectedGameId(e.target.value)}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[var(--card-2)] border border-[var(--line-2)] text-sm font-semibold text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] cursor-pointer sm:max-w-xs shrink-0"
                  >
                    {filteredGamesByStatus.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 tabular-nums">
                  {/* 1. TOTAL PLAYS */}
                  <div className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] text-[var(--muted)] font-bold uppercase tracking-wider">Tổng Số Ván</span>
                      <p className="font-display font-black text-2xl text-[var(--accent)] mt-1">
                        {activeGameStats.totalPlays} ván
                      </p>
                    </div>
                    <span className="text-[10px] text-[var(--muted)] mt-1">
                      {activeGameSessions.length} session đã log
                    </span>
                  </div>

                  {/* 2. AVERAGE DURATION */}
                  <div className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] text-[var(--muted)] font-bold uppercase tracking-wider">Thời Lượng TB</span>
                      <p className="font-display font-black text-2xl text-cyan-700 dark:text-cyan-400 mt-1">
                        {formatDuration(activeGameStats.averageDuration)}
                      </p>
                    </div>
                    <span className="text-[10px] text-[var(--muted)] mt-1">
                      Chuẩn nhịp chơi của hội
                    </span>
                  </div>

                  {/* 3. HIGHEST SCORE RECORD */}
                  <div className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <span>🏆</span> Cao Nhất
                      </span>
                      <p className="font-mono font-black text-2xl text-emerald-600 dark:text-emerald-400 mt-1">
                        {activeGameStats.highestScore ? `${activeGameStats.highestScore.score}đ` : '—'}
                      </p>
                    </div>
                    {activeGameStats.highestScore ? (
                      <div className="mt-1 space-y-0.5">
                        <span className="text-xs font-bold text-[var(--ink)] block truncate">
                          {activeGameStats.highestScore.playerName}
                        </span>
                        <span className="text-[10px] text-[var(--muted)] block truncate">
                          {formatRecordTimeAgo(activeGameStats.highestScore.date)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-[var(--muted)]">Chưa có điểm</span>
                    )}
                  </div>

                  {/* 4. LOWEST SCORE RECORD */}
                  <div className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] text-rose-500 font-bold uppercase tracking-wider flex items-center gap-1">
                        <span>📉</span> Thấp Nhất
                      </span>
                      <p className="font-mono font-black text-2xl text-rose-500 mt-1">
                        {activeGameStats.lowestScore ? `${activeGameStats.lowestScore.score}đ` : '—'}
                      </p>
                    </div>
                    {activeGameStats.lowestScore ? (
                      <div className="mt-1 space-y-0.5">
                        <span className="text-xs font-bold text-[var(--ink)] block truncate">
                          {activeGameStats.lowestScore.playerName}
                        </span>
                        <span className="text-[10px] text-[var(--muted)] block truncate">
                          {formatRecordTimeAgo(activeGameStats.lowestScore.date)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-[var(--muted)]">Chưa có điểm</span>
                    )}
                  </div>

                  {/* 5. CHAMPION (MOST WINS) */}
                  <div className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <span>👑</span> Thắng Nhiều Nhất
                      </span>
                      <p className="font-display font-bold text-base text-amber-600 dark:text-amber-400 mt-1 truncate">
                        {activeGameStats.mostWinsPlayer?.playerName || activeGameStats.playerWinRates[0]?.playerName || '—'}
                      </p>
                    </div>
                    {activeGameStats.mostWinsPlayer || activeGameStats.playerWinRates[0] ? (
                      <div className="mt-1 space-y-0.5">
                        <span className="text-xs font-mono font-bold text-[var(--ink)] block">
                          {(activeGameStats.mostWinsPlayer || activeGameStats.playerWinRates[0])?.wins} thắng ({(activeGameStats.mostWinsPlayer || activeGameStats.playerWinRates[0])?.winRate}%)
                        </span>
                        {(activeGameStats.mostWinsPlayer || activeGameStats.playerWinRates[0])?.lastWonDate && (
                          <span className="text-[10px] text-[var(--muted)] block truncate">
                            Thắng: {formatRecordTimeAgo((activeGameStats.mostWinsPlayer || activeGameStats.playerWinRates[0])?.lastWonDate)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-[var(--muted)]">Chưa có trận thắng</span>
                    )}
                  </div>

                  {/* 6. MOST LOSSES PLAYER */}
                  <div className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <span>🥄</span> Thua Nhiều Nhất
                      </span>
                      <p className="font-display font-bold text-base text-rose-600 dark:text-rose-400 mt-1 truncate">
                        {activeGameStats.mostLossesPlayer?.playerName || '—'}
                      </p>
                    </div>
                    {activeGameStats.mostLossesPlayer ? (
                      <div className="mt-1 space-y-0.5">
                        <span className="text-xs font-mono font-bold text-[var(--ink)] block">
                          {activeGameStats.mostLossesPlayer.losses} thua / {activeGameStats.mostLossesPlayer.plays} ván ({activeGameStats.mostLossesPlayer.lossRate}%)
                        </span>
                        {activeGameStats.mostLossesPlayer.lastPlayedDate && (
                          <span className="text-[10px] text-[var(--muted)] block truncate">
                            Gần nhất: {formatRecordTimeAgo(activeGameStats.mostLossesPlayer.lastPlayedDate)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-[var(--muted)]">Chưa có trận thua</span>
                    )}
                  </div>
                </div>

                {/* Win rates for this game */}
                {activeGameStats.playerWinRates.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-[var(--line)]">
                    <h3 className="font-bold text-sm text-[var(--ink)]">Hiệu Suất Của Người Chơi Trong Game Này</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {activeGameStats.playerWinRates.map((pw) => (
                        <div
                          key={pw.playerName}
                          className="p-3 rounded-xl bg-[var(--card-2)] border border-[var(--line)] flex items-center justify-between"
                        >
                          <span className="font-bold text-xs text-[var(--ink)]">{pw.playerName}</span>
                          <div className="text-xs font-mono">
                            <span className="text-amber-600 dark:text-amber-400 font-bold">{pw.wins} thắng</span>
                            <span className="text-[var(--muted)] ml-2">({pw.winRate}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ) : (
              <div className="p-8 text-center bg-[var(--card-2)] rounded-2xl border border-[var(--line)] text-sm text-[var(--muted)]">
                Không tìm thấy game nào phù hợp với bộ lọc trạng thái sở hữu hiện tại.
              </div>
            )}

            {/* ALL GAMES BREAKDOWN TABLE FOR CURRENT STATUS */}
            {gamesBreakdownList.length > 0 && (
              <Card className="p-6 space-y-4 bg-[var(--card)] border border-[var(--line)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display font-bold text-lg text-[var(--ink)] flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-emerald-500" />
                      <span>
                        Bảng Thống Kê Tổng Quan ({gamesBreakdownList.length} game)
                      </span>
                    </h3>
                    <p className="text-xs text-[var(--muted)]">
                      {gameStatusFilter === 'all'
                        ? 'Danh sách toàn bộ các game trong kho sắp xếp theo số lượt chơi nhiều nhất'
                        : `Danh sách các game có trạng thái "${STATUS_FILTER_OPTIONS.find((o) => o.id === gameStatusFilter)?.label || gameStatusFilter}" sắp xếp theo số lượt chơi`}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-[var(--line)]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[var(--card-2)] border-b border-[var(--line)] text-[var(--muted)]">
                      <tr>
                        <th className="py-3 px-4 font-bold">Tựa Game</th>
                        <th className="py-3 px-3 font-bold text-center">Trạng Thái</th>
                        <th className="py-3 px-3 font-bold text-right">Lượt Chơi</th>
                        <th className="py-3 px-3 font-bold text-right">Tổng Thời Gian</th>
                        <th className="py-3 px-3 font-bold text-right">Điểm Cao Nhất</th>
                        <th className="py-3 px-3 font-bold text-right">Điểm Thấp Nhất</th>
                        <th className="py-3 px-3 font-bold text-right">Thắng Nhiều Nhất</th>
                        <th className="py-3 px-3 font-bold text-right">Thua Nhiều Nhất</th>
                        <th className="py-3 px-4 font-bold text-center">Hành Động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--line)] tabular-nums bg-[var(--card)]">
                      {gamesBreakdownList.map((item) => {
                        const isSelected = activeGame && item.game.id === activeGame.id;
                        return (
                          <tr
                            key={item.game.id}
                            onClick={() => setSelectedGameId(item.game.id)}
                            className={cn(
                              'hover:bg-[var(--card-2)]/60 transition-colors cursor-pointer',
                              isSelected && 'bg-[var(--accent)]/10 font-medium'
                            )}
                          >
                            <td className="py-3 px-4 font-display font-bold text-[var(--ink)]">
                              <div className="flex items-center gap-3">
                                <img
                                  src={item.game.thumbnail || item.game.image}
                                  alt={item.game.name}
                                  referrerPolicy="no-referrer"
                                  className="w-8 h-10 rounded-lg object-cover shrink-0 border border-[var(--line)] shadow-sm"
                                />
                                <div className="min-w-0">
                                  <span className="font-bold text-sm block truncate text-[var(--ink)]">
                                    {item.game.name}
                                  </span>
                                  <span className="text-[10px] text-[var(--muted)] font-normal font-sans">
                                    {item.game.minPlayers} - {item.game.maxPlayers} người · {item.game.playingTime}p
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <GameStatusBadge status={item.game.status} />
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-sm">
                              <span className={item.totalPlays > 0 ? 'text-[var(--accent)] font-black' : 'text-[var(--muted)]'}>
                                {item.totalPlays} ván
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-xs text-[var(--ink-2)]">
                              {item.totalDuration > 0 ? formatDuration(item.totalDuration) : '—'}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-xs">
                              {item.highestScore ? (
                                <div>
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                    {item.highestScore.score}đ
                                  </span>
                                  <span className="text-[10px] text-[var(--muted)] block truncate max-w-[120px] ml-auto">
                                    {item.highestScore.playerName}
                                  </span>
                                  {item.highestScore.date && (
                                    <span className="text-[9px] text-[var(--muted)]/80 block truncate max-w-[130px] ml-auto" title={formatRecordTimeAgo(item.highestScore.date)}>
                                      {formatRecordTimeAgo(item.highestScore.date)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[var(--muted)]">—</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-xs">
                              {item.lowestScore ? (
                                <div>
                                  <span className="font-bold text-rose-500">
                                    {item.lowestScore.score}đ
                                  </span>
                                  <span className="text-[10px] text-[var(--muted)] block truncate max-w-[120px] ml-auto">
                                    {item.lowestScore.playerName}
                                  </span>
                                  {item.lowestScore.date && (
                                    <span className="text-[9px] text-[var(--muted)]/80 block truncate max-w-[130px] ml-auto" title={formatRecordTimeAgo(item.lowestScore.date)}>
                                      {formatRecordTimeAgo(item.lowestScore.date)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[var(--muted)]">—</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-xs">
                              {item.topWinner ? (
                                <div>
                                  <span className="font-bold text-amber-600 dark:text-amber-400 block truncate max-w-[120px] ml-auto">
                                    {item.topWinner.playerName}
                                  </span>
                                  <span className="text-[10px] text-[var(--muted)] block">
                                    {item.topWinner.wins} thắng ({item.topWinner.winRate}%)
                                  </span>
                                  {item.topWinner.lastWonDate && (
                                    <span className="text-[9px] text-[var(--muted)]/80 block truncate max-w-[130px] ml-auto" title={`Thắng: ${formatRecordTimeAgo(item.topWinner.lastWonDate)}`}>
                                      {formatRecordTimeAgo(item.topWinner.lastWonDate)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[var(--muted)]">—</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-xs">
                              {item.topLoser ? (
                                <div>
                                  <span className="font-bold text-rose-600 dark:text-rose-400 block truncate max-w-[120px] ml-auto">
                                    {item.topLoser.playerName}
                                  </span>
                                  <span className="text-[10px] text-[var(--muted)] block">
                                    {item.topLoser.losses} thua ({item.topLoser.lossRate}%)
                                  </span>
                                  {item.topLoser.lastPlayedDate && (
                                    <span className="text-[9px] text-[var(--muted)]/80 block truncate max-w-[130px] ml-auto" title={`Gần nhất: ${formatRecordTimeAgo(item.topLoser.lastPlayedDate)}`}>
                                      {formatRecordTimeAgo(item.topLoser.lastPlayedDate)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[var(--muted)]">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedGameId(item.game.id);
                                }}
                                className={cn(
                                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none',
                                  isSelected
                                    ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                                    : 'bg-[var(--card-2)] text-[var(--ink-2)] hover:bg-[var(--card-3)] hover:text-[var(--ink)]'
                                )}
                              >
                                {isSelected ? 'Đang Xem' : 'Xem'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

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
