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
          className="relative rounded-3xl overflow-hidden p-6 sm:p-8 lg:p-10 bg-[image:var(--gradient-hero)] shadow-2xl shadow-[#7c3aed]/25 border border-white/15"
        >
          <div
            className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-sky-200">
                Curated by Huy Nguyễn · Tabletop Archive
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
            accentColor="#7c3aed"
            subtitle={`${games.length} total in vault`}
          />
          <StatCard
            label="Sessions Played"
            value={totalSessionsCount}
            icon={<Gamepad2 className="w-5 h-5" />}
            accentColor="#22d3ee"
            subtitle="All-time tabletop logs"
          />
          <StatCard
            label="Hours Played"
            value={totalHoursPlayed}
            suffix="h"
            icon={<Clock className="w-5 h-5" />}
            accentColor="#10b981"
            subtitle={`${totalMinutesPlayed} minutes at the table`}
          />
          <StatCard
            label="Collection Value"
            value={totalCollectionValue}
            isCurrencyVND
            icon={<Wallet className="w-5 h-5" />}
            accentColor="#ec4899"
            subtitle="Active shelf valuation"
          />
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
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#a78bfa] hover:text-white transition-colors"
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
                  className="snap-start shrink-0 w-72 sm:w-80 rounded-2xl bg-[#1a1a2e]/90 border border-white/[0.08] hover:border-[#7c3aed]/50 p-4 transition-all duration-300 group flex gap-3.5"
                >
                  <img
                    src={session.gameThumbnail}
                    alt={session.gameName}
                    referrerPolicy="no-referrer"
                    className="w-20 h-26 rounded-xl object-cover shrink-0 bg-[#1e1e35]"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h3 className="font-display font-bold text-base text-white truncate group-hover:text-[#a78bfa] transition-colors">
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
                      <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
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
                className="text-xs font-semibold text-[#a78bfa] hover:text-white transition-colors"
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
              <div className="p-3.5 rounded-xl bg-[#16162a] border border-white/[0.06]">
                <span className="text-xs text-[#94a3b8]">In Vault (Own)</span>
                <p className="font-display font-extrabold text-2xl text-emerald-400 mt-0.5">
                  {games.filter((g) => g.status === 'own').length}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#16162a] border border-white/[0.06]">
                <span className="text-xs text-[#94a3b8]">Lent Out</span>
                <p className="font-display font-extrabold text-2xl text-orange-400 mt-0.5">
                  {games.filter((g) => g.status === 'lent_out').length}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#16162a] border border-white/[0.06]">
                <span className="text-xs text-[#94a3b8]">Sold Archive</span>
                <p className="font-display font-extrabold text-2xl text-pink-400 mt-0.5">
                  {games.filter((g) => g.status === 'sold').length}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#16162a] border border-white/[0.06]">
                <span className="text-xs text-[#94a3b8]">Wishlist</span>
                <p className="font-display font-extrabold text-2xl text-[#a78bfa] mt-0.5">
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
