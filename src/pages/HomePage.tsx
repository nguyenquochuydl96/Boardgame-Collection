import React from 'react';
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
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useGameStore } from '../store/useGameStore';
import { useSessionStore } from '../store/useSessionStore';
import { formatDate, formatDuration, getCollectionTotalValue } from '../lib/utils';

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' as const },
  },
};

export const HomePage: React.FC = () => {
  const games = useGameStore((s) => s.games);
  const sessions = useSessionStore((s) => s.sessions);

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
        {/* Full-Width Hero Banner */}
        <motion.section
          variants={fadeUpItem}
          className="relative rounded-3xl overflow-hidden p-6 sm:p-8 lg:p-10 bg-[image:var(--gradient-hero)] shadow-2xl shadow-[var(--accent-glow)] border border-white/15"
        >
          <div
            className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-sky-200">
                Curated by Heo & Gaming Group · Tabletop Archive
              </p>
              <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight">
                My Boardgame Collection
              </h1>
              <p className="text-sm sm:text-base text-white/85 leading-relaxed">
                Track every box on your shelf, spin the wheel on game night, and relive every victory across your tabletop group.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link to="/collection/add">
                <Button
                  variant="secondary"
                  size="lg"
                  className="bg-slate-950/75 hover:bg-slate-950 text-white border-white/25"
                >
                  <Plus className="w-5 h-5" />
                  Add Game
                </Button>
              </Link>
              <Link to="/sessions/new">
                <Button
                  variant="secondary"
                  size="lg"
                  className="bg-white text-slate-950 hover:bg-slate-100 border-white font-extrabold shadow-xl"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  New Session
                </Button>
              </Link>
            </div>
          </div>
        </motion.section>

        {/* Animated Stat Cards Grid */}
        <motion.section
          variants={fadeUpItem}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatCard
            label="Total Games Owned"
            value={ownedGamesCount}
            icon={<Dices className="w-5 h-5" />}
            accentColor="var(--accent-primary)"
            subtitle={`${games.length} total in vault`}
          />
          <StatCard
            label="Sessions Played"
            value={totalSessionsCount}
            icon={<Gamepad2 className="w-5 h-5" />}
            accentColor="var(--accent-secondary)"
            subtitle="All-time tabletop logs"
          />
          <StatCard
            label="Hours Played"
            value={totalHoursPlayed}
            suffix="h"
            icon={<Clock className="w-5 h-5" />}
            accentColor="var(--accent-green)"
            subtitle={`${totalMinutesPlayed} minutes at the table`}
          />
          <StatCard
            label="Collection Value"
            value={totalCollectionValue}
            isCurrencyVND
            icon={<Wallet className="w-5 h-5" />}
            accentColor="var(--accent-pink)"
            subtitle="Active shelf valuation"
          />
        </motion.section>

        {/* Game Night Picker Quick Access Banner */}
        <motion.section variants={fadeUpItem}>
          <Link
            to="/picker"
            className="block p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-600/15 border border-amber-500/30 hover:border-amber-400 transition-all group shadow-xl relative overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl group-hover:scale-110 group-hover:rotate-12 transition-transform shadow-inner">
                  🎲
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-lg sm:text-xl text-[var(--text-primary)] group-hover:text-amber-300 transition-colors">
                    Hôm Nay Chơi Gì? &amp; Vòng Quay Người Đi Đầu
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
                    Quay may mắn hoặc xáo rút thẻ bài bí ẩn để chọn game hoặc chọn người đi đầu ngay tức thì!
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/30 group-hover:brightness-110 shrink-0 w-fit">
                <span>Quay Ngay</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </motion.section>

        {/* Recently Played Horizontal Scroll List */}
        <motion.section variants={fadeUpItem} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-xl sm:text-2xl text-white">
                Recently Played
              </h2>
              <p className="text-xs sm:text-sm text-[#94a3b8]">
                Your last 5 tabletop game nights
              </p>
            </div>
            <Link
              to="/sessions"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[var(--accent-neon)] hover:text-white transition-colors"
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
                <Link
                  key={session.id}
                  to={`/sessions/${session.id}`}
                  className="snap-start shrink-0 w-72 sm:w-80 rounded-2xl bg-[var(--bg-card)]/90 border border-[var(--border-subtle)] hover:border-[var(--border-glow)] p-4 transition-all duration-300 group flex gap-3.5"
                >
                  <img
                    src={session.gameThumbnail}
                    alt={session.gameName}
                    referrerPolicy="no-referrer"
                    className="w-20 h-26 rounded-xl object-cover shrink-0 bg-[var(--bg-elevated)]"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h3 className="font-display font-bold text-base text-white truncate group-hover:text-[var(--accent-neon)] transition-colors">
                        {session.gameName}
                      </h3>
                      <p className="text-xs text-[#94a3b8] inline-flex items-center gap-1 mt-1 tabular-nums">
                        <Calendar className="w-3 h-3 text-[#22d3ee]" />
                        {formatDate(session.datePlayed)}
                        {session.durationMinutes
                          ? ` · ${formatDuration(session.durationMinutes)}`
                          : ''}
                      </p>
                    </div>

                    {winner && (
                      <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1 text-amber-300 font-semibold truncate">
                          <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                          {winner.playerName}
                        </span>
                        {typeof winner.score === 'number' && (
                          <span className="font-mono font-bold text-white tabular-nums">
                            {winner.score} pts
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.section>

        {/* Bottom Split: Most Played Bar Chart + Vault Spotlight */}
        <motion.section
          variants={fadeUpItem}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
        >
          <Card className="lg:col-span-7 p-6 space-y-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-xl text-white">
                  Most Played Games
                </h2>
                <p className="text-xs text-[#94a3b8]">
                  Top 5 boardgames hitting the table
                </p>
              </div>
              <Link
                to="/stats"
                className="text-xs font-semibold text-[var(--accent-neon)] hover:text-white transition-colors"
              >
                Full Analytics →
              </Link>
            </div>
            <MiniBarChart items={topPlayedGames} unit="plays" />
          </Card>

          <Card className="lg:col-span-5 p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-1">
              <h2 className="font-display font-bold text-xl text-white">
                Shelf Status Breakdown
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Inventory status across your vault
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 tabular-nums">
              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <span className="text-xs text-[#94a3b8]">In Vault (Own)</span>
                <p className="font-display font-extrabold text-2xl text-emerald-400 mt-0.5">
                  {games.filter((g) => g.status === 'own').length}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <span className="text-xs text-[#94a3b8]">Lent Out</span>
                <p className="font-display font-extrabold text-2xl text-orange-400 mt-0.5">
                  {games.filter((g) => g.status === 'lent_out').length}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <span className="text-xs text-[#94a3b8]">Sold Archive</span>
                <p className="font-display font-extrabold text-2xl text-pink-400 mt-0.5">
                  {games.filter((g) => g.status === 'sold').length}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <span className="text-xs text-[#94a3b8]">Wishlist</span>
                <p className="font-display font-extrabold text-2xl text-[var(--accent-neon)] mt-0.5">
                  {games.filter((g) => g.status === 'wishlist').length}
                </p>
              </div>
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
