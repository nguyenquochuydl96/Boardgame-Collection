import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Dices,
  Gamepad2,
  Clock,
  Wallet,
  Plus,
  Play,
  Crown,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { PageTransition } from '../components/layout/PageTransition';
import { StatCard } from '../components/dashboard/StatCard';
import { MiniBarChart } from '../components/dashboard/MiniBarChart';
import { DraftSessionCard } from '../components/session/DraftSessionCard';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useGameStore } from '../store/useGameStore';
import { useSessionStore } from '../store/useSessionStore';
import { formatDate, formatDuration, getCollectionTotalValue } from '../lib/utils';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { SessionDraft } from '../types';

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

export const HomePage: React.FC = () => {
  const games = useGameStore((s) => s.games);
  const sessions = useSessionStore((s) => s.sessions);

  // Active Draft Session detection
  const [activeDraft, setActiveDraft] = useState<SessionDraft | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('boardgame_session_draft');
      if (raw) {
        const parsed = JSON.parse(raw) as SessionDraft;
        if (parsed && Date.now() - parsed.sessionStartTime < 36 * 60 * 60 * 1000) {
          setActiveDraft(parsed);
        }
      }
    } catch {}
  }, []);

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem('boardgame_session_draft');
    } catch {}
    setActiveDraft(null);
  };

  const ownedGamesCount = games.filter(
    (g) => g.status === 'own' || g.status === 'lent_out'
  ).length;
  const totalSessionsCount = sessions.length;
  const totalMinutesPlayed = sessions.reduce(
    (sum, s) => sum + (s.durationMinutes || 0),
    0
  );
  const totalHoursPlayed = Math.round(totalMinutesPlayed / 60);
  const totalCollectionValue = getCollectionTotalValue(games);

  const recentSessions = [...sessions]
    .sort(
      (a, b) =>
        new Date(b.datePlayed).getTime() - new Date(a.datePlayed).getTime()
    )
    .slice(0, 5);

  const playCountMap = new Map<string, { id: string; label: string; value: number }>();
  for (const s of sessions) {
    const existing = playCountMap.get(s.gameId) || {
      id: s.gameId,
      label: s.gameName,
      value: 0,
    };
    existing.value += 1;
    playCountMap.set(s.gameId, existing);
  }

  const topPlayedGames = Array.from(playCountMap.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((item) => ({
      ...item,
      href: `/collection/${item.id}`,
    }));

  return (
    <PageTransition>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* Fitlo Editorial Hero Banner with Clean High-Contrast Action Buttons */}
        <motion.section
          variants={fadeUpItem}
          className="relative rounded-[24px] overflow-hidden p-6 sm:p-8 lg:p-10 bg-[image:var(--gradient-hero)] shadow-xl shadow-[var(--accent)]/15 border border-white/15 text-white"
        >
          <div
            className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-1.5 max-w-2xl">
              <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-teal-200">
                Curated by Heo
              </p>
              <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight">
                Heo's Board Game Collection
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link to="/collection/add">
                <Button
                  variant="secondary"
                  size="lg"
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/25 shadow-sm font-bold"
                >
                  <Plus className="w-5 h-5 text-white" />
                  Add Game
                </Button>
              </Link>
              <Link to="/sessions/new">
                <Button
                  variant="secondary"
                  size="lg"
                  className="bg-white text-slate-950 hover:bg-slate-100 font-extrabold shadow-lg"
                >
                  <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
                  New Session
                </Button>
              </Link>
            </div>
          </div>
        </motion.section>

        {/* Active Draft Session In Progress Notification */}
        {activeDraft && (
          <motion.section variants={fadeUpItem}>
            <DraftSessionCard draft={activeDraft} onDiscard={handleDiscardDraft} />
          </motion.section>
        )}

        {/* Fitlo Signature Pastel KPI Tiles Grid */}
        <motion.section
          variants={fadeUpItem}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatCard
            label="Total Games Owned"
            value={ownedGamesCount}
            icon={<Dices className="w-5 h-5" />}
            subtitle={`${games.length} total in vault`}
            href="/collection?status=own"
            tileIndex={1}
          />
          <StatCard
            label="Sessions Played"
            value={totalSessionsCount}
            icon={<Gamepad2 className="w-5 h-5" />}
            subtitle="All-time tabletop logs"
            href="/sessions"
            tileIndex={2}
          />
          <StatCard
            label="Hours Played"
            value={totalHoursPlayed}
            suffix="h"
            icon={<Clock className="w-5 h-5" />}
            subtitle={`${totalMinutesPlayed} minutes at the table`}
            href="/stats"
            tileIndex={3}
          />
          <StatCard
            label="Collection Value"
            value={totalCollectionValue}
            isCurrencyVND
            icon={<Wallet className="w-5 h-5" />}
            subtitle="Active shelf valuation"
            href="/collection"
            tileIndex={4}
          />
        </motion.section>

        {/* Recently Played Horizontal Scroll List */}
        <motion.section variants={fadeUpItem} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[var(--ink)]">
                Recently Played
              </h2>
              <p className="text-xs sm:text-sm text-[var(--muted)] font-medium">
                Your last 5 tabletop game nights
              </p>
            </div>
            <Link
              to="/sessions"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[var(--accent)] hover:underline transition-colors"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-3 snap-x">
            {recentSessions.map((session) => {
              const winner = session.players.find(
                (p) => p.isWinner || p.playerId === session.winnerId
              );
              return (
                <motion.div
                  key={session.id}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  className="snap-start shrink-0"
                >
                  <Link
                    to={`/sessions/${session.id}`}
                    className="block w-72 sm:w-80 rounded-[18px] bg-[var(--card)] shadow-[inset_0_0_0_1px_var(--line),var(--shadow)] hover:shadow-lg p-3.5 transition-all duration-200 group flex gap-3.5"
                  >
                    <div className="relative w-20 h-24 rounded-[12px] overflow-hidden bg-[var(--card-2)] shrink-0 shadow-sm shadow-[inset_0_0_0_1px_var(--line)]">
                      <img
                        src={session.gameThumbnail}
                        alt={session.gameName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h3 className="font-display font-bold text-base text-[var(--ink)] truncate group-hover:text-[var(--accent)] transition-colors">
                          {session.gameName}
                        </h3>
                        <p className="text-xs text-[var(--muted)] inline-flex items-center gap-1 mt-1 tabular-nums font-semibold">
                          <Calendar className="w-3 h-3 text-[var(--accent)]" />
                          {formatDate(session.datePlayed)}
                          {session.durationMinutes
                            ? ` · ${formatDuration(session.durationMinutes)}`
                            : ''}
                        </p>
                      </div>

                      {winner && (
                        <div className="mt-2 pt-2 border-t border-[var(--line)] flex items-center justify-between text-xs">
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold truncate">
                            <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                            {winner.playerName}
                          </span>
                          {typeof winner.score === 'number' && (
                            <span className="font-mono font-extrabold text-[var(--ink)] tabular-nums">
                              {winner.score} pts
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Bottom Split: Most Played Bar Chart + Vault Spotlight */}
        <motion.section
          variants={fadeUpItem}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
        >
          <Card className="lg:col-span-7 p-6 space-y-5 flex flex-col justify-between rounded-[20px]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-xl text-[var(--ink)]">
                  Most Played Games
                </h2>
                <p className="text-xs text-[var(--muted)] font-medium">
                  Top 5 boardgames hitting the table
                </p>
              </div>
              <Link
                to="/stats"
                className="text-xs font-bold text-[var(--accent)] hover:underline transition-colors"
              >
                Full Analytics →
              </Link>
            </div>
            <MiniBarChart items={topPlayedGames} unit="plays" />
          </Card>

          <Card className="lg:col-span-5 p-6 flex flex-col justify-between space-y-5 rounded-[20px]">
            <div className="space-y-1">
              <h2 className="font-display font-bold text-xl text-[var(--ink)]">
                Shelf Status Breakdown
              </h2>
              <p className="text-xs text-[var(--muted)] font-medium">
                Inventory status across your vault
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 tabular-nums">
              <Link
                to="/collection?status=own"
                className="p-3.5 rounded-[14px] bg-[var(--card-2)] shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-md transition-all group cursor-pointer block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--ink-2)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 font-bold transition-colors">Owned</span>
                  <span className="text-xs text-[var(--muted)]">→</span>
                </div>
                <div className="font-display font-extrabold text-2xl text-emerald-600 dark:text-emerald-400 mt-1">
                  <AnimatedNumber value={games.filter((g) => g.status === 'own').length} />
                </div>
              </Link>

              <Link
                to="/collection?status=rented"
                className="p-3.5 rounded-[14px] bg-[var(--card-2)] shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-md transition-all group cursor-pointer block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--ink-2)] group-hover:text-amber-600 dark:group-hover:text-amber-400 font-bold transition-colors">Rented</span>
                  <span className="text-xs text-[var(--muted)]">→</span>
                </div>
                <div className="font-display font-extrabold text-2xl text-amber-600 dark:text-amber-400 mt-1">
                  <AnimatedNumber value={games.filter((g) => g.status === 'rented').length} />
                </div>
              </Link>

              <Link
                to="/collection?status=lent_out"
                className="p-3.5 rounded-[14px] bg-[var(--card-2)] shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-md transition-all group cursor-pointer block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--ink-2)] group-hover:text-orange-600 dark:group-hover:text-orange-400 font-bold transition-colors">Lent Out</span>
                  <span className="text-xs text-[var(--muted)]">→</span>
                </div>
                <div className="font-display font-extrabold text-2xl text-orange-600 dark:text-orange-400 mt-1">
                  <AnimatedNumber value={games.filter((g) => g.status === 'lent_out').length} />
                </div>
              </Link>

              <Link
                to="/collection?status=borrowed"
                className="p-3.5 rounded-[14px] bg-[var(--card-2)] shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-md transition-all group cursor-pointer block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--ink-2)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 font-bold transition-colors">Borrowed</span>
                  <span className="text-xs text-[var(--muted)]">→</span>
                </div>
                <div className="font-display font-extrabold text-2xl text-cyan-600 dark:text-cyan-400 mt-1">
                  <AnimatedNumber value={games.filter((g) => g.status === 'borrowed').length} />
                </div>
              </Link>

              <Link
                to="/collection?status=sold"
                className="p-3.5 rounded-[14px] bg-[var(--card-2)] shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-md transition-all group cursor-pointer block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--ink-2)] group-hover:text-rose-600 dark:group-hover:text-rose-400 font-bold transition-colors">Sold Archive</span>
                  <span className="text-xs text-[var(--muted)]">→</span>
                </div>
                <div className="font-display font-extrabold text-2xl text-rose-600 dark:text-rose-400 mt-1">
                  <AnimatedNumber value={games.filter((g) => g.status === 'sold').length} />
                </div>
              </Link>

              <Link
                to="/collection?status=wishlist"
                className="p-3.5 rounded-[14px] bg-[var(--card-2)] shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-md transition-all group cursor-pointer block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--ink-2)] group-hover:text-[var(--accent)] font-bold transition-colors">Wishlist</span>
                  <span className="text-xs text-[var(--muted)]">→</span>
                </div>
                <div className="font-display font-extrabold text-2xl text-[var(--accent)] mt-1">
                  <AnimatedNumber value={games.filter((g) => g.status === 'wishlist').length} />
                </div>
              </Link>
            </div>

            <Link to="/collection" className="block">
              <Button variant="outline" className="w-full justify-center">
                Browse Full Collection
              </Button>
            </Link>
          </Card>
        </motion.section>
      </motion.div>
    </PageTransition>
  );
};

export default HomePage;
