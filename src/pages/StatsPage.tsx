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
    if (selectedYears.length === 0) return 'All Time';
    if (selectedYears.length === 1) return `Year ${selectedYears[0]}`;
    const sorted = [...selectedYears].sort();
    return `Period ${sorted.join(' - ')}`;
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
  }, [sessions, players]);

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
              Advanced Statistics &amp; Insights
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
              Comprehensive breakdown of H-Index, game records, favorite venues, and player rivalries
            </p>
          </div>

          <div className="text-xs font-mono px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--accent-neon)] w-fit">
            Total: <strong>{sessions.length}</strong> sessions · <strong>{totalHoursPlayed}h</strong> played
          </div>
        </div>

        {/* Navigation Tabs (5 Tabs with sliding spring pill) */}
        <div
          role="tablist"
          className="flex p-1.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] max-w-full overflow-x-auto gap-1"
        >
          {[
            { id: 'overview', label: 'Overview & H-Index', icon: BarChart3, iconColor: '' },
            { id: 'years', label: 'Years & Trends', icon: Calendar, iconColor: 'text-amber-400' },
            { id: 'locations', label: 'Venues & Locations', icon: MapPin, iconColor: 'text-rose-400' },
            { id: 'by_player', label: 'Leaderboard & Rivalries', icon: Users, iconColor: 'text-cyan-400' },
            { id: 'by_game', label: 'Game Breakdown', icon: Dices, iconColor: 'text-emerald-400' },
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
                    Time Filter:
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
                    All Time ({sessions.length})
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
                        Year {yr} ({count})
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
                      {availableYears[1]} - {availableYears[0]} (Last 2 Years)
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
                      <span>Custom Years...</span>
                    </button>
                  )}
                </div>

                {/* Current Filter Status */}
                <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                  <span>Viewing:</span>
                  <span className="font-bold text-white px-2 py-0.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                    {timeFilterLabel}
                  </span>
                  <span className="font-mono text-amber-400 font-bold">
                    ({overviewSessions.length} sessions)
                  </span>
                </div>
              </div>

              {/* Custom Multi-Year Selection Drawer */}
              {isCustomMultiYearOpen && (
                <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-2 animate-in fade-in duration-150">
                  <span className="text-xs text-[var(--text-muted)] font-medium mr-1">
                    Select years to combine data:
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
                        <span>{yr} ({yrCount} sessions)</span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setSelectedYears([...availableYears])}
                    className="text-[11px] font-bold text-amber-400 hover:underline ml-2 cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedYears([])}
                    className="text-[11px] font-bold text-rose-400 hover:underline ml-1 cursor-pointer"
                  >
                    Clear Selection
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
                    H-Index Rating:{' '}
                    <span className="text-amber-400 underline decoration-amber-400/50">
                      H-{hIndex}
                    </span>
                  </h2>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    In {timeFilterLabel.toLowerCase()}, you have played at least <strong>{hIndex} different games</strong>, each at least{' '}
                    <strong>{hIndex} times</strong>!
                  </p>

                  {/* Progress towards next H-Index */}
                  {nextHIndexGame && (
                    <div className="pt-2">
                      <div className="flex justify-between text-xs font-bold text-white mb-1.5">
                        <span>Progress towards H-{hIndex + 1}:</span>
                        <span className="text-amber-300 font-mono">
                          {nextHIndexGame.name} ({nextHIndexGame.plays}/{hIndex + 1} plays)
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
                        Only <strong>{(hIndex + 1) - nextHIndexGame.plays} more {(hIndex + 1) - nextHIndexGame.plays === 1 ? 'play' : 'plays'}</strong> for {nextHIndexGame.name} to advance to <strong>H-{hIndex + 1}</strong>!
                      </p>
                    </div>
                  )}
                </div>

                {/* H-Index Club Games Preview */}
                <div className="bg-[var(--bg-elevated)]/80 border border-[var(--border-subtle)] rounded-2xl p-4 lg:w-80 space-y-2.5">
                  <span className="text-xs font-bold text-[var(--accent-neon)] uppercase tracking-wider block">
                    Games in H-{hIndex} Club ({hIndexClub.length})
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
                            {g.plays} plays
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[var(--text-muted)] italic py-2 text-center">
                        No games have reached H-{hIndex} in this period
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
                  No Sessions Found
                </h3>
                <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                  No play sessions recorded in {timeFilterLabel.toLowerCase()}.
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
                  View All Time ({sessions.length} sessions)
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
                          Most Played Game
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </div>
                      <h3 className="font-display font-bold text-base text-white truncate block mt-0.5 group-hover:text-amber-300 transition-colors">
                        {mostPlayedGame.name}
                      </h3>
                      <p className="text-xs text-amber-300 font-mono font-bold mt-0.5">
                        {mostPlayedGame.plays} plays logged
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">
                        {((mostPlayedGame.plays / Math.max(1, overviewSessions.length)) * 100).toFixed(0)}% of sessions in {timeFilterLabel.toLowerCase()}
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
                    <span className="text-[9px] font-extrabold uppercase mt-1 tracking-wider">Vault</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#94a3b8] group-hover:text-amber-300 transition-colors">
                        Played Games in Vault
                      </span>
                      <span className="text-xs font-bold text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                        View <ArrowRight className="w-3 h-3" />
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
                      % vault played · {sortedGamesByPlays.filter((g) => g.plays === 0).length} unplayed
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
                          Longest Play Session
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
                    No play sessions with recorded duration
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
                          Shortest Play Session
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
                    No play sessions with recorded duration
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
                      Play Frequency by Month
                    </h2>
                    <p className="text-xs text-[#94a3b8]">
                      Session history by month (scroll horizontally to explore)
                    </p>
                  </div>
                  <span className="text-xs font-mono text-amber-400 font-bold bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                    Peak: {maxMonthCount} sessions/month
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
                      Longest Win Streak
                    </h2>
                    <p className="text-xs text-[#94a3b8]">Consecutive wins across all games</p>
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
                      title="Click to view winning streak history"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <PlayerAvatar player={player} size="sm" />
                        <span className="font-display font-bold text-xs text-white truncate group-hover:text-amber-300 transition-colors">
                          {player.name}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-xs text-orange-300 shrink-0 flex items-center gap-1 group-hover:underline">
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
            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] w-fit flex-wrap">
              <span className="text-xs font-bold text-[var(--text-secondary)] px-2">Filter Year:</span>
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
                <span className="relative z-10">All Years</span>
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
                  <span className="relative z-10">{yr}</span>
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
                  <span className="text-xs text-[var(--text-secondary)]">Total Sessions ({selectedYear === 'all' ? 'All-Time' : selectedYear})</span>
                  <p className="font-display font-black text-2xl text-white mt-0.5">
                    {yearStats.totalSessions} plays
                  </p>
                </div>
              </Card>

              <Card className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-2xl">
                  ⏱️
                </div>
                <div>
                  <span className="text-xs text-[var(--text-secondary)]">Tabletop Playtime</span>
                  <p className="font-display font-black text-2xl text-white mt-0.5">
                    ~{yearStats.hours} hrs
                  </p>
                </div>
              </Card>

              <Card className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-2xl">
                  👑
                </div>
                <div>
                  <span className="text-xs text-[var(--text-secondary)]">Most Wins</span>
                  <p className="font-display font-black text-xl text-white mt-0.5 truncate">
                    {yearStats.topWinners[0]?.playerName || '—'}
                  </p>
                  {yearStats.topWinners[0] && (
                    <span className="text-[11px] text-amber-300 font-bold">
                      {yearStats.topWinners[0].wins} wins
                    </span>
                  )}
                </div>
              </Card>
            </div>

            {/* Top Games of the Year */}
            <Card className="p-6 space-y-4">
              <h2 className="font-display font-bold text-xl text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>Top Played Board Games ({selectedYear === 'all' ? 'All-Time' : selectedYear})</span>
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
            <Card className="p-6 space-y-6">
              <div>
                <h2 className="font-display font-bold text-xl text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-rose-400" />
                  <span>Favorite Venues &amp; Locations</span>
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Tabletop gaming locations logged across {sessions.length.toLocaleString('en-US')} sessions
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
                          {loc.count} plays ({loc.percentage}%)
                        </span>
                        {loc.topWinnerWins > 0 && loc.topWinnerName && (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <span>👑</span> {loc.topWinnerName}: {loc.topWinnerWins} wins ({loc.topWinnerRate}%)
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
                    <span>All-Time Player Leaderboard</span>
                  </h2>
                  <p className="text-xs text-[#94a3b8]">
                    Rankings by total sessions logged and win rates across all tabletop games
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] text-[#94a3b8]">
                    <tr>
                      <th className="py-3 px-4 font-bold">Rank</th>
                      <th className="py-3 px-4 font-bold">Player</th>
                      <th className="py-3 px-3 font-bold text-right">Plays</th>
                      <th className="py-3 px-3 font-bold text-right">Wins</th>
                      <th className="py-3 px-3 font-bold text-right">Win Rate (%)</th>
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
                            {idx === 0 && item.winRate > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                👑 Top Win Rate ({item.winRate}%)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-white">
                          {item.plays} plays
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
                    Head-to-Head Comparison
                  </h2>
                </div>
                <p className="text-xs text-[#94a3b8]">
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
                <div className="p-8 rounded-2xl bg-[var(--bg-surface)] border border-white/10 text-center">
                  <p className="text-sm text-[#94a3b8]">
                    Please select at least 2 players above to compare head-to-head records.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Swords className="w-5 h-5 text-cyan-400" />
                      <span className="font-display font-bold text-sm text-white">
                        Shared Sessions Played
                      </span>
                    </div>
                    <span className="font-mono font-black text-2xl text-cyan-300 tabular-nums">
                      {headToHead.sharedSessionsCount} plays
                    </span>
                  </div>

                  {/* Head-to-Head Summary Table */}
                  <div className="overflow-x-auto rounded-2xl border border-white/10">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[var(--bg-elevated)] text-xs text-[#94a3b8]">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Player</th>
                          <th className="py-3 px-4 font-semibold text-right">Shared Wins</th>
                          <th className="py-3 px-4 font-semibold text-right">Win Rate (%)</th>
                          <th className="py-3 px-4 font-semibold text-right">High Score</th>
                          <th className="py-3 px-4 font-semibold text-right">Low Score</th>
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
                        Per-Game Shared Record
                      </h3>
                      <div className="overflow-x-auto rounded-2xl border border-white/10 max-h-64 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[var(--bg-elevated)] text-[#94a3b8] sticky top-0">
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
                    Select any board game to inspect high score records, average playtime, and top winners
                  </p>
                </div>
              </div>

              <select
                aria-label="Select board game to view analytics"
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
                <span className="text-xs text-[#94a3b8]">Total Plays Logged</span>
                <p className="font-display font-black text-2xl text-[var(--accent-neon)] mt-1">
                  {activeGameStats.totalPlays}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-white/[0.06]">
                <span className="text-xs text-[#94a3b8]">Average Duration</span>
                <p className="font-display font-black text-2xl text-[#22d3ee] mt-1">
                  {formatDuration(activeGameStats.averageDuration)}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-white/[0.06]">
                <span className="text-xs text-[#94a3b8]">High Score Record</span>
                <p className="font-mono font-black text-2xl text-emerald-400 mt-1">
                  {activeGameStats.highestScore ? activeGameStats.highestScore.score : '—'}
                </p>
                {activeGameStats.highestScore && (
                  <span className="text-xs text-[#94a3b8]">
                    by {activeGameStats.highestScore.playerName}
                  </span>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-white/[0.06]">
                <span className="text-xs text-[#94a3b8]">Champion (Most Wins)</span>
                <p className="font-display font-bold text-base text-amber-400 mt-1 truncate">
                  {activeGameStats.playerWinRates[0]?.playerName || '—'}
                </p>
                {activeGameStats.playerWinRates[0] && (
                  <span className="text-xs text-[#94a3b8]">
                    {activeGameStats.playerWinRates[0].winRate}% win rate
                  </span>
                )}
              </div>
            </div>

            {/* Win rates for this game */}
            {activeGameStats.playerWinRates.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-white/[0.08]">
                <h3 className="font-bold text-sm text-white">Player Performance in this Game</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeGameStats.playerWinRates.map((pw) => (
                    <div
                      key={pw.playerName}
                      className="p-3 rounded-xl bg-[var(--bg-surface)] border border-white/5 flex items-center justify-between"
                    >
                      <span className="font-bold text-xs text-white">{pw.playerName}</span>
                      <div className="text-xs font-mono">
                        <span className="text-amber-400 font-bold">{pw.wins} wins</span>
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
          title="Played vs. Unplayed Games (Pile of Shame)"
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
                <span>Played Games</span>
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
                <span>Unplayed (Pile of Shame)</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 tabular-nums">
                  {unplayedGamesList.length}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <Input
              placeholder="Search games..."
              value={playedGamesSearch}
              onChange={(e) => setPlayedGamesSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-[var(--text-secondary)]" />}
              className="text-xs"
            />

            {/* Games List */}
            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              {filteredModalGames.length === 0 ? (
                <div className="text-center py-8 text-xs text-[var(--text-muted)]">
                  No matching board games found
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
                              {item.plays} plays logged
                            </span>
                          ) : (
                            <span className="text-rose-400 font-medium">
                              No plays recorded yet
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
                          Play Session
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
