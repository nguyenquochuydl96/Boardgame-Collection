import React, { useState } from 'react';
import { BoardGame } from '../types/boardgame';
import { getGenerativeBoardGameBoxArt } from '../services/bggService';
import { ShieldCheck, AlertTriangle, Users, Clock, ArrowLeftRight, Eye, Star, Layers } from 'lucide-react';

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
  const isOOS = game.status === 'OOS';
  const isExpansion = game.gameType === 'Expansion';

  const formatCurrency = (price: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
      .format(price)
      .replace('VND', '₫');
  };

  const displayImage = !imageError && game.imageUrl && game.imageUrl.trim().length > 10
    ? game.imageUrl
    : getGenerativeBoardGameBoxArt(game.name);

  // Modern Board Game Box End Spine View (Standing upright on shelf)
  if (viewMode === 'spine') {
    const spineWidthClass =
      game.spineWidth === 'wide'
        ? 'w-16 md:w-20'
        : game.spineWidth === 'narrow'
        ? 'w-11 md:w-13'
        : 'w-14 md:w-16';

    const baseColor = game.boxColor || (isReal ? '#1e3a8a' : '#881337');

    // Clean player and playtime strings for compact spine footer
    const compactPlayers = game.players
      ? game.players.replace(/\s*players?/gi, 'p').replace(/\s*nguoi/gi, 'p')
      : '2-4p';
    const compactPlaytime = game.playtime
      ? game.playtime.replace(/\s*mins?/gi, 'm').replace(/\s*phut/gi, 'm')
      : '45m';

    return (
      <div
        onClick={() => onSelect(game)}
        className={`group relative cursor-pointer select-none game-spine-3d shrink-0 transition-transform duration-300 ease-out hover:-translate-y-3 hover:z-30 ${
          isOOS ? 'opacity-50 grayscale contrast-80 hover:opacity-100 hover:grayscale-0 hover:contrast-100' : ''
        }`}
        title={`${game.name} ${isExpansion ? '[Expansion]' : ''} ${isOOS ? '(Out of Stock)' : ''} - Click to inspect`}
      >
        <div
          className={`${spineWidthClass} h-64 md:h-72 rounded-[3px] flex flex-col justify-between p-1.5 md:p-2 shadow-2xl relative overflow-hidden transition-all duration-300 border-t border-r border-white/25`}
          style={{
            background: `linear-gradient(180deg, ${baseColor} 0%, rgba(0,0,0,0.6) 100%)`,
            backgroundColor: baseColor,
            borderLeft: `4px solid ${isReal ? '#fbbf24' : '#f43f5e'}`,
            boxShadow: 'inset 2px 0 4px rgba(255,255,255,0.22), inset -3px 0 6px rgba(0,0,0,0.65), 0 12px 28px rgba(0,0,0,0.85)',
          }}
        >
          {/* Subtle cardboard sheen overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-black/50 pointer-events-none" />

          {/* Two-piece telescoping box lid seam line */}
          <div className="absolute bottom-12 left-0 right-0 h-[2px] bg-black/60 border-b border-white/15 pointer-events-none z-10" />

          {/* Top Spine Header: Classification Badge & Year */}
          <div className="relative z-10 flex flex-col items-center gap-0.5">
            <span
              className={`text-[8px] md:text-[9px] uppercase font-mono font-black tracking-widest px-1.5 py-0.5 rounded shadow-sm border ${
                isReal ? 'bg-amber-950/95 text-amber-300 border-amber-500/50' : 'bg-rose-950/95 text-rose-300 border-rose-500/50'
              }`}
            >
              {isReal ? 'REAL' : 'FAKE'}
            </span>
            <span className="text-[8px] md:text-[9px] font-mono font-bold text-white/80 drop-shadow-sm">
              {game.year}
            </span>

            {isExpansion && (
              <span className="px-1 py-0.2 rounded bg-purple-950/95 text-purple-300 border border-purple-500/60 font-black text-[7px] tracking-wider leading-none shadow mt-0.5">
                EXP
              </span>
            )}

            {isOOS && (
              <span className="px-1 py-0.2 rounded bg-black/90 text-rose-400 border border-rose-500/80 font-mono font-black text-[7px] tracking-wider uppercase shadow mt-0.5">
                OOS
              </span>
            )}
          </div>

          {/* Vertical Modern Board Game Title (Clean, High-Contrast, Bold Sans) */}
          <div className="relative z-10 flex-1 flex items-center justify-center my-2 w-full overflow-hidden px-0.5">
            <span
              className="font-sans font-black tracking-wider text-white text-xs md:text-sm uppercase text-center leading-none max-h-full overflow-hidden drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]"
              style={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                textShadow: '0 1px 3px rgba(0,0,0,0.95), 0 2px 8px rgba(0,0,0,0.85)',
              }}
              title={game.name}
            >
              {game.name}
            </span>
          </div>

          {/* Bottom Spine Footer: BGG Rating, Players/Time & Publisher */}
          <div className="relative z-10 flex flex-col items-center gap-1 pt-1.5 border-t border-white/20 mt-auto">
            <div
              className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-black/85 border border-amber-500/40 text-amber-300 font-mono font-black text-[9px] md:text-[10px] shadow"
              title={`BGG Rating: ${(game.bggRating || game.rating).toFixed(1)}/10`}
            >
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              <span>{(game.bggRating || game.rating).toFixed(1)}</span>
            </div>
            <span className="text-[8px] font-bold text-white/90 tracking-tight whitespace-nowrap">
              {compactPlayers} · {compactPlaytime}
            </span>
            <span
              className="truncate max-w-[55px] text-[8px] font-black uppercase text-amber-400/90 tracking-wider text-center"
              title={game.publisher}
            >
              {game.publisher}
            </span>
          </div>
        </div>

        {/* Hover quick card tooltip with FULL UN-CROPPED FRONT BOX ART */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:flex flex-col z-50 w-72 p-3 bg-slate-900/98 border border-amber-500/40 rounded-xl shadow-2xl text-left pointer-events-none backdrop-blur-md animate-fade-in">
          <div className="relative w-full aspect-[4/5] rounded-lg overflow-hidden bg-slate-950 mb-2 border border-slate-700/80 shadow-inner flex items-center justify-center p-2">
            <img
              src={displayImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover blur-xl opacity-35 scale-125"
            />
            <img
              src={displayImage}
              alt={game.name}
              referrerPolicy="no-referrer"
              className="relative z-10 max-h-full max-w-full object-contain rounded-sm shadow-xl"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-white truncate">{game.name}</p>
            {isOOS ? (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-500/40">
                OOS
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                On Hand
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
            <span>{game.publisher} · {game.year}</span>
            <span>·</span>
            <span className="text-amber-300 font-bold font-mono">★ {(game.bggRating || game.rating).toFixed(1)} BGG</span>
          </div>
          {game.gameplayStory && (
            <p className="text-[10px] text-slate-300 line-clamp-2 mt-1.5 leading-snug">
              {game.gameplayStory}
            </p>
          )}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800 text-[11px]">
            <span className="text-slate-300">{game.players} · {game.playtime}</span>
            <span className="font-bold text-amber-400 font-mono tabular-nums">
              {formatCurrency(game.price)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 3D Front Box Art Card - Full Uncropped Box Art Showcase
  return (
    <div
      onClick={() => onSelect(game)}
      className={`group relative cursor-pointer perspective-1000 flex flex-col h-full ${
        isOOS ? 'opacity-55 grayscale contrast-90 hover:opacity-90 hover:grayscale-0 hover:contrast-100 transition-all duration-300' : ''
      }`}
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

        {/* Box Art Container - Layered Uncropped Presentation (Full Retail Box Cover Visible) */}
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-slate-950 flex items-center justify-center p-2.5">
          {/* Ambient blurred backdrop image filling the card container seamlessly */}
          <img
            src={displayImage}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover blur-xl opacity-35 scale-125 pointer-events-none"
          />
          <div className="absolute inset-0 bg-slate-950/40 pointer-events-none" />

          {/* Foreground: 100% Uncropped Retail Box Cover (No edge cropping for landscape/square boxes) */}
          <img
            src={displayImage}
            alt={game.name}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="relative z-10 max-h-full max-w-full object-contain rounded-sm shadow-[0_12px_24px_rgba(0,0,0,0.85)] border border-white/10 transition-transform duration-500 group-hover:scale-105"
          />

          {/* Subtle bottom scrim gradient for title legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-transparent to-transparent opacity-80 pointer-events-none z-10" />

          {/* Real Collection vs Replicas & Fake Seal + Type + OOS Tag */}
          <div className="absolute top-2.5 left-2.5 z-20 flex flex-col gap-1 items-start">
            {isReal ? (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 shadow-md backdrop-blur-sm text-[10px] font-bold tracking-wide">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>REAL COLLECTION</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/90 text-rose-300 border border-rose-500/40 shadow-md backdrop-blur-sm text-[10px] font-bold tracking-wide">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>REPLICAS & FAKE</span>
              </div>
            )}
            {isExpansion ? (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-950/90 text-purple-300 border border-purple-500/40 shadow-md backdrop-blur-sm text-[9px] font-bold tracking-wide">
                <Layers className="w-3 h-3 text-purple-400" />
                <span>EXPANSION</span>
              </div>
            ) : (
              <div className="inline-flex items-center px-1.5 py-0.2 rounded bg-slate-900/80 text-slate-300 border border-slate-700/60 text-[8px] font-semibold tracking-wide">
                BASE GAME
              </div>
            )}
            {isOOS && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/90 text-rose-300 border border-rose-500/70 shadow-lg text-[10px] font-mono font-bold tracking-wider uppercase backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span>OUT OF STOCK</span>
              </div>
            )}
          </div>

          {/* BGG Rating Badge */}
          <div className="absolute top-2.5 right-2.5 z-20 flex flex-col items-end gap-1">
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/85 border border-amber-500/40 text-amber-300 text-[11px] font-mono font-bold backdrop-blur-sm shadow-md"
              title={`Official BGG Rating: ${(game.bggRating || game.rating).toFixed(1)}/10`}
            >
              <span className="text-[8px] font-extrabold text-amber-400 bg-amber-950/80 px-1 py-0.2 rounded uppercase tracking-wider border border-amber-500/30">
                BGG
              </span>
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{(game.bggRating || game.rating).toFixed(1)}</span>
            </div>
            {!isReal && game.bggRating && game.rating !== game.bggRating && (
              <div
                className="px-1.5 py-0.5 rounded bg-rose-950/90 text-rose-300 border border-rose-600/50 text-[9px] font-mono font-bold shadow-sm"
                title="Counterfeit Quality Score"
              >
                Fake: {game.rating.toFixed(1)}★
              </div>
            )}
          </div>

          {/* Quick Action: Move Between Cabinets */}
          <div className="absolute bottom-2.5 right-2.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <button
              onClick={(e) => onToggleCabinet(game, e)}
              className="p-1.5 rounded-md bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-600 shadow-md transition-colors"
              title={isReal ? 'Move to Counterfeits Cabinet' : 'Move to Authentic Cabinet'}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-amber-300" />
            </button>
            <div className="p-1.5 rounded-md bg-slate-800/90 text-slate-200 border border-slate-600 shadow-md">
              <Eye className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Bottom Title on Image */}
          <div
            className="absolute bottom-2.5 left-2.5 right-12 z-20"
            title={game.name}
          >
            <h3 className="text-sm font-bold text-white drop-shadow-md line-clamp-2 leading-snug">
              {game.name}
            </h3>
          </div>
        </div>

        {/* Card Info Details */}
        <div className="p-3 flex flex-col gap-2 flex-1 justify-between bg-slate-900/70 border-t border-slate-800/60">
          <div
            className="flex items-center gap-1.5 text-[11px] text-slate-400"
            title={game.category}
          >
            <span className="min-w-0 flex-1 truncate">{game.category}</span>
            <span aria-hidden="true" className="shrink-0">·</span>
            <span className="shrink-0 tabular-nums">{game.year}</span>
          </div>

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

          {/* Condition & Price & Status */}
          <div className="flex items-baseline justify-between gap-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span
                className="text-[11px] text-slate-300 truncate"
                title={game.condition}
              >
                {game.condition}
              </span>
              {isOOS ? (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-950/80 text-rose-400 border border-rose-800/60 shrink-0">
                  OOS
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 shrink-0">
                  On Hand
                </span>
              )}
            </div>
            <span className="shrink-0 font-mono font-bold text-xs text-amber-400 tabular-nums whitespace-nowrap">
              {formatCurrency(game.price)}
            </span>
          </div>

          {/* Gameplay Lore & Strategic Overview */}
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
