import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Crown,
  Flame,
  Gamepad2,
  Medal,
  Frown,
  Snowflake,
  HeartCrack,
} from 'lucide-react';
import { Player, PlaySession } from '../../types';
import { PlayerAvatar } from '../player/PlayerAvatar';
import { Card } from '../ui/Card';
import { cn } from '../ui/cn';

export type LeaderboardCriterion =
  // Positive / Hall of Fame
  | 'win_rate'
  | 'total_wins'
  | 'win_streak'
  | 'game_variety'
  // Negative & Spicy / Fun
  | 'runner_up'
  | 'wooden_spoon'
  | 'cold_streak'
  | 'heartbreak';

export type LeaderboardGroup = 'all' | 'positive' | 'negative';

export interface PlayerComprehensiveStats {
  player: Player;
  plays: number;
  wins: number;
  winRate: number;
  secondPlaces: number;
  secondRate: number;
  lastPlaces: number;
  lastRate: number;
  maxWinStreak: number;
  currentWinStreak: number;
  maxColdStreak: number;
  currentColdStreak: number;
  closeLosses: number;
  uniqueGamesCount: number;
}

interface CriterionConfig {
  id: LeaderboardCriterion;
  label: string;
  shortLabel: string;
  group: 'positive' | 'negative';
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
  tagline: string;
  description: string;
  metricHeader: string;
  contextHeader: string;
  getPrimaryMetric: (st: PlayerComprehensiveStats) => string | number;
  getSecondaryMetric: (st: PlayerComprehensiveStats) => string;
  sortFn: (a: PlayerComprehensiveStats, b: PlayerComprehensiveStats) => number;
  filterFn?: (st: PlayerComprehensiveStats) => boolean;
}

const CRITERIA_CONFIG: CriterionConfig[] = [
  // POSITIVE
  {
    id: 'win_rate',
    label: 'Win Rate (%)',
    shortLabel: 'Win Rate',
    group: 'positive',
    icon: Trophy,
    iconColor: 'text-amber-500 dark:text-amber-400',
    badgeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300',
    badgeText: '🏆 Hall of Fame',
    tagline: 'Highest Victory Percentage',
    description: 'Ranked by highest win rate (minimum 5 matches played for fair qualification).',
    metricHeader: 'Win Rate',
    contextHeader: 'Match Record',
    getPrimaryMetric: (st) => `${st.winRate}%`,
    getSecondaryMetric: (st) => `${st.wins} wins / ${st.plays} plays`,
    sortFn: (a, b) => b.winRate - a.winRate || b.wins - a.wins,
    filterFn: (st) => st.plays >= 5,
  },
  {
    id: 'total_wins',
    label: 'Total Victories (Total Wins)',
    shortLabel: 'Total Wins',
    group: 'positive',
    icon: Crown,
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
    badgeText: '👑 Champion',
    tagline: 'Most Trophies Collected',
    description: 'Total absolute match victories accumulated across all tabletop sessions.',
    metricHeader: 'Total Wins',
    contextHeader: 'Win Rate & Plays',
    getPrimaryMetric: (st) => `${st.wins} wins`,
    getSecondaryMetric: (st) => `Win rate: ${st.winRate}% (across ${st.plays} plays)`,
    sortFn: (a, b) => b.wins - a.wins || b.winRate - a.winRate,
  },
  {
    id: 'win_streak',
    label: 'Record Win Streak',
    shortLabel: 'Win Streak',
    group: 'positive',
    icon: Flame,
    iconColor: 'text-orange-500 dark:text-orange-400',
    badgeBg: 'bg-orange-500/15 border-orange-500/30 text-orange-700 dark:text-orange-300',
    badgeText: '🔥 On Fire',
    tagline: 'Unstoppable Winning Streak',
    description: 'Longest consecutive match winning streak ever achieved by a player.',
    metricHeader: 'Record Streak',
    contextHeader: 'Current Streak Status',
    getPrimaryMetric: (st) => `${st.maxWinStreak} games`,
    getSecondaryMetric: (st) => `Current streak: ${st.currentWinStreak} consecutive wins`,
    sortFn: (a, b) => b.maxWinStreak - a.maxWinStreak || b.wins - a.wins,
  },
  {
    id: 'game_variety',
    label: 'Game Explorer (Variety)',
    shortLabel: 'Variety',
    group: 'positive',
    icon: Gamepad2,
    iconColor: 'text-indigo-500 dark:text-indigo-400',
    badgeBg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-700 dark:text-indigo-300',
    badgeText: '🎮 Explorer',
    tagline: 'Conquering Diverse Board Games',
    description: 'Number of unique tabletop games played across the collection.',
    metricHeader: 'Games Played',
    contextHeader: 'Total Plays Logged',
    getPrimaryMetric: (st) => `${st.uniqueGamesCount} games`,
    getSecondaryMetric: (st) => `${st.plays} total plays logged`,
    sortFn: (a, b) => b.uniqueGamesCount - a.uniqueGamesCount || b.plays - a.plays,
  },

  // NEGATIVE & SPICY / FUN
  {
    id: 'runner_up',
    label: 'Silver Collector (Most 2nd Places)',
    shortLabel: 'Runner-Up',
    group: 'negative',
    icon: Medal,
    iconColor: 'text-slate-400 dark:text-slate-300',
    badgeBg: 'bg-slate-500/15 border-slate-500/30 text-slate-700 dark:text-slate-300',
    badgeText: '🥈 Runner-Up King',
    tagline: 'One Step Away From Glory',
    description: 'Players with the most 2nd-place finishes — agonizingly close to the trophy!',
    metricHeader: '2nd Places',
    contextHeader: '2nd Place Rate (%)',
    getPrimaryMetric: (st) => `${st.secondPlaces} times`,
    getSecondaryMetric: (st) => `${st.secondRate}% of total ${st.plays} plays`,
    sortFn: (a, b) => b.secondPlaces - a.secondPlaces || b.secondRate - a.secondRate,
  },
  {
    id: 'wooden_spoon',
    label: 'The Wooden Spoon (Last Places)',
    shortLabel: 'Wooden Spoon',
    group: 'negative',
    icon: Frown,
    iconColor: 'text-rose-500 dark:text-rose-400',
    badgeBg: 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300',
    badgeText: '🥄 Wooden Spoon',
    tagline: 'Steadfast Anchor of the Table',
    description: 'Players holding down last place the most, bringing joy and easy wins to everyone else!',
    metricHeader: 'Last Places',
    contextHeader: 'Last Place Rate (%)',
    getPrimaryMetric: (st) => `${st.lastPlaces} times`,
    getSecondaryMetric: (st) => `Last place rate: ${st.lastRate}% (${st.plays} plays)`,
    sortFn: (a, b) => b.lastPlaces - a.lastPlaces || b.lastRate - a.lastRate,
  },
  {
    id: 'cold_streak',
    label: 'Victory Drought (Cold Streak)',
    shortLabel: 'Cold Streak',
    group: 'negative',
    icon: Snowflake,
    iconColor: 'text-sky-500 dark:text-sky-400',
    badgeBg: 'bg-sky-500/15 border-sky-500/30 text-sky-700 dark:text-sky-300',
    badgeText: '❄️ Deep Freeze',
    tagline: 'Longest Thirst for Victory',
    description: 'Longest consecutive match drought without a single victory.',
    metricHeader: 'Longest Drought',
    contextHeader: 'Current Drought Status',
    getPrimaryMetric: (st) => `${st.maxColdStreak} games`,
    getSecondaryMetric: (st) => `Current drought: ${st.currentColdStreak} games without a win`,
    sortFn: (a, b) => b.maxColdStreak - a.maxColdStreak || b.plays - a.plays,
  },
  {
    id: 'heartbreak',
    label: 'Heartbreak Loss (Defeat by ≤ 2 pts)',
    shortLabel: 'Heartbreak Loss',
    group: 'negative',
    icon: HeartCrack,
    iconColor: 'text-pink-500 dark:text-pink-400',
    badgeBg: 'bg-pink-500/15 border-pink-500/30 text-pink-700 dark:text-pink-300',
    badgeText: '💔 Narrow Defeat',
    tagline: 'Fell Short at Heaven’s Gate',
    description: 'Finished 2nd place by an agonizing margin of just 1 or 2 points behind the winner!',
    metricHeader: 'Narrow Losses (≤ 2 pts)',
    contextHeader: 'Of All 2nd Places',
    getPrimaryMetric: (st) => `${st.closeLosses} games`,
    getSecondaryMetric: (st) => `${(st.secondPlaces > 0 ? Math.round((st.closeLosses / st.secondPlaces) * 100) : 0)}% of 2nd places (${st.secondPlaces} times)`,
    sortFn: (a, b) => b.closeLosses - a.closeLosses || b.secondPlaces - a.secondPlaces,
  },
];

export interface PlayerLeaderboardSectionProps {
  players: Player[];
  sessions: PlaySession[];
}

export const PlayerLeaderboardSection: React.FC<PlayerLeaderboardSectionProps> = React.memo(
  ({ players, sessions }) => {
    const [activeGroup, setActiveGroup] = useState<LeaderboardGroup>('all');
    const [activeCriterionId, setActiveCriterionId] = useState<LeaderboardCriterion>('win_rate');

    // 1. Compute comprehensive stats for all players from session history
    const allStats = useMemo(() => {
      // Sort sessions chronologically for accurate streak calculations
      const chrono = [...sessions].sort(
        (a, b) => new Date(a.datePlayed).getTime() - new Date(b.datePlayed).getTime()
      );

      const statsMap = new Map<string, PlayerComprehensiveStats>();

      players.forEach((p) => {
        statsMap.set(p.id, {
          player: p,
          plays: 0,
          wins: 0,
          winRate: 0,
          secondPlaces: 0,
          secondRate: 0,
          lastPlaces: 0,
          lastRate: 0,
          maxWinStreak: 0,
          currentWinStreak: 0,
          maxColdStreak: 0,
          currentColdStreak: 0,
          closeLosses: 0,
          uniqueGamesCount: 0,
        });
      });

      const uniqueGamesMap = new Map<string, Set<string>>();
      players.forEach((p) => uniqueGamesMap.set(p.id, new Set<string>()));

      chrono.forEach((s) => {
        const totalPlayers = s.players.length;
        // Determine highest score among players in this session
        let maxScore = -Infinity;
        s.players.forEach((ps) => {
          if (typeof ps.score === 'number' && ps.score > maxScore) {
            maxScore = ps.score;
          }
        });

        s.players.forEach((ps) => {
          const st = statsMap.get(ps.playerId);
          if (!st) return;

          st.plays += 1;
          uniqueGamesMap.get(ps.playerId)?.add(s.gameName);

          const isWin = ps.isWinner || s.winnerId === ps.playerId;
          if (isWin) {
            st.wins += 1;
            st.currentWinStreak += 1;
            if (st.currentWinStreak > st.maxWinStreak) {
              st.maxWinStreak = st.currentWinStreak;
            }
            st.currentColdStreak = 0;
          } else {
            st.currentColdStreak += 1;
            if (st.currentColdStreak > st.maxColdStreak) {
              st.maxColdStreak = st.currentColdStreak;
            }
            st.currentWinStreak = 0;

            if (ps.rank === 2) {
              st.secondPlaces += 1;
              if (
                typeof ps.score === 'number' &&
                maxScore > -Infinity &&
                maxScore - ps.score <= 2 &&
                maxScore - ps.score > 0
              ) {
                st.closeLosses += 1;
              }
            }

            if (totalPlayers > 1 && ps.rank === totalPlayers) {
              st.lastPlaces += 1;
            }
          }
        });
      });

      // Calculate percentages & unique counts
      players.forEach((p) => {
        const st = statsMap.get(p.id);
        if (!st) return;
        if (st.plays > 0) {
          st.winRate = Math.round((st.wins / st.plays) * 100);
          st.secondRate = Math.round((st.secondPlaces / st.plays) * 100);
          st.lastRate = Math.round((st.lastPlaces / st.plays) * 100);
        }
        st.uniqueGamesCount = uniqueGamesMap.get(p.id)?.size || 0;
      });

      return Array.from(statsMap.values()).filter((st) => st.plays > 0);
    }, [players, sessions]);

    // 2. Filter criteria options by group (All, Positive, Negative)
    const availableCriteria = useMemo(() => {
      if (activeGroup === 'all') return CRITERIA_CONFIG;
      return CRITERIA_CONFIG.filter((c) => c.group === activeGroup);
    }, [activeGroup]);

    // 3. Active criterion configuration
    const activeCriterion = useMemo(() => {
      const match = availableCriteria.find((c) => c.id === activeCriterionId);
      return match || availableCriteria[0] || CRITERIA_CONFIG[0];
    }, [availableCriteria, activeCriterionId]);

    const positiveCount = useMemo(
      () => CRITERIA_CONFIG.filter((c) => c.group === 'positive').length,
      []
    );
    const negativeCount = useMemo(
      () => CRITERIA_CONFIG.filter((c) => c.group === 'negative').length,
      []
    );

    // 4. Sorted ranking list for the active criterion
    const rankedStats = useMemo(() => {
      let list = allStats;
      if (activeCriterion.filterFn) {
        list = list.filter(activeCriterion.filterFn);
      }
      return [...list].sort(activeCriterion.sortFn);
    }, [allStats, activeCriterion]);

    const IconComponent = activeCriterion.icon;
    const top1 = rankedStats[0];
    const top2 = rankedStats[1];
    const top3 = rankedStats[2];

    return (
      <Card className="p-4 sm:p-6 space-y-6 bg-[var(--card)] border border-[var(--line)]">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--line)]">
          <div>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[var(--ink)] flex items-center gap-2.5">
              <Trophy className="w-6 h-6 text-amber-500" />
              <span>Multi-Dimensional Leaderboards</span>
            </h2>
            <p className="text-xs sm:text-sm text-[var(--muted)] mt-1">
              Rankings across all dimensions: from hall of fame milestones to fun rivalries
            </p>
          </div>

          {/* GROUP FILTER TABS (All / Positive / Negative) */}
          <div className="inline-flex items-center p-1 rounded-xl bg-[var(--card-2)] border border-[var(--line)] self-start md:self-auto">
            <button
              type="button"
              onClick={() => setActiveGroup('all')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none',
                activeGroup === 'all'
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm'
                  : 'text-[var(--ink-2)] hover:text-[var(--ink)]'
              )}
            >
              🌟 All ({CRITERIA_CONFIG.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveGroup('positive');
                const first = CRITERIA_CONFIG.find((c) => c.group === 'positive');
                if (first && !CRITERIA_CONFIG.filter((c) => c.group === 'positive').some((c) => c.id === activeCriterionId)) {
                  setActiveCriterionId(first.id);
                }
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none',
                activeGroup === 'positive'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-[var(--ink-2)] hover:text-[var(--ink)]'
              )}
            >
              🏆 Hall of Fame ({positiveCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveGroup('negative');
                const first = CRITERIA_CONFIG.find((c) => c.group === 'negative');
                if (first && !CRITERIA_CONFIG.filter((c) => c.group === 'negative').some((c) => c.id === activeCriterionId)) {
                  setActiveCriterionId(first.id);
                }
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none',
                activeGroup === 'negative'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-[var(--ink-2)] hover:text-[var(--ink)]'
              )}
            >
              😈 Spicy &amp; Fun ({negativeCount})
            </button>
          </div>
        </div>

        {/* HORIZONTAL CRITERIA SUB-TAB PILLS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
          {availableCriteria.map((crit) => {
            const CritIcon = crit.icon;
            const isSelected = crit.id === activeCriterionId;
            const isNegative = crit.group === 'negative';

            return (
              <button
                key={crit.id}
                type="button"
                onClick={() => setActiveCriterionId(crit.id)}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-all cursor-pointer select-none border',
                  isSelected
                    ? isNegative
                      ? 'bg-rose-600 text-white border-rose-500 shadow-md scale-102'
                      : 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)] shadow-md scale-102'
                    : 'bg-[var(--card-2)] text-[var(--ink-2)] border-[var(--line)] hover:bg-[var(--card-3)] hover:text-[var(--ink)]'
                )}
              >
                <CritIcon
                  className={cn(
                    'w-3.5 h-3.5 shrink-0',
                    isSelected ? 'text-current' : crit.iconColor
                  )}
                />
                <span>{crit.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* ACTIVE LEADERBOARD BANNER / DESCRIPTION */}
        <div className="p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={cn('p-2.5 rounded-xl bg-[var(--card)] border border-[var(--line)] shrink-0', activeCriterion.iconColor)}>
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-bold text-base text-[var(--ink)]">
                  {activeCriterion.label}
                </h3>
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-bold', activeCriterion.badgeBg)}>
                  {activeCriterion.badgeText}
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] mt-1 font-medium">
                {activeCriterion.description}
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] block">
              {activeCriterion.tagline}
            </span>
            <span className="text-xs font-semibold text-[var(--ink-2)]">
              {rankedStats.length} qualified players
            </span>
          </div>
        </div>

        {/* PODIUM SHOWCASE (TOP 3 HIGHLIGHT) */}
        {rankedStats.length >= 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* 1st Place */}
            {top1 && (
              <div className="order-1 sm:order-2 p-4 rounded-2xl bg-gradient-to-b from-amber-500/15 via-[var(--card-2)] to-[var(--card)] border-2 border-amber-500/50 shadow-lg relative flex flex-col items-center text-center">
                <span className="absolute -top-3 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-stone-900 font-black text-[11px] shadow">
                  🥇 TOP 1
                </span>
                <div className="relative mt-2">
                  <PlayerAvatar player={top1.player} size="lg" />
                  <Crown className="w-5 h-5 text-amber-400 absolute -top-2.5 -right-2 drop-shadow" />
                </div>
                <h4 className="font-display font-bold text-base text-[var(--ink)] mt-2">
                  {top1.player.name}
                </h4>
                <div className="text-2xl font-black font-mono text-amber-500 dark:text-amber-400 mt-1">
                  {activeCriterion.getPrimaryMetric(top1)}
                </div>
                <p className="text-[11px] text-[var(--muted)] mt-1 font-medium line-clamp-1">
                  {activeCriterion.getSecondaryMetric(top1)}
                </p>
              </div>
            )}

            {/* 2nd Place */}
            {top2 && (
              <div className="order-2 sm:order-1 p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] shadow relative flex flex-col items-center text-center sm:mt-4">
                <span className="absolute -top-3 px-2.5 py-0.5 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[10px] border border-slate-400/40">
                  🥈 TOP 2
                </span>
                <div className="mt-2">
                  <PlayerAvatar player={top2.player} size="md" />
                </div>
                <h4 className="font-display font-bold text-sm text-[var(--ink)] mt-2">
                  {top2.player.name}
                </h4>
                <div className="text-xl font-black font-mono text-[var(--ink)] mt-1">
                  {activeCriterion.getPrimaryMetric(top2)}
                </div>
                <p className="text-[11px] text-[var(--muted)] mt-1 font-medium line-clamp-1">
                  {activeCriterion.getSecondaryMetric(top2)}
                </p>
              </div>
            )}

            {/* 3rd Place */}
            {top3 && (
              <div className="order-3 p-4 rounded-2xl bg-[var(--card-2)] border border-[var(--line)] shadow relative flex flex-col items-center text-center sm:mt-6">
                <span className="absolute -top-3 px-2.5 py-0.5 rounded-full bg-amber-800/30 text-amber-600 dark:text-amber-400 font-bold text-[10px] border border-amber-600/40">
                  🥉 TOP 3
                </span>
                <div className="mt-2">
                  <PlayerAvatar player={top3.player} size="md" />
                </div>
                <h4 className="font-display font-bold text-sm text-[var(--ink)] mt-2">
                  {top3.player.name}
                </h4>
                <div className="text-xl font-black font-mono text-[var(--ink)] mt-1">
                  {activeCriterion.getPrimaryMetric(top3)}
                </div>
                <p className="text-[11px] text-[var(--muted)] mt-1 font-medium line-clamp-1">
                  {activeCriterion.getSecondaryMetric(top3)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* FULL LEADERBOARD TABLE */}
        <div className="overflow-x-auto rounded-2xl border border-[var(--line)]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[var(--card-2)] border-b border-[var(--line)] text-[var(--muted)]">
              <tr>
                <th className="py-3 px-4 font-bold w-16">Rank</th>
                <th className="py-3 px-4 font-bold">Player</th>
                <th className="py-3 px-4 font-bold text-right">{activeCriterion.metricHeader}</th>
                <th className="py-3 px-4 font-bold text-right">{activeCriterion.contextHeader}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)] tabular-nums bg-[var(--card)]">
              {rankedStats.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-[var(--muted)]">
                    No players qualified for this leaderboard yet.
                  </td>
                </tr>
              ) : (
                rankedStats.map((st, idx) => {
                  const isTop1 = idx === 0;
                  const isTop2 = idx === 1;
                  const isTop3 = idx === 2;

                  return (
                    <tr
                      key={st.player.id}
                      className={cn(
                        'transition-colors hover:bg-[var(--card-2)]/50',
                        isTop1 && 'bg-amber-500/5'
                      )}
                    >
                      {/* RANK */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[var(--muted)]">
                        {isTop1 ? (
                          <span className="text-base">🥇</span>
                        ) : isTop2 ? (
                          <span className="text-base">🥈</span>
                        ) : isTop3 ? (
                          <span className="text-base">🥉</span>
                        ) : (
                          `#${idx + 1}`
                        )}
                      </td>

                      {/* PLAYER */}
                      <td className="py-3.5 px-4 font-display font-bold text-[var(--ink)]">
                        <div className="flex items-center gap-2.5">
                          <PlayerAvatar player={st.player} size="sm" />
                          <span className="text-sm">{st.player.name}</span>
                          {isTop1 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30">
                              👑 Champion
                            </span>
                          )}
                        </div>
                      </td>

                      {/* PRIMARY METRIC */}
                      <td className="py-3.5 px-4 text-right font-mono font-black text-sm text-[var(--ink)]">
                        <span
                          className={cn(
                            isTop1 && 'text-amber-600 dark:text-amber-400 font-extrabold text-base',
                            activeCriterion.group === 'negative' && isTop1 && 'text-rose-500'
                          )}
                        >
                          {activeCriterion.getPrimaryMetric(st)}
                        </span>
                      </td>

                      {/* SECONDARY / CONTEXT */}
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-[var(--muted)]">
                        {activeCriterion.getSecondaryMetric(st)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }
);
PlayerLeaderboardSection.displayName = 'PlayerLeaderboardSection';
