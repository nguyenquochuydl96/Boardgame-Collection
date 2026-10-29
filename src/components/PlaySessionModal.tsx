import React, { useState, useEffect } from 'react';
import { BoardGame, PlaySession, PlayerScore } from '../types/boardgame';
import {
  X,
  Trophy,
  Users,
  Clock,
  Calendar,
  MapPin,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Crown,
  Sparkles,
  Check,
} from 'lucide-react';

interface PlaySessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  games: BoardGame[];
  onSaveSession: (session: PlaySession) => void;
  preSelectedGame?: BoardGame | null;
}

export const PlaySessionModal: React.FC<PlaySessionModalProps> = ({
  isOpen,
  onClose,
  games,
  onSaveSession,
  preSelectedGame,
}) => {
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [location, setLocation] = useState<string>('Nhà');
  const [notes, setNotes] = useState<string>('');

  // Live Stopwatch
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Player roster
  const [players, setPlayers] = useState<PlayerScore[]>([
    { playerId: 'p1', playerName: 'Huy', score: 0, isWinner: true, roleOrFaction: '' },
    { playerId: 'p2', playerName: 'Bạn chơi 2', score: 0, isWinner: false, roleOrFaction: '' },
  ]);

  // Synchronize preSelectedGame
  useEffect(() => {
    if (preSelectedGame) {
      setSelectedGameId(preSelectedGame.id);
    } else if (games.length > 0 && !selectedGameId) {
      setSelectedGameId(games[0].id);
    }
  }, [preSelectedGame, games]);

  // Stopwatch interval
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Sync stopwatch to minutes
  const handleApplyTimer = () => {
    const mins = Math.max(1, Math.round(timerSeconds / 60));
    setDurationMinutes(mins);
    setIsTimerRunning(false);
  };

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAddPlayer = () => {
    const newId = `p-${Date.now()}-${Math.floor(Math.random() * 100)}`;
    setPlayers((prev) => [
      ...prev,
      {
        playerId: newId,
        playerName: `Người chơi ${prev.length + 1}`,
        score: 0,
        isWinner: false,
        roleOrFaction: '',
      },
    ]);
  };

  const handleRemovePlayer = (id: string) => {
    if (players.length <= 1) return;
    setPlayers((prev) => prev.filter((p) => p.playerId !== id));
  };

  const handleUpdatePlayer = (id: string, updates: Partial<PlayerScore>) => {
    setPlayers((prev) =>
      prev.map((p) => (p.playerId === id ? { ...p, ...updates } : p))
    );
  };

  const handleToggleWinner = (id: string) => {
    setPlayers((prev) =>
      prev.map((p) => (p.playerId === id ? { ...p, isWinner: !p.isWinner } : p))
    );
  };

  const handleAutoWinner = () => {
    if (players.length === 0) return;
    const maxScore = Math.max(...players.map((p) => p.score));
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        isWinner: p.score === maxScore && maxScore > 0,
      }))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const game = games.find((g) => g.id === selectedGameId);
    if (!game) return;

    const newSession: PlaySession = {
      id: `play-${Date.now()}`,
      gameId: game.id,
      gameName: game.name,
      gameImageUrl: game.imageUrl,
      date,
      durationMinutes,
      location,
      notes,
      players,
      createdAt: new Date().toISOString(),
    };

    onSaveSession(newSession);
    onClose();
  };

  if (!isOpen) return null;

  const currentGame = games.find((g) => g.id === selectedGameId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#091D33] border border-[#1E3F66] rounded-3xl shadow-2xl flex flex-col overflow-hidden my-auto animate-scale-in max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#163558] bg-[#071628]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF6B00]/15 border border-[#FF6B00]/30 flex items-center justify-center text-[#FF6B00]">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white font-display">
                Ghi Nhận Ván Chơi Mới
              </h3>
              <p className="text-xs text-[#8EADC8]">
                Lưu lại kết quả, người chiến thắng và thời gian ván đấu
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[#0E2642] hover:bg-[#16385F] text-[#8EADC8] hover:text-white flex items-center justify-center transition-colors border border-[#1A3F69]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* 1. Chọn Game */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white uppercase tracking-wider block">
              Tựa Game Đã Chơi:
            </label>
            <div className="flex items-center gap-3 bg-[#0C223A] border border-[#163558] rounded-2xl p-2.5">
              {currentGame && (
                <img
                  src={currentGame.imageUrl}
                  alt={currentGame.name}
                  className="w-11 h-11 rounded-xl object-cover shrink-0 border border-[#1A3F69]"
                />
              )}
              <select
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                className="w-full bg-transparent text-white font-bold text-sm outline-none cursor-pointer"
              >
                {games.map((g) => (
                  <option key={g.id} value={g.id} className="bg-[#091D33] text-white">
                    {g.name} {g.vietnameseName ? `(${g.vietnameseName})` : ''} [{g.cabinetType === 'real' ? 'Real' : 'Fake'}]
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Ngày Chơi & Địa Điểm */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#FF6B00]" />
                <span>Ngày Chơi:</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#0C223A] border border-[#163558] focus:border-[#FF6B00] rounded-xl px-3 py-2.5 text-white outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#FF6B00]" />
                <span>Địa Điểm / Dịp:</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ví dụ: Nhà, Quán Cafe, CLB..."
                className="w-full bg-[#0C223A] border border-[#163558] focus:border-[#FF6B00] rounded-xl px-3 py-2.5 text-white outline-none"
              />
            </div>
          </div>

          {/* 3. Thời Lượng & Live Stopwatch */}
          <div className="p-3.5 rounded-2xl bg-[#08182B] border border-[#163558] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#FF6B00]" />
                <span>Thời Lượng Ván Đấu:</span>
              </label>

              {/* Stopwatch Controls */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#FF6B00] bg-[#0E2642] px-2.5 py-1 rounded-lg border border-[#1A3F69]">
                  ⏱ {formatTimer(timerSeconds)}
                </span>
                <button
                  type="button"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`p-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all ${
                    isTimerRunning
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-[#122A47] text-[#8EADC8] hover:text-white'
                  }`}
                  title={isTimerRunning ? 'Tạm dừng' : 'Bắt đầu bấm giờ'}
                >
                  {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{isTimerRunning ? 'Dừng' : 'Bấm giờ'}</span>
                </button>
                {timerSeconds > 0 && (
                  <button
                    type="button"
                    onClick={handleApplyTimer}
                    className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all text-[11px] font-bold"
                    title="Gán thời gian này vào ván đấu"
                  >
                    Gán phút
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimerSeconds(0);
                  }}
                  className="p-1.5 rounded-lg bg-[#0E2642] text-[#8EADC8] hover:text-white transition-all"
                  title="Đặt lại đồng hồ"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="1440"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                className="w-24 bg-[#0C223A] border border-[#163558] focus:border-[#FF6B00] rounded-xl px-3 py-2 text-white font-mono font-bold text-center outline-none"
              />
              <span className="text-xs text-[#8EADC8]">phút</span>

              {/* Quick minute chips */}
              <div className="flex items-center gap-1.5 ml-auto">
                {[30, 45, 60, 90, 120].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDurationMinutes(m)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      durationMinutes === m
                        ? 'bg-[#FF6B00] text-white'
                        : 'bg-[#0C223A] text-[#8EADC8] hover:text-white'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Danh Sách Người Chơi & Điểm Số */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#FF6B00]" />
                <span>Danh Sách Người Chơi ({players.length}):</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoWinner}
                  className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20 transition-all"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Tự động chọn điểm cao nhất</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddPlayer}
                  className="text-[11px] font-bold text-[#FF6B00] hover:text-white flex items-center gap-1 bg-[#FF6B00]/15 hover:bg-[#FF6B00] px-2.5 py-1 rounded-lg border border-[#FF6B00]/30 transition-all"
                >
                  <Plus className="w-3 h-3" />
                  <span>Thêm người</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {players.map((player, idx) => (
                <div
                  key={player.playerId}
                  className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 ${
                    player.isWinner
                      ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                      : 'bg-[#0C223A] border-[#163558]'
                  }`}
                >
                  {/* Left: Player Name & Role */}
                  <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1">
                    <span className="w-6 h-6 rounded-lg bg-[#0E2642] text-[#8EADC8] font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={player.playerName}
                      onChange={(e) => handleUpdatePlayer(player.playerId, { playerName: e.target.value })}
                      placeholder="Tên người chơi"
                      className="bg-[#091D33] border border-[#142C48] focus:border-[#FF6B00] rounded-xl px-2.5 py-1.5 text-white font-semibold text-xs outline-none w-32 sm:w-36"
                      required
                    />
                    <input
                      type="text"
                      value={player.roleOrFaction || ''}
                      onChange={(e) => handleUpdatePlayer(player.playerId, { roleOrFaction: e.target.value })}
                      placeholder="Phe / Vai trò (tùy chọn)"
                      className="bg-[#091D33] border border-[#142C48] focus:border-[#FF6B00] rounded-xl px-2.5 py-1.5 text-[#8EADC8] text-xs outline-none flex-1"
                    />
                  </div>

                  {/* Right: Score, Winner Toggle, Delete */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-[#8EADC8]">Điểm:</span>
                      <input
                        type="number"
                        value={player.score}
                        onChange={(e) => handleUpdatePlayer(player.playerId, { score: parseFloat(e.target.value) || 0 })}
                        className="w-16 bg-[#091D33] border border-[#142C48] focus:border-[#FF6B00] rounded-xl px-2 py-1.5 text-white font-mono font-bold text-center text-xs outline-none"
                      />
                    </div>

                    {/* Winner Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleWinner(player.playerId)}
                      className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1 transition-all ${
                        player.isWinner
                          ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                          : 'bg-[#0E2642] text-[#8EADC8] hover:text-amber-400 border border-[#1A3F69]'
                      }`}
                    >
                      <Crown className={`w-3.5 h-3.5 ${player.isWinner ? 'fill-slate-950' : ''}`} />
                      <span>{player.isWinner ? 'Thắng 👑' : 'Thắng?'}</span>
                    </button>

                    {players.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePlayer(player.playerId)}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-all"
                        title="Xóa người chơi này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Ghi Chú Kỷ Niệm */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white uppercase tracking-wider block">
              Ghi Chú Kỷ Niệm Ván Đấu:
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Khoảnh khắc lật kèo kịch tính, chiến thuật đặc sắc, ai đã làm gì đáng nhớ..."
              className="w-full bg-[#0C223A] border border-[#163558] focus:border-[#FF6B00] rounded-2xl p-3 text-white text-xs outline-none resize-none"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#163558]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#0E2642] hover:bg-[#153457] text-[#8EADC8] hover:text-white font-semibold transition-colors border border-[#1A3F69]"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF7A1A] text-white font-bold shadow-lg shadow-[#FF6B00]/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Lưu Ván Chơi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
