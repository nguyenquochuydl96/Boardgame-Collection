import React, { useState } from 'react';
import { BoardGame } from '../types/boardgame';
import { ShieldCheck, AlertTriangle, Users, Clock, ArrowLeftRight, Eye, Star } from 'lucide-react';

interface GameBoxCardProps {
  game: BoardGame;
  viewMode: 'front' | 'spine';
  onSelect: (game: BoardGame) => void;
  onToggleCabinet: (game: BoardGame, e: React.MouseEvent) => void;
}

export const GameBoxCard: React.FC<GameBoxCardProps> = ({
  game,
  viewMode,
  onSelect,
  onToggleCabinet,
}) => {
  const [imageError, setImageError] = useState(false);
  const isReal = game.cabinetType === 'real';

  const formatVnd = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // Spine View (standing upright side-by-side on the shelf like books)
  if (viewMode === 'spine') {
    return (
      <div
        onClick={() => onSelect(game)}
        className="group relative cursor-pointer select-none game-spine-3d shrink-0"
        title={`${game.name} - Nhấn để xem chi tiết`}
      >
        <div
          className={`w-12 h-56 md:h-64 rounded-sm flex flex-col justify-between p-1.5 md:p-2 shadow-2xl relative overflow-hidden transition-all duration-200 border-t border-r ${
            isReal
              ? 'border-amber-400/40 bg-gradient-to-b from-stone-800 via-stone-900 to-black text-amber-200 shadow-amber-950/40'
              : 'border-zinc-500/40 bg-gradient-to-b from-zinc-800 via-zinc-900 to-black text-zinc-300 shadow-black'
          }`}
          style={{
            borderLeft: `5px solid ${game.boxColor || (isReal ? '#b45309' : '#71717a')}`,
          }}
        >
          {/* Top spine logo / badge */}
          <div className="flex flex-col items-center">
            {isReal ? (
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="text-[9px] uppercase tracking-wider font-semibold opacity-80 mt-1">
              {isReal ? 'REAL' : 'FAKE'}
            </span>
          </div>

          {/* Vertical Title along spine */}
          <div className="flex-1 flex items-center justify-center my-2 w-full overflow-hidden">
            <span
              className="text-[11px] md:text-xs font-bold tracking-tight text-white leading-tight max-h-full overflow-hidden"
              style={{ writingMode: 'vertical-rl' }}
              title={game.name}
            >
              {game.name}
            </span>
          </div>

          {/* Bottom stats on spine */}
          <div className="flex flex-col items-center gap-1 text-[10px] text-slate-400 border-t border-white/10 pt-1">
            <span className="font-mono tabular-nums text-[9px] text-amber-300">
              {game.rating.toFixed(1)}★
            </span>
            <span className="truncate max-w-[46px] text-[8px] opacity-70" title={game.publisher}>
              {game.publisher}
            </span>
          </div>
        </div>

        {/* Hover quick card tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-40 w-60 p-3 bg-slate-900/98 border border-amber-500/30 rounded-lg shadow-2xl text-left pointer-events-none">
          <p className="text-xs font-bold text-white truncate">{game.name}</p>
          <p className="text-[11px] text-amber-300/80">{game.publisher} · {game.year}</p>
          {game.gameplayStory && (
            <p className="text-[10px] text-slate-300 line-clamp-2 mt-1 leading-snug">
              {game.gameplayStory}
            </p>
          )}
          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800 text-[11px]">
            <span className="text-slate-300">{game.players}</span>
            <span className="font-semibold text-amber-400 font-mono tabular-nums">
              {formatVnd(game.price)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Front Box 3D View (showing the rich cover art, cardboard depth, and real/fake seal)
  return (
    <div
      onClick={() => onSelect(game)}
      className="group relative cursor-pointer perspective-1000 flex flex-col h-full"
    >
      <div
        className={`game-box-3d relative rounded-lg overflow-hidden flex flex-col h-full bg-slate-900/90 border transition-all duration-300 ${
          isReal
            ? 'border-amber-500/30 hover:border-amber-400 shadow-xl shadow-amber-950/20'
            : 'border-rose-900/40 hover:border-rose-500/60 shadow-xl shadow-rose-950/20'
        }`}
      >
        {/* Box Top Lip Depth Simulation */}
        <div
          className={`h-1.5 w-full ${
            isReal
              ? 'bg-gradient-to-r from-amber-600 via-amber-400 to-amber-700'
              : 'bg-gradient-to-r from-rose-700 via-rose-500 to-rose-800'
          }`}
        />

        {/* Box Art Container */}
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-950">
          {!imageError ? (
            <img
              src={game.imageUrl}
              alt={game.name}
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            // Styled CSS Fallback Container with domain SVG icon
            <div
              className="w-full h-full flex flex-col items-center justify-center p-4 text-center"
              style={{
                background: `radial-gradient(circle at 50% 30%, ${
                  isReal ? '#1e293b' : '#271b1b'
                }, #0f172a 80%)`,
              }}
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-lg ${
                  isReal
                    ? 'bg-amber-500/20 border border-amber-400/30 text-amber-300'
                    : 'bg-rose-500/20 border border-rose-400/30 text-rose-300'
                }`}
              >
                {isReal ? <ShieldCheck className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
              </div>
              <h4 className="text-sm font-bold text-white px-2 line-clamp-2">
                {game.name}
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">{game.publisher}</p>
            </div>
          )}

          {/* Dark scrim gradient for legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

          {/* Real vs Fake Seal */}
          <div className="absolute top-2.5 left-2.5 z-10">
            {isReal ? (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 shadow-md backdrop-blur-sm text-[11px] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>REAL · CHÍNH HÃNG</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/90 text-rose-300 border border-rose-500/40 shadow-md backdrop-blur-sm text-[11px] font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>FAKE · REPRINT</span>
              </div>
            )}
          </div>

          {/* Rating Badge */}
          <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/70 border border-white/10 text-amber-300 text-[11px] font-mono font-bold backdrop-blur-sm">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{game.rating.toFixed(1)}</span>
          </div>

          {/* Floating Action: Quick Move Between Cabinets */}
          <div className="absolute bottom-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <button
              onClick={(e) => onToggleCabinet(game, e)}
              className="p-1.5 rounded-md bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-600 shadow-md transition-colors"
              title={isReal ? 'Chuyển sang Tủ Fake' : 'Chuyển sang Tủ Real'}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-amber-300" />
            </button>
            <div className="p-1.5 rounded-md bg-slate-800/90 text-slate-200 border border-slate-600 shadow-md">
              <Eye className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Bottom Title on Image */}
          <div
            className="absolute bottom-2.5 left-2.5 right-12 z-10"
            title={game.name}
          >
            <h3 className="text-sm font-bold text-white drop-shadow-md line-clamp-2 leading-snug">
              {game.name}
            </h3>
            {game.vietnameseName && (
              <p
                className="text-[11px] text-slate-300 truncate drop-shadow mt-0.5"
                title={game.vietnameseName}
              >
                {game.vietnameseName}
              </p>
            )}
          </div>
        </div>

        {/* Card Info Details */}
        <div className="p-3 flex flex-col gap-2 flex-1 justify-between bg-slate-900/70 border-t border-slate-800/60">
          {/* Metadata clean unboxed text with · separators */}
          <div
            className="flex items-center gap-1.5 text-[11px] text-slate-400"
            title={game.category}
          >
            <span className="min-w-0 flex-1 truncate">{game.category}</span>
            <span aria-hidden="true" className="shrink-0">·</span>
            <span className="shrink-0 tabular-nums">{game.year}</span>
          </div>

          {/* Players and Playtime */}
          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>{game.players}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{game.playtime}</span>
            </div>
          </div>

          {/* Condition & Price */}
          <div className="flex items-baseline justify-between gap-2 pt-2 border-t border-slate-800/80">
            <span
              className="text-[11px] text-slate-300 min-w-0 flex-1 truncate"
              title={game.condition}
            >
              {game.condition}
            </span>
            <span className="shrink-0 font-mono font-bold text-xs text-amber-400 tabular-nums whitespace-nowrap">
              {formatVnd(game.price)}
            </span>
          </div>

          {/* Gameplay Lore & Setting Story */}
          {game.gameplayStory && (
            <p className="text-[11px] text-slate-300/90 line-clamp-2 leading-relaxed mt-1 pt-1.5 border-t border-slate-800/60 group-hover:text-amber-200 transition-colors">
              {game.gameplayStory}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
