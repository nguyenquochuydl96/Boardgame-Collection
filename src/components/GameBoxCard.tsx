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

  // Spine View (standing upright side-by-side on shelf like books)
  if (viewMode === 'spine') {
    const spineWidthClass =
      game.spineWidth === 'wide'
        ? 'w-16 md:w-20'
        : game.spineWidth === 'narrow'
        ? 'w-11 md:w-13'
        : 'w-14 md:w-16';

    const baseColor = game.boxColor || (isReal ? '#1e3a8a' : '#881337');

    return (
      <div
        onClick={() => onSelect(game)}
        className={`group relative cursor-pointer select-none game-spine-3d shrink-0 transition-transform duration-300 ease-out hover:-translate-y-3 hover:z-30 ${
          isOOS ? 'opacity-50 grayscale contrast-80 hover:opacity-100 hover:grayscale-0 hover:contrast-100' : ''
        }`}
        title={`${game.name} ${isExpansion ? '[Expansion]' : ''} ${isOOS ? '(Out of Stock)' : ''} - Click to inspect`}
      >
        <div
          className={`${spineWidthClass} h-64 md:h-72 rounded-sm flex flex-col justify-between p-1.5 md:p-2 shadow-2xl relative overflow-hidden transition-all duration-300 border-t border-r border-white/20`}
          style={{
            backgroundColor: baseColor,
            borderLeft: `4px solid ${isReal ? '#fbbf24' : '#f43f5e'}`,
            boxShadow: 'inset 2px 0 5px rgba(255,255,255,0.25), inset -3px 0 6px rgba(0,0,0,0.6), 0 10px 25px rgba(0,0,0,0.7)',
          }}
        >
          {/* Custom Spine Image if provided, else subtle brand gradient */}
          {game.spineImageUrl ? (
            <img
              src={game.spineImageUrl}
              alt={game.name}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none"
            />
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/60 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/75 pointer-events-none" />
            </>
          )}

          {/* Top Spine Header: Icon & Classification */}
          <div className="relative z-10 flex flex-col items-center gap-0.5">
            <div
              className={`p-1 rounded-full shadow-md ${
                isReal ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40' : 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
              }`}
            >
              {isReal ? (
                <ShieldCheck className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
            </div>
            <span
              className={`text-[8px] md:text-[9px] uppercase font-mono font-extrabold tracking-wider px-1 py-0.2 rounded mt-0.5 shadow-sm ${
                isReal ? 'bg-amber-950/90 text-amber-300 border border-amber-500/30' : 'bg-rose-950/90 text-rose-300 border border-rose-500/30'
              }`}
            >
              {isReal ? 'REAL' : 'FAKE'}
            </span>

            {isExpansion && (
              <span className="px-1 py-0.2 rounded bg-purple-950/95 text-purple-300 border border-purple-500/60 font-bold text-[7px] tracking-wider leading-none shadow">
                EXP
              </span>
            )}

            {isOOS && (
              <span className="px-1 py-0.2 rounded bg-black/90 text-rose-400 border border-rose-500/80 font-mono font-extrabold text-[7px] tracking-wider uppercase shadow mt-0.5">
                OOS
              </span>
            )}
          </div>

          {/* Spine Title (Vertical writing) */}
          {!game.spineImageUrl && (
            <div className="relative z-10 flex-1 flex items-center justify-center my-2 w-full overflow-hidden px-0.5">
              <span
                className="font-display font-black tracking-wide text-white leading-tight max-h-full overflow-hidden text-center text-xs md:text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                style={{
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed',
                  textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.7)',
                }}
                title={game.name}
              >
                {game.name}
              </span>
            </div>
          )}

          {/* Bottom Spine Footer: BGG Rating & Publisher */}
          <div className="relative z-10 flex flex-col items-center gap-0.5 pt-1.5 border-t border-white/20 mt-auto">
            <div
              className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-black/85 border border-amber-500/40 text-amber-300 font-mono font-bold text-[9px] md:text-[10px] shadow"
              title={`BGG Rating: ${(game.bggRating || game.rating).toFixed(1)}/10`}
            >
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              <span>{(game.bggRating || game.rating).toFixed(1)}</span>
            </div>
            {!game.spineImageUrl && (
              <span className="truncate max-w-[50px] text-[8px] font-medium text-slate-300 opacity-80" title={game.publisher}>
                {game.publisher}
              </span>
            )}
          </div>
        </div>

        {/* Hover quick card tooltip with FRONT BOX ART */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:flex flex-col z-50 w-72 p-3 bg-slate-900/98 border border-amber-500/40 rounded-xl shadow-2xl text-left pointer-events-none backdrop-blur-md animate-fade-in">
          <div className="w-full aspect-[4/5] rounded-lg overflow-hidden bg-slate-950 mb-2 border border-slate-700/80 shadow-inner flex items-center justify-center">
            <img
              src={displayImage}
              alt={game.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-top"
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

  // 3D Front Box Art Card
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

        {/* Box Art Container - 4:5 Vertical Aspect Ratio for Retail Box Covers */}
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-slate-950 flex items-center justify-center">
          <img
            src={displayImage}
            alt={game.name}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
          {/* Subtle bottom scrim gradient for title legibility while keeping box art vibrant */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/25 to-transparent opacity-70 group-hover:opacity-40 transition-opacity pointer-events-none" />

          {/* Real Collection vs Replicas & Fake Seal + Type + OOS Tag */}
          <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start">
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
          <div className="absolute top-2.5 right-2.5 z-10 flex flex-col items-end gap-1">
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
          <div className="absolute bottom-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
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
            className="absolute bottom-2.5 left-2.5 right-12 z-10"
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
