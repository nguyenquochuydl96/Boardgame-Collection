import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Check,
  Clock,
  Play,
  Pause,
  UserPlus,
  Camera,
  Sparkles,
  Crown,
  Trash2,
} from 'lucide-react';
import { PageTransition } from '../components/layout/PageTransition';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PlayerChip } from '../components/player/PlayerChip';
import { PlayerScoreRow } from '../components/session/PlayerScoreRow';
import { ScoringSheetMatrix } from '../components/session/ScoringSheetMatrix';
import { getScoringTemplateForGame } from '../lib/scoringPresets';
import { RandomPlayerWheel } from '../components/session/RandomPlayerWheel';
import { cn } from '../components/ui/cn';
import { useGameStore } from '../store/useGameStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useSessionStore } from '../store/useSessionStore';
import {
  FirstPlayerMethod,
  Player,
  PlayerScore,
} from '../types';
import {
  FIRST_PLAYER_METHOD_LABELS,
  formatDate,
  formatDuration,
  generateId,
} from '../lib/utils';

const WIZARD_STEPS = [
  { step: 1, title: 'Pick Game' },
  { step: 2, title: 'Setup' },
  { step: 3, title: 'Players' },
  { step: 4, title: 'Who Goes First?' },
  { step: 5, title: 'Scores' },
  { step: 6, title: 'Memories' },
];

const ONE_OFF_COLORS = ['#f97316', '#22d3ee', '#a855f7', '#10b981', '#ec4899'];

export const NewSessionPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedGameId = searchParams.get('gameId');
  const initialStepParam = Number(searchParams.get('step'));

  const games = useGameStore((s) => s.games);
  const savedPlayers = usePlayerStore((s) => s.players);
  const addPlayerToStore = usePlayerStore((s) => s.addPlayer);
  const addSession = useSessionStore((s) => s.addSession);

  const [currentStep, setCurrentStep] = useState<number>(
    initialStepParam >= 1 && initialStepParam <= 6 ? initialStepParam : 1
  );

  // Step 1: Pick Game
  const [gameSearch, setGameSearch] = useState('');
  const [selectedGameId, setSelectedGameId] = useState<string>(
    preselectedGameId || games[0]?.id || ''
  );

  // Step 2: Setup
  const [datePlayed, setDatePlayed] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [location, setLocation] = useState<string>('Huy’s Game Room, District 3');
  const [durationMinutes, setDurationMinutes] = useState<string>('60');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Step 3: Players
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(() =>
    savedPlayers.slice(0, 3).map((p) => p.id)
  );
  const [oneOffPlayers, setOneOffPlayers] = useState<Player[]>([]);
  const [newGuestName, setNewGuestName] = useState('');
  const [saveGuestToVault, setSaveGuestToVault] = useState(true);

  // Step 4: First Player
  const [firstPlayerId, setFirstPlayerId] = useState<string | undefined>(
    savedPlayers[0]?.id
  );
  const [firstPlayerMethod, setFirstPlayerMethod] =
    useState<FirstPlayerMethod>('random_wheel');

  // Step 5: Scores
  const [lowScoreWins, setLowScoreWins] = useState(false);
  const [scoringMode, setScoringMode] = useState<'detailed' | 'quick'>('detailed');
  const [breakdownsByPlayerId, setBreakdownsByPlayerId] = useState<
    Record<string, Record<string, number>>
  >({});
  const [scoresByPlayerId, setScoresByPlayerId] = useState<
    Record<string, number | undefined>
  >({});
  const [manualWinnerIds, setManualWinnerIds] = useState<string[]>([]);

  // Step 6: Memories
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Live timer effect
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = window.setInterval(() => {
      setElapsedSeconds((sec) => {
        const next = sec + 1;
        setDurationMinutes(String(Math.max(1, Math.round(next / 60))));
        return next;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isTimerRunning]);

  const selectedGame = useMemo(
    () => games.find((g) => g.id === selectedGameId) || games[0],
    [games, selectedGameId]
  );

  const scoringTemplate = useMemo(
    () => getScoringTemplateForGame(selectedGame?.name),
    [selectedGame?.name]
  );

  const filteredGames = useMemo(() => {
    if (!gameSearch.trim()) return games;
    const q = gameSearch.toLowerCase();
    return games.filter((g) => g.name.toLowerCase().includes(q));
  }, [games, gameSearch]);

  const allAvailablePlayers = useMemo(
    () => [...savedPlayers, ...oneOffPlayers],
    [savedPlayers, oneOffPlayers]
  );

  const activeSessionPlayers = useMemo(
    () =>
      selectedPlayerIds
        .map((id) => allAvailablePlayers.find((p) => p.id === id))
        .filter((p): p is Player => Boolean(p)),
    [selectedPlayerIds, allAvailablePlayers]
  );

  // Compute ranked PlayerScore list
  const computedPlayerScores: PlayerScore[] = useMemo(() => {
    const hasAnyNumericScore = activeSessionPlayers.some(
      (p) => typeof scoresByPlayerId[p.id] === 'number'
    );

    if (hasAnyNumericScore && manualWinnerIds.length === 0) {
      const validScores = activeSessionPlayers
        .map((p) => scoresByPlayerId[p.id])
        .filter((v): v is number => typeof v === 'number');
      const targetBest = lowScoreWins
        ? Math.min(...validScores)
        : Math.max(...validScores);

      const sortedForRank = [...activeSessionPlayers].sort((a, b) => {
        const sa = scoresByPlayerId[a.id];
        const sb = scoresByPlayerId[b.id];
        if (sa === undefined && sb === undefined) return 0;
        if (sa === undefined) return 1;
        if (sb === undefined) return -1;
        return lowScoreWins ? sa - sb : sb - sa;
      });

      return activeSessionPlayers.map((p) => {
        const sc = scoresByPlayerId[p.id];
        const rankIdx = sortedForRank.findIndex((x) => x.id === p.id);
        const bd = breakdownsByPlayerId[p.id];
        const hasBd = bd && Object.values(bd).some((v) => v !== 0);
        return {
          playerId: p.id,
          playerName: p.name,
          score: sc,
          rank: rankIdx >= 0 ? rankIdx + 1 : undefined,
          isWinner: sc !== undefined && sc === targetBest,
          scoreBreakdown: hasBd ? bd : undefined,
        };
      });
    }

    return activeSessionPlayers.map((p, idx) => {
      const bd = breakdownsByPlayerId[p.id];
      const hasBd = bd && Object.values(bd).some((v) => v !== 0);
      return {
        playerId: p.id,
        playerName: p.name,
        score: scoresByPlayerId[p.id],
        rank: idx + 1,
        isWinner: manualWinnerIds.includes(p.id),
        scoreBreakdown: hasBd ? bd : undefined,
      };
    });
  }, [activeSessionPlayers, scoresByPlayerId, lowScoreWins, manualWinnerIds, breakdownsByPlayerId]);

  const handleTogglePlayer = (playerId: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleAddGuestPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newGuestName.trim();
    if (!trimmed) return;

    const color =
      ONE_OFF_COLORS[
        (savedPlayers.length + oneOffPlayers.length) % ONE_OFF_COLORS.length
      ];

    if (saveGuestToVault) {
      const created = addPlayerToStore({
        name: trimmed,
        avatar: '🎲',
        color,
      });
      setSelectedPlayerIds((prev) => [...prev, created.id]);
    } else {
      const guest: Player = {
        id: `guest-${generateId()}`,
        name: trimmed,
        avatar: '🎲',
        color,
        createdAt: new Date().toISOString(),
      };
      setOneOffPlayers((prev) => [...prev, guest]);
      setSelectedPlayerIds((prev) => [...prev, guest.id]);
    }
    setNewGuestName('');
  };

  const handleScoreChange = (playerId: string, score: number | undefined) => {
    setManualWinnerIds([]); // Re-enable auto-detection when typing scores
    setScoresByPlayerId((prev) => ({
      ...prev,
      [playerId]: score,
    }));
  };

  const handleToggleManualWinner = (playerId: string) => {
    setManualWinnerIds((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [playerId]
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPhotos((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSaveSession = () => {
    if (!selectedGame || activeSessionPlayers.length === 0) return;
    setIsSaving(true);

    const winnerEntry =
      computedPlayerScores.find((p) => p.isWinner) || computedPlayerScores[0];

    setTimeout(() => {
      const created = addSession({
        gameId: selectedGame.id,
        gameName: selectedGame.name,
        gameThumbnail: selectedGame.thumbnail || selectedGame.image,
        datePlayed: new Date(datePlayed).toISOString(),
        location: location.trim() || undefined,
        durationMinutes: Math.max(5, Number(durationMinutes) || 60),
        players: computedPlayerScores,
        winnerId: winnerEntry?.playerId,
        firstPlayerMethod,
        firstPlayerId: firstPlayerId || activeSessionPlayers[0]?.id,
        photos: photos.length > 0 ? photos : undefined,
        notes: notes.trim() || undefined,
      });
      setIsSaving(false);
      navigate(`/sessions/${created.id}`);
    }, 300);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/sessions"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#94a3b8] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sessions
          </Link>
          <span className="text-xs font-mono text-[#a78bfa] tabular-nums">
            Step {currentStep} of 6
          </span>
        </div>

        {/* Wizard Step Progress Bar */}
        <div className="grid grid-cols-6 gap-2">
          {WIZARD_STEPS.map((s) => {
            const isActive = currentStep === s.step;
            const isDone = currentStep > s.step;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => setCurrentStep(s.step)}
                className={cn(
                  'p-2.5 rounded-xl border text-left transition-all cursor-pointer',
                  isActive
                    ? 'bg-[#7c3aed]/25 border-[#a78bfa] text-white'
                    : isDone
                    ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                    : 'bg-[#16162a] border-white/[0.06] text-[#94a3b8] hover:text-white'
                )}
              >
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span>0{s.step}</span>
                  {isDone && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <p className="font-display font-bold text-xs truncate mt-0.5">
                  {s.title}
                </p>
              </button>
            );
          })}
        </div>

        {/* Animated Wizard Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {/* STEP 1: PICK GAME */}
            {currentStep === 1 && (
              <Card className="p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="font-display font-extrabold text-2xl text-white">
                      Step 1 — Pick a Boardgame
                    </h1>
                    <p className="text-sm text-[#94a3b8]">
                      Choose which game is hitting the table tonight
                    </p>
                  </div>

                  {selectedGame && (
                    <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#16162a] border border-[#7c3aed]/40">
                      <img
                        src={selectedGame.thumbnail || selectedGame.image}
                        alt={selectedGame.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-16 rounded-lg object-cover"
                      />
                      <div>
                        <span className="text-[11px] text-[#a78bfa] font-semibold">
                          Selected Game
                        </span>
                        <p className="font-display font-bold text-sm text-white">
                          {selectedGame.name}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <Input
                  placeholder="Filter your collection..."
                  value={gameSearch}
                  onChange={(e) => setGameSearch(e.target.value)}
                  leftIcon={<Search className="w-4 h-4" />}
                />

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-1">
                  {filteredGames.map((game) => {
                    const active = selectedGame?.id === game.id;
                    return (
                      <button
                        key={game.id}
                        type="button"
                        onClick={() => setSelectedGameId(game.id)}
                        className={cn(
                          'group relative rounded-2xl overflow-hidden border text-left transition-all cursor-pointer flex flex-col',
                          active
                            ? 'border-[#a78bfa] ring-2 ring-[#7c3aed]/50 bg-[#7c3aed]/20'
                            : 'border-white/10 bg-[#16162a] hover:border-white/30'
                        )}
                      >
                        <div className="aspect-[4/3] w-full overflow-hidden bg-[#1e1e35] relative">
                          <img
                            src={game.image || game.thumbnail}
                            alt={game.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {active && (
                            <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shadow-lg">
                              <Check className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="font-display font-bold text-sm text-white truncate">
                            {game.name}
                          </p>
                          <p className="text-xs text-[#94a3b8] tabular-nums">
                            {game.minPlayers}–{game.maxPlayers}p · {game.playingTime}m
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* STEP 2: SETUP */}
            {currentStep === 2 && (
              <Card className="p-6 sm:p-8 space-y-6">
                <div>
                  <h1 className="font-display font-extrabold text-2xl text-white">
                    Step 2 — Session Setup
                  </h1>
                  <p className="text-sm text-[#94a3b8]">
                    Set date, location, and start the live timer or enter minutes manually
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Date Played"
                    type="date"
                    value={datePlayed}
                    onChange={(e) => setDatePlayed(e.target.value)}
                  />
                  <Input
                    label="Location"
                    placeholder="e.g., Huy’s Game Room, Boardgame Cafe..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                  <div className="p-5 rounded-2xl bg-[#16162a] border border-white/10 space-y-3">
                    <label
                      htmlFor="manual-duration-input"
                      className="block text-xs font-semibold text-[#94a3b8]"
                    >
                      Manual Duration (Minutes)
                    </label>
                    <input
                      id="manual-duration-input"
                      type="number"
                      min={1}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl bg-[#1e1e35] border border-white/15 px-4 py-2 font-mono font-bold text-xl text-white tabular-nums focus:outline-none focus:border-[#7c3aed]"
                    />
                    <div className="flex flex-wrap gap-2">
                      {[30, 45, 60, 90, 120].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setDurationMinutes(String(preset))}
                          className="px-3 py-1 rounded-lg bg-[#1e1e35] hover:bg-[#7c3aed]/30 text-xs font-mono text-[#cbd5e1] border border-white/10 cursor-pointer"
                        >
                          {preset}m
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#16162a] border border-white/10 flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#94a3b8]">
                        Live Session Stopwatch
                      </span>
                      <Clock className="w-4 h-4 text-[#22d3ee]" />
                    </div>
                    <p className="font-mono font-extrabold text-3xl text-[#22d3ee] tabular-nums">
                      {formatTimer(elapsedSeconds)}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={isTimerRunning ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => setIsTimerRunning((r) => !r)}
                      >
                        {isTimerRunning ? (
                          <>
                            <Pause className="w-4 h-4" />
                            Pause Timer
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-current" />
                            Start Timer
                          </>
                        )}
                      </Button>
                      {elapsedSeconds > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsTimerRunning(false);
                            setElapsedSeconds(0);
                          }}
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* STEP 3: PLAYERS */}
            {currentStep === 3 && (
              <Card className="p-6 sm:p-8 space-y-6">
                <div>
                  <h1 className="font-display font-extrabold text-2xl text-white">
                    Step 3 — Select Players
                  </h1>
                  <p className="text-sm text-[#94a3b8]">
                    Tap player chips to include them in tonight’s game ({activeSessionPlayers.length} selected)
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {allAvailablePlayers.map((player) => {
                    const isSelected = selectedPlayerIds.includes(player.id);
                    return (
                      <PlayerChip
                        key={player.id}
                        player={player}
                        selected={isSelected}
                        onClick={() => handleTogglePlayer(player.id)}
                      />
                    );
                  })}
                </div>

                {/* Add Guest or New Player */}
                <form
                  onSubmit={handleAddGuestPlayer}
                  className="p-4 rounded-2xl bg-[#16162a] border border-white/10 space-y-3"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
                    Add New or One-Off Player
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <Input
                        placeholder="Player name (e.g., Bảo Anh)..."
                        value={newGuestName}
                        onChange={(e) => setNewGuestName(e.target.value)}
                      />
                    </div>
                    <Button type="submit" variant="secondary">
                      <UserPlus className="w-4 h-4" />
                      Add to Table
                    </Button>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs text-[#94a3b8] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveGuestToVault}
                      onChange={(e) => setSaveGuestToVault(e.target.checked)}
                      className="rounded border-white/20 bg-[#1e1e35] text-[#7c3aed]"
                    />
                    Also save this player to my permanent Players list
                  </label>
                </form>
              </Card>
            )}

            {/* STEP 4: WHO GOES FIRST? SPIN WHEEL */}
            {currentStep === 4 && (
              <Card className="p-6 sm:p-8 space-y-6">
                <div className="text-center space-y-1">
                  <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
                    🎡 Step 4 — Who Goes First?
                  </h1>
                  <p className="text-sm text-[#94a3b8]">
                    Spin the wheel of destiny or pick a starting player method
                  </p>
                </div>

                <RandomPlayerWheel
                  players={activeSessionPlayers}
                  selectedPlayerId={firstPlayerId}
                  onSelectFirstPlayer={(id, method) => {
                    setFirstPlayerId(id);
                    setFirstPlayerMethod(method);
                  }}
                />

                {/* Alternative manual selection chips */}
                <div className="pt-4 border-t border-white/[0.08] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#94a3b8]">
                      Or select starting player manually:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          'random_wheel',
                          'manual',
                          'previous_loser',
                          'previous_winner',
                        ] as FirstPlayerMethod[]
                      ).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setFirstPlayerMethod(m)}
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer',
                            firstPlayerMethod === m
                              ? 'bg-[#7c3aed]/25 border-[#a78bfa] text-white'
                              : 'bg-[#16162a] border-white/10 text-[#94a3b8]'
                          )}
                        >
                          {FIRST_PLAYER_METHOD_LABELS[m]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {activeSessionPlayers.map((p) => (
                      <PlayerChip
                        key={p.id}
                        player={p}
                        size="sm"
                        selected={firstPlayerId === p.id}
                        onClick={() => {
                          setFirstPlayerId(p.id);
                          if (firstPlayerMethod === 'random_wheel') {
                            setFirstPlayerMethod('manual');
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* STEP 5: SCORE ENTRY */}
            {currentStep === 5 && (
              <Card className="p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="font-display font-extrabold text-2xl text-[var(--text-primary)]">
                      Bước 5 — Nhập Điểm & Bảng Điểm
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Tự động tính tổng điểm theo từng hạng mục riêng của game và gắn vương miện người chiến thắng
                    </p>
                  </div>

                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lowScoreWins}
                      onChange={(e) => setLowScoreWins(e.target.checked)}
                      className="rounded border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--accent-primary)]"
                    />
                    Điểm thấp nhất thắng
                  </label>
                </div>

                {/* Mode Selector Tabs */}
                <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl w-fit">
                  <button
                    type="button"
                    onClick={() => setScoringMode('detailed')}
                    className={cn(
                      'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
                      scoringMode === 'detailed'
                        ? 'bg-[var(--accent-primary)] text-white shadow-md'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    )}
                  >
                    <span>📊 Bảng Tính Điểm:</span>
                    <span className="text-[var(--accent-neon)] font-extrabold">{scoringTemplate.displayName}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScoringMode('quick')}
                    className={cn(
                      'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                      scoringMode === 'quick'
                        ? 'bg-[var(--accent-primary)] text-white shadow-md'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    )}
                  >
                    <span>⚡ Nhập Tổng Điểm Nhanh</span>
                  </button>
                </div>

                {scoringMode === 'detailed' ? (
                  <div className="space-y-4">
                    <ScoringSheetMatrix
                      players={activeSessionPlayers}
                      initialCategories={scoringTemplate.categories}
                      initialBreakdowns={breakdownsByPlayerId}
                      lowScoreWins={lowScoreWins}
                      onScoresUpdate={(totals, breakdowns) => {
                        setScoresByPlayerId(totals);
                        setBreakdownsByPlayerId(breakdowns);
                        setManualWinnerIds([]);
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {computedPlayerScores.map((ps) => {
                      const pl = allAvailablePlayers.find(
                        (x) => x.id === ps.playerId
                      );
                      return (
                        <PlayerScoreRow
                          key={ps.playerId}
                          playerScore={ps}
                          player={pl}
                          onScoreChange={handleScoreChange}
                          onToggleWinner={handleToggleManualWinner}
                        />
                      );
                    })}
                  </div>
                )}
              </Card>
            )}

            {/* STEP 6: MEMORIES & SUMMARY */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <Card className="p-6 sm:p-8 space-y-6">
                  <div>
                    <h1 className="font-display font-extrabold text-2xl text-white">
                      Step 6 — Memories & Table Notes
                    </h1>
                    <p className="text-sm text-[#94a3b8]">
                      Capture a photo of the final board state and jot down memorable moments
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-[#94a3b8]">
                      Session Photos
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="min-h-[88px] px-5 py-4 rounded-2xl border-2 border-dashed border-white/15 hover:border-[#a78bfa] bg-[#16162a] flex flex-col items-center justify-center gap-1.5 text-xs font-semibold text-[#94a3b8] hover:text-white cursor-pointer transition-colors">
                        <Camera className="w-5 h-5 text-[#a78bfa]" />
                        <span>Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>

                      {photos.map((src, idx) => (
                        <div
                          key={idx}
                          className="relative w-24 h-24 rounded-2xl overflow-hidden border border-white/15 group"
                        >
                          <img
                            src={src}
                            alt={`Session upload ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            aria-label="Remove photo"
                            onClick={() =>
                              setPhotos((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/75 text-rose-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="session-notes"
                      className="block text-xs font-semibold text-[#94a3b8]"
                    >
                      Session Notes
                    </label>
                    <textarea
                      id="session-notes"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any funny moments? House rules used? Who rage-quit? 😄"
                      className="w-full rounded-xl bg-[#16162a] border border-white/10 p-3.5 text-sm text-[#f1f5f9] placeholder:text-[#475569] focus:outline-none focus:border-[#7c3aed]"
                    />
                  </div>
                </Card>

                {/* Animated Summary Card Before Save */}
                {selectedGame && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-3xl bg-gradient-to-br from-[#1e1e35] to-[#16162a] border border-[#7c3aed]/50 shadow-xl space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#a78bfa]">
                        <Sparkles className="w-4 h-4" />
                        Ready to Record Session
                      </span>
                      <span className="text-xs text-[#94a3b8] tabular-nums">
                        {formatDate(datePlayed)} ·{' '}
                        {formatDuration(Number(durationMinutes) || 60)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <img
                        src={selectedGame.thumbnail || selectedGame.image}
                        alt={selectedGame.name}
                        referrerPolicy="no-referrer"
                        className="w-16 h-20 rounded-xl object-cover shrink-0"
                      />
                      <div className="space-y-1">
                        <h2 className="font-display font-extrabold text-xl text-white">
                          {selectedGame.name}
                        </h2>
                        <p className="text-xs text-[#94a3b8]">
                          {location || 'Home Table'} · First turn:{' '}
                          <strong className="text-white">
                            {allAvailablePlayers.find(
                              (p) => p.id === firstPlayerId
                            )?.name || activeSessionPlayers[0]?.name}
                          </strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                      {computedPlayerScores.map((ps) => (
                        <div
                          key={ps.playerId}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border',
                            ps.isWinner
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                              : 'bg-[#16162a] border-white/10 text-[#cbd5e1]'
                          )}
                        >
                          {ps.isWinner && (
                            <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          )}
                          <span>{ps.playerName}</span>
                          {typeof ps.score === 'number' && (
                            <span className="font-mono font-bold">
                              {ps.score}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Bottom Wizard Navigation Controls */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="secondary"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
          >
            <ArrowLeft className="w-4 h-4" />
            Previous Step
          </Button>

          {currentStep < 6 ? (
            <Button
              variant="primary"
              onClick={() => setCurrentStep((s) => Math.min(6, s + 1))}
            >
              Next Step
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              isLoading={isSaving}
              onClick={handleSaveSession}
            >
              <Check className="w-5 h-5" />
              Save Play Session
            </Button>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default NewSessionPage;
