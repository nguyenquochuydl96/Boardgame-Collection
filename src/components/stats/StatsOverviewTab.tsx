import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Clock,
  Flame,
  Calendar,
  ArrowRight,
  Award,
  ChevronRight,
  ChevronDown,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { PlayerAvatar } from '../player/PlayerAvatar';
import { StreakDetailModal } from '../player/StreakDetailModal';
import { GameCoverImage } from '../game/GameCoverImage';
import { cn } from '../ui/cn';
import {
  calculateLongestWinStreak,
  calculateMinRequiredPlays,
  calculatePlayerStreaks,
  StreakData,
  formatDate,
  formatDuration,
  pluralize,
} from '../../lib/utils';
import { Player, PlaySession, BoardGame } from '../../types';

export const GameThumbBox: React.FC<{
  src?: string;
  alt: string;
  fallbackIcon: React.ReactNode;
  fallbackBg?: string;
}> = React.memo(({ src, alt, fallbackIcon, fallbackBg = 'bg-[var(--card-3)]' }) => {
  if (src) {
    return (
      <GameCoverImage
        game={{ name: alt, thumbnail: src }}
        className="w-16 h-20 rounded-xl shrink-0 border border-[var(--line)] shadow-md group-hover:scale-105 transition-transform"
        paddingClass="p-1"
        fallbackIconSize="text-2xl"
      />
    );
  }

  return (
    <div
      className={cn(
        'relative w-16 h-20 rounded-xl overflow-hidden shrink-0 border border-[var(--line)] shadow-md group-hover:scale-105 transition-transform flex flex-col items-center justify-center text-center p-1',
        fallbackBg
      )}
    >
      {fallbackIcon}
    </div>
  );
});

interface StatsOverviewTabProps {
  sessions: PlaySession[];
  games: BoardGame[];
  players: Player[];
  availableYears: string[];
}

export const StatsOverviewTab: React.FC<StatsOverviewTabProps> = React.memo(
  ({ sessions, games, players, availableYears }) => {
    // Time filter states
    const [selectedYears, setSelectedYears] = useState<string[]>([]);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
    const yearPickerRef = useRef<HTMLDivElement>(null);

    const [selectedStreakPlayer, setSelectedStreakPlayer] = useState<Player | null>(null);
    const [selectedStreakData, setSelectedStreakData] = useState<StreakData | null>(null);

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

    // Overview sessions filtered by date range and selected years
    const overviewSessions = useMemo(() => {
      return sessions.filter((s) => {
        if (!s.datePlayed) return false;
        const sDate = s.datePlayed.slice(0, 10);
        const sYear = s.datePlayed.slice(0, 4);

        if (selectedYears.length > 0 && !selectedYears.includes(sYear)) {
          return false;
        }
        if (startDate && sDate < startDate) {
          return false;
        }
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

    // Play count per game
    const playCountByGame = useMemo(() => {
      const map = new Map<string, number>();
      for (const s of overviewSessions) {
        map.set(s.gameId, (map.get(s.gameId) || 0) + 1);
      }
      return map;
    }, [overviewSessions]);

    // Ranked games by play count
    const sortedGamesByPlays = useMemo(() => {
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
        nextHIndexGame: sortedGamesByPlays[h],
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

    // Winning streaks per player
    const playerStreaks = useMemo(() => {
      const minRequiredPlays = calculateMinRequiredPlays(overviewSessions.length, 0.05);
      const playerPlaysMap = new Map<string, number>();
      overviewSessions.forEach((s) => {
        s.players?.forEach((p) => {
          playerPlaysMap.set(p.playerId, (playerPlaysMap.get(p.playerId) || 0) + 1);
        });
      });

      return players
        .filter((p) => (playerPlaysMap.get(p.id) || 0) >= minRequiredPlays)
        .map((p) => ({
          player: p,
          streak: calculateLongestWinStreak(p.id, overviewSessions),
        }))
        .filter((x) => x.streak > 0)
        .sort((a, b) => b.streak - a.streak);
    }, [players, overviewSessions]);

    // Monthly play frequency
    const monthlyFrequency = useMemo(() => {
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
    }, [overviewSessions]);

    const maxMonthCount = Math.max(...monthlyFrequency.map((m) => m.count), 1);

    return (
      <div className="space-y-6">
        {/* TIME FILTER TOOLBAR */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--card)] shadow-[inset_0_0_0_1px_var(--line)] space-y-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Left: Filter Controls */}
            <div className="flex items-center gap-2 flex-wrap">
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
              <div className="inline-flex flex-wrap items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[var(--card-2)] shadow-[inset_0_0_0_1px_var(--line)] text-xs max-w-full">
                <Calendar className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                <div className="inline-flex items-center gap-1">
                  <span className="text-[11px] font-bold text-[var(--muted)]">From:</span>
                  <input
                    type="date"
                    aria-label="Start date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent border-0 text-xs font-bold text-[var(--ink)] focus:outline-none p-0 cursor-pointer min-w-[95px] [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
                <span className="text-[var(--muted)] font-bold px-0.5 hidden sm:inline">➔</span>
                <div className="inline-flex items-center gap-1">
                  <span className="text-[11px] font-bold text-[var(--muted)]">To:</span>
                  <input
                    type="date"
                    aria-label="End date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent border-0 text-xs font-bold text-[var(--ink)] focus:outline-none p-0 cursor-pointer min-w-[95px] [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="w-8 h-8 sm:w-6 sm:h-6 rounded-full bg-[var(--card-3)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center text-xs ml-1 cursor-pointer"
                    title="Clear date range"
                    aria-label="Clear date range"
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
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-[#161311] font-mono font-bold">
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
                              {pluralize(count, 'play')}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {hasActiveTimeFilter && (
                <button
                  type="button"
                  onClick={resetTimeFilter}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-1 cursor-pointer select-none"
                  title="Reset all filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
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
                ({pluralize(overviewSessions.length, 'play')})
              </span>
            </div>
          </div>
        </div>

        {/* H-INDEX SPECIAL HERO BANNER */}
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
                {hasActiveTimeFilter ? `In ${timeFilterLabel.toLowerCase()},` : 'Across all time,'} you have played at least{' '}
                <strong className="text-[var(--ink)]">{pluralize(hIndex, 'different game')}</strong>, each at least{' '}
                <strong className="text-[var(--ink)]">{pluralize(hIndex, 'time')}</strong>!
              </p>

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
                        {pluralize(g.plays, 'play')}
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
              {hasActiveTimeFilter
                ? `No play sessions recorded in ${timeFilterLabel.toLowerCase()}.`
                : 'No play sessions recorded yet.'}
            </p>
            <Button variant="primary" size="sm" onClick={resetTimeFilter}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              View All Time ({pluralize(sessions.length, 'session')})
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
                    {pluralize(mostPlayedGame.plays, 'play')} logged
                  </p>
                  <p className="text-[10px] text-[var(--muted)] truncate">
                    {((mostPlayedGame.plays / Math.max(1, overviewSessions.length)) * 100).toFixed(0)}% of{' '}
                    {hasActiveTimeFilter ? `sessions in ${timeFilterLabel.toLowerCase()}` : 'all-time sessions'}
                  </p>
                </div>
              </Link>
            )}

            {/* 2. Longest Session Card */}
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

            {/* 3. Shortest Session Card */}
            {shortestSession ? (
              <Link
                to={`/sessions/${shortestSession.id}`}
                className="p-4 sm:p-5 rounded-2xl bg-[var(--card)] border border-[var(--line)] hover:border-[var(--accent)] hover:shadow-md transition-all group cursor-pointer flex gap-3.5 items-center select-none"
              >
                <GameThumbBox
                  src={shortestSessionThumbnail}
                  alt={shortestSession.gameName}
                  fallbackIcon={<Clock className="w-7 h-7 text-[var(--accent)]" />}
                  fallbackBg="bg-[var(--accent)]/15 border-[var(--accent)]/30"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--accent)] inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Shortest Play Session
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[var(--accent)] group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </div>
                  <p className="font-display font-black text-2xl text-[var(--ink)] mt-0.5">
                    {formatDuration(shortestSession.durationMinutes)}
                  </p>
                  <h4 className="font-display font-bold text-sm text-[var(--ink)] truncate group-hover:text-[var(--accent)] transition-colors">
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
                <p className="text-xs text-[var(--muted)]">
                  Consecutive wins across all games (≥ 5% sessions played)
                </p>
              </div>
            </div>

            <div className="space-y-2 tabular-nums">
              {playerStreaks.slice(0, 6).map(({ player, streak }) => (
                <div
                  key={player.id}
                  onClick={() => {
                    const sDetails = calculatePlayerStreaks(player.id, overviewSessions);
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
    );
  }
);
