import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Link } from 'react-router-dom';
import {
  Dices,
  Gamepad2,
  Clock,
  Play,
  Crown,
  ArrowRight,
  Calendar,
  Sparkles,
  Flame,
  Users,
} from 'lucide-react';
import { PageTransition } from '../components/layout/PageTransition';
import { StatCard } from '../components/dashboard/StatCard';
import { MiniBarChart } from '../components/dashboard/MiniBarChart';
import { DraftSessionCard } from '../components/session/DraftSessionCard';
import { GameCoverImage } from '../components/game/GameCoverImage';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useGameStore } from '../store/useGameStore';
import { useSessionStore } from '../store/useSessionStore';
import { usePlayerStore } from '../store/usePlayerStore';
import {
  formatDate,
  formatDuration,
  formatNumber,
  formatCount,
  getCollectionTotalValue,
  getTotalPlayDurationMinutes,
  getTotalPlayHours,
  isDraftMatchingCompletedSession,
  calculatePlayerStreaks,
  filterSessionsByRecordScope,
  pluralize,
  isCoopSession,
  isWinOnlySession,
  getSessionWinners,
  formatWinnerBadgeText,
} from '../lib/utils';
import { DRAFT_STORAGE_KEY, parseSessionDraft, removeDraftIfUnchanged } from '../lib/draftSafety';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { SessionDraft } from '../types';

const WhatToPlayModal = React.lazy(() =>
  import('../components/game/WhatToPlayModal').then((m) => ({ default: m.WhatToPlayModal }))
);

export const HomePage: React.FC = () => {
  const games = useGameStore((s) => s.games);
  const sessions = useSessionStore((s) => s.sessions);
  const players = usePlayerStore((s) => s.players);

  const gamesById = useMemo(() => {
    const map = new Map<string, typeof games[0]>();
    for (const g of games) {
      if (g.id) map.set(g.id, g);
    }
    return map;
  }, [games]);

  const [isWhatToPlayOpen, setIsWhatToPlayOpen] = useState(false);

  const playersById = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])),
    [players]
  );

  // Active Draft Session detection (synced with draftSafety & ResumeSessionBanner)
  const [activeDraft, setActiveDraft] = useState<SessionDraft | null>(null);

  useEffect(() => {
    const syncDraft = () => {
      try {
        const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
        const parsed = parseSessionDraft(raw, Date.now());
        if (parsed) {
          if (isDraftMatchingCompletedSession(parsed, sessions)) {
            removeDraftIfUnchanged(localStorage, raw);
            window.dispatchEvent(new CustomEvent('boardgame_draft_updated'));
            setActiveDraft(null);
            return;
          }
          setActiveDraft(parsed);
          return;
        }
        setActiveDraft(null);
      } catch {
        setActiveDraft(null);
      }
    };

    syncDraft();
    window.addEventListener('storage', syncDraft);
    window.addEventListener('boardgame_draft_updated', syncDraft);
    return () => {
      window.removeEventListener('storage', syncDraft);
      window.removeEventListener('boardgame_draft_updated', syncDraft);
    };
  }, [sessions]);

  const handleDiscardDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      removeDraftIfUnchanged(localStorage, raw);
      window.dispatchEvent(new CustomEvent('boardgame_draft_updated'));
    } catch {}
    setActiveDraft(null);
  };

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning, Heo';
    if (hour < 18) return 'Good afternoon, Heo';
    return 'Good evening, Heo';
  }, []);

  const todayFormatted = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date());
  }, []);

  // Primary user streak defaults to competitive sessions; team outcomes stay separate.
  const competitiveSessions = useMemo(
    () => filterSessionsByRecordScope(sessions, 'competitive', gamesById),
    [sessions, gamesById]
  );
  const heoStreak = useMemo(() => {
    const heo = players.find((p) => p.name.toLowerCase() === 'heo') || players[0];
    if (!heo) return null;
    return calculatePlayerStreaks(heo.id, competitiveSessions, 'all', gamesById);
  }, [players, competitiveSessions, gamesById]);

  // High-performance memoized calculations across all games and sessions
  const {
    ownedGamesCount,
    totalSessionsCount,
    totalMinutesPlayed,
    totalHoursPlayed,
    totalCollectionValue,
    recentSessions,
    topPlayedGames,
    statusCounts,
  } = useMemo(() => {
    let ownCount = 0;
    const statusMap: Record<string, number> = {
      own: 0,
      rented: 0,
      lent_out: 0,
      borrowed: 0,
      sold: 0,
      wishlist: 0,
      previously_owned: 0,
    };
    for (const g of games) {
      if (statusMap[g.status] !== undefined) statusMap[g.status]++;
      if (g.status === 'own' || g.status === 'lent_out') ownCount++;
    }

    const totalMinutes = getTotalPlayDurationMinutes(sessions);
    const playMap = new Map<string, { id: string; label: string; value: number }>();
    for (const s of sessions) {
      const storeGame = gamesById.get(s.gameId);
      const existing = playMap.get(s.gameId) || {
        id: s.gameId,
        label: storeGame?.name || s.gameName,
        value: 0,
      };
      existing.value += 1;
      playMap.set(s.gameId, existing);
    }

    const recent = [...sessions]
      .sort((a, b) => (b.datePlayed || '').localeCompare(a.datePlayed || ''))
      .slice(0, 5);

    const top = Array.from(playMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((item) => ({
        ...item,
        href: `/collection/${item.id}`,
      }));

    return {
      ownedGamesCount: ownCount,
      totalSessionsCount: sessions.length,
      totalMinutesPlayed: totalMinutes,
      totalHoursPlayed: getTotalPlayHours(sessions),
      totalCollectionValue: getCollectionTotalValue(games),
      recentSessions: recent,
      topPlayedGames: top,
      statusCounts: statusMap,
    };
  }, [games, sessions]);

  const lastSession = recentSessions[0];

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Editorial Greeting Header */}
        <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[var(--line)] pb-5">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              {todayFormatted}
            </p>
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[var(--ink)] tracking-tight">
              {greeting}
            </h1>
          </div>
          <div className="text-xs sm:text-sm text-[var(--muted)] font-medium">
            <span className="font-bold text-[var(--ink)]">{formatNumber(ownedGamesCount)}</span>{' '}
            {ownedGamesCount === 1 ? 'game' : 'games'} in collection ·{' '}
            <span className="font-bold text-[var(--ink)]">{formatNumber(totalSessionsCount)}</span>{' '}
            {totalSessionsCount === 1 ? 'play' : 'plays'} logged
          </div>
        </section>

        {/* Active Draft Session In Progress Notification */}
        {activeDraft && (
          <section>
            <DraftSessionCard draft={activeDraft} onDiscard={handleDiscardDraft} />
          </section>
        )}

        {/* Bento Grid Upper Row: Left Peach Hero Tile + Right 2x2 Pastel KPI Cards */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left Hero Card (Peach / Terracotta Editorial Accent) */}
          <div className="lg:col-span-7 rounded-3xl p-6 sm:p-8 bg-[#FADAD0] text-[#231F1D] dark:bg-[#2A201D] dark:text-[#F4EFE6] border border-[var(--line)] shadow-xs flex flex-col justify-between relative overflow-hidden group">
            {/* Soft decorative background shape */}
            <div
              className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/30 dark:bg-white/5 pointer-events-none transition-transform duration-500 group-hover:scale-110"
              aria-hidden="true"
            />

            <div className="relative z-10 space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/10 dark:bg-white/10 text-xs font-extrabold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#E5734F]" />
                Tabletop Collection
              </div>
              <h2 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl leading-tight tracking-tight">
                Ready for game night?
              </h2>
              <p className="text-xs sm:text-sm opacity-80 leading-relaxed font-medium">
                {lastSession ? (
                  <>
                    Last game on the table was{' '}
                    <strong className="font-bold text-[var(--accent)]">{gamesById.get(lastSession.gameId)?.name || lastSession.gameName}</strong> ({formatDate(lastSession.datePlayed)}). Start a new play or roll for what to play next.
                  </>
                ) : (
                  'Explore your collection, pick what to play tonight, or log your scores in seconds.'
                )}
              </p>
            </div>

            {/* Pill Action Buttons */}
            <div className="relative z-10 mt-6 pt-4 flex items-center gap-3 flex-wrap">
              <Link to="/sessions/new">
                <button
                  type="button"
                  className="px-6 py-3 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-sm inline-flex items-center gap-2 shadow-md shadow-[var(--accent)]/25 active:scale-95 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>New Session</span>
                </button>
              </Link>

              <button
                type="button"
                onClick={() => setIsWhatToPlayOpen(true)}
                className="px-5 py-3 rounded-full bg-white/90 hover:bg-white text-[#231F1D] dark:bg-white/10 dark:hover:bg-white/20 dark:text-[#F4EFE6] border border-black/10 dark:border-white/15 font-bold text-sm inline-flex items-center gap-2 active:scale-95 transition-all cursor-pointer shadow-xs"
              >
                <Dices className="w-4 h-4 text-[var(--accent)]" />
                <span>What to Play</span>
              </button>
            </div>
          </div>

          {/* Right 2x2 Grid of 4 Pastel KPI Cards */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-3.5">
            <StatCard
              label="Games Owned"
              value={ownedGamesCount}
              icon={<Dices className="w-5 h-5" />}
              subtitle={`${formatNumber(games.length)} total in collection`}
              href="/collection?status=own"
              tileIndex={1}
            />
            <StatCard
              label="Sessions Played"
              value={totalSessionsCount}
              icon={<Gamepad2 className="w-5 h-5" />}
              subtitle="All-time plays"
              href="/sessions"
              tileIndex={2}
            />
            <StatCard
              label="Hours Played"
              value={totalHoursPlayed}
              suffix="h"
              icon={<Clock className="w-5 h-5" />}
              subtitle={`${formatNumber(totalMinutesPlayed)}m at the table`}
              href="/stats"
              tileIndex={3}
            />
            {heoStreak && heoStreak.currentStreak && heoStreak.currentStreak.count > 0 ? (
              <StatCard
                label="Current Streak"
                value={heoStreak.currentStreak.count}
                suffix={heoStreak.currentStreak.type === 'win' ? ' Win' : ' Loss'}
                icon={<Flame className="w-5 h-5" />}
                subtitle={heoStreak.currentStreak.type === 'win' ? 'Consecutive competitive wins' : 'Current competitive streak'}
                href="/players"
                tileIndex={4}
              />
            ) : (
              <StatCard
                label="Active Rivals"
                value={players.length}
                icon={<Users className="w-5 h-5" />}
                subtitle={`${pluralize(players.length, 'player')} logged`}
                href="/players"
                tileIndex={4}
              />
            )}
          </div>
        </section>

        {/* Lower Row: Recent Sessions + Top Played Games */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Recent Sessions List */}
          <div className="lg:col-span-7 rounded-3xl p-6 bg-[var(--card)] border border-[var(--line)] shadow-xs flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
              <div>
                <h2 className="font-display font-bold text-xl text-[var(--ink)]">
                  Recent Sessions
                </h2>
                <p className="text-xs text-[var(--muted)] font-medium">
                  Your last 5 tabletop game nights
                </p>
              </div>
              <Link
                to="/sessions"
                className="inline-flex items-center gap-1 text-xs font-bold text-[var(--accent)] hover:underline transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {recentSessions.length > 0 ? (
                recentSessions.map((session) => {
                  const game = gamesById.get(session.gameId);
                  const displayGameName = game?.name || session.gameName;
                  const displayGameCover = game
                    ? { ...game, name: displayGameName, thumbnail: game.thumbnail || session.gameThumbnail }
                    : { name: session.gameName, thumbnail: session.gameThumbnail };
                  const isCoop = isCoopSession(session, game);
                  const isWinOnly = isWinOnlySession(session, game);
                  const winners = getSessionWinners(session, game);
                  const resolvedWinners = winners.map((w) => ({
                    ...w,
                    playerName: playersById[w.playerId]?.name || w.playerName,
                  }));
                  const winnerBadge = formatWinnerBadgeText(resolvedWinners);
                  const scoreSuffix =
                    !isWinOnly &&
                    winners.length > 0 &&
                    typeof winners[0].score === 'number' &&
                    winners.every((w) => w.score === winners[0].score)
                      ? ` · ${formatNumber(winners[0].score)}p`
                      : '';

                  return (
                    <Link
                      key={session.id}
                      to={`/sessions/${session.id}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--card-2)] hover:bg-[var(--line)]/40 transition-colors group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <GameCoverImage
                          game={displayGameCover}
                          className="w-12 h-12 rounded-xl shrink-0 border border-[var(--line)] shadow-xs"
                          imgClassName="group-hover:scale-105 transition-transform duration-200"
                          fallbackIconSize="text-lg"
                        />

                        <div className="min-w-0">
                          <h3 className="font-display font-bold text-sm text-[var(--ink)] truncate group-hover:text-[var(--accent)] transition-colors">
                            {displayGameName}
                          </h3>
                          <p className="text-xs text-[var(--muted)] inline-flex items-center gap-1 tabular-nums font-medium mt-0.5">
                            <Calendar className="w-3 h-3 text-[var(--accent)]" />
                            {formatDate(session.datePlayed)}
                            {session.durationMinutes ? ` · ${formatDuration(session.durationMinutes)}` : ''}
                          </p>
                        </div>
                      </div>

                      {isCoop && (session.coopOutcome === 'won' || winners.length > 0) ? (
                        <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--good-soft)] text-[var(--good)] text-xs font-bold">
                          <span>🤝</span>
                          <span>Team Win</span>
                        </div>
                      ) : isCoop ? (
                        <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bad-soft)] text-[var(--bad)] text-xs font-bold">
                          <span>💀</span>
                          <span>Team Defeat</span>
                        </div>
                      ) : winners.length > 0 ? (
                        <div
                          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E5734F]/15 text-[#E5734F] text-xs font-bold max-w-[150px] sm:max-w-[200px]"
                          title={winnerBadge.fullTitle}
                        >
                          <Crown className="w-3.5 h-3.5 fill-[#E5734F] text-[#E5734F] shrink-0" />
                          <span className="truncate">{winnerBadge.label}</span>
                          {scoreSuffix && (
                            <span className="font-mono tabular-nums shrink-0 ml-0.5">
                              {scoreSuffix}
                            </span>
                          )}
                        </div>
                      ) : null}
                    </Link>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-[var(--muted)] font-medium">
                  No plays logged yet. Start your first session!
                </div>
              )}
            </div>
          </div>

          {/* Most Played Games Chart & Shelf Summary */}
          <div className="lg:col-span-5 rounded-3xl p-6 bg-[var(--card)] border border-[var(--line)] shadow-xs flex flex-col justify-between space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
              <div>
                <h2 className="font-display font-bold text-xl text-[var(--ink)]">
                  Most Played Games
                </h2>
                <p className="text-xs text-[var(--muted)] font-medium">
                  Top board games hitting the table
                </p>
              </div>
              <Link
                to="/stats"
                className="text-xs font-bold text-[var(--accent)] hover:underline transition-colors"
              >
                Analytics →
              </Link>
            </div>

            <MiniBarChart items={topPlayedGames} unit="plays" />

            {/* Shelf Status Quick Chips */}
            <div className="pt-3 border-t border-[var(--line)] flex items-center justify-between gap-2 text-xs flex-wrap">
              <Link
                to="/collection?status=own"
                className="px-3 py-1.5 rounded-full bg-[var(--card-2)] hover:bg-[var(--line)]/50 text-[var(--ink)] font-semibold transition-colors flex items-center gap-1.5"
              >
                <span>Owned</span>
                <span className="font-mono font-bold text-[var(--accent)]">{formatNumber(statusCounts.own)}</span>
              </Link>
              <Link
                to="/collection?status=borrowed"
                className="px-3 py-1.5 rounded-full bg-[var(--card-2)] hover:bg-[var(--line)]/50 text-[var(--ink)] font-semibold transition-colors flex items-center gap-1.5"
              >
                <span>Borrowed</span>
                <span className="font-mono font-bold">{formatNumber(statusCounts.borrowed)}</span>
              </Link>
              <Link
                to="/collection?status=wishlist"
                className="px-3 py-1.5 rounded-full bg-[var(--card-2)] hover:bg-[var(--line)]/50 text-[var(--ink)] font-semibold transition-colors flex items-center gap-1.5"
              >
                <span>Wishlist</span>
                <span className="font-mono font-bold">{formatNumber(statusCounts.wishlist)}</span>
              </Link>
            </div>
          </div>
        </section>

        {/* On-demand What to Play Modal */}
        {isWhatToPlayOpen && (
          <Suspense fallback={null}>
            <WhatToPlayModal
              isOpen={isWhatToPlayOpen}
              onClose={() => setIsWhatToPlayOpen(false)}
            />
          </Suspense>
        )}
      </div>
    </PageTransition>
  );
};

export default HomePage;
