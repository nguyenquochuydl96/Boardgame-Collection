import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Play,
  Pause,
} from 'lucide-react';
import { PageTransition } from '../components/layout/PageTransition';
import { Button } from '../components/ui/Button';
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
  generateId,
  isDraftMatchingCompletedSession,
  compressImage,
  getLocalDateString,
  buildLocalDateTimeISO,
  resolveCoopWinnerIds,
} from '../lib/utils';
import { getScoringTemplateForGame } from '../lib/scoringPresets';
import { pushVaultToCloud } from '../lib/supabaseSync';
import { saveMediaImage } from '../lib/mediaStorage';
import { PickerItem } from '../components/picker/MysteryCardShuffle';
import { GameCoverImage } from '../components/game/GameCoverImage';

import { SessionLiveTimer, formatTimer } from '../components/session/wizard/SessionLiveTimer';
import { Step1PickGame } from '../components/session/wizard/Step1PickGame';
import { Step2Setup } from '../components/session/wizard/Step2Setup';
import { Step3Players } from '../components/session/wizard/Step3Players';
import { Step4FirstPlayer } from '../components/session/wizard/Step4FirstPlayer';
import { Step5Scoring } from '../components/session/wizard/Step5Scoring';
import { Step6Memories } from '../components/session/wizard/Step6Memories';

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
  const registerGuestPlayer = usePlayerStore((s) => s.registerGuestPlayer);
  const addSession = useSessionStore((s) => s.addSession);
  const sessions = useSessionStore((s) => s.sessions);
  const defaultLocation = useLocationStore(
    (s) => s.locations.find((l) => l.isDefault)?.name || s.locations[0]?.name || ''
  );

  const [currentStep, setCurrentStep] = useState<number>(
    initialStepParam >= 1 && initialStepParam <= 6 ? initialStepParam : 1
  );

  // Step 1: Pick Game
  const [selectedGameId, setSelectedGameId] = useState<string>(preselectedGameId || '');

  // Step 2: Setup
  const [datePlayed, setDatePlayed] = useState<string>(getLocalDateString());
  const [location, setLocation] = useState<string>(() => {
    if (preselectedLocation) return decodeURIComponent(preselectedLocation);
    return defaultLocation;
  });

  useEffect(() => {
    if (!location && defaultLocation) {
      setLocation(defaultLocation);
    }
  }, [defaultLocation, location]);

  const [durationMinutes, setDurationMinutes] = useState<string>('60');
  const hasManualDurationRef = useRef<boolean>(false);

  // Auto-Timer & Session Draft state
  const [sessionStartTime, setSessionStartTime] = useState<number>(() => Date.now());
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [pausedDurationMs, setPausedDurationMs] = useState<number>(0);
  const [pauseStartTime, setPauseStartTime] = useState<number | undefined>(undefined);
  const [existingDraft, setExistingDraft] = useState<SessionDraft | null>(null);
  const [quotaError, setQuotaError] = useState<string | null>(null);

  // Step 3: Players
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(() => {
    if (preselectedPlayerIds && preselectedPlayerIds.length > 0) {
      return preselectedPlayerIds;
    }
    return [];
  });
  const [oneOffPlayers, setOneOffPlayers] = useState<Player[]>([]);
  const [newGuestName, setNewGuestName] = useState('');
  const [saveGuestToVault, setSaveGuestToVault] = useState(true);

  // Step 4: First Player
  const [firstPlayerId, setFirstPlayerId] = useState<string | undefined>(
    isRematchMode ? undefined : (preselectedFirstPlayerId || savedPlayers[0]?.id)
  );
  const [firstPlayerMethod, setFirstPlayerMethod] = useState<FirstPlayerMethod>('random_wheel');
  const [firstPlayerAnimStyle, setFirstPlayerAnimStyle] = useState<'card_shuffle' | 'manual'>('card_shuffle');

  // Step 5: Scores
  const [lowScoreWins, setLowScoreWins] = useState(false);
  const [scoringMode, setScoringMode] = useState<'detailed' | 'quick'>('quick');
  const [breakdownsByPlayerId, setBreakdownsByPlayerId] = useState<Record<string, Record<string, number>>>({});
  const [scoresByPlayerId, setScoresByPlayerId] = useState<Record<string, number | undefined>>({});
  const [manualWinnerIds, setManualWinnerIds] = useState<string[]>([]);
  const [coopOutcome, setCoopOutcome] = useState<'won' | 'lost'>('won');
  const [hasTouchedMatrix, setHasTouchedMatrix] = useState(false);

  // Step 6: Memories
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isSubmittedRef = useRef(false);

  // Detect and offer restoring previous draft on mount (skip in rematch mode)
  useEffect(() => {
    if (isRematchMode) return;
    const shouldAutoResume = searchParams.get('resume') === '1' || searchParams.get('resume') === 'true';

    try {
      const raw = localStorage.getItem('boardgame_session_draft');
      if (raw) {
        const parsed = JSON.parse(raw) as SessionDraft;
        const isGhostDraft =
          !parsed.gameId ||
          (parsed.currentStep === 1 &&
            (!parsed.selectedPlayerIds || parsed.selectedPlayerIds.length === 0) &&
            (!parsed.notes || parsed.notes.trim() === '') &&
            (!parsed.photos || parsed.photos.length === 0));

        if (isGhostDraft || isDraftMatchingCompletedSession(parsed, sessions)) {
          localStorage.removeItem('boardgame_session_draft');
          window.dispatchEvent(new CustomEvent('boardgame_draft_updated'));
          setExistingDraft(null);
          return;
        }
        if (parsed && (!parsed.sessionStartTime || Date.now() - parsed.sessionStartTime < 36 * 60 * 60 * 1000)) {
          if (shouldAutoResume) {
            setSelectedGameId(parsed.gameId);
            setDatePlayed(parsed.datePlayed);
            setLocation(parsed.location);
            setDurationMinutes(parsed.durationMinutes);
            setSessionStartTime(parsed.sessionStartTime);
            setIsTimerRunning(parsed.isTimerRunning);
            setPausedDurationMs(parsed.pausedDurationMs);
            setPauseStartTime(parsed.pauseStartTime);
            setSelectedPlayerIds(parsed.selectedPlayerIds || []);
            setOneOffPlayers(parsed.oneOffPlayers || []);
            if (parsed.oneOffPlayers?.length > 0) {
              parsed.oneOffPlayers.forEach((g) => registerGuestPlayer(g));
            }
            setFirstPlayerId(parsed.firstPlayerId);
            setFirstPlayerMethod(parsed.firstPlayerMethod);
            setFirstPlayerAnimStyle(parsed.firstPlayerAnimStyle === 'wheel' ? 'card_shuffle' : (parsed.firstPlayerAnimStyle || 'card_shuffle'));
            setScoresByPlayerId(parsed.scoresByPlayerId || {});
            setBreakdownsByPlayerId(parsed.breakdownsByPlayerId || {});
            setManualWinnerIds(parsed.manualWinnerIds || []);
            if (parsed.coopOutcome === 'won' || parsed.coopOutcome === 'lost') {
              setCoopOutcome(parsed.coopOutcome);
            }
            hasManualDurationRef.current = Boolean(parsed.hasManualDuration);
            setLowScoreWins(parsed.lowScoreWins ?? false);
            setScoringMode(parsed.scoringMode || 'quick');
            setPhotos(parsed.photos || []);
            setNotes(parsed.notes || '');
            setCurrentStep(parsed.currentStep || 1);
            setExistingDraft(null);
          } else {
            setExistingDraft(parsed);
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [isRematchMode, sessions, searchParams, registerGuestPlayer]);

  // Ensure draft is cleared if session has been submitted
  useEffect(() => {
    return () => {
      if (isSubmittedRef.current) {
        try {
          localStorage.removeItem('boardgame_session_draft');
          window.dispatchEvent(new CustomEvent('boardgame_draft_updated'));
        } catch {}
      }
    };
  }, []);

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
    if (existingDraft.oneOffPlayers?.length > 0) {
      existingDraft.oneOffPlayers.forEach((g) => registerGuestPlayer(g));
    }
    setFirstPlayerId(existingDraft.firstPlayerId);
    setFirstPlayerMethod(existingDraft.firstPlayerMethod);
    setFirstPlayerAnimStyle(existingDraft.firstPlayerAnimStyle === 'wheel' ? 'card_shuffle' : (existingDraft.firstPlayerAnimStyle || 'card_shuffle'));
    setScoresByPlayerId(existingDraft.scoresByPlayerId);
    setBreakdownsByPlayerId(existingDraft.breakdownsByPlayerId);
    setManualWinnerIds(existingDraft.manualWinnerIds);
    if (existingDraft.coopOutcome === 'won' || existingDraft.coopOutcome === 'lost') {
      setCoopOutcome(existingDraft.coopOutcome);
    }
    hasManualDurationRef.current = Boolean(existingDraft.hasManualDuration);
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
      window.dispatchEvent(new CustomEvent('boardgame_draft_updated'));
    } catch {}
    setExistingDraft(null);
  };

  // Synchronous flush function: writes draft immediately to localStorage without debounce delay
  const flushDraftNow = (overrides?: Partial<SessionDraft>) => {
    if (isSaving || isSubmittedRef.current) return;
    const targetGameId = overrides?.gameId ?? selectedGameId;
    if (!targetGameId) return;

    const timerRunning = overrides?.isTimerRunning !== undefined ? overrides.isTimerRunning : isTimerRunning;
    const startMs = overrides?.sessionStartTime ?? sessionStartTime;
    const pauseMs = overrides?.pausedDurationMs ?? pausedDurationMs;
    const pauseStart = overrides?.pauseStartTime !== undefined ? overrides.pauseStartTime : pauseStartTime;

    const currentElapsedSecs = timerRunning
      ? Math.max(0, Math.floor((Date.now() - startMs - pauseMs) / 1000))
      : pauseStart
      ? Math.max(0, Math.floor((pauseStart - startMs - pauseMs) / 1000))
      : 0;

    const draft: SessionDraft = {
      gameId: targetGameId,
      datePlayed: overrides?.datePlayed ?? datePlayed,
      location: overrides?.location ?? location,
      durationMinutes: overrides?.durationMinutes ?? durationMinutes,
      elapsedSeconds: currentElapsedSecs,
      sessionStartTime: startMs,
      isTimerRunning: timerRunning,
      pausedDurationMs: pauseMs,
      pauseStartTime: pauseStart,
      selectedPlayerIds: overrides?.selectedPlayerIds ?? selectedPlayerIds,
      oneOffPlayers: overrides?.oneOffPlayers ?? oneOffPlayers,
      firstPlayerId: overrides?.firstPlayerId ?? firstPlayerId,
      firstPlayerMethod: overrides?.firstPlayerMethod ?? firstPlayerMethod,
      firstPlayerAnimStyle: overrides?.firstPlayerAnimStyle ?? firstPlayerAnimStyle,
      scoresByPlayerId: overrides?.scoresByPlayerId ?? scoresByPlayerId,
      breakdownsByPlayerId: overrides?.breakdownsByPlayerId ?? breakdownsByPlayerId,
      manualWinnerIds: overrides?.manualWinnerIds ?? manualWinnerIds,
      coopOutcome: overrides?.coopOutcome ?? coopOutcome,
      hasManualDuration: overrides?.hasManualDuration ?? hasManualDurationRef.current,
      lowScoreWins: overrides?.lowScoreWins ?? lowScoreWins,
      scoringMode: overrides?.scoringMode ?? scoringMode,
      photos: overrides?.photos ?? photos,
      notes: overrides?.notes ?? notes,
      currentStep: overrides?.currentStep ?? currentStep,
      lastUpdated: new Date().toISOString(),
    };

    try {
      localStorage.setItem('boardgame_session_draft', JSON.stringify(draft));
      setQuotaError(null);
      window.dispatchEvent(new CustomEvent('boardgame_draft_updated'));
    } catch (err: unknown) {
      if (
        err instanceof DOMException &&
        (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014)
      ) {
        setQuotaError('Storage quota exceeded: Draft cannot be saved locally.');
      }
    }
  };

  // Sync duration on step changes or when leaving Step 1 (unless user manually set duration)
  useEffect(() => {
    if (currentStep >= 2 && !hasManualDurationRef.current) {
      const activeMs = (pauseStartTime || Date.now()) - sessionStartTime - pausedDurationMs;
      const totalSecs = Math.max(0, Math.floor(activeMs / 1000));
      const mins = Math.max(1, Math.round(totalSecs / 60));
      setDurationMinutes(String(mins));
    }
  }, [currentStep, pauseStartTime, sessionStartTime, pausedDurationMs]);

  const handleToggleTimer = () => {
    if (isTimerRunning) {
      const now = Date.now();
      setIsTimerRunning(false);
      setPauseStartTime(now);
      // Synchronously flush state to localStorage immediately!
      flushDraftNow({
        isTimerRunning: false,
        pauseStartTime: now,
      });
    } else {
      const now = Date.now();
      const addedPause = pauseStartTime ? now - pauseStartTime : 0;
      const nextPausedDurationMs = pausedDurationMs + addedPause;
      setPausedDurationMs(nextPausedDurationMs);
      setPauseStartTime(undefined);
      setIsTimerRunning(true);
      // Synchronously flush state to localStorage immediately!
      flushDraftNow({
        isTimerRunning: true,
        pauseStartTime: undefined,
        pausedDurationMs: nextPausedDurationMs,
      });
    }
  };

  const handleResetTimer = () => {
    const now = Date.now();
    hasManualDurationRef.current = false;
    setSessionStartTime(now);
    setPausedDurationMs(0);
    setPauseStartTime(undefined);
    setDurationMinutes('1');
    flushDraftNow({
      sessionStartTime: now,
      pausedDurationMs: 0,
      pauseStartTime: undefined,
      durationMinutes: '1',
      hasManualDuration: false,
      elapsedSeconds: 0,
    });
  };

  const handleManualDurationChange = (val: string) => {
    hasManualDurationRef.current = true;
    setDurationMinutes(val);
  };

  const handleSelectGameId = (id: string) => {
    setSelectedGameId(id);
    setCoopOutcome('won');
    setManualWinnerIds([]);
  };

  const flushDraftRef = useRef(flushDraftNow);
  flushDraftRef.current = flushDraftNow;

  // Bind visibilitychange/pagehide/beforeunload ONCE so listeners never churn on keystrokes
  useEffect(() => {
    const handleVisibilityOrPageHide = () => {
      if (document.visibilityState === 'hidden') {
        flushDraftRef.current();
      }
    };

    const handlePageHide = () => {
      flushDraftRef.current();
    };

    document.addEventListener('visibilitychange', handleVisibilityOrPageHide);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrPageHide);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
    };
  }, []);

  // Debounced auto-save draft effect to LocalStorage for typing/scoring changes
  useEffect(() => {
    if (isSaving || isSubmittedRef.current) return;
    if (!selectedGameId || existingDraft) return;

    const hasMeaningfulProgress =
      currentStep > 1 ||
      selectedPlayerIds.length > 0 ||
      (notes && notes.trim().length > 0) ||
      photos.length > 0;

    if (!hasMeaningfulProgress) return;

    const timer = window.setTimeout(() => {
      flushDraftNow();
    }, 600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    selectedGameId,
    datePlayed,
    location,
    durationMinutes,
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
    coopOutcome,
    lowScoreWins,
    scoringMode,
    photos,
    notes,
    currentStep,
    isSaving,
    existingDraft,
  ]);

  const selectedGame = useMemo(
    () => (selectedGameId ? games.find((g) => g.id === selectedGameId) : undefined),
    [games, selectedGameId]
  );

  const scoringTemplate = useMemo(
    () => getScoringTemplateForGame(selectedGame?.name),
    [selectedGame?.name]
  );

  const allAvailablePlayers = useMemo(
    () => [...savedPlayers, ...oneOffPlayers],
    [savedPlayers, oneOffPlayers]
  );

  const latestSession = useMemo(() => {
    if (!sessions || sessions.length === 0) return null;
    return [...sessions].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return (b.datePlayed || '').localeCompare(a.datePlayed || '');
    })[0];
  }, [sessions]);

  const lastSessionPlayers = useMemo(() => {
    if (!latestSession || !latestSession.players) return [];
    return latestSession.players;
  }, [latestSession]);

  const handleCopyPreviousSessionPlayers = () => {
    if (!latestSession || !latestSession.players || latestSession.players.length === 0) return;
    const newGuestList: Player[] = [];
    const ids: string[] = [];

    latestSession.players.forEach((p, idx) => {
      ids.push(p.playerId);
      const exists = allAvailablePlayers.some((ap) => ap.id === p.playerId);
      if (!exists) {
        const guestPlayer: Player = {
          id: p.playerId,
          name: p.playerName,
          avatar: '🎲',
          color: ONE_OFF_COLORS[idx % ONE_OFF_COLORS.length],
          createdAt: new Date().toISOString(),
          isGuest: true,
        };
        newGuestList.push(guestPlayer);
        registerGuestPlayer(guestPlayer);
      }
    });

    if (newGuestList.length > 0) {
      setOneOffPlayers((prev) => [...prev, ...newGuestList]);
    }
    setSelectedPlayerIds(ids);
  };

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
    const hasAnyNumericScore =
      hasTouchedMatrix ||
      activeSessionPlayers.some((p) => typeof scoresByPlayerId[p.id] === 'number');

    if (scoringTemplate.isCoop) {
      // In cooperative games, all players share victory or defeat together via dedicated coopOutcome state
      const coopWinnerIds = resolveCoopWinnerIds(
        coopOutcome,
        activeSessionPlayers.map((p) => p.id)
      );

      return activeSessionPlayers.map((p) => {
        const bd = breakdownsByPlayerId[p.id];
        const hasBd = bd && Object.values(bd).some((v) => v !== 0);
        return {
          playerId: p.id,
          playerName: p.name,
          score: scoresByPlayerId[p.id],
          rank: undefined,
          isWinner: coopWinnerIds.includes(p.id),
          scoreBreakdown: hasBd ? bd : undefined,
        };
      });
    }

    if (hasAnyNumericScore && manualWinnerIds.length === 0) {
      const validScores = activeSessionPlayers
        .map((p) => scoresByPlayerId[p.id])
        .filter((v): v is number => typeof v === 'number');
      const targetBest =
        validScores.length > 0
          ? lowScoreWins
            ? Math.min(...validScores)
            : Math.max(...validScores)
          : undefined;

      const sortedForRank = [...activeSessionPlayers].sort((a, b) => {
        const sa = scoresByPlayerId[a.id];
        const sb = scoresByPlayerId[b.id];
        if (sa === undefined && sb === undefined) return 0;
        if (sa === undefined) return 1;
        if (sb === undefined) return -1;
        return lowScoreWins ? sa - sb : sb - sa;
      });

      // Standard Competition Ranking (1, 1, 3 for ties)
      const ranksByPlayerId: Record<string, number> = {};
      let currentRank = 1;
      for (let i = 0; i < sortedForRank.length; i++) {
        const p = sortedForRank[i];
        const sc = scoresByPlayerId[p.id];
        if (sc === undefined) continue;
        if (i > 0) {
          const prevScore = scoresByPlayerId[sortedForRank[i - 1].id];
          if (sc !== prevScore) {
            currentRank = i + 1;
          }
        }
        ranksByPlayerId[p.id] = currentRank;
      }

      return activeSessionPlayers.map((p) => {
        const sc = scoresByPlayerId[p.id];
        const bd = breakdownsByPlayerId[p.id];
        const hasBd = bd && Object.values(bd).some((v) => v !== 0);
        return {
          playerId: p.id,
          playerName: p.name,
          score: sc,
          rank: ranksByPlayerId[p.id],
          isWinner: sc !== undefined && targetBest !== undefined && sc === targetBest,
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
  }, [
    activeSessionPlayers,
    scoresByPlayerId,
    lowScoreWins,
    manualWinnerIds,
    coopOutcome,
    breakdownsByPlayerId,
    hasTouchedMatrix,
    scoringTemplate.isCoop,
  ]);

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
        isGuest: true,
      };
      registerGuestPlayer(guest);
      setOneOffPlayers((prev) => [...prev, guest]);
      setSelectedPlayerIds((prev) => [...prev, guest.id]);
    }
    setNewGuestName('');
  };

  const handleScoreChange = (playerId: string, score: number | undefined) => {
    if (!scoringTemplate.isCoop) {
      setManualWinnerIds([]);
    }
    setScoresByPlayerId((prev) => ({
      ...prev,
      [playerId]: score,
    }));
  };

  const handleToggleManualWinner = (playerId: string) => {
    if (scoringTemplate.isCoop) {
      setCoopOutcome((prev) => (prev === 'won' ? 'lost' : 'won'));
      return;
    }

    setManualWinnerIds((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    for (const file of fileList) {
      try {
        const compressed = await compressImage(file, 1024, 1024, 0.7);
        if (compressed) {
          const idbRef = await saveMediaImage(compressed);
          setPhotos((prev) => [...prev, idbRef]);
        }
      } catch (err) {
        console.error('Failed to compress image:', err);
      }
    }
    e.target.value = '';
  };

  const handleSaveSession = () => {
    if (!selectedGame || activeSessionPlayers.length === 0 || isSaving || isSubmittedRef.current) return;
    isSubmittedRef.current = true;
    setIsSaving(true);

    try {
      localStorage.removeItem('boardgame_session_draft');
    } catch {}

    oneOffPlayers.forEach((g) => {
      registerGuestPlayer(g);
    });

    const winnerEntry = scoringTemplate.isCoop
      ? (computedPlayerScores.some((p) => p.isWinner) ? computedPlayerScores[0] : undefined)
      : (computedPlayerScores.find((p) => p.isWinner) || computedPlayerScores[0]);

    const cleanDate = (datePlayed || '').split('T')[0] || getLocalDateString();
    const computedIsoDate = buildLocalDateTimeISO(cleanDate, new Date());

    const created = addSession({
      status: 'completed',
      gameId: selectedGame.id,
      gameName: selectedGame.name,
      gameThumbnail: selectedGame.thumbnail || selectedGame.image,
      datePlayed: computedIsoDate,
      location: location.trim() || undefined,
      durationMinutes: Math.max(5, Number(durationMinutes) || 60),
      players: computedPlayerScores,
      winnerId: winnerEntry?.playerId,
      isCoop: scoringTemplate.isCoop || undefined,
      firstPlayerMethod,
      firstPlayerId: firstPlayerId || activeSessionPlayers[0]?.id,
      photos: photos.length > 0 ? photos : undefined,
      notes: notes.trim() || undefined,
    });

    try {
      pushVaultToCloud();
    } catch (err) {
      console.warn('Immediate sync push after session save skipped or failed:', err);
    }

    try {
      localStorage.removeItem('boardgame_session_draft');
    } catch {}

    navigate(`/sessions/${created.id}`, { replace: true });
  };

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6 overflow-x-hidden max-w-full">
        <div className="flex items-center justify-between">
          <Link
            to="/sessions"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sessions
          </Link>
          <span className="text-xs font-mono text-[var(--accent)] font-bold tabular-nums">
            Step {currentStep} of 6
          </span>
        </div>

        {/* Wizard Step Progress Bar */}
        <div className="flex sm:grid sm:grid-cols-6 gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
          {WIZARD_STEPS.map((s) => {
            const isActive = currentStep === s.step;
            const isDone = currentStep > s.step;
            const isLocked =
              (s.step >= 2 && !selectedGame) ||
              (s.step >= 4 && activeSessionPlayers.length === 0);
            return (
              <button
                key={s.step}
                type="button"
                disabled={isLocked}
                onClick={() => {
                  if (!isLocked) setCurrentStep(s.step);
                }}
                className={cn(
                  'min-w-[72px] sm:min-w-0 flex-1 p-1.5 sm:p-2.5 rounded-xl border text-left transition-all shrink-0 select-none',
                  isLocked
                    ? 'opacity-40 cursor-not-allowed bg-[var(--card)]/50 border-[var(--line)] text-[var(--muted)]'
                    : 'cursor-pointer',
                  isActive
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)] font-bold shadow-xs border-[var(--accent)]'
                    : isDone
                    ? 'bg-[var(--good-soft)] border-[var(--good)]/30 text-[var(--good)]'
                    : 'bg-[var(--card)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'
                )}
              >
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span>0{s.step}</span>
                  {isDone && <Check className="w-3.5 h-3.5 text-[var(--good)]" />}
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
                <Button variant="primary" size="sm" onClick={handleRestoreDraft} className="bg-amber-500 text-[#161311] font-bold shadow-md">
                  ▶️ Resume Session
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quota Exceeded Warning Banner */}
        {quotaError && (
          <div className="p-3 bg-[var(--bad-soft)] border border-[var(--bad)]/30 rounded-xl text-[var(--bad)] text-xs flex items-center justify-between gap-3 shadow-md">
            <span>⚠️ {quotaError}</span>
            <button
              type="button"
              onClick={() => setQuotaError(null)}
              className="text-[var(--bad)] hover:opacity-80 text-sm font-bold px-1.5 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Persistent Session Companion Bar (Always Active, Compact on Mobile) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 sm:p-3.5 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            {selectedGame ? (
              <GameCoverImage
                game={selectedGame}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-[var(--line)] shrink-0"
                fallbackIconSize="text-base"
              />
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--card-2)] flex items-center justify-center text-base sm:text-lg shrink-0">
                🎲
              </div>
            )}
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-[var(--accent)] tracking-wider block truncate">
                {selectedGame ? selectedGame.name : 'Setting up game session'}
              </span>
              <span className="text-xs text-[var(--muted)] truncate block">
                {location} · {activeSessionPlayers.length} players
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Stopwatch with Pulsing Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-[var(--card-2)] border border-[var(--line)]">
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  isTimerRunning ? 'bg-[var(--good)] animate-pulse' : 'bg-amber-400'
                )}
              />
              <Clock className="w-3.5 h-3.5 text-[var(--muted)]" />
              <SessionLiveTimer
                sessionStartTime={sessionStartTime}
                isTimerRunning={isTimerRunning}
                pausedDurationMs={pausedDurationMs}
                pauseStartTime={pauseStartTime}
                className="font-mono font-extrabold text-xs sm:text-sm text-[var(--ink)] tabular-nums"
              />
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
              <Step1PickGame
                selectedGame={selectedGame}
                selectedGameId={selectedGameId}
                onSelectGameId={handleSelectGameId}
                games={games}
              />
            )}

            {/* STEP 2: SETUP */}
            {currentStep === 2 && (
              <Step2Setup
                datePlayed={datePlayed}
                setDatePlayed={setDatePlayed}
                location={location}
                setLocation={setLocation}
                durationMinutes={durationMinutes}
                setDurationMinutes={handleManualDurationChange}
                sessionStartTime={sessionStartTime}
                isTimerRunning={isTimerRunning}
                pausedDurationMs={pausedDurationMs}
                pauseStartTime={pauseStartTime}
                onToggleTimer={handleToggleTimer}
                onResetTimer={handleResetTimer}
              />
            )}

            {/* STEP 3: PLAYERS */}
            {currentStep === 3 && (
              <Step3Players
                activeSessionPlayers={activeSessionPlayers}
                latestSession={latestSession}
                lastSessionPlayers={lastSessionPlayers}
                onCopyPreviousSessionPlayers={handleCopyPreviousSessionPlayers}
                allAvailablePlayers={allAvailablePlayers}
                selectedPlayerIds={selectedPlayerIds}
                onTogglePlayer={handleTogglePlayer}
                onClearSelection={() => setSelectedPlayerIds([])}
                newGuestName={newGuestName}
                setNewGuestName={setNewGuestName}
                saveGuestToVault={saveGuestToVault}
                setSaveGuestToVault={setSaveGuestToVault}
                onAddGuestPlayer={handleAddGuestPlayer}
              />
            )}

            {/* STEP 4: WHO GOES FIRST? */}
            {currentStep === 4 && (
              <Step4FirstPlayer
                isRematchMode={isRematchMode}
                selectedGame={selectedGame}
                activeSessionPlayers={activeSessionPlayers}
                location={location}
                firstPlayerAnimStyle={firstPlayerAnimStyle}
                setFirstPlayerAnimStyle={setFirstPlayerAnimStyle}
                playerPickerItems={playerPickerItems}
                firstPlayerId={firstPlayerId}
                firstPlayerMethod={firstPlayerMethod}
                setFirstPlayerId={setFirstPlayerId}
                setFirstPlayerMethod={setFirstPlayerMethod}
                firstPlayerObj={firstPlayerObj}
                onBackToStep3={() => setCurrentStep(3)}
                onContinueToStep5={() => setCurrentStep(5)}
              />
            )}

            {/* STEP 5: SCORE ENTRY */}
            {currentStep === 5 && (
              <Step5Scoring
                lowScoreWins={lowScoreWins}
                setLowScoreWins={setLowScoreWins}
                scoringMode={scoringMode}
                setScoringMode={setScoringMode}
                scoringTemplate={scoringTemplate}
                coopOutcome={coopOutcome}
                onSetCoopOutcome={setCoopOutcome}
                activeSessionPlayers={activeSessionPlayers}
                breakdownsByPlayerId={breakdownsByPlayerId}
                onScoresUpdate={(totals, breakdowns) => {
                  setHasTouchedMatrix(true);
                  setScoresByPlayerId(totals);
                  setBreakdownsByPlayerId(breakdowns);
                  if (!scoringTemplate.isCoop) {
                    setManualWinnerIds([]);
                  }
                }}
                computedPlayerScores={computedPlayerScores}
                allAvailablePlayers={allAvailablePlayers}
                onScoreChange={handleScoreChange}
                onToggleManualWinner={handleToggleManualWinner}
              />
            )}

            {/* STEP 6: MEMORIES & SUMMARY */}
            {currentStep === 6 && (
              <Step6Memories
                photos={photos}
                onPhotoUpload={handlePhotoUpload}
                onRemovePhoto={(idx) => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                notes={notes}
                setNotes={setNotes}
                selectedGame={selectedGame}
                datePlayed={datePlayed}
                durationMinutes={durationMinutes}
                location={location}
                firstPlayerId={firstPlayerId}
                allAvailablePlayers={allAvailablePlayers}
                activeSessionPlayers={activeSessionPlayers}
                computedPlayerScores={computedPlayerScores}
              />
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
              disabled={
                (currentStep === 1 && !selectedGame) ||
                (currentStep === 3 && activeSessionPlayers.length === 0)
              }
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
