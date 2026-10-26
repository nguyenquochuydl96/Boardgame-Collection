import React, { useState } from 'react';
import { BoardGame } from '../types/boardgame';
import { resolveImageUrl } from '../utils/imageUrl';
import { ShieldCheck, AlertTriangle, ArrowRight, CheckCircle2, XCircle, Scale, Sparkles } from 'lucide-react';

interface ComparisonModeProps {
  games: BoardGame[];
  onSelectGame: (game: BoardGame) => void;
}

export const ComparisonMode: React.FC<ComparisonModeProps> = ({ games, onSelectGame }) => {
  const realGames = games.filter((g) => g.cabinetType === 'real');
  const fakeGames = games.filter((g) => g.cabinetType === 'fake');

  const defaultReal = realGames.find((g) => g.counterpartId) || realGames[0];
  const defaultFake =
    fakeGames.find((g) => g.id === defaultReal?.counterpartId) ||
    fakeGames.find((g) => g.counterpartId) ||
    fakeGames[0];

  const [selectedRealId, setSelectedRealId] = useState<string>(defaultReal?.id || '');
  const [selectedFakeId, setSelectedFakeId] = useState<string>(defaultFake?.id || '');

  const currentReal = realGames.find((g) => g.id === selectedRealId) || realGames[0];
  const currentFake = fakeGames.find((g) => g.id === selectedFakeId) || fakeGames[0];

  const formatCurrency = (price: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
      .format(price)
      .replace('VND', '₫');
  };

  const priceDiff = currentReal && currentFake ? currentReal.price - currentFake.price : 0;
  const priceRatio =
    currentReal && currentFake && currentFake.price > 0
      ? (currentReal.price / currentFake.price).toFixed(1)
      : '0';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-rose-950/40 border border-slate-800 rounded-2xl p-6 text-center shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3">
          <Scale className="w-3.5 h-3.5" />
          <span>VISUAL AUTHENTICITY COMPARISON</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-white font-display">
          Compare Authentic vs Counterfeit Editions
        </h2>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl mx-auto">
          Examine side-by-side differences in box construction, linen card finishes, component weights, and publisher quality.
        </p>
      </div>

      {/* Selectors Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Real Selector */}
        <div className="bg-[#18120c] border border-amber-600/30 rounded-xl p-4 flex flex-col gap-2">
          <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Select Authentic Game (Real Collection):</span>
          </label>
          <select
            value={selectedRealId}
            onChange={(e) => setSelectedRealId(e.target.value)}
            className="w-full bg-slate-900 border border-amber-500/40 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
          >
            {realGames.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} {g.status === 'OOS' ? '[OOS] ' : ''}({formatCurrency(g.price)})
              </option>
            ))}
          </select>
        </div>

        {/* Fake Selector */}
        <div className="bg-[#181416] border border-rose-700/40 rounded-xl p-4 flex flex-col gap-2">
          <label className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Select Counterfeit / Replica Game:</span>
          </label>
          <select
            value={selectedFakeId}
            onChange={(e) => setSelectedFakeId(e.target.value)}
            className="w-full bg-slate-900 border border-rose-500/40 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-400"
          >
            {fakeGames.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} {g.status === 'OOS' ? '[OOS] ' : ''}({formatCurrency(g.price)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Side-by-Side Comparison Grid */}
      {currentReal && currentFake && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LEFT: REAL CARD */}
          <div className="rounded-2xl bg-gradient-to-b from-[#1c140d] to-[#120d09] border-2 border-emerald-500/40 p-5 shadow-2xl flex flex-col justify-between">
            <div>
              {/* Badge & Title */}
              <div className="flex items-center justify-between pb-3 border-b border-amber-700/30">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>REAL COLLECTION · AUTHENTIC</span>
                </div>
                <span className="font-mono text-sm font-bold text-amber-400">
                  {formatCurrency(currentReal.price)}
                </span>
              </div>

              {/* Game Cover & Specs */}
              <div className="flex gap-4 mt-4">
                <img
                  src={resolveImageUrl(currentReal.imageUrl)}
                  alt={currentReal.name}
                  referrerPolicy="no-referrer"
                  className="w-28 h-36 object-cover object-top bg-black/50 rounded-lg shadow-lg border border-amber-500/30 shrink-0 p-1"
                />
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white font-display">
                    {currentReal.name}
                  </h3>
                  <p className="text-xs text-amber-300/80">
                    Publisher: {currentReal.publisher} ({currentReal.year})
                  </p>
                  <p className="text-xs text-slate-300">
                    Players: {currentReal.players} · {currentReal.playtime}
                  </p>
                  <p className="text-xs text-emerald-400 font-semibold">
                    Condition: {currentReal.condition}
                  </p>
                  {currentReal.weightGrams && (
                    <p className="text-xs text-slate-400 font-mono">
                      Weight: {currentReal.weightGrams}g (retail standard)
                    </p>
                  )}
                </div>
              </div>

              {/* Highlights */}
              <div className="mt-5 space-y-2.5 pt-4 border-t border-amber-900/40">
                <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                  Authentic Publisher Quality:
                </h4>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Heavy 2.5mm compressed cardboard box with anti-scuff finish.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Black-core cards with textured linen embossing preventing light transparency.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Dense, smooth components with non-toxic premium dyes.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-amber-200 italic">
                      "{currentReal.authenticityNotes}"
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => onSelectGame(currentReal)}
              className="mt-6 w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold rounded-lg transition-colors"
            >
              Inspect Authentic Edition
            </button>
          </div>

          {/* RIGHT: FAKE CARD */}
          <div className="rounded-2xl bg-gradient-to-b from-[#1e1416] to-[#120d0f] border-2 border-rose-500/40 p-5 shadow-2xl flex flex-col justify-between">
            <div>
              {/* Badge & Title */}
              <div className="flex items-center justify-between pb-3 border-b border-rose-700/30">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-950 text-rose-300 border border-rose-500/40 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>REPLICAS & FAKE · COUNTERFEIT</span>
                </div>
                <span className="font-mono text-sm font-bold text-rose-400">
                  {formatCurrency(currentFake.price)}
                </span>
              </div>

              {/* Game Cover & Specs */}
              <div className="flex gap-4 mt-4">
                <img
                  src={resolveImageUrl(currentFake.imageUrl)}
                  alt={currentFake.name}
                  referrerPolicy="no-referrer"
                  className="w-28 h-36 object-cover object-top bg-black/50 rounded-lg shadow-lg border border-rose-500/30 shrink-0 p-1"
                />
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white font-display">
                    {currentFake.name}
                  </h3>
                  <p className="text-xs text-rose-300/80">
                    Source: {currentFake.publisher} ({currentFake.year})
                  </p>
                  <p className="text-xs text-slate-300">
                    Players: {currentFake.players} · {currentFake.playtime}
                  </p>
                  <p className="text-xs text-rose-400 font-semibold">
                    Condition: {currentFake.condition}
                  </p>
                  {currentFake.weightGrams && (
                    <p className="text-xs text-slate-400 font-mono">
                      Weight: {currentFake.weightGrams}g (lighter than authentic box)
                    </p>
                  )}
                </div>
              </div>

              {/* Flaws */}
              <div className="mt-5 space-y-2.5 pt-4 border-t border-rose-900/40">
                <h4 className="text-xs font-bold text-rose-200 uppercase tracking-wider">
                  Counterfeit Flaws & Inspection Warnings:
                </h4>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>Flimsy, thin cardboard box with splitting corners and weak glue.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>Glossy cardstock with shifted hues on card backs exposing secret roles.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>Hollow plastic or rough splintered wooden pieces with strong chemical odor.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span className="text-rose-200 italic">
                      "{currentFake.authenticityNotes}"
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => onSelectGame(currentFake)}
              className="mt-6 w-full py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold rounded-lg transition-colors"
            >
              Inspect Counterfeit Edition
            </button>
          </div>
        </div>
      )}

      {/* Valuation Difference Summary Strip */}
      {currentReal && currentFake && (
        <div className="bg-[#121620] border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              Valuation Discrepancy & Player Advisory
            </p>
            <p className="text-sm font-semibold text-slate-200 mt-0.5">
              The authentic edition costs{' '}
              <span className="text-amber-400 font-bold font-mono">{priceRatio}x</span> more than
              the counterfeit (valuation gap of{' '}
              <span className="text-amber-400 font-bold font-mono">
                {formatCurrency(Math.abs(priceDiff))}
              </span>
              ).
            </p>
          </div>
          <p className="text-xs text-slate-400 max-w-md">
            Advisory: In social deduction or card-driven games (like Avalon, Exploding Kittens, Codenames), color discrepancies on counterfeit card backs reveal identities and compromise gameplay integrity.
          </p>
        </div>
      )}
    </div>
  );
};
