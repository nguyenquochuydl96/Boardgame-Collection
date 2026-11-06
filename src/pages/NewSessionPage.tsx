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
  RotateCcw,
} from 'lucide-react';
import { PageTransition } from '../components/layout/PageTransition';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PlayerChip } from '../components/player/PlayerChip';
import { PlayerScoreRow } from '../components/session/PlayerScoreRow';
import { ScoringSheetMatrix } from '../components/session/ScoringSheetMatrix';
import { LocationSelector } from '../components/session/LocationSelector';
import { getScoringTemplateForGame } from '../lib/scoringPresets';
import { LuckyWheel } from '../components/picker/LuckyWheel';
import { MysteryCardShuffle, PickerItem } from '../components/picker/MysteryCardShuffle';
import { PlayerAvatar } from '../components/player/PlayerAvatar';
import { cn } from '../components/ui/cn';
import { useGameStore } from '../store/useGameStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useSessionStore } from '../store/useSessionStore';
import { useLocationStore } from '../store/useLocationStore';
import {
  FirstPlayerMethod,
  Player,
  PlayerScore,
  SessionDraft,
} from '../types';
import {
  FIRST_PLAYER_METHOD_LABELS,
  formatDate,
  formatDuration,
  generateId,
} from '../lib/utils';

const WIZARD_STEPS = [
  { step: 1, title: 'Game' },
  { step: 2, title: 'Setup' },
  { step: 3, title: 'Players' },
  { step: 4, title: 'First Player' },
  { step: 5, title: 'Scores' },
  { step: 6, title: 'Memories' },
];

const ONE_OFF_COLORS = ['#f97316', '#22d3ee', '#a855f7', '#10b981', '#ec4899'];

export const NewSessionPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedGameId = searchParams.get('gameId');
  const initialStepParam = Number(searchParams.get('step'));
  const preselectedFirstPlayerId = searchParams.get('firstPlayerId');
  const preselectedPlayerIds = searchParams.get('playerIds')?.split(',').filter(Boolean);
  const preselectedLocation = searchParams.get('location');
  const isRematchMode = searchParams.get('mode') === 'rematch';

  const games = useGameStore((s) => s.games);
  const savedPlayers = usePlayerStore((s) => s.players);
  const addPlayerToStore = usePlayerStore((s) => s.addPlayer);
  const addSession = useSessionStore((s) => s.addSession);
  const defaultLocation = useLocationStore(
    (s) => s.locations.find((l) => l.isDefault)?.name || s.locations[0]?.name || ''
  );

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
  const [location, setLocation] = useState<string>(() => {
    if (preselectedLocation) return decodeURIComponent(preselectedLocation);
    return defaultLocation;
  });
  const [durationMinutes, setDurationMinutes] = useState<string>('60');

  // Auto-Timer & Session Draft state
  const [sessionStartTime, setSessionStartTime] = useState<number>(() => Date.now());
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [pausedDurationMs, setPausedDurationMs] = useState<number>(0);
  const [pauseStartTime, setPauseStartTime] = useState<number | undefined>(undefined);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [existingDraft, setExistingDraft] = useState<SessionDraft | null>(null);

  // Step 3: Players
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(() => {
    if (preselectedPlayerIds && preselectedPlayerIds.length > 0) {
      return preselectedPlayerIds;
    }
    return savedPlayers.slice(0, 3).map((p) => p.id);
  });
  const [oneOffPlayers, setOneOffPlayers] = useState<Player[]>([]);
  const [newGuestName, setNewGuestName] = useState('');
  const [saveGuestToVault, setSaveGuestToVault] = useState(true);

  // Step 4: First Player
  const [firstPlayerId, setFirstPlayerId] = useState<string | undefined>(
    isRematchMode ? undefined : (preselectedFirstPlayerId || savedPlayers[0]?.id)
  );
  const [firstPlayerMethod, setFirstPlayerMethod] =
    useState<FirstPlayerMethod>('random_wheel');
  const [firstPlayerAnimStyle, setFirstPlayerAnimStyle] = useState<
    'wheel' | 'card_shuffle' | 'manual'
  >('wheel');

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

  // Detect and offer restoring previous draft on mount (skip in rematch mode)
  useEffect(() => {
    if (isRematchMode) return;
    try {
      const raw = localStorage.getItem('boardgame_session_draft');
      if (raw) {
        const parsed = JSON.parse(raw) as SessionDraft;
        // Offer restoring if draft is less than 36 hours old
        if (parsed && Date.now() - parsed.sessionStartTime < 36 * 60 * 60 * 1000) {
          setExistingDraft(parsed);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [isRematchMode]);

  const handleRestoreDraft = () => {
    if (!existingDraft) return;
    setSelectedGameId(existingDraft.gameId);
    setDatePlayed(existingDraft.datePlayed);
    setLocation(existingDraft.location);
    setDurationMinutes(existingDraft.durationMinutes);
    setSessionStartTime(existingDraft.sessionStartTime);
    setIsTimerRunning(existingDraft.isTimerRunning);
    setPausedDurationMs(existingDraft.pausedDurationMs);
    setPauseStartTime(existingDraft.pauseStartTime);
    setSelectedPlayerIds(existingDraft.selectedPlayerIds);
    setOneOffPlayers(existingDraft.oneOffPlayers);
    setFirstPlayerId(existingDraft.firstPlayerId);
    setFirstPlayerMethod(existingDraft.firstPlayerMethod);
    setFirstPlayerAnimStyle(existingDraft.firstPlayerAnimStyle);
    setScoresByPlayerId(existingDraft.scoresByPlayerId);
    setBreakdownsByPlayerId(existingDraft.breakdownsByPlayerId);
    setManualWinnerIds(existingDraft.manualWinnerIds);
    setLowScoreWins(existingDraft.lowScoreWins);
    setScoringMode(existingDraft.scoringMode);
    setPhotos(existingDraft.photos);
    setNotes(existingDraft.notes);
    setCurrentStep(existingDraft.currentStep);
    setExistingDraft(null);
  };

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem('boardgame_session_draft');
    } catch {}
    setExistingDraft(null);
  };

  // Live timer effect based on real wall-clock timestamps (sleep & background proof)
  useEffect(() => {
    const updateTime = () => {
      if (isTimerRunning) {
        const now = Date.now();
        const activeMs = now - sessionStartTime - pausedDurationMs;
        const totalSecs = Math.max(0, Math.floor(activeMs / 1000));
        setElapsedSeconds(totalSecs);
        setDurationMinutes(String(Math.max(1, Math.round(totalSecs / 60))));
      } else if (pauseStartTime) {
        const activeMs = pauseStartTime - sessionStartTime - pausedDurationMs;
        const totalSecs = Math.max(0, Math.floor(activeMs / 1000));
        setElapsedSeconds(totalSecs);
      }
    };

    updateTime();
    const interval = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(interval);
  }, [isTimerRunning, sessionStartTime, pausedDurationMs, pauseStartTime]);

  const handleToggleTimer = () => {
    if (isTimerRunning) {
      setIsTimerRunning(false);
      setPauseStartTime(Date.now());
    } else {
      const now = Date.now();
      const addedPause = pauseStartTime ? now - pauseStartTime : 0;
      setPausedDurationMs((prev) => prev + addedPause);
      setPauseStartTime(undefined);
      setIsTimerRunning(true);
    }
  };

  // Auto-save draft effect to LocalStorage
  useEffect(() => {
    if (isSaving) return;
    const draft: SessionDraft = {
      gameId: selectedGameId,
      datePlayed,
      location,
      durationMinutes,
      elapsedSeconds,
      sessionStartTime,
      isTimerRunning,
      pausedDurationMs,
      pauseStartTime,
      selectedPlayerIds,
      oneOffPlayers,
      firstPlayerId,
      firstPlayerMethod,
      firstPlayerAnimStyle,
      scoresByPlayerId,
      breakdownsByPlayerId,
      manualWinnerIds,
      lowScoreWins,
      scoringMode,
      photos,
      notes,
      currentStep,
      lastUpdated: new Date().toISOString(),
    };
    try {
      localStorage.setItem('boardgame_session_draft', JSON.stringify(draft));
    } catch {}
  }, [
    selectedGameId,
    datePlayed,
    location,
    durationMinutes,
    elapsedSeconds,
    sessionStartTime,
    isTimerRunning,
    pausedDurationMs,
    pauseStartTime,
    selectedPlayerIds,
    oneOffPlayers,
    firstPlayerId,
    firstPlayerMethod,
    firstPlayerAnimStyle,
    scoresByPlayerId,
    breakdownsByPlayerId,
    manualWinnerIds,
    lowScoreWins,
    scoringMode,
    photos,
    notes,
    currentStep,
    isSaving,
  ]);

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

  const playerPickerItems: PickerItem[] = useMemo(() => {
    return activeSessionPlayers.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
    }));
  }, [activeSessionPlayers]);

  const firstPlayerObj = useMemo(() => {
    return allAvailablePlayers.find((p) => p.id === firstPlayerId);
  }, [allAvailablePlayers, firstPlayerId]);

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
    try {
      localStorage.removeItem('boardgame_session_draft');
    } catch {}

    const winnerEntry =
      computedPlayerScores.find((p) => p.isWinner) || computedPlayerScores[0];

    setTimeout(() => {
      const created = addSession({
        status: 'completed',
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
        <div className="flex sm:grid sm:grid-cols-6 gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
          {WIZARD_STEPS.map((s) => {
            const isActive = currentStep === s.step;
            const isDone = currentStep > s.step;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => setCurrentStep(s.step)}
                className={cn(
                  'min-w-[85px] sm:min-w-0 flex-1 p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer shrink-0 select-none',
                  isActive
                    ? 'bg-[var(--accent-primary)]/20 border-[var(--accent-primary)] text-[var(--text-primary)] shadow-sm'
                    : isDone
                    ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400'
                    : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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

        {/* Active Draft Detected Banner */}
        <AnimatePresence>
          {existingDraft && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-400 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-3xl shrink-0">📋</span>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">
                    Unfinished game session found!
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Started at {new Date(existingDraft.sessionStartTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} ({formatTimer(existingDraft.elapsedSeconds)} elapsed) · Currently at Step {existingDraft.currentStep}/6
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                <Button variant="ghost" size="sm" onClick={handleDiscardDraft}>
                  Discard
                </Button>
                <Button variant="primary" size="sm" onClick={handleRestoreDraft} className="bg-amber-500 text-slate-950 font-bold shadow-md">
                  ▶️ Resume Session
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Persistent Session Companion Bar (Always Active) */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            {selectedGame ? (
              <img
                src={selectedGame.thumbnail || selectedGame.image}
                alt={selectedGame.name}
                className="w-10 h-10 rounded-xl object-cover border border-[var(--border-subtle)] shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center text-lg shrink-0">
                🎲
              </div>
            )}
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-[var(--accent-neon)] tracking-wider block truncate">
                {selectedGame ? selectedGame.name : 'Setting up game session'}
              </span>
              <span className="text-xs text-[var(--text-secondary)] truncate block">
                {location} · {activeSessionPlayers.length} players at table
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Live Stopwatch with Pulsing Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  isTimerRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                )}
              />
              <Clock className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span className="font-mono font-extrabold text-sm text-[var(--text-primary)] tabular-nums">
                {formatTimer(elapsedSeconds)}
              </span>
            </div>

            {/* Pause / Resume Button */}
            <Button
              variant={isTimerRunning ? 'secondary' : 'primary'}
              size="sm"
              onClick={handleToggleTimer}
              className="text-xs font-bold"
            >
              {isTimerRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5 mr-1" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 mr-1 fill-current" />
                  Resume
                </>
              )}
            </Button>
          </div>
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
                    <h1 className="font-display font-extrabold text-2xl text-[var(--text-primary)]">
                      Step 1 — Choose Boardgame
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Select the tabletop game to bring to the table
                    </p>
                  </div>

                  {selectedGame && (
                    <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-glow)]">
                      <img
                        src={selectedGame.thumbnail || selectedGame.image}
                        alt={selectedGame.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-16 rounded-lg object-cover"
                      />
                      <div>
                        <span className="text-[11px] text-[var(--accent-neon)] font-semibold">
                          Selected Game
                        </span>
                        <p className="font-display font-bold text-sm text-[var(--text-primary)]">
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
            {/* STEP 2: SETUP */}
            {currentStep === 2 && (
              <Card className="p-6 sm:p-8 space-y-6">
                <div>
                  <h1 className="font-display font-extrabold text-2xl text-[var(--text-primary)]">
                    Step 2 — Session Setup
                  </h1>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Select play date, venue location, and track game time
                  </p>
                </div>

                <div className="space-y-4">
                  <Input
                    label="Date Played"
                    type="date"
                    value={datePlayed}
                    onChange={(e) => setDatePlayed(e.target.value)}
                  />

                  {/* Location Selector from permanent list */}
                  <LocationSelector
                    selectedLocation={location}
                    onSelectLocation={(loc) => setLocation(loc)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                  <div className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-3">
                    <label
                      htmlFor="manual-duration-input"
                      className="block text-xs font-semibold text-[var(--text-secondary)]"
                    >
                      Duration (Minutes - Auto or manual adjustment)
                    </label>
                    <input
                      id="manual-duration-input"
                      type="number"
                      min={1}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-4 py-2 font-mono font-bold text-xl text-[var(--text-primary)] tabular-nums focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                    <div className="flex flex-wrap gap-2">
                      {[30, 45, 60, 90, 120].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setDurationMinutes(String(preset))}
                          className="px-3 py-1 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--accent-glow)] text-xs font-mono text-[var(--text-primary)] border border-[var(--border-subtle)] cursor-pointer"
                        >
                          {preset}m
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full',
                            isTimerRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                          )}
                        />
                        Stopwatch Active
                      </span>
                      <Clock className="w-4 h-4 text-[var(--accent-neon)]" />
                    </div>
                    <p className="font-mono font-extrabold text-3xl text-[var(--accent-neon)] tabular-nums">
                      {formatTimer(elapsedSeconds)}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={isTimerRunning ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={handleToggleTimer}
                      >
                        {isTimerRunning ? (
                          <>
                            <Pause className="w-4 h-4 mr-1" />
                            Pause Timer
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-1 fill-current" />
                            Resume Timer
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSessionStartTime(Date.now());
                          setPausedDurationMs(0);
                          setPauseStartTime(undefined);
                          setElapsedSeconds(0);
                          setDurationMinutes('1');
                        }}
                        className="text-xs text-[var(--text-secondary)]"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        Reset
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* STEP 3: PLAYERS */}
            {currentStep === 3 && (
              <Card className="p-6 sm:p-8 space-y-6">
                <div>
                  <h1 className="font-display font-extrabold text-2xl text-[var(--text-primary)]">
                    Step 3 — Select Players
                  </h1>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Tap cards to select participating players ({activeSessionPlayers.length} selected)
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
                  className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-3"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Add New Friend or Guest Player
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <Input
                        placeholder="Player name (e.g. Alex, Sam)..."
                        value={newGuestName}
                        onChange={(e) => setNewGuestName(e.target.value)}
                      />
                    </div>
                    <Button type="submit" variant="secondary">
                      <UserPlus className="w-4 h-4 mr-1" />
                      Add to Table
                    </Button>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveGuestToVault}
                      onChange={(e) => setSaveGuestToVault(e.target.checked)}
                      className="rounded border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--accent-primary)]"
                    />
                    Save this player to permanent vault roster
                  </label>
                </form>
              </Card>
            )}

            {/* STEP 4: WHO GOES FIRST? */}
            {currentStep === 4 && (
              <Card className="p-6 sm:p-8 space-y-6">
                {isRematchMode && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-transparent border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">🔄</span>
                      <span>
                        <strong className="text-amber-300">Rematch:</strong> Kept <strong>{selectedGame?.name}</strong>, <strong>{activeSessionPlayers.length} players</strong> and venue <strong>{location}</strong>. Spin or draw to pick a new first player!
                      </span>
                    </div>
                    <span className="font-mono text-emerald-400 font-bold shrink-0 flex items-center gap-1">
                      <span>⏱️</span> New timer running
                    </span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[var(--text-primary)] flex items-center gap-2.5">
                      <span>👑</span>
                      Step 4 — Who Goes First?
                    </h1>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                      Spin the lucky wheel, shuffle mystery cards, or choose house rules for {activeSessionPlayers.length} players
                    </p>
                  </div>

                  {/* Mode Selector Tabs */}
                  <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shrink-0">
                    <button
                      type="button"
                      onClick={() => setFirstPlayerAnimStyle('wheel')}
                      className={cn(
                        'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none',
                        firstPlayerAnimStyle === 'wheel'
                          ? 'bg-amber-500/25 border border-amber-500/50 text-amber-300 shadow-sm'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      )}
                    >
                      <span>🎡 Spin Wheel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFirstPlayerAnimStyle('card_shuffle')}
                      className={cn(
                        'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none',
                        firstPlayerAnimStyle === 'card_shuffle'
                          ? 'bg-amber-500/25 border border-amber-500/50 text-amber-300 shadow-sm'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      )}
                    >
                      <span>🎴 Draw Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFirstPlayerAnimStyle('manual')}
                      className={cn(
                        'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none',
                        firstPlayerAnimStyle === 'manual'
                          ? 'bg-[var(--accent-glow)] border border-[var(--border-glow)] text-[var(--accent-neon)] shadow-sm'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      )}
                    >
                      <span>✋ Manual</span>
                    </button>
                  </div>
                </div>

                {/* Main Interactive Stage */}
                {activeSessionPlayers.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-center space-y-3">
                    <span className="text-3xl">⚠️</span>
                    <h3 className="font-bold text-base text-[var(--text-primary)]">No players at the table yet</h3>
                    <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                      Please return to Step 3 and select at least 1 player for this session.
                    </p>
                    <Button variant="secondary" size="sm" onClick={() => setCurrentStep(3)}>
                      <ArrowLeft className="w-4 h-4 mr-1" /> Back to Step 3
                    </Button>
                  </div>
                ) : activeSessionPlayers.length === 1 ? (
                  <div className="p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-center space-y-4">
                    <div className="inline-flex items-center gap-3 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40">
                      <PlayerAvatar
                        avatar={activeSessionPlayers[0].avatar}
                        name={activeSessionPlayers[0].name}
                        color={activeSessionPlayers[0].color}
                        size="md"
                      />
                      <div className="text-left">
                        <span className="text-[10px] uppercase font-bold text-amber-400">Solo Mode</span>
                        <p className="font-bold text-[var(--text-primary)] text-sm">{activeSessionPlayers[0].name} goes first</p>
                      </div>
                    </div>
                    <div>
                      <Button variant="primary" onClick={() => setCurrentStep(5)}>
                        Continue to Score Entry (Step 5) 👉
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 sm:p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex flex-col items-center justify-center min-h-[380px] relative overflow-hidden">
                    {firstPlayerAnimStyle === 'wheel' ? (
                      <LuckyWheel
                        items={playerPickerItems}
                        onSelect={(winner) => {
                          setFirstPlayerId(winner.id);
                          setFirstPlayerMethod('random_wheel');
                        }}
                      />
                    ) : firstPlayerAnimStyle === 'card_shuffle' ? (
                      <MysteryCardShuffle
                        items={playerPickerItems}
                        onSelect={(winner) => {
                          setFirstPlayerId(winner.id);
                          setFirstPlayerMethod('random_wheel');
                        }}
                        mode="first_player"
                      />
                    ) : (
                      <div className="w-full max-w-md py-6 space-y-6 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center text-2xl mx-auto shadow-inner">
                          👑
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-[var(--text-primary)]">Manually Assign First Player</h3>
                          <p className="text-xs text-[var(--text-secondary)] mt-1">
                            Choose directly below or use custom tabletop house rules
                          </p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2.5">
                          {activeSessionPlayers.map((p) => {
                            const isChosen = firstPlayerId === p.id;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setFirstPlayerId(p.id);
                                  setFirstPlayerMethod('manual');
                                }}
                                className={cn(
                                  'flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer',
                                  isChosen
                                    ? 'bg-amber-500/25 border-amber-400 text-[var(--text-primary)] shadow-lg ring-2 ring-amber-400/30'
                                    : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/20'
                                )}
                              >
                                <PlayerAvatar
                                  avatar={p.avatar}
                                  name={p.name}
                                  color={p.color}
                                  size="sm"
                                />
                                <span>{p.name}</span>
                                {isChosen && <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Spotlight Celebration Card when First Player is Picked */}
                    <AnimatePresence>
                      {firstPlayerObj && (
                        <motion.div
                          initial={{ opacity: 0, y: 16, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/25 to-amber-600/20 border-2 border-amber-400 shadow-2xl w-full max-w-lg flex flex-col sm:flex-row items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="relative">
                              <PlayerAvatar
                                avatar={firstPlayerObj.avatar}
                                name={firstPlayerObj.name}
                                color={firstPlayerObj.color}
                                size="lg"
                              />
                              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg font-bold">
                                👑
                              </div>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300">
                                  First Player This Session!
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-[var(--text-primary)] font-medium">
                                  {FIRST_PLAYER_METHOD_LABELS[firstPlayerMethod]}
                                </span>
                              </div>
                              <h4 className="font-display font-extrabold text-base sm:text-lg text-[var(--text-primary)] truncate">
                                {firstPlayerObj.name}
                              </h4>
                            </div>
                          </div>

                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setCurrentStep(5)}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-lg shrink-0 w-full sm:w-auto"
                          >
                            Enter Scores 👉
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Alternative Quick Manual Rule Selector */}
                {activeSessionPlayers.length > 1 && (
                  <div className="pt-4 border-t border-white/[0.08] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">
                        Alternative house rules:
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
                                ? 'bg-amber-500/25 border-amber-400 text-amber-300'
                                : 'bg-[var(--bg-surface)] border-white/10 text-[var(--text-secondary)] hover:text-white'
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
                )}
              </Card>
            )}

            {/* STEP 5: SCORE ENTRY */}
            {currentStep === 5 && (
              <Card className="p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="font-display font-extrabold text-2xl text-[var(--text-primary)]">
                      Step 5 — Scores &amp; Scoring Sheet
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Automatically calculate category scores and crown table champions
                    </p>
                  </div>

                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lowScoreWins}
                      onChange={(e) => setLowScoreWins(e.target.checked)}
                      className="rounded border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--accent-primary)]"
                    />
                    Lowest score wins
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
                    <span>📊 Scoring Sheet:</span>
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
                    <span>⚡ Quick Total Entry</span>
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
                    <h1 className="font-display font-extrabold text-2xl text-[var(--text-primary)]">
                      Step 6 — Game Night Memories &amp; Notes
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Snap final board photos and record memorable tabletop moments
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                      Boardgame Photos
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="min-h-[88px] px-5 py-4 rounded-2xl border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--accent-primary)] bg-[var(--bg-elevated)] flex flex-col items-center justify-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors">
                        <Camera className="w-5 h-5 text-[var(--accent-primary)]" />
                        <span>Upload Photos</span>
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
                          className="relative w-24 h-24 rounded-2xl overflow-hidden border border-[var(--border-subtle)] group"
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
                      className="block text-xs font-semibold text-[var(--text-secondary)]"
                    >
                      Session Notes
                    </label>
                    <textarea
                      id="session-notes"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Epic comeback? House rule used? Fun moments at the table? 😄"
                      className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
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
