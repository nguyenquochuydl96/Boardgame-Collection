import React, { useState, useMemo } from 'react';
import { BoardGame, PlaySession } from '../types/boardgame';
import {
  Trophy,
  Calendar,
  Clock,
  MapPin,
  Plus,
  Trash2,
  Users,
  Sparkles,
  Flame,
  Award,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface PlayLogViewProps {
  sessions: PlaySession[];
  games: BoardGame[];
  onOpenNewSessionModal: (game?: BoardGame) => void;
  onDeleteSession: (sessionId: string) => void;
  onSelectGame: (game: BoardGame) => void;
}

export const PlayLogView: React.FC<PlayLogViewProps> = ({
  sessions,
  games,
  onOpenNewSessionModal,
  onDeleteSession,
  onSelectGame,
}) => {
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>('all');

  // Filter sessions
  const filteredSessions = useMemo(() => {
    if (selectedGameFilter === 'all') return sessions;
    return sessions.filter((s) => s.gameId === selectedGameFilter);
  }, [sessions, selectedGameFilter]);

  // Overall Statistics
  const totalPlays = sessions.length;
  const totalMinutes = useMemo(() => sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0), [sessions]);
  const totalHours = (totalMinutes / 60).toFixed(1);

  // Most played game
  const mostPlayedGame = useMemo(() => {
    const counts: Record<string, { count: number; name: string; img: string }> = {};
    sessions.forEach((s) => {
      if (!counts[s.gameId]) {
        counts[s.gameId] = { count: 0, name: s.gameName, img: s.gameImageUrl };
      }
      counts[s.gameId].count += 1;
    });
    const sorted = Object.values(counts).sort((a, b) => b.count - a.count);
    return sorted[0] || null;
  }, [sessions]);

  // Player Leaderboard Aggregation
  const leaderboard = useMemo(() => {
    const stats: Record<
      string,
      {
        name: string;
        plays: number;
        wins: number;
        highScore: number;
        totalScore: number;
      }
    > = {};

    sessions.forEach((s) => {
      s.players.forEach((p) => {
        const trimmed = p.playerName.trim();
        if (!stats[trimmed]) {
          stats[trimmed] = {
            name: trimmed,
            plays: 0,
            wins: 0,
            highScore: 0,
            totalScore: 0,
          };
        }
        stats[trimmed].plays += 1;
        if (p.isWinner) stats[trimmed].wins += 1;
        if (p.score > stats[trimmed].highScore) stats[trimmed].highScore = p.score;
        stats[trimmed].totalScore += p.score;
      });
    });

    return Object.values(stats)
      .map((p) => ({
        ...p,
        winRate: p.plays > 0 ? Math.round((p.wins / p.plays) * 100) : 0,
        avgScore: p.plays > 0 ? Math.round(p.totalScore / p.plays) : 0,
      }))
      .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate);
  }, [sessions]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 animate-fade-in">
      {/* 1. Header Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-[#0C223A] via-[#0E2845] to-[#071526] border border-[#1A3F69] p-5 sm:p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF6B00] to-[#FF8C33] flex items-center justify-center text-white shadow-lg shadow-[#FF6B00]/30 border border-[#FFA154]/40 shrink-0">
            <Trophy className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
                Nhật Ký Ván Chơi & Bảng Thành Tích
              </h2>
            </div>
            <p className="text-xs text-[#8EADC8] mt-0.5">
              Ghi nhận điểm số, người chiến thắng và khoảnh khắc đáng nhớ qua từng buổi game night
            </p>
          </div>
        </div>

        <button
          onClick={() => onOpenNewSessionModal()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FF6B00] hover:bg-[#FF7A1A] text-white font-bold text-xs shadow-lg shadow-[#FF6B00]/30 transition-all hover:scale-105 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Ghi Ván Chơi Mới</span>
        </button>
      </div>

      {/* 2. Overview Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Plays */}
        <div className="p-4 rounded-2xl bg-[#091D33] border border-[#163558] shadow-lg">
          <div className="flex items-center justify-between text-[#8EADC8] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tổng Ván Đã Chơi</span>
            <Flame className="w-4 h-4 text-[#FF6B00]" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">{totalPlays}</p>
          <p className="text-[10px] text-[#6080A2] mt-0.5">ván được ghi nhận</p>
        </div>

        {/* Total Time */}
        <div className="p-4 rounded-2xl bg-[#091D33] border border-[#163558] shadow-lg">
          <div className="flex items-center justify-between text-[#8EADC8] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Thời Gian Chơi</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">{totalHours}h</p>
          <p className="text-[10px] text-[#6080A2] mt-0.5">tương đương {totalMinutes} phút</p>
        </div>

        {/* Most Played Game */}
        <div className="p-4 rounded-2xl bg-[#091D33] border border-[#163558] shadow-lg">
          <div className="flex items-center justify-between text-[#8EADC8] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Chơi Nhiều Nhất</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-sm font-bold text-white truncate mt-1">
            {mostPlayedGame?.name || 'Chưa có'}
          </p>
          <p className="text-[10px] text-amber-400 mt-0.5 font-semibold">
            {mostPlayedGame ? `${mostPlayedGame.count} ván chơi` : 'Ghi ván đầu tiên'}
          </p>
        </div>

        {/* Top Winner */}
        <div className="p-4 rounded-2xl bg-[#091D33] border border-[#163558] shadow-lg">
          <div className="flex items-center justify-between text-[#8EADC8] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Vua Chiến Thắng</span>
            <Trophy className="w-4 h-4 text-[#FF6B00]" />
          </div>
          <p className="text-sm font-bold text-white truncate mt-1">
            {leaderboard[0]?.name || 'Chưa có'}
          </p>
          <p className="text-[10px] text-[#FF6B00] mt-0.5 font-semibold">
            {leaderboard[0] ? `${leaderboard[0].wins} chiến thắng (${leaderboard[0].winRate}%)` : 'Chưa có dữ liệu'}
          </p>
        </div>
      </div>

      {/* 3. BẢNG XẾP HẠNG BẠN BÈ (Friend Leaderboard) */}
      <div className="rounded-3xl bg-[#091D33] border border-[#163558] p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-base sm:text-lg font-bold text-white font-display">
              Bảng Xếp Hạng Người Chơi (Leaderboard)
            </h3>
          </div>
          <span className="text-xs text-[#8EADC8] bg-[#0E2642] px-3 py-1 rounded-full border border-[#1A3F69]">
            {leaderboard.length} người chơi
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#142C48] text-[#8EADC8] uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Hạng</th>
                <th className="py-2.5 px-3">Người Chơi</th>
                <th className="py-2.5 px-3 text-center">Số Ván</th>
                <th className="py-2.5 px-3 text-center">Chiến Thắng 👑</th>
                <th className="py-2.5 px-3 text-center">Tỷ Lệ Thắng (%)</th>
                <th className="py-2.5 px-3 text-right">Điểm Cao Nhất</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#142C48]/60">
              {leaderboard.map((player, idx) => (
                <tr key={player.name} className="hover:bg-[#0C223A] transition-colors">
                  <td className="py-3 px-3 font-mono font-bold">
                    {idx === 0 ? (
                      <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-black shadow-sm">
                        1
                      </span>
                    ) : idx === 1 ? (
                      <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-950 flex items-center justify-center text-xs font-black shadow-sm">
                        2
                      </span>
                    ) : idx === 2 ? (
                      <span className="w-6 h-6 rounded-full bg-amber-700 text-white flex items-center justify-center text-xs font-black shadow-sm">
                        3
                      </span>
                    ) : (
                      <span className="text-[#6080A2] pl-2">{idx + 1}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                    <span>{player.name}</span>
                    {idx === 0 && <span className="text-xs">👑</span>}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-[#8EADC8]">{player.plays}</td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-amber-400">
                    {player.wins}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 font-mono">
                      <span className="font-bold text-emerald-400">{player.winRate}%</span>
                      <div className="w-12 h-1.5 rounded-full bg-[#0E2642] overflow-hidden hidden sm:block">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${player.winRate}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-white">
                    {player.highScore} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. DÒNG THỜI GIAN VÁN CHƠI (Play Sessions History) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#FF6B00]" />
            <h3 className="text-base sm:text-lg font-bold text-white font-display">
              Lịch Sử Các Ván Đấu ({filteredSessions.length})
            </h3>
          </div>

          {/* Filter by Game */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#8EADC8]">Lọc theo game:</span>
            <select
              value={selectedGameFilter}
              onChange={(e) => setSelectedGameFilter(e.target.value)}
              className="bg-[#0C223A] border border-[#163558] focus:border-[#FF6B00] rounded-xl px-3 py-1.5 text-white outline-none"
            >
              <option value="all">Tất cả game ({sessions.length} ván)</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="text-center py-12 rounded-3xl bg-[#091D33] border border-[#163558] p-6 space-y-3">
            <p className="text-sm font-semibold text-white">Chưa có ván đấu nào được ghi nhận cho tựa game này.</p>
            <p className="text-xs text-[#8EADC8]">
              Hãy bấm "Ghi Ván Chơi Mới" để lưu lại kết quả của buổi chơi đầu tiên!
            </p>
            <button
              onClick={() => onOpenNewSessionModal()}
              className="px-5 py-2 rounded-full bg-[#FF6B00] text-white font-bold text-xs hover:bg-[#FF7A1A] transition-all"
            >
              Ghi Ván Chơi Đầu Tiên
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className="group relative rounded-3xl bg-[#091D33] hover:bg-[#0B2139] border border-[#163558] hover:border-[#1E4570] p-5 shadow-xl transition-all"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[#142C48]">
                  {/* Game Info Left */}
                  <div className="flex items-center gap-3.5">
                    <img
                      src={session.gameImageUrl}
                      alt={session.gameName}
                      className="w-14 h-14 rounded-2xl object-cover border border-[#1A3F69] shadow-md shrink-0 cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => {
                        const target = games.find((g) => g.id === session.gameId);
                        if (target) onSelectGame(target);
                      }}
                    />
                    <div>
                      <h4
                        onClick={() => {
                          const target = games.find((g) => g.id === session.gameId);
                          if (target) onSelectGame(target);
                        }}
                        className="text-base font-bold text-white hover:text-[#FF6B00] transition-colors cursor-pointer font-display"
                      >
                        {session.gameName}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#8EADC8] mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#FF6B00]" />
                          <span>{session.date}</span>
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{session.durationMinutes} phút</span>
                        </span>
                        {session.location && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-rose-400" />
                              <span>{session.location}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Delete button */}
                  <button
                    onClick={() => {
                      if (window.confirm('Bạn có chắc chắn muốn xóa ván chơi này?')) {
                        onDeleteSession(session.id);
                      }
                    }}
                    className="p-2 rounded-xl text-[#6080A2] hover:text-rose-400 hover:bg-rose-500/10 transition-colors self-end md:self-auto"
                    title="Xóa ván chơi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Player Scores Grid */}
                <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {session.players
                    .sort((a, b) => b.score - a.score)
                    .map((p, idx) => (
                      <div
                        key={p.playerId}
                        className={`p-3 rounded-2xl border transition-all ${
                          p.isWinner
                            ? 'bg-amber-500/15 border-amber-500/40 shadow-sm'
                            : 'bg-[#0C223A] border-[#163558]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-white truncate">{p.playerName}</span>
                          {p.isWinner && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow">
                              👑 THẮNG
                            </span>
                          )}
                        </div>
                        {p.roleOrFaction && (
                          <p className="text-[10px] text-[#8EADC8] truncate italic">
                            {p.roleOrFaction}
                          </p>
                        )}
                        <p className="text-sm font-black text-amber-400 font-mono mt-1">
                          {p.score} <span className="text-[10px] text-[#8EADC8] font-normal">pts</span>
                        </p>
                      </div>
                    ))}
                </div>

                {/* Session Notes if any */}
                {session.notes && (
                  <div className="mt-3.5 p-3 rounded-2xl bg-[#08182B] border border-[#142C48] text-xs text-[#8EADC8] italic">
                    💬 "{session.notes}"
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
