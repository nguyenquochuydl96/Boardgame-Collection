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
  Sparkles,
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
    transition: { duration: 0.35, ease: 'easeOut' as const },
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
        {/* Rayé Signature Editorial Hero Banner */}
        <motion.section
          variants={fadeUpItem}
          className="relative rounded-3xl overflow-hidden p-6 sm:p-8 lg:p-10 bg-[image:var(--gradient-hero)] text-white border border-[var(--line-2)] shadow-lg"
        >
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white border border-white/20 text-xs font-bold uppercase tracking-wider font-display shadow-xs backdrop-blur-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Curated by Huy &amp; Gaming Group</span>
              </div>

              <h1 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-[0.98]">
                Tabletop Vault Archive
              </h1>

              <p className="text-base sm:text-lg font-medium text-white/90 leading-snug">
                Track every box on your shelf, log friendly tabletop rivalries, and sync smoothly across desktop and mobile.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link to="/sessions/new">
                <Button
                  variant="butter"
                  size="lg"
                  withArrowDot
                  className="font-bold text-base shadow-md"
                >
                  <Play className="w-4 h-4 fill-current mr-1" />
                  New Session
                </Button>
              </Link>
              <Link to="/collection/add">
                <Button
                  variant="outline"
                  size="lg"
                  className="font-bold text-base bg-white/15 text-white border-white/25 hover:bg-white/25 shadow-xs"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Game
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

        {/* Rayé Neobrutalist Stat Cards Grid */}
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
          />
          <StatCard
            label="Sessions Played"
            value={totalSessionsCount}
            icon={<Gamepad2 className="w-5 h-5" />}
            subtitle="All-time tabletop logs"
            href="/sessions"
          />
          <StatCard
            label="Hours Played"
            value={totalHoursPlayed}
            suffix="h"
            icon={<Clock className="w-5 h-5" />}
            subtitle={`${totalMinutesPlayed} minutes at table`}
            href="/stats"
          />
          <StatCard
            label="Collection Value"
            value={totalCollectionValue}
            isCurrencyVND
            icon={<Wallet className="w-5 h-5" />}
            subtitle="Active shelf valuation"
            href="/collection"
          />
        </motion.section>

        {/* Recently Played Horizontal Scroll List */}
        <motion.section variants={fadeUpItem} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-xl sm:text-2xl text-[var(--text-primary)] tracking-tight">
                Recently Played
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
                Your last 5 tabletop game sessions
              </p>
            </div>
            <Link
              to="/sessions"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--line-2)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors shadow-xs"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
            {recentSessions.map((session) => {
              const winner = session.players.find(
                (p) => p.isWinner || p.playerId === session.winnerId
              );
              return (
                <motion.div
                  key={session.id}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.2 }}
                  className="snap-start shrink-0"
                >
                  <Link
                    to={`/sessions/${session.id}`}
                    className="block w-72 sm:w-80 rounded-xl bg-[var(--bg-card)] border-[1.5px] border-[var(--ink)] shadow-[var(--shadow-brutal-sm)] hover:shadow-[var(--shadow-brutal)] p-3.5 transition-all duration-200 group flex gap-3.5"
                  >
                    <div className="relative w-20 h-24 rounded-lg overflow-hidden bg-[var(--paper)] border border-[var(--ink)] shrink-0 shadow-sm">
                      <img
                        src={session.gameThumbnail}
                        alt={session.gameName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h3 className="font-display font-black text-sm text-[var(--text-primary)] truncate group-hover:text-[var(--coral)] transition-colors">
                          {session.gameName}
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)] font-medium inline-flex items-center gap-1 mt-1 tabular-nums">
                          <Calendar className="w-3 h-3 text-[var(--coral)]" />
                          {formatDate(session.datePlayed)}
                          {session.durationMinutes
                            ? ` · ${formatDuration(session.durationMinutes)}`
                            : ''}
                        </p>
                      </div>

                      {winner && (
                        <div className="mt-2 pt-2 border-t border-[var(--border-divider)] flex items-center justify-between text-xs">
                          <span className="inline-flex items-center gap-1 text-[var(--text-primary)] font-bold truncate">
                            <Crown className="w-3.5 h-3.5 fill-[var(--butter)] text-[var(--ink)] shrink-0" />
                            {winner.playerName}
                          </span>
                          {typeof winner.score === 'number' && (
                            <span className="font-mono font-bold text-[var(--text-primary)] tabular-nums px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--ink)] text-[11px]">
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

        {/* Bottom Split: Most Played Bar Chart + Shelf Status Breakdown */}
        <motion.section
          variants={fadeUpItem}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
        >
          <Card className="lg:col-span-7 p-6 space-y-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-xl text-[var(--text-primary)] tracking-tight">
                  Most Played Games
                </h2>
                <p className="text-xs text-[var(--text-secondary)] font-medium">
                  Top 5 titles hitting the table most often
                </p>
              </div>
              <Link
                to="/stats"
                className="text-xs font-semibold text-[var(--accent-primary)] hover:underline"
              >
                Analytics →
              </Link>
            </div>
            <MiniBarChart items={topPlayedGames} unit="plays" />
          </Card>

          <Card className="lg:col-span-5 p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-1">
              <h2 className="font-display font-bold text-xl text-[var(--text-primary)] tracking-tight">
                Shelf Status
              </h2>
              <p className="text-xs text-[var(--text-secondary)] font-medium">
                Inventory status breakdown across your vault
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 tabular-nums">
              <Link
                to="/collection?status=own"
                className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--ink)] shadow-[2px_2px_0_var(--ink)] hover:bg-[var(--butter)] hover:-translate-y-0.5 transition-all group cursor-pointer block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Owned</span>
                  <span className="text-xs text-[var(--text-muted)]">→</span>
                </div>
                <div className="font-display font-black text-2xl text-[var(--text-primary)] mt-1">
                  <AnimatedNumber value={games.filter((g) => g.status === 'own').length} />
                </div>
              </Link>

              <Link
                to="/collection?status=rented"
                className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--ink)] shadow-[2px_2px_0_var(--ink)] hover:bg-[var(--butter)] hover:-translate-y-0.5 transition-all group cursor-pointer block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Rented</span>
                  <span className="text-xs text-[var(--text-muted)]">→</span>
                </div>
                <div className="font-display font-black text-2xl text-[var(--text-primary)] mt-1">
                  <AnimatedNumber value={games.filter((g) => g.status === 'rented').length} />
                </div>
              </Link>

              <Link
                to="/collection?status=lent_out"
                className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--ink)] shadow-[2px_2px_0_var(--ink)] hover:bg-[var(--coral)] hover:-translate-y-0.5 transition-all group cursor-pointer block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Lent Out</span>
                  <span className="text-xs text-[var(--text-muted)]">→</span>
                </div>
                <div className="font-display font-black text-2xl text-[var(--text-primary)] mt-1">
                  <AnimatedNumber value={games.filter((g) => g.status === 'lent_out').length} />
                </div>
              </Link>

              <Link
                to="/collection?status=borrowed"
                className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--ink)] shadow-[2px_2px_0_var(--ink)] hover:bg-[var(--butter)] hover:-translate-y-0.5 transition-all group cursor-pointer block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Borrowed</span>
                  <span className="text-xs text-[var(--text-muted)]">→</span>
                </div>
                <div className="font-display font-black text-2xl text-[var(--text-primary)] mt-1">
                  <AnimatedNumber value={games.filter((g) => g.status === 'borrowed').length} />
                </div>
              </Link>

              <Link
                to="/collection?status=sold"
                className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--ink)] shadow-[2px_2px_0_var(--ink)] hover:bg-[var(--paper)] hover:-translate-y-0.5 transition-all group cursor-pointer block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Sold</span>
                  <span className="text-xs text-[var(--text-muted)]">→</span>
                </div>
                <div className="font-display font-black text-2xl text-[var(--text-primary)] mt-1">
                  <AnimatedNumber value={games.filter((g) => g.status === 'sold').length} />
                </div>
              </Link>

              <Link
                to="/collection?status=wishlist"
                className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--ink)] shadow-[2px_2px_0_var(--ink)] hover:bg-[var(--butter-soft)] hover:-translate-y-0.5 transition-all group cursor-pointer block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Wishlist</span>
                  <span className="text-xs text-[var(--text-muted)]">→</span>
                </div>
                <div className="font-display font-black text-2xl text-[var(--text-primary)] mt-1">
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
