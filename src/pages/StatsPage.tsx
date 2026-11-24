import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Dices,
  Users,
  MapPin,
  Calendar,
} from 'lucide-react';
import { PageTransition } from '../components/layout/PageTransition';
import { cn } from '../components/ui/cn';
import { useGameStore } from '../store/useGameStore';
import { useSessionStore } from '../store/useSessionStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { getTotalPlayHours } from '../lib/utils';

import { StatsOverviewTab } from '../components/stats/StatsOverviewTab';
import { StatsYearsTab } from '../components/stats/StatsYearsTab';
import { StatsLocationsTab } from '../components/stats/StatsLocationsTab';
import { StatsPlayersTab } from '../components/stats/StatsPlayersTab';
import { StatsByGameTab } from '../components/stats/StatsByGameTab';

type StatsTab = 'overview' | 'years' | 'locations' | 'by_player' | 'by_game';

export const StatsPage: React.FC = () => {
  const games = useGameStore((s) => s.games);
  const sessions = useSessionStore((s) => s.sessions);
  const players = usePlayerStore((s) => s.players);

  const [activeTab, setActiveTab] = useState<StatsTab>('overview');

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

  // Total play time in hours across all sessions (unified with HomePage)
  const totalHoursPlayed = useMemo(() => getTotalPlayHours(sessions), [sessions]);

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
            Total: <strong>{sessions.length}</strong> {sessions.length === 1 ? 'session' : 'sessions'} · <strong>{totalHoursPlayed}h</strong> played
          </div>
        </div>

        {/* Navigation Tabs (5 Tabs with Warm Editorial pill) */}
        <div
          role="tablist"
          className="flex p-1.5 rounded-full bg-[var(--card)] border border-[var(--line)] max-w-full overflow-x-auto gap-1"
        >
          {[
            { id: 'overview', label: 'Overview & H-Index', icon: BarChart3, iconColor: 'text-[var(--accent)]' },
            { id: 'years', label: 'Years & Trends', icon: Calendar, iconColor: 'text-amber-500' },
            { id: 'locations', label: 'Venues & Locations', icon: MapPin, iconColor: 'text-rose-500' },
            { id: 'by_player', label: 'Leaderboard & Rivalries', icon: Users, iconColor: 'text-cyan-600 dark:text-cyan-400' },
            { id: 'by_game', label: 'Game Breakdown', icon: Dices, iconColor: 'text-[var(--accent)]' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as StatsTab)}
                className={cn(
                  'min-h-[38px] px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 select-none active:scale-95',
                  isActive
                    ? 'bg-[#231F1D] text-white dark:bg-[#F4EFE6] dark:text-[#161311] shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--card-2)]'
                )}
              >
                <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-current' : tab.iconColor)} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Lazy-mounted tab contents: Only compute & render when active */}
        {activeTab === 'overview' && (
          <StatsOverviewTab
            sessions={sessions}
            games={games}
            players={players}
            availableYears={availableYears}
          />
        )}

        {activeTab === 'years' && (
          <StatsYearsTab
            sessions={sessions}
            availableYears={availableYears}
          />
        )}

        {activeTab === 'locations' && (
          <StatsLocationsTab
            sessions={sessions}
            players={players}
          />
        )}

        {activeTab === 'by_player' && (
          <StatsPlayersTab
            sessions={sessions}
            players={players}
          />
        )}

        {activeTab === 'by_game' && (
          <StatsByGameTab
            sessions={sessions}
            games={games}
            initialGameId={games[0]?.id}
          />
        )}
      </div>
    </PageTransition>
  );
};

export default StatsPage;
