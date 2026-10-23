import React, { useState } from 'react';
import { BoardGame } from '../types/boardgame';
import { ShieldCheck, AlertTriangle, ArrowRight, CheckCircle2, XCircle, Scale, Sparkles } from 'lucide-react';

interface ComparisonModeProps {
  games: BoardGame[];
  onSelectGame: (game: BoardGame) => void;
}

export const ComparisonMode: React.FC<ComparisonModeProps> = ({ games, onSelectGame }) => {
  const realGames = games.filter((g) => g.cabinetType === 'real');
  const fakeGames = games.filter((g) => g.cabinetType === 'fake');

  // Find linked pairs first or default to first pair
  const defaultReal = realGames.find((g) => g.counterpartId) || realGames[0];
  const defaultFake =
    fakeGames.find((g) => g.id === defaultReal?.counterpartId) ||
    fakeGames.find((g) => g.counterpartId) ||
    fakeGames[0];

  const [selectedRealId, setSelectedRealId] = useState<string>(defaultReal?.id || '');
  const [selectedFakeId, setSelectedFakeId] = useState<string>(defaultFake?.id || '');

  const currentReal = realGames.find((g) => g.id === selectedRealId) || realGames[0];
  const currentFake = fakeGames.find((g) => g.id === selectedFakeId) || fakeGames[0];

  const formatVnd = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const priceDiff = currentReal && currentFake ? currentReal.price - currentFake.price : 0;
  const priceRatio =
    currentReal && currentFake && currentFake.price > 0
      ? (currentReal.price / currentFake.price).toFixed(1)
      : '0';

  // Common inspection checklist criteria
  const inspectionCriteria = [
    {
      title: 'Độ Dày & Cấu Trúc Hộp',
      realDesc:
        currentReal?.authenticityNotes.includes('Hộp') || currentReal?.authenticityNotes.includes('bìa')
          ? currentReal.authenticityNotes
          : 'Hộp carton nén xốp 2.0mm - 2.5mm cứng cáp, bề mặt ép màng mờ hoặc dập nổi nhũ vàng/bạc.',
      fakeDesc:
        currentFake?.authenticityNotes.includes('Hộp') || currentFake?.authenticityNotes.includes('carton')
          ? currentFake.authenticityNotes
          : 'Hộp giấy mềm 1.2mm dễ móp méo góc, màu in ngả tone, không có hiệu ứng dập nổi.',
    },
    {
      title: 'Chất Liệu Thẻ Bài (Cards)',
      realDesc:
        'Giấy chuyên dụng 300 - 320gsm, dập vân sần Linen (vân vải chống trượt khi xào bài) và có lõi đen Black Core chống soi đèn xuyên thấu.',
      fakeDesc:
        'Giấy couche trơn láng rẻ tiền 200 - 230gsm, không có vân linen, không lõi đen nên dễ bị soi thấu quân bài dưới ánh đèn.',
    },
    {
      title: 'Quân Cờ & Linh Kiện (Tokens)',
      realDesc:
        'Gỗ tự nhiên bo cạnh mịn màng hoặc nhựa resin đúc đặc có lõi sắt đầm tay, sơn tĩnh điện an toàn không độc hại.',
      fakeDesc:
        'Nhựa tái chế nhẹ xốp, có bavia sắc nhọn, token rỗng ruột hoặc gỗ vụn dễ tách nứt, sơn có mùi hóa chất nồng.',
    },
    {
      title: 'Sách Hướng Dẫn & Bản Quyền',
      realDesc:
        'Luật chơi in màu đầy đủ trên giấy dày cao cấp, có mã vạch, logo nhà xuất bản, tem bản quyền và thông tin tác giả chuẩn quốc tế.',
      fakeDesc:
        'Sách hướng dẫn photocopy hoặc in đen trắng, dịch thuật lủng củng bằng Google Dịch cũ, không có bản quyền chính thức.',
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-rose-950/40 border border-slate-800 rounded-2xl p-6 text-center shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3">
          <Scale className="w-3.5 h-3.5" />
          <span>CHẾ ĐỘ ĐỐI CHỨNG TRỰC QUAN</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-white font-display">
          So Sánh Điểm Khác Biệt Giữa Game Real & Fake
        </h2>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl mx-auto">
          Đặt cạnh nhau hai phiên bản để nhận diện các chi tiết: chất liệu giấy, vân dập nổi, trọng lượng linh kiện và độ hoàn thiện bản quyền.
        </p>
      </div>

      {/* Selectors Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Real Selector */}
        <div className="bg-[#18120c] border border-amber-600/30 rounded-xl p-4 flex flex-col gap-2">
          <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Chọn Game từ Tủ Real (Chính Hãng):</span>
          </label>
          <select
            value={selectedRealId}
            onChange={(e) => setSelectedRealId(e.target.value)}
            className="w-full bg-slate-900 border border-amber-500/40 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
          >
            {realGames.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({formatVnd(g.price)})
              </option>
            ))}
          </select>
        </div>

        {/* Fake Selector */}
        <div className="bg-[#181416] border border-rose-700/40 rounded-xl p-4 flex flex-col gap-2">
          <label className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Chọn Game từ Tủ Fake (Bản Nhái/Reprint):</span>
          </label>
          <select
            value={selectedFakeId}
            onChange={(e) => setSelectedFakeId(e.target.value)}
            className="w-full bg-slate-900 border border-rose-500/40 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-400"
          >
            {fakeGames.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({formatVnd(g.price)})
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
                  <span>BẢN CHÍNH HÃNG (REAL)</span>
                </div>
                <span className="font-mono text-sm font-bold text-amber-400">
                  {formatVnd(currentReal.price)}
                </span>
              </div>

              {/* Game Cover & Specs */}
              <div className="flex gap-4 mt-4">
                <img
                  src={currentReal.imageUrl}
                  alt={currentReal.name}
                  referrerPolicy="no-referrer"
                  className="w-28 h-36 object-cover rounded-lg shadow-lg border border-amber-500/30 shrink-0"
                />
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white font-display">
                    {currentReal.name}
                  </h3>
                  <p className="text-xs text-amber-300/80">
                    NXB: {currentReal.publisher} ({currentReal.year})
                  </p>
                  <p className="text-xs text-slate-300">
                    Số người: {currentReal.players} · {currentReal.playtime}
                  </p>
                  <p className="text-xs text-emerald-400 font-semibold">
                    Tình trạng: {currentReal.condition}
                  </p>
                  {currentReal.weightGrams && (
                    <p className="text-xs text-slate-400 font-mono">
                      Khối lượng: {currentReal.weightGrams}g (chuẩn hộp gốc)
                    </p>
                  )}
                </div>
              </div>

              {/* Highlight list */}
              <div className="mt-5 space-y-2.5 pt-4 border-t border-amber-900/40">
                <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                  Đặc điểm hoàn thiện chính hãng:
                </h4>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Hộp carton cứng 2.5mm có dập nổi chống trầy và rách góc.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Thẻ bài dập vân linen, lõi chống soi xuyên thấu khi chơi.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Linh kiện đầm tay, độ hoàn thiện cao, an toàn cho sức khỏe.</span>
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
              Xem Chi Tiết Bản Real
            </button>
          </div>

          {/* RIGHT: FAKE CARD */}
          <div className="rounded-2xl bg-gradient-to-b from-[#1e1416] to-[#120d0f] border-2 border-rose-500/40 p-5 shadow-2xl flex flex-col justify-between">
            <div>
              {/* Badge & Title */}
              <div className="flex items-center justify-between pb-3 border-b border-rose-700/30">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-950 text-rose-300 border border-rose-500/40 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>BẢN REPRINT / FAKE</span>
                </div>
                <span className="font-mono text-sm font-bold text-rose-400">
                  {formatVnd(currentFake.price)}
                </span>
              </div>

              {/* Game Cover & Specs */}
              <div className="flex gap-4 mt-4">
                <img
                  src={currentFake.imageUrl}
                  alt={currentFake.name}
                  referrerPolicy="no-referrer"
                  className="w-28 h-36 object-cover rounded-lg shadow-lg border border-rose-500/30 shrink-0"
                />
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white font-display">
                    {currentFake.name}
                  </h3>
                  <p className="text-xs text-rose-300/80">
                    Xuất xứ: {currentFake.publisher} ({currentFake.year})
                  </p>
                  <p className="text-xs text-slate-300">
                    Số người: {currentFake.players} · {currentFake.playtime}
                  </p>
                  <p className="text-xs text-rose-400 font-semibold">
                    Tình trạng: {currentFake.condition}
                  </p>
                  {currentFake.weightGrams && (
                    <p className="text-xs text-slate-400 font-mono">
                      Khối lượng: {currentFake.weightGrams}g (nhẹ hơn bản thật)
                    </p>
                  )}
                </div>
              </div>

              {/* Flaws list */}
              <div className="mt-5 space-y-2.5 pt-4 border-t border-rose-900/40">
                <h4 className="text-xs font-bold text-rose-200 uppercase tracking-wider">
                  Dấu hiệu lỗi & linh kiện kém:
                </h4>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>Hộp carton mỏng ọp ẹp, mép dán hở keo và xơ sợi.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>Thẻ bài trơn láng, lưng bài lệch màu dễ làm lộ vai trò/chiến thuật.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>Token nhựa nhẹ bẫng hoặc gỗ méo có dăm gai sắc nhọn.</span>
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
              Xem Chi Tiết Bản Fake
            </button>
          </div>
        </div>
      )}

      {/* Price Difference Summary Strip */}
      {currentReal && currentFake && (
        <div className="bg-[#121620] border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              Chênh lệch giá trị & Cảnh báo tiêu dùng
            </p>
            <p className="text-sm font-semibold text-slate-200 mt-0.5">
              Bản chính hãng có giá gấp{' '}
              <span className="text-amber-400 font-bold font-mono">{priceRatio}x</span> lần bản
              fake (chênh lệch{' '}
              <span className="text-amber-400 font-bold font-mono">
                {formatVnd(Math.abs(priceDiff))}
              </span>
              ).
            </p>
          </div>
          <p className="text-xs text-slate-400 max-w-md">
            Lời khuyên: Với các game cần bảo mật bài (như Avalon, Mèo Nổ, Codenames), bài fake lệch màu sẽ làm hỏng hoàn toàn trải nghiệm chơi.
          </p>
        </div>
      )}
    </div>
  );
};
