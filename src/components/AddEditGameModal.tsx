import React, { useState, useEffect } from 'react';
import { BoardGame, CabinetType } from '../types/boardgame';
import { X, ShieldCheck, AlertTriangle, Save, Image, Sparkles } from 'lucide-react';

interface AddEditGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (game: BoardGame) => void;
  editingGame?: BoardGame | null;
  defaultCabinetType?: CabinetType;
}

export const AddEditGameModal: React.FC<AddEditGameModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingGame,
  defaultCabinetType = 'real',
}) => {
  const [name, setName] = useState('');
  const [vietnameseName, setVietnameseName] = useState('');
  const [cabinetType, setCabinetType] = useState<CabinetType>(defaultCabinetType);
  const [status, setStatus] = useState<'On Hand' | 'OOS'>('On Hand');
  const [imageUrl, setImageUrl] = useState('');
  const [players, setPlayers] = useState('2 - 4 người');
  const [minPlayers, setMinPlayers] = useState(2);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [playtime, setPlaytime] = useState('45 phút');
  const [category, setCategory] = useState('Chiến thuật');
  const [price, setPrice] = useState(500000);
  const [publisher, setPublisher] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [condition, setCondition] = useState('Mới 99%');
  const [gameplayStory, setGameplayStory] = useState('');
  const [authenticityNotes, setAuthenticityNotes] = useState('');
  const [rating, setRating] = useState(8.0);

  useEffect(() => {
    if (editingGame) {
      setName(editingGame.name);
      setVietnameseName(editingGame.vietnameseName || '');
      setCabinetType(editingGame.cabinetType);
      setStatus(editingGame.status || 'On Hand');
      setImageUrl(editingGame.imageUrl);
      setPlayers(editingGame.players);
      setMinPlayers(editingGame.minPlayers);
      setMaxPlayers(editingGame.maxPlayers);
      setPlaytime(editingGame.playtime);
      setCategory(editingGame.category);
      setPrice(editingGame.price);
      setPublisher(editingGame.publisher);
      setYear(editingGame.year);
      setCondition(editingGame.condition);
      setGameplayStory(editingGame.gameplayStory || '');
      setAuthenticityNotes(editingGame.authenticityNotes);
      setRating(editingGame.rating);
    } else {
      setName('');
      setVietnameseName('');
      setCabinetType(defaultCabinetType);
      setStatus('On Hand');
      setImageUrl('');
      setPlayers('2 - 4 người');
      setMinPlayers(2);
      setMaxPlayers(4);
      setPlaytime('45 phút');
      setCategory('Chiến thuật');
      setPrice(defaultCabinetType === 'real' ? 850000 : 120000);
      setPublisher('');
      setYear(new Date().getFullYear());
      setCondition(defaultCabinetType === 'real' ? 'Mới nguyên seal' : 'Bản in lỗi');
      setGameplayStory('');
      setAuthenticityNotes(
        defaultCabinetType === 'real'
          ? 'Hộp carton nén dày, dập nổi vân linen, linh kiện chuẩn xịn.'
          : 'Dấu hiệu fake/replica: Hộp carton mỏng, lưng bài lệch màu, token nhẹ không có lõi.'
      );
      setRating(defaultCabinetType === 'real' ? 8.5 : 4.5);
    }
  }, [editingGame, defaultCabinetType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const gameToSave: BoardGame = {
      id: editingGame?.id || `game-${Date.now().toString(36)}`,
      name: name.trim(),
      vietnameseName: vietnameseName.trim() || undefined,
      cabinetType,
      status,
      imageUrl:
        imageUrl.trim() ||
        (cabinetType === 'real'
          ? 'https://upload.wikimedia.org/wikipedia/en/a/a3/Catan-2015-boxart.jpg'
          : 'https://upload.wikimedia.org/wikipedia/en/a/a3/Catan-2015-boxart.jpg'),
      players,
      minPlayers,
      maxPlayers,
      playtime,
      playtimeMinutes: parseInt(playtime, 10) || 45,
      category,
      price: Number(price) || 0,
      publisher: publisher.trim() || (cabinetType === 'real' ? 'Nhà xuất bản chính thức' : 'Chưa rõ nguồn gốc'),
      year: Number(year) || 2023,
      condition,
      gameplayStory: gameplayStory.trim() || `Trò chơi ${name} với lối chơi cuốn hút và trải nghiệm chiến thuật đặc sắc.`,
      authenticityNotes: authenticityNotes.trim(),
      boxColor: cabinetType === 'real' ? '#b45309' : '#991b1b',
      rating: Number(rating) || 8.0,
      addedDate: editingGame?.addedDate || new Date().toISOString().split('T')[0],
    };

    onSave(gameToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-[#11141c] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`p-4 md:px-6 flex items-center justify-between border-b ${
            cabinetType === 'real'
              ? 'bg-gradient-to-r from-amber-950/40 to-slate-900 border-amber-600/30'
              : 'bg-gradient-to-r from-rose-950/40 to-slate-900 border-rose-600/30'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {cabinetType === 'real' ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            )}
            <h3 className="text-base md:text-lg font-bold text-white font-display">
              {editingGame ? 'Chỉnh Sửa Boardgame' : 'Thêm Boardgame Vào Tủ'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Cabinet Type Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200">
              Chọn Tủ Trưng Bày:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCabinetType('real')}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all text-left ${
                  cabinetType === 'real'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/20'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-white">Real Collection</p>
                  <p className="text-[11px] opacity-75">Bản chính hãng có bản quyền</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCabinetType('fake')}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all text-left ${
                  cabinetType === 'fake'
                    ? 'bg-rose-950/60 border-rose-500 text-rose-200 ring-2 ring-rose-500/20'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-white">Replicas & Fake</p>
                  <p className="text-[11px] opacity-75">Bản replica / copy / đối chứng</p>
                </div>
              </button>
            </div>
          </div>

          {/* Status Selection: On Hand vs OOS */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
              <span>Trạng thái kho (Status):</span>
              <span className="text-[10px] text-slate-400 font-normal">Game OOS sẽ tự động xếp ở cuối kệ và làm mờ</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus('On Hand')}
                className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all text-left ${
                  status === 'On Hand'
                    ? 'bg-emerald-950/50 border-emerald-500/70 text-emerald-200 ring-2 ring-emerald-500/20'
                    : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
                <div>
                  <p className="text-xs font-bold text-white">On Hand</p>
                  <p className="text-[10px] text-slate-400">Có sẵn trên kệ trưng bày</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStatus('OOS')}
                className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all text-left ${
                  status === 'OOS'
                    ? 'bg-zinc-800/80 border-zinc-500 text-zinc-200 ring-2 ring-zinc-500/20'
                    : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-white">OOS (Out of Stock)</p>
                  <p className="text-[10px] text-slate-400">Tạm hết / Chưa có mặt (xếp cuối, mờ)</p>
                </div>
              </button>
            </div>
          </div>

          {/* Name & Vietnamese Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                Tên Game Quốc Tế / Gốc: <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Catan, Splendor, Wingspan..."
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                Tên Tiếng Việt (nếu có):
              </label>
              <input
                type="text"
                value={vietnameseName}
                onChange={(e) => setVietnameseName(e.target.value)}
                placeholder="VD: Người Khai Hoang, Thương Nhân..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Image URL */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              Link Ảnh Bìa Board Game (URL):
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/boardgame-cover.jpg"
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
              />
              {imageUrl && (
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-700 shrink-0">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Players, Playtime, Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Số Người Chơi:</label>
              <input
                type="text"
                value={players}
                onChange={(e) => setPlayers(e.target.value)}
                placeholder="VD: 3 - 4 người"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Thời Gian Chơi:</label>
              <input
                type="text"
                value={playtime}
                onChange={(e) => setPlaytime(e.target.value)}
                placeholder="VD: 60 - 90 phút"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Thể Loại:</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Chiến thuật, Party, Bluffing..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Price, Publisher, Year */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                Giá Tiền (VND):
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                step="10000"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Nhà Phát Hành:</label>
              <input
                type="text"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="KOSMOS, Space Cowboys, Xưởng in..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Năm Phát Hành:</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Condition & Rating */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Tình Trạng Hộp:</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="Mới nguyên seal">Mới nguyên seal</option>
                <option value="99% Likenew">99% Likenew</option>
                <option value="Đã chơi vài lần">Đã chơi vài lần</option>
                <option value="Hộp cũ xước">Hộp cũ xước</option>
                <option value="Bản in lỗi">Bản in lỗi (Fake)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                Đánh Giá (1 - 10★):
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="10"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Gameplay Lore & Story */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
              <span>Bối Cảnh & Lối Chơi Game (Gameplay & Lore):</span>
              <span className="text-[10px] text-amber-400">Hiển thị dưới thẻ game trên kệ</span>
            </label>
            <textarea
              rows={2}
              value={gameplayStory}
              onChange={(e) => setGameplayStory(e.target.value)}
              placeholder="VD: Khai phá hòn đảo Catan, giao thương gỗ lúa gạch để xây dựng thuộc địa phồn vinh..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Authenticity Notes */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              {cabinetType === 'real'
                ? 'Đặc Điểm Kiểm Định Chính Hãng (Dập vân, lõi đen, linh kiện cao cấp...):'
                : 'Dấu Hiệu Fake / Lỗi Nhận Biết (Màu in nhợt nhạt, hộp mỏng, thẻ trơn...):'}
            </label>
            <textarea
              rows={2}
              value={authenticityNotes}
              onChange={(e) => setAuthenticityNotes(e.target.value)}
              placeholder="Ghi chú chi tiết để phân biệt với bản còn lại..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-md transition-all flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{editingGame ? 'Cập Nhật Game' : 'Lưu Vào Tủ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
