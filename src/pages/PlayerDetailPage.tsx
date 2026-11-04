import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Trophy,
  Gamepad2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { PageTransition } from '../components/layout/PageTransition';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PlayerAvatar } from '../components/player/PlayerAvatar';
import { SessionCard } from '../components/session/SessionCard';
import { usePlayerStore } from '../store/usePlayerStore';
import { useSessionStore } from '../store/useSessionStore';
import { calculateLongestWinStreak, formatDate } from '../lib/utils';

export const PlayerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const player = usePlayerStore((s) => s.players.find((p) => p.id === id));
  const allPlayers = usePlayerStore((s) => s.players);
  const deletePlayer = usePlayerStore((s) => s.deletePlayer);
  const allSessions = useSessionStore((s) => s.sessions);

  if (!player) {
    return (
      <PageTransition>
        <Card className="p-8 text-center space-y-4">
          <h1 className="font-display font-bold text-2xl text-white">
            Player Not Found
          </h1>
          <Link to="/players">
            <Button variant="primary">Back to Players</Button>
          </Link>
        </Card>
      </PageTransition>
    );
  }

  const playersById = Object.fromEntries(allPlayers.map((p) => [p.id, p]));

  const playerSessions = allSessions
    .filter((s) => s.players.some((p) => p.playerId === player.id))
    .sort(
      (a, b) =>
        new Date(b.datePlayed).getTime() - new Date(a.datePlayed).getTime()
    );

  const totalPlays = playerSessions.length;
  const totalWins = playerSessions.filter((s) => {
    const entry = s.players.find((p) => p.playerId === player.id);
    return Boolean(entry?.isWinner || s.winnerId === player.id);
  }).length;
  const overallWinRate =
    totalPlays > 0 ? Math.round((totalWins / totalPlays) * 100) : 0;
  const bestStreak = calculateLongestWinStreak(player.id, allSessions);

  // Per-game breakdown
  const gameMap = new Map<
    string,
    { gameId: string; gameName: string; plays: number; wins: number }
  >();
  for (const s of playerSessions) {
    const existing = gameMap.get(s.gameId) || {
      gameId: s.gameId,
      gameName: s.gameName,
      plays: 0,
      wins: 0,
    };
    existing.plays += 1;
    const entry = s.players.find((p) => p.playerId === player.id);
    if (entry?.isWinner || s.winnerId === player.id) {
      existing.wins += 1;
    }
    gameMap.set(s.gameId, existing);
  }

  const perGameStats = Array.from(gameMap.values())
    .map((g) => ({
      ...g,
      winRate: g.plays > 0 ? Math.round((g.wins / g.plays) * 100) : 0,
    }))
    .sort((a, b) => b.plays - a.plays);

  const favoriteGame = perGameStats[0];

  const handleDelete = () => {
    deletePlayer(player.id);
    navigate('/players');
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/players"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#94a3b8] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Players
          </Link>

          <Button variant="danger" size="sm" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
            Remove Player
          </Button>
        </div>

        {/* Player Profile Header */}
        <Card className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <PlayerAvatar player={player} size="xl" />
            <div className="space-y-1">
              <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
                {player.name}
              </h1>
              <p className="text-xs sm:text-sm text-[#94a3b8] inline-flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#a78bfa]" />
                Member since {formatDate(player.createdAt)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 w-full sm:w-auto tabular-nums">
            <div className="p-3.5 rounded-2xl bg-[#16162a] border border-white/[0.06] text-center">
              <span className="text-xs text-[#94a3b8]">Games</span>
              <p className="font-display font-extrabold text-2xl text-white mt-0.5">
                {totalPlays}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#16162a] border border-white/[0.06] text-center">
              <span className="text-xs text-[#94a3b8]">Win Rate</span>
              <p className="font-display font-extrabold text-2xl text-emerald-400 mt-0.5">
                {overallWinRate}%
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#16162a] border border-white/[0.06] text-center">
              <span className="text-xs text-[#94a3b8]">Best Streak</span>
              <p className="font-display font-extrabold text-2xl text-amber-400 mt-0.5">
                {bestStreak}W
              </p>
            </div>
          </div>
        </Card>

        {/* Favorite Game + Per-Game Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-5 p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#a78bfa]">
                <Sparkles className="w-4 h-4" />
                Favorite Boardgame
              </span>
              {favoriteGame ? (
                <>
                  <Link
                    to={`/collection/${favoriteGame.gameId}`}
                    className="font-display font-extrabold text-2xl text-white hover:text-[#a78bfa] transition-colors block"
                  >
                    {favoriteGame.gameName}
                  </Link>
                  <p className="text-sm text-[#94a3b8] tabular-nums">
                    Played {favoriteGame.plays} times with a{' '}
                    <strong className="text-emerald-400">
                      {favoriteGame.winRate}%
                    </strong>{' '}
                    win rate ({favoriteGame.wins} wins).
                  </p>
                </>
              ) : (
                <p className="text-sm text-[#94a3b8]">
                  No sessions recorded yet for this player.
                </p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-[#16162a] border border-white/[0.06] flex items-center justify-between">
              <span className="text-xs text-[#94a3b8]">Total Victories</span>
              <span className="font-display font-extrabold text-xl text-amber-400 inline-flex items-center gap-1.5 tabular-nums">
                <Trophy className="w-4 h-4" />
                {totalWins} Wins
              </span>
            </div>
          </Card>

          <Card className="lg:col-span-7 p-6 space-y-4">
            <h2 className="font-display font-bold text-lg text-white">
              Per-Game Breakdown
            </h2>
            {perGameStats.length > 0 ? (
              <div className="space-y-2.5">
                {perGameStats.map((item) => (
                  <Link
                    key={item.gameId}
                    to={`/collection/${item.gameId}`}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-[#16162a] border border-white/[0.06] hover:border-[#7c3aed]/50 transition-colors tabular-nums"
                  >
                    <div className="flex items-center gap-2.5">
                      <Gamepad2 className="w-4 h-4 text-[#a78bfa]" />
                      <span className="font-display font-bold text-sm text-white">
                        {item.gameName}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-[#94a3b8]">
                        {item.plays} {item.plays === 1 ? 'play' : 'plays'}
                      </span>
                      <span className="font-mono font-bold text-emerald-400 w-16 text-right">
                        {item.winRate}% ({item.wins}W)
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#94a3b8]">
                No games played yet.
              </p>
            )}
          </Card>
        </div>

        {/* Recent 5 Sessions */}
        <div className="space-y-3">
          <h2 className="font-display font-bold text-xl text-white">
            Recent Sessions (Last 5)
          </h2>
          {playerSessions.slice(0, 5).map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              playersById={playersById}
            />
          ))}
        </div>
      </div>
    </PageTransition>
  );
};

export default PlayerDetailPage;
