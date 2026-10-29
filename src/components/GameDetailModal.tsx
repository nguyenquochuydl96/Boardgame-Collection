import React, { useState } from 'react';
import { BoardGame } from '../types/boardgame';
import { getGameSleeveSpecs, getGameUpgrades } from '../utils/sleeveCatalog';
import { getGenerativeBoardGameBoxArt } from '../services/bggService';
import { resolveImageUrl } from '../utils/imageUrl';
import {
  X,
  Trophy,
  Shield,
  Box,
  ShieldCheck,
  AlertTriangle,
  Users,
  Clock,
  DollarSign,
  Calendar,
  Star,
  ExternalLink,
  Edit2,
  Trash2,
  ArrowLeftRight,
  BookOpen,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface GameDetailModalProps {
  game: BoardGame | null;
  onClose: () => void;
  onToggleCabinet: (game: BoardGame, e: React.MouseEvent) => void;
  onEdit: (game: BoardGame) => void;
  onDelete: (gameId: string) => void;
  onLogPlay?: (game: BoardGame) => void;
  onOpenSleeveManager?: () => void;
}

export const GameDetailModal: React.FC<GameDetailModalProps> = ({
  game,
  onClose,
  onToggleCabinet,
  onEdit,
  onDelete,
  onLogPlay,
  onOpenSleeveManager,
}) => {
  const [imageError, setImageError] = useState(false);

  if (!game) return null;

  const isReal = game.cabinetType === 'real';

  const formatCurrency = (price: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
      .format(price)
      .replace('VND', '₫');
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to remove "${game.name}" from your collection?`)) {
      onDelete(game.id);
      onClose();
    }
  };

  const rawModalImage = !imageError && game.imageUrl && game.imageUrl.trim().length > 10
    ? game.imageUrl
    : getGenerativeBoardGameBoxArt(game.name);
  const modalImage = resolveImageUrl(rawModalImage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between p-4 md:px-6 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {isReal ? (
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <ShieldCheck className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
                <AlertTriangle className="w-5 h-5" />
              </div>
            )}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {isReal ? 'REAL COLLECTION · AUTHENTIC' : 'REPLICAS & FAKE · COUNTERFEIT'}
              </span>
              <h3 className="text-base md:text-lg font-bold text-white font-display truncate max-w-md">
                {game.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(game)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Edit Game Details"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 transition-colors"
              title="Delete Game"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Left: 3D Box / Image Showcase - Full Uncropped Retail Box Cover */}
            <div className="flex flex-col items-center">
              <div className="relative w-full max-w-xs aspect-[4/5] rounded-xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-950 group flex items-center justify-center p-3">
                {/* Ambient blurred backdrop */}
                <img
                  src={modalImage}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-35 scale-125 pointer-events-none"
                />
                <div className="absolute inset-0 bg-slate-950/40 pointer-events-none" />

                {/* Foreground 100% full uncropped box art */}
                <img
                  src={modalImage}
                  alt={game.name}
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                  className={`relative z-10 max-h-full max-w-full object-contain rounded-lg shadow-2xl border border-white/10 transition-transform duration-300 group-hover:scale-102 ${
                    game.status === 'OOS' ? 'grayscale opacity-75' : ''
                  }`}
                />

                {/* Box Badges */}
                <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 items-start">
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-bold border backdrop-blur-md ${
                      isReal
                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-950/90 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    {isReal ? 'Real Collection' : 'Replicas & Fake'}
                  </span>
                  {game.gameType === 'Expansion' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-purple-500/50 bg-purple-950/90 text-purple-200 uppercase tracking-wider backdrop-blur-md">
                      Expansion
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider backdrop-blur-md ${
                      game.status === 'OOS'
                        ? 'bg-zinc-900/90 text-zinc-300 border-zinc-600/60'
                        : 'bg-emerald-900/80 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {game.status === 'OOS' ? 'Out of Stock' : 'On Hand'}
                  </span>
                </div>
              </div>

              {/* Action: Switch Cabinet */}
              <button
                onClick={(e) => onToggleCabinet(game, e)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <ArrowLeftRight className="w-4 h-4 text-amber-400" />
                <span>
                  {isReal ? 'Move to Replicas & Fake' : 'Move to Real Collection'}
                </span>
              </button>
            </div>

            {/* Right: Technical Specs & Details */}
            <div className="space-y-4">
              {/* Specs grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>Player Count</span>
                  </div>
                  <p className="text-sm font-semibold text-white">{game.players}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Playing Time</span>
                  </div>
                  <p className="text-sm font-semibold text-white">{game.playtime}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Estimated Valuation</span>
                  </div>
                  <p className="text-sm font-bold text-amber-400 font-mono tabular-nums">
                    {formatCurrency(game.price)}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Release Year</span>
                  </div>
                  <p className="text-sm font-semibold text-white">{game.year}</p>
                </div>
              </div>

              {/* Category & Publisher */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Inventory Status:</span>
                  <span className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                    game.status === 'OOS'
                      ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                      : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {game.status === 'OOS' ? 'Out of Stock' : 'On Hand'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Classification:</span>
                  <span className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                    game.gameType === 'Expansion'
                      ? 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                      : 'bg-blue-950/60 text-blue-300 border border-blue-500/30'
                  }`}>
                    {game.gameType === 'Expansion' ? 'Expansion' : 'Base Game'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Official BGG Rating:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-amber-400 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {(game.bggRating || game.rating).toFixed(1)} / 10
                    </span>
                    {game.bggId && (
                      <a
                        href={`https://boardgamegeek.com/boardgame/${game.bggId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-0.5"
                      >
                        <span>BGG Profile</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Category:</span>
                  <span className="font-semibold text-white">{game.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Publisher:</span>
                  <span className="font-semibold text-slate-200">{game.publisher}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Condition:</span>
                  <span className="font-semibold text-amber-300">{game.condition}</span>
                </div>
                {game.weightGrams && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Box Weight:</span>
                    <span className="font-mono text-slate-200">{game.weightGrams}g</span>
                  </div>
                )}
              </div>

              {/* Card Sleeves & Upgrades Section */}
              {(() => {
                const specs = getGameSleeveSpecs(game);
                const upgrades = getGameUpgrades(game);
                return (
                  <div className="p-3.5 rounded-xl bg-[#091D33] border border-[#163558] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                          Bọc Bài (Sleeves) & Phụ Kiện Nâng Cấp
                        </h4>
                      </div>
                      {onOpenSleeveManager && (
                        <button
                          onClick={onOpenSleeveManager}
                          className="text-[11px] text-[#FF6B00] hover:underline font-semibold"
                        >
                          Mở Tracker →
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {specs.length === 0 ? (
                        <div className="p-2 rounded-lg bg-[#0C223A] border border-[#142C48] w-full text-center">
                          <span className="text-[11px] text-[#8EADC8] italic">Tựa game này không sử dụng thẻ bài (hoặc là phụ kiện gaming).</span>
                        </div>
                      ) : (
                        specs.map((s, idx) => (
                          <div key={idx} className="p-2 rounded-lg bg-[#0C223A] border border-[#142C48] flex-1 min-w-[140px]">
                            <span className="text-[10px] text-[#8EADC8] block">{s.size}</span>
                            <span className="font-bold text-white font-mono">{s.sleevedCount}/{s.cardCount} lá</span>
                            <span className="text-[10px] text-emerald-400 ml-1.5 font-semibold">
                              {s.sleevedCount >= s.cardCount ? '✓ Đã bọc đủ' : 'Cần bọc thêm'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    {upgrades.length > 0 && (
                      <div className="pt-2 border-t border-[#142C48] space-y-1">
                        <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                          Phụ kiện Deluxe đã trang bị:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {upgrades.map((u) => (
                            <span key={u.id} className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-medium flex items-center gap-1">
                              <span>✓</span>
                              <span>{u.name}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Gameplay & Lore Story */}
              {game.gameplayStory && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center gap-2 mb-1.5">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-200">
                      Gameplay Overview & Strategic Setting
                    </h4>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-200">
                    {game.gameplayStory}
                  </p>
                </div>
              )}

              {/* Authenticity Notes */}
              <div
                className={`p-4 rounded-xl border ${
                  isReal
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-rose-950/20 border-rose-500/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {isReal ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                    {isReal ? 'Authentic Verification Checklist' : 'Counterfeit Warning & Flaw Notes'}
                  </h4>
                </div>
                <p className="text-xs leading-relaxed text-slate-300">
                  {game.authenticityNotes || 'No specific authenticity notes recorded.'}
                </p>
              </div>

              {/* Online Rulebook link */}
              {game.rulesUrl && (
                <a
                  href={game.rulesUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Official Publisher Rulebook</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
          {onLogPlay && (
            <button
              onClick={() => {
                onClose();
                onLogPlay(game);
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#FF6B00] to-[#FF8C33] hover:from-[#FF7A1A] hover:to-[#FFA04D] rounded-xl shadow-md shadow-[#FF6B00]/30 transition-all flex items-center gap-1.5"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Ghi Nhận Ván Chơi Này</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
