import React, { useState } from 'react';
import { BoardGame } from '../types/boardgame';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  Users,
  Clock,
  DollarSign,
  Calendar,
  Layers,
  ArrowLeftRight,
  ExternalLink,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  BookOpen,
} from 'lucide-react';

interface GameDetailModalProps {
  game: BoardGame | null;
  onClose: () => void;
  onToggleCabinet: (game: BoardGame, e: React.MouseEvent) => void;
  onEdit: (game: BoardGame) => void;
  onDelete: (id: string) => void;
}

export const GameDetailModal: React.FC<GameDetailModalProps> = ({
  game,
  onClose,
  onToggleCabinet,
  onEdit,
  onDelete,
}) => {
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [imageError, setImageError] = useState(false);

  if (!game) return null;

  const isReal = game.cabinetType === 'real';

  const formatVnd = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const handleDelete = () => {
    if (window.confirm(`Bạn có chắc muốn xóa "${game.name}" khỏi tủ không?`)) {
      onDelete(game.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-3xl bg-[#11141c] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div
          className={`p-4 md:px-6 flex items-center justify-between border-b ${
            isReal
              ? 'bg-gradient-to-r from-amber-950/60 to-slate-900 border-amber-600/30'
              : 'bg-gradient-to-r from-rose-950/60 to-slate-900 border-rose-600/30'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isReal ? (
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
            )}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {isReal ? 'TỦ GAME CHÍNH HÃNG' : 'TỦ GAME REPRINT / FAKE'}
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
              title="Chỉnh sửa thông tin"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 transition-colors"
              title="Xóa game"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Main 2-column Inspection View */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Left: 3D Box / Image Showcase */}
            <div className="flex flex-col items-center">
              <div className="relative w-full max-w-xs aspect-[3/4] rounded-xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-950 group">
                {!imageError ? (
                  <img
                    src={game.imageUrl}
                    alt={game.name}
                    referrerPolicy="no-referrer"
                    onError={() => setImageError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-900">
                    {isReal ? (
                      <ShieldCheck className="w-12 h-12 text-amber-400 mb-2" />
                    ) : (
                      <AlertTriangle className="w-12 h-12 text-rose-400 mb-2" />
                    )}
                    <span className="text-sm font-bold text-white">{game.name}</span>
                    <span className="text-xs text-slate-400 mt-1">{game.publisher}</span>
                  </div>
                )}

                {/* Box Badge */}
                <div className="absolute top-3 left-3">
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-bold border backdrop-blur-md ${
                      isReal
                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-950/90 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    {isReal ? 'Chính Hãng (Real)' : 'Bản Nhái (Fake)'}
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
                  {isReal ? 'Chuyển sang Tủ Fake' : 'Chuyển sang Tủ Real'}
                </span>
              </button>
            </div>

            {/* Right: Technical Specs & Details */}
            <div className="space-y-4">
              {/* Essential specs grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>Số người chơi</span>
                  </div>
                  <p className="text-sm font-semibold text-white">{game.players}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Thời gian chơi</span>
                  </div>
                  <p className="text-sm font-semibold text-white">{game.playtime}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Giá trị / Giá mua</span>
                  </div>
                  <p className="text-sm font-bold text-amber-400 font-mono tabular-nums">
                    {formatVnd(game.price)}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Năm phát hành</span>
                  </div>
                  <p className="text-sm font-semibold text-white">{game.year}</p>
                </div>
              </div>

              {/* Category & Publisher */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Thể loại:</span>
                  <span className="font-semibold text-white">{game.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Nhà phát hành:</span>
                  <span className="font-semibold text-slate-200">{game.publisher}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Tình trạng:</span>
                  <span className="font-semibold text-amber-300">{game.condition}</span>
                </div>
                {game.weightGrams && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Trọng lượng hộp:</span>
                    <span className="font-mono text-slate-200">{game.weightGrams}g</span>
                  </div>
                )}
              </div>

              {/* Gameplay & Lore Story */}
              {game.gameplayStory && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center gap-2 mb-1.5">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-200">
                      Bối Cảnh & Lối Chơi (Gameplay & Lore)
                    </h4>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-200">
                    {game.gameplayStory}
                  </p>
                </div>
              )}

              {/* Authenticity Notes / Dấu hiệu nhận biết */}
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
                    {isReal ? 'Dấu Hiệu Chính Hãng (Authentic Traits)' : 'Dấu Hiệu Hàng Fake / Lỗi'}
                  </h4>
                </div>
                <p className="text-xs leading-relaxed text-slate-300">
                  {game.authenticityNotes || 'Chưa có ghi chú nhận diện cho bản này.'}
                </p>
              </div>

              {/* Online Rulebook link if any */}
              {game.rulesUrl && (
                <a
                  href={game.rulesUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Xem sách hướng dẫn luật chơi chính thức</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
