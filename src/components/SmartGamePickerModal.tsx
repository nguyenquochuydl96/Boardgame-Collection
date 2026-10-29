import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BoardGame } from '../types/boardgame';
import {
  X,
  Sparkles,
  Dices,
  Users,
  Clock,
  Compass,
  Flame,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  Trophy,
  ArrowRight,
  CheckCircle2,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface SmartGamePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  games: BoardGame[];
  onSelectGame: (game: BoardGame) => void;
  initialTab?: 'recommend' | 'wheel';
}

export const SmartGamePickerModal: React.FC<SmartGamePickerModalProps> = ({
  isOpen,
  onClose,
  games,
  onSelectGame,
  initialTab = 'recommend',
}) => {
  const [activeTab, setActiveTab] = useState<'recommend' | 'wheel'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [playerCount, setPlayerCount] = useState<number>(4);
  const [availableTime, setAvailableTime] = useState<'any' | 'quick' | 'medium' | 'standard' | 'epic'>('medium');
  const [vibe, setVibe] = useState<'all' | 'competitive' | 'coop' | 'party' | 'engine' | 'gateway'>('all');
  const [cabinetPref, setCabinetPref] = useState<'all' | 'real' | 'fake'>('all');
  const [onlyOnHand, setOnlyOnHand] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Wheel state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<BoardGame | null>(null);
  const [wheelRotation, setWheelRotation] = useState(0);

  // Audio Context for crisp mechanical tick sound
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playTickSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(650 + Math.random() * 150, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {}
  };

  const playWinSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.25);
      });
    } catch {}
  };

  // Filter and Score Candidates
  const scoredGames = useMemo(() => {
    const candidates = games.filter((g) => {
      // 1. On Hand check
      if (onlyOnHand && g.status === 'OOS') return false;

      // 2. Cabinet check
      if (cabinetPref !== 'all' && g.cabinetType !== cabinetPref) return false;

      // 3. Player count compatibility
      if (playerCount < g.minPlayers || playerCount > g.maxPlayers) {
        return false;
      }

      // 4. Time compatibility
      const minutes = g.playtimeMinutes || 45;
      if (availableTime === 'quick' && minutes > 35) return false;
      if (availableTime === 'medium' && (minutes < 25 || minutes > 65)) return false;
      if (availableTime === 'standard' && (minutes < 55 || minutes > 105)) return false;
      if (availableTime === 'epic' && minutes < 90) return false;

      return true;
    });

    // Score candidates based on match affinity
    return candidates
      .map((game) => {
        let score = (game.rating || 7.0) * 8; // Max 80 pts base

        // Player count sweet spot bonus
        if (game.minPlayers === playerCount && game.maxPlayers === playerCount) {
          score += 20; // Dedicated player count (e.g. 7 Wonders Duel for 2 players)
        } else if (playerCount >= game.minPlayers && playerCount <= game.maxPlayers) {
          score += 12;
        }

        // Vibe affinity
        const cat = game.category.toLowerCase();
        const story = (game.gameplayStory || '').toLowerCase();
        if (vibe === 'competitive' && (cat.includes('strategy') || cat.includes('economic') || cat.includes('area control'))) {
          score += 15;
        } else if (vibe === 'coop' && (cat.includes('coop') || cat.includes('cooperative') || story.includes('hợp tác'))) {
          score += 20;
        } else if (vibe === 'party' && (cat.includes('party') || cat.includes('deduction') || cat.includes('bluffing'))) {
          score += 20;
        } else if (vibe === 'engine' && (cat.includes('engine') || cat.includes('deck') || cat.includes('worker') || cat.includes('economic'))) {
          score += 18;
        } else if (vibe === 'gateway' && (game.playtimeMinutes <= 45 || cat.includes('family') || cat.includes('card'))) {
          score += 15;
        }

        // Real collection authenticity bonus
        if (game.cabinetType === 'real') {
          score += 5;
        }

        const matchPercent = Math.min(99, Math.round((score / 125) * 100));

        let matchReason = `Tối ưu cho ${playerCount} người chơi (${game.playtime})`;
        if (game.rating >= 8.0) {
          matchReason = `Siêu phẩm BGG ${game.rating}★ · Tối ưu cho ${playerCount} người (${game.playtime})`;
        } else if (vibe === 'party') {
          matchReason = `Không khí sôi nổi, tương tác cao cho nhóm ${playerCount} người`;
        } else if (vibe === 'coop') {
          matchReason = `Thử thách đồng lòng, vượt qua hiểm nguy cùng nhau`;
        }

        return {
          ...game,
          matchPercent,
          matchReason,
        };
      })
      .sort((a, b) => b.matchPercent - a.matchPercent);
  }, [games, playerCount, availableTime, vibe, cabinetPref, onlyOnHand]);

  const topRecommendations = useMemo(() => {
    return scoredGames.slice(0, 3);
  }, [scoredGames]);

  // Games pool for the lucky wheel (up to 12 items to keep slices readable)
  const wheelGames = useMemo(() => {
    if (scoredGames.length > 0) {
      return scoredGames.slice(0, Math.min(12, scoredGames.length));
    }
    // Fallback to top rated on hand games if filters too restrictive
    return games.filter((g) => g.status !== 'OOS').slice(0, 10);
  }, [scoredGames, games]);

  // Draw Lucky Wheel on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || wheelGames.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 16;
    const totalSlices = wheelGames.length;
    const sliceAngle = (2 * Math.PI) / totalSlices;

    ctx.clearRect(0, 0, width, height);

    // Neon vibrant color palette
    const sliceColors = [
      '#FF6B00', '#10B981', '#3B82F6', '#8B5CF6',
      '#EC4899', '#F59E0B', '#06B6D4', '#14B8A6',
      '#6366F1', '#D946EF', '#F97316', '#22C55E'
    ];

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(wheelRotation);

    // Draw Slices
    for (let i = 0; i < totalSlices; i++) {
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      // Alternating radiant gradients
      const sliceColor = sliceColors[i % sliceColors.length];
      ctx.fillStyle = sliceColor;
      ctx.fill();

      // Border between slices
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#071526';
      ctx.stroke();

      // Text label inside slice
      ctx.save();
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;

      const title = wheelGames[i].name;
      const truncated = title.length > 15 ? title.substring(0, 14) + '…' : title;
      ctx.fillText(truncated, radius - 20, 4);
      ctx.restore();
    }

    // Outer Glow Ring
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#163558';
    ctx.stroke();

    // Center Hub
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, 2 * Math.PI);
    ctx.fillStyle = '#071526';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#FF6B00';
    ctx.stroke();

    // Center Dice Icon / Pip
    ctx.fillStyle = '#FF6B00';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎲', 0, 0);

    ctx.restore();
  }, [wheelGames, wheelRotation]);

  // Handle Wheel Spin
  const spinWheel = () => {
    if (isSpinning || wheelGames.length === 0) return;
    setIsSpinning(true);
    setSelectedWinner(null);

    const fullRotations = 5 + Math.floor(Math.random() * 3); // 5 to 7 full circles
    const totalSlices = wheelGames.length;
    const winningIndex = Math.floor(Math.random() * totalSlices);
    const sliceAngle = (2 * Math.PI) / totalSlices;

    // Pointer is fixed at top: 270 deg or -Math.PI / 2
    // We want slice winningIndex to land under the pointer
    const targetOffset = 1.5 * Math.PI - (winningIndex * sliceAngle + sliceAngle / 2);
    const totalRotation = fullRotations * 2 * Math.PI + targetOffset;

    const startRotation = wheelRotation % (2 * Math.PI);
    const finalRotation = startRotation + totalRotation;
    const duration = 4000;
    const startTime = performance.now();

    let lastTickAngle = startRotation;

    const animateSpin = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic: 1 - pow(1 - progress, 3)
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentRotation = startRotation + (finalRotation - startRotation) * easeProgress;

      setWheelRotation(currentRotation);

      // Trigger sound on each slice crossed
      if (Math.abs(currentRotation - lastTickAngle) >= sliceAngle * 0.8) {
        playTickSound();
        lastTickAngle = currentRotation;
      }

      if (progress < 1) {
        requestAnimationFrame(animateSpin);
      } else {
        setIsSpinning(false);
        const winner = wheelGames[winningIndex];
        setSelectedWinner(winner);
        playWinSound();
      }
    };

    requestAnimationFrame(animateSpin);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[#08182B] border border-[#1B3E68] rounded-3xl shadow-2xl flex flex-col overflow-hidden my-auto animate-scale-in">
        {/* Header Ribbon */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#163558] bg-[#061424]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FF6B00] to-[#FF8C33] flex items-center justify-center text-white shadow-lg shadow-[#FF6B00]/30 border border-[#FFA154]/40">
              <Dices className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white font-display">
                  Hôm Nay Chơi Gì?
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/40">
                  Decision Assistant
                </span>
              </div>
              <p className="text-xs text-[#8EADC8]">
                Trợ lý gợi ý thông minh & Vòng quay may mắn chọn board game hoàn hảo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-[#0E2642] hover:bg-[#153457] text-[#8EADC8] hover:text-white transition-colors border border-[#1A3F69]"
              title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#FF6B00]" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#0E2642] hover:bg-[#153457] text-[#8EADC8] hover:text-white transition-colors border border-[#1A3F69]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dual Tab Mode Switcher */}
        <div className="px-6 pt-3 pb-2 bg-[#061424] border-b border-[#142C48] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-[#0C223A] p-1 rounded-full border border-[#1A3F69]">
            <button
              onClick={() => setActiveTab('recommend')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === 'recommend'
                  ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/30'
                  : 'text-[#8EADC8] hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gợi Ý Thông Minh ({scoredGames.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('wheel')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === 'wheel'
                  ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/30'
                  : 'text-[#8EADC8] hover:text-white'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Vòng Quay May Mắn (Lucky Wheel)</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-[#8EADC8]">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyOnHand}
                onChange={(e) => setOnlyOnHand(e.target.checked)}
                className="rounded accent-[#FF6B00]"
              />
              <span className="font-semibold text-emerald-400">Chỉ chọn game On Hand</span>
            </label>
          </div>
        </div>

        {/* Setup Wizard Form Ribbon */}
        <div className="px-6 py-3.5 bg-[#091D33]/90 border-b border-[#142C48] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* 1. Players */}
          <div className="space-y-1">
            <label className="font-bold text-[#8EADC8] flex items-center gap-1 uppercase tracking-wider text-[10px]">
              <Users className="w-3 h-3 text-[#FF6B00]" />
              <span>Số Người Chơi:</span>
            </label>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <button
                  key={n}
                  onClick={() => setPlayerCount(n)}
                  className={`w-7 h-7 rounded-lg font-bold text-xs shrink-0 transition-all ${
                    playerCount === n
                      ? 'bg-[#FF6B00] text-white shadow-sm'
                      : 'bg-[#0E2642] text-[#8EADC8] hover:text-white hover:bg-[#153457]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Available Time */}
          <div className="space-y-1">
            <label className="font-bold text-[#8EADC8] flex items-center gap-1 uppercase tracking-wider text-[10px]">
              <Clock className="w-3 h-3 text-[#FF6B00]" />
              <span>Thời Gian Rảnh:</span>
            </label>
            <select
              value={availableTime}
              onChange={(e) => setAvailableTime(e.target.value as any)}
              className="w-full bg-[#0E2642] border border-[#163558] focus:border-[#FF6B00] text-white font-medium rounded-lg px-2.5 py-1.5 outline-none text-xs"
            >
              <option value="any">Bất kỳ thời gian</option>
              <option value="quick">Khởi động (&lt; 30 phút)</option>
              <option value="medium">Vừa vặn (30 - 60 phút)</option>
              <option value="standard">Tiêu chuẩn (60 - 90 phút)</option>
              <option value="epic">Chiến trường dài (&gt; 90 phút)</option>
            </select>
          </div>

          {/* 3. Vibe / Mood */}
          <div className="space-y-1">
            <label className="font-bold text-[#8EADC8] flex items-center gap-1 uppercase tracking-wider text-[10px]">
              <Compass className="w-3 h-3 text-[#FF6B00]" />
              <span>Phong Cách / Vibe:</span>
            </label>
            <select
              value={vibe}
              onChange={(e) => setVibe(e.target.value as any)}
              className="w-full bg-[#0E2642] border border-[#163558] focus:border-[#FF6B00] text-white font-medium rounded-lg px-2.5 py-1.5 outline-none text-xs"
            >
              <option value="all">Tất cả phong cách</option>
              <option value="competitive">🔥 Cạnh tranh & Đấu trí</option>
              <option value="coop">🤝 Đồng lòng hợp tác</option>
              <option value="party">😂 Tiệc tùng & Ẩn vai</option>
              <option value="engine">🧠 Xây dựng kinh tế</option>
              <option value="gateway">🎲 Nhẹ nhàng dễ chơi</option>
            </select>
          </div>

          {/* 4. Cabinet Preference */}
          <div className="space-y-1">
            <label className="font-bold text-[#8EADC8] flex items-center gap-1 uppercase tracking-wider text-[10px]">
              <Flame className="w-3 h-3 text-[#FF6B00]" />
              <span>Nguồn Kệ Ưu Tiên:</span>
            </label>
            <select
              value={cabinetPref}
              onChange={(e) => setCabinetPref(e.target.value as any)}
              className="w-full bg-[#0E2642] border border-[#163558] focus:border-[#FF6B00] text-white font-medium rounded-lg px-2.5 py-1.5 outline-none text-xs"
            >
              <option value="all">Cả 2 Kệ (Real & Fake)</option>
              <option value="real">Chỉ Real Collection (100% Genuine)</option>
              <option value="fake">Chỉ Replicas & Fake</option>
            </select>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
          {/* TAB 1: SMART RECOMMENDATIONS */}
          {activeTab === 'recommend' && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white font-display flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <span>Top 3 Đề Xuất Hoàn Hảo Cho Nhóm {playerCount} Người</span>
                  </h3>
                  <p className="text-xs text-[#8EADC8]">
                    Tính toán theo số người chơi, thời lượng ván đấu và điểm đánh giá BGG
                  </p>
                </div>

                <span className="text-xs font-bold text-[#FF6B00] bg-[#122A47] px-3 py-1 rounded-full border border-[#1C3D66]">
                  {scoredGames.length} game hợp chuẩn
                </span>
              </div>

              {scoredGames.length === 0 ? (
                <div className="text-center py-12 rounded-3xl bg-[#091D33] border border-[#163558] p-6 space-y-3">
                  <p className="text-sm font-semibold text-white">
                    Không tìm thấy game nào vừa vặn với toàn bộ tiêu chí khắt khe này!
                  </p>
                  <p className="text-xs text-[#8EADC8] max-w-md mx-auto">
                    Hãy thử nới lỏng thời gian hoặc chuyển số người chơi để tìm thấy nhiều tựa game hơn trên kệ.
                  </p>
                  <button
                    onClick={() => {
                      setAvailableTime('any');
                      setVibe('all');
                      setCabinetPref('all');
                    }}
                    className="px-5 py-2 rounded-full bg-[#FF6B00] text-white font-bold text-xs hover:bg-[#FF7A1A] transition-all"
                  >
                    Xem Tương Thích Rộng Hơn
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {topRecommendations.map((game, idx) => (
                    <div
                      key={game.id}
                      onClick={() => {
                        onClose();
                        onSelectGame(game);
                      }}
                      className="group relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#0C223A] to-[#071526] border border-[#193F69] hover:border-[#FF6B00] p-4 shadow-xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between"
                    >
                      {/* Top Rank Badge */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-full font-black text-xs flex items-center justify-center text-slate-950 ${
                              idx === 0
                                ? 'bg-amber-400 shadow-md shadow-amber-400/40'
                                : idx === 1
                                ? 'bg-slate-300'
                                : 'bg-amber-700 text-white'
                            }`}
                          >
                            #{idx + 1}
                          </span>
                          <span className="text-[11px] font-bold text-[#FF6B00] bg-[#FF6B00]/15 px-2 py-0.5 rounded-full border border-[#FF6B00]/30">
                            {game.matchPercent}% Match
                          </span>
                        </div>

                        {game.cabinetType === 'real' ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Real</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 text-[10px] font-bold border border-rose-500/30 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Fake</span>
                          </span>
                        )}
                      </div>

                      {/* Box Art Thumbnail */}
                      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black/40 mb-3 border border-[#142F4F]">
                        <img
                          src={game.imageUrl}
                          alt={game.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#071526] via-transparent to-transparent" />
                        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-mono font-bold text-amber-400 border border-amber-400/30">
                          {game.rating ? `${game.rating} ★` : 'N/A'}
                        </div>
                      </div>

                      {/* Info & Story Hook */}
                      <div className="space-y-1.5 flex-1">
                        <h4 className="text-sm font-bold text-white group-hover:text-[#FF6B00] transition-colors line-clamp-1">
                          {game.name}
                        </h4>
                        {game.vietnameseName && (
                          <p className="text-[11px] text-[#8EADC8] line-clamp-1 italic">
                            {game.vietnameseName}
                          </p>
                        )}
                        <p className="text-[11px] text-emerald-300 font-semibold line-clamp-2">
                          ✓ {game.matchReason}
                        </p>
                      </div>

                      {/* CTA */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onClose();
                          onSelectGame(game);
                        }}
                        className="mt-4 w-full py-2 px-3 rounded-xl bg-[#122E4E] group-hover:bg-[#FF6B00] text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <span>Chơi Hộp Này Ngay</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Other Eligible Games List */}
              {scoredGames.length > 3 && (
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-[#8EADC8] uppercase tracking-wider mb-2">
                    Các Lựa Chọn Thay Thế Phù Hợp ({scoredGames.length - 3} game khác):
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {scoredGames.slice(3, 11).map((g) => (
                      <div
                        key={g.id}
                        onClick={() => {
                          onClose();
                          onSelectGame(g);
                        }}
                        className="p-2 rounded-xl bg-[#0C223A] hover:bg-[#122C4A] border border-[#163558] hover:border-[#FF6B00] flex items-center gap-2 cursor-pointer transition-all"
                      >
                        <img
                          src={g.imageUrl}
                          alt={g.name}
                          className="w-9 h-9 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">{g.name}</p>
                          <p className="text-[10px] text-[#8EADC8]">{g.playtime} · {g.rating}★</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LUCKY WHEEL (VÒNG QUAY MAY MẮN) */}
          {activeTab === 'wheel' && (
            <div className="flex flex-col items-center justify-center space-y-6 py-2 animate-fade-in">
              <div className="text-center space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-white font-display flex items-center justify-center gap-2">
                  <RotateCw className="w-5 h-5 text-[#FF6B00] animate-spin" style={{ animationDuration: '6s' }} />
                  <span>Vòng Quay May Mắn Định Mệnh</span>
                </h3>
                <p className="text-xs text-[#8EADC8]">
                  Đang nạp {wheelGames.length} game thỏa mãn tiêu chí nhóm {playerCount} người
                </p>
              </div>

              {/* Wheel Container with Pointer Pin */}
              <div className="relative flex items-center justify-center">
                {/* Pointer Arrow Top */}
                <div className="absolute -top-3 z-20 flex flex-col items-center">
                  <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-[#FF6B00] filter drop-shadow-[0_2px_8px_rgba(255,107,0,0.8)]" />
                </div>

                {/* Canvas Wheel */}
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={340}
                  className="rounded-full shadow-[0_0_40px_rgba(255,107,0,0.25)] border-4 border-[#163558] max-w-[320px] max-h-[320px] sm:max-w-[340px] sm:max-h-[340px]"
                />
              </div>

              {/* Spin Trigger Button */}
              <button
                onClick={spinWheel}
                disabled={isSpinning || wheelGames.length === 0}
                className="px-8 py-3.5 rounded-full bg-gradient-to-r from-[#FF6B00] via-[#FF8C33] to-[#FFA154] hover:brightness-110 active:scale-95 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-[#FF6B00]/40 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Dices className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
                <span>{isSpinning ? 'Đang Quay May Mắn...' : 'Quay Ngay Định Mệnh!'}</span>
              </button>

              {/* Winner Result Card Announcement */}
              {selectedWinner && !isSpinning && (
                <div className="w-full max-w-lg p-4 rounded-3xl bg-gradient-to-r from-[#0C223A] via-[#0E2845] to-[#0A1E35] border-2 border-amber-400/80 shadow-2xl animate-scale-in flex items-center gap-4">
                  <img
                    src={selectedWinner.imageUrl}
                    alt={selectedWinner.name}
                    className="w-18 h-22 rounded-2xl object-cover border-2 border-amber-400 shadow-md shrink-0"
                  />
                  <div className="space-y-1 min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-400/15 px-2 py-0.5 rounded-full border border-amber-400/30">
                      🎉 Game Được Chọn Tối Nay!
                    </span>
                    <h4 className="text-base font-black text-white truncate font-display">
                      {selectedWinner.name}
                    </h4>
                    <p className="text-xs text-[#8EADC8]">
                      {selectedWinner.players} · {selectedWinner.playtime} · {selectedWinner.rating}★
                    </p>
                    <button
                      onClick={() => {
                        onClose();
                        onSelectGame(selectedWinner);
                      }}
                      className="mt-2 py-1.5 px-4 rounded-xl bg-[#FF6B00] hover:bg-[#FF7A1A] text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
                    >
                      <span>Xem Hộp Này & Bắt Đầu Chơi</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
