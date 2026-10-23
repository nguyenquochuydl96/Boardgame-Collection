import React, { useMemo } from 'react';
import { BoardGame } from '../types/boardgame';
import { ShieldCheck, AlertTriangle, Layers, DollarSign, Users, Award, PieChart, Star } from 'lucide-react';

interface StatsViewProps {
  games: BoardGame[];
  onSelectGame: (game: BoardGame) => void;
}

export const StatsView: React.FC<StatsViewProps> = ({ games, onSelectGame }) => {
  const realGames = useMemo(() => games.filter((g) => g.cabinetType === 'real'), [games]);
  const fakeGames = useMemo(() => games.filter((g) => g.cabinetType === 'fake'), [games]);

  const realTotal = useMemo(() => realGames.reduce((acc, g) => acc + g.price, 0), [realGames]);
  const fakeTotal = useMemo(() => fakeGames.reduce((acc, g) => acc + g.price, 0), [fakeGames]);

  const realAvgRating = useMemo(() => {
    if (realGames.length === 0) return 0;
    return (realGames.reduce((acc, g) => acc + g.rating, 0) / realGames.length).toFixed(1);
  }, [realGames]);

  const fakeAvgRating = useMemo(() => {
    if (fakeGames.length === 0) return 0;
    return (fakeGames.reduce((acc, g) => acc + g.rating, 0) / fakeGames.length).toFixed(1);
  }, [fakeGames]);

  const formatVnd = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // Category distribution
  const categoryCounts = useMemo(() => {
    const counts: Record<string, { real: number; fake: number; total: number }> = {};
    games.forEach((g) => {
      const primaryCat = g.category.split('/')[0].trim();
      if (!counts[primaryCat]) counts[primaryCat] = { real: 0, fake: 0, total: 0 };
      counts[primaryCat].total += 1;
      if (g.cabinetType === 'real') counts[primaryCat].real += 1;
      else counts[primaryCat].fake += 1;
    });
    return Object.entries(counts).sort((a, b) => b[1].total - a[1].total);
  }, [games]);

  // Player count distribution
  const playerGroups = useMemo(() => {
    const groups = {
      solo: 0,
      duo: 0,
      medium: 0,
      party: 0,
    };
    games.forEach((g) => {
      if (g.minPlayers === 1) groups.solo += 1;
      if (g.minPlayers <= 2 && g.maxPlayers >= 2) groups.duo += 1;
      if (g.maxPlayers >= 4 && g.maxPlayers <= 5) groups.medium += 1;
      if (g.maxPlayers >= 6) groups.party += 1;
    });
    return groups;
  }, [games]);

  const authenticityRate = games.length > 0 ? Math.round((realGames.length / games.length) * 100) : 0;

  const onHandCount = useMemo(() => games.filter((g) => g.status !== 'OOS').length, [games]);
  const oosCount = useMemo(() => games.filter((g) => g.status === 'OOS').length, [games]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total games */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg flex items-center gap-3.5">
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Tổng Số Game</p>
            <p className="text-xl font-bold text-white font-mono tabular-nums">{games.length} bộ</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              <span className="text-emerald-400 font-semibold">{onHandCount} On Hand</span> ·{' '}
              <span className="text-zinc-400 font-semibold">{oosCount} OOS</span>
            </p>
          </div>
        </div>

        {/* Real Value */}
        <div className="p-4 rounded-xl bg-slate-900 border border-emerald-900/40 shadow-lg flex items-center gap-3.5">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Real Collection</p>
            <p className="text-lg font-bold text-emerald-400 font-mono tabular-nums truncate">
              {formatVnd(realTotal)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{realGames.length} bộ · TB: {realAvgRating}★</p>
          </div>
        </div>

        {/* Fake Cost */}
        <div className="p-4 rounded-xl bg-slate-900 border border-rose-900/40 shadow-lg flex items-center gap-3.5">
          <div className="p-3 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Replicas & Fake</p>
            <p className="text-lg font-bold text-rose-400 font-mono tabular-nums truncate">
              {formatVnd(fakeTotal)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{fakeGames.length} bộ · TB: {fakeAvgRating}★</p>
          </div>
        </div>

        {/* Authenticity Ratio */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg flex items-center gap-3.5">
          <div className="p-3 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Tỉ Lệ Real</p>
            <p className="text-xl font-bold text-sky-400 font-mono tabular-nums">
              {authenticityRate}% Real
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {authenticityRate >= 70 ? 'Bộ sưu tập chất lượng cao' : 'Nhiều bản reprint/đối chứng'}
            </p>
          </div>
        </div>
      </div>

      {/* Breakdown by Categories */}
      <div className="bg-[#11141c] border border-slate-800 rounded-xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-white font-display mb-4 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-amber-400" />
          <span>Phân Bổ Thể Loại Game (Real vs Replicas & Fake)</span>
        </h3>

        <div className="space-y-3">
          {categoryCounts.map(([cat, count]) => {
            const realPct = Math.round((count.real / count.total) * 100);
            const fakePct = 100 - realPct;
            return (
              <div key={cat} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">{cat}</span>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-emerald-400">{count.real} Real</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-rose-400">{count.fake} Fake</span>
                    <span className="text-slate-500">({count.total} tổng)</span>
                  </div>
                </div>
                {/* Visual bar */}
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${realPct}%` }}
                    title={`${realPct}% Real`}
                  />
                  <div
                    className="h-full bg-rose-500 transition-all"
                    style={{ width: `${fakePct}%` }}
                    title={`${fakePct}% Fake`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Player Compatibility Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <p className="text-xs text-slate-400">Chơi Solo (1 người)</p>
          <p className="text-xl font-bold text-amber-400 font-mono mt-1">{playerGroups.solo}</p>
          <p className="text-[11px] text-slate-500">tựa game hỗ trợ</p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <p className="text-xs text-slate-400">Chơi Cặp Đôi (2 người)</p>
          <p className="text-xl font-bold text-amber-400 font-mono mt-1">{playerGroups.duo}</p>
          <p className="text-[11px] text-slate-500">tựa game phù hợp</p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <p className="text-xs text-slate-400">Nhóm Vừa (4 - 5 người)</p>
          <p className="text-xl font-bold text-amber-400 font-mono mt-1">{playerGroups.medium}</p>
          <p className="text-[11px] text-slate-500">tựa game lý tưởng</p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <p className="text-xs text-slate-400">Party Game (6+ người)</p>
          <p className="text-xl font-bold text-amber-400 font-mono mt-1">{playerGroups.party}</p>
          <p className="text-[11px] text-slate-500">tựa game đông vui</p>
        </div>
      </div>
    </div>
  );
};
