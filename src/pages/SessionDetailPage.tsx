import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Crown,
  Sparkles,
  Trash2,
  Edit3,
  Maximize2,
  Plus,
  UserCheck,
  Check,
  X,
  Trophy,
  RotateCcw,
} from 'lucide-react';
import { PageTransition } from '../components/layout/PageTransition';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { PlayerAvatar } from '../components/player/PlayerAvatar';
import { useSessionStore } from '../store/useSessionStore';
import { usePlayerStore } from '../store/usePlayerStore';
import {
  FIRST_PLAYER_METHOD_LABELS,
  formatDate,
  formatDuration,
} from '../lib/utils';
import { PlayerScore, Player } from '../types';
import { ScoringSheetMatrix } from '../components/session/ScoringSheetMatrix';
import { LocationSelector } from '../components/session/LocationSelector';
import { getScoringTemplateForGame, ScoringCategory } from '../lib/scoringPresets';
import { cn } from '../components/ui/cn';

interface EditablePlayerRow {
  playerId: string;
  playerName: string;
  score: string;
  isWinner: boolean;
  isFirstPlayer: boolean;
}

function toDatetimeLocal(isoString?: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const SessionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const session = useSessionStore((s) => s.sessions.find((x) => x.id === id));
  const updateSession = useSessionStore((s) => s.updateSession);
  const deleteSession = useSessionStore((s) => s.deleteSession);
  const savedPlayers = usePlayerStore((s) => s.players);

  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editDatetime, setEditDatetime] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editDuration, setEditDuration] = useState('60');
  const [editNotes, setEditNotes] = useState('');
  const [editPlayers, setEditPlayers] = useState<EditablePlayerRow[]>([]);
  const [addPlayerSelectId, setAddPlayerSelectId] = useState('');
  const [editBreakdowns, setEditBreakdowns] = useState<Record<string, Record<string, number>>>({});
  const [editScoreMode, setEditScoreMode] = useState<'quick' | 'detailed'>('quick');

  const scoringTemplate = React.useMemo(
    () => getScoringTemplateForGame(session?.gameName),
    [session?.gameName]
  );

  const hasBreakdown = React.useMemo(() => {
    return (
      session?.players.some(
        (p) => p.scoreBreakdown && Object.keys(p.scoreBreakdown).length > 0
      ) ?? false
    );
  }, [session?.players]);

  const breakdownCategories = React.useMemo(() => {
    if (!session || !hasBreakdown) return [];
    const catMap = new Map<string, ScoringCategory>();

    // Add template categories first
    scoringTemplate.categories.forEach((c) => catMap.set(c.id, c));

    // Add any extra custom category found in players' scoreBreakdowns
    session.players.forEach((p) => {
      if (p.scoreBreakdown) {
        Object.keys(p.scoreBreakdown).forEach((k) => {
          if (!catMap.has(k)) {
            catMap.set(k, {
              id: k,
              name: k.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
              icon: '✨',
              multiplier: 1,
            });
          }
        });
      }
    });

    return Array.from(catMap.values()).filter((cat) => {
      return (
        session.players.some(
          (p) =>
            typeof p.scoreBreakdown?.[cat.id] === 'number' &&
            p.scoreBreakdown?.[cat.id] !== 0
        ) || scoringTemplate.categories.some((tc) => tc.id === cat.id)
      );
    });
  }, [session, hasBreakdown, scoringTemplate]);

  if (!session) {
    return (
      <PageTransition>
        <Card className="p-8 text-center space-y-4 max-w-md mx-auto">
          <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">
            Session Not Found
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            This session may have been deleted or does not exist.
          </p>
          <Link to="/sessions">
            <Button variant="primary">Back to Sessions</Button>
          </Link>
        </Card>
      </PageTransition>
    );
  }

  const playersById = Object.fromEntries(savedPlayers.map((p) => [p.id, p]));
  const firstPlayer = session.players?.find(
    (p) => p.playerId === session.firstPlayerId
  );

  const sortedResults = [...(session.players || [])].sort((a, b) => {
    if (a.isWinner && !b.isWinner) return -1;
    if (!a.isWinner && b.isWinner) return 1;
    if (typeof a.score === 'number' && typeof b.score === 'number') {
      return b.score - a.score;
    }
    return (a.rank || 99) - (b.rank || 99);
  });

  // Open Edit Modal with full state initialized
  const handleOpenEdit = () => {
    setEditDatetime(toDatetimeLocal(session.datePlayed));
    setEditLocation(session.location || '');
    setEditDuration(String(session.durationMinutes || 60));
    setEditNotes(session.notes || '');

    const rows: EditablePlayerRow[] = (session.players || []).map((p) => ({
      playerId: p.playerId,
      playerName: p.playerName,
      score: typeof p.score === 'number' ? String(p.score) : '',
      isWinner: Boolean(p.isWinner || session.winnerId === p.playerId),
      isFirstPlayer: session.firstPlayerId === p.playerId,
    }));

    setEditPlayers(rows);
    setAddPlayerSelectId('');

    const initialBreakdowns: Record<string, Record<string, number>> = {};
    (session.players || []).forEach((p) => {
      if (p.scoreBreakdown) {
        initialBreakdowns[p.playerId] = { ...p.scoreBreakdown };
      }
    });
    setEditBreakdowns(initialBreakdowns);
    setEditScoreMode(hasBreakdown ? 'detailed' : 'quick');
    setIsEditOpen(true);
  };

  // Toggle winner for a player
  const handleToggleWinner = (playerId: string) => {
    setEditPlayers((prev) =>
      prev.map((p) =>
        p.playerId === playerId ? { ...p, isWinner: !p.isWinner } : p
      )
    );
  };

  // Set exclusive first player
  const handleSetFirstPlayer = (playerId: string) => {
    setEditPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        isFirstPlayer: p.playerId === playerId ? !p.isFirstPlayer : false,
      }))
    );
  };

  // Change a player's score
  const handleScoreChange = (playerId: string, scoreVal: string) => {
    setEditPlayers((prev) =>
      prev.map((p) => (p.playerId === playerId ? { ...p, score: scoreVal } : p))
    );
  };

  // Remove player from session
  const handleRemovePlayer = (playerId: string) => {
    setEditPlayers((prev) => prev.filter((p) => p.playerId !== playerId));
  };

  // Add new player to session
  const handleAddPlayer = () => {
    if (!addPlayerSelectId) return;
    const playerToAdd = savedPlayers.find((p) => p.id === addPlayerSelectId);
    if (!playerToAdd) return;

    if (editPlayers.some((p) => p.playerId === playerToAdd.id)) return;

    setEditPlayers((prev) => [
      ...prev,
      {
        playerId: playerToAdd.id,
        playerName: playerToAdd.name,
        score: '',
        isWinner: false,
        isFirstPlayer: false,
      },
    ]);
    setAddPlayerSelectId('');
  };

  // Auto pick highest score as winner
  const handleAutoWinner = () => {
    let maxScore = -Infinity;
    let winnerId = '';
    for (const p of editPlayers) {
      const num = Number(p.score);
      if (!isNaN(num) && num > maxScore) {
        maxScore = num;
        winnerId = p.playerId;
      }
    }
    if (winnerId) {
      setEditPlayers((prev) =>
        prev.map((p) => ({
          ...p,
          isWinner: p.playerId === winnerId,
        }))
      );
    }
  };

  // Save changes
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();

    // Map rows to PlayerScore[]
    const updatedScores: PlayerScore[] = editPlayers.map((p) => {
      const num = p.score.trim() === '' ? undefined : Number(p.score);
      const bd = editBreakdowns[p.playerId];
      const hasBd = bd && Object.values(bd).some((v) => v !== 0);
      return {
        playerId: p.playerId,
        playerName: p.playerName,
        score: num,
        isWinner: p.isWinner,
        rank: 1,
        scoreBreakdown: hasBd ? bd : undefined,
      };
    });

    // Sort to recalculate ranks
    const sorted = [...updatedScores].sort((a, b) => {
      if (a.isWinner && !b.isWinner) return -1;
      if (!a.isWinner && b.isWinner) return 1;
      return (b.score ?? -999999) - (a.score ?? -999999);
    });

    sorted.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    const activeWinner = editPlayers.find((p) => p.isWinner);
    const activeFirstPlayer = editPlayers.find((p) => p.isFirstPlayer);

    const newDate = editDatetime
      ? new Date(editDatetime).toISOString()
      : session.datePlayed;

    updateSession(session.id, {
      datePlayed: newDate,
      location: editLocation.trim() || undefined,
      durationMinutes: Number(editDuration) || session.durationMinutes,
      notes: editNotes.trim() || undefined,
      players: sorted,
      winnerId: activeWinner ? activeWinner.playerId : undefined,
      firstPlayerId: activeFirstPlayer ? activeFirstPlayer.playerId : undefined,
    });

    setIsEditOpen(false);
  };

  const handleDelete = () => {
    if (!session) return;
    if (window.confirm('Are you sure you want to delete this session from history?')) {
      const sessionId = session.id;
      navigate('/sessions', { replace: true });
      setTimeout(() => {
        deleteSession(sessionId);
      }, 50);
    }
  };

  const handleRematch = () => {
    if (!session) return;
    const playerIds = (session.players || []).map((p) => p.playerId).join(',');
    const encodedLocation = encodeURIComponent(session.location || '');
    // Navigate straight to Step 4 (Who Goes First) in rematch mode
    navigate(
      `/sessions/new?gameId=${session.gameId}&playerIds=${playerIds}&location=${encodedLocation}&step=4&mode=rematch`
    );
  };

  const availablePlayersToAdd = savedPlayers.filter(
    (p) => !editPlayers.some((ep) => ep.playerId === p.id)
  );

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/sessions"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sessions
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleRematch}
              className="bg-[image:var(--gradient-hero)] text-white shadow-md shadow-[var(--accent-glow)] font-bold"
              title="Launch rematch keeping game, players, and location, skipping to first player picker"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Rematch
            </Button>
            <Button variant="secondary" size="sm" onClick={handleOpenEdit}>
              <Edit3 className="w-4 h-4 mr-1.5 text-[var(--accent-neon)]" />
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete
            </Button>
          </div>
        </div>

        {/* Hero Banner */}
        <div className="rounded-3xl overflow-hidden bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6 shadow-2xl">
          <Link to={`/collection/${session.gameId}`} className="shrink-0">
            <img
              src={session.gameThumbnail}
              alt={session.gameName}
              referrerPolicy="no-referrer"
              className="w-24 h-32 rounded-2xl object-cover border border-[var(--border-subtle)] hover:scale-105 transition-transform bg-[var(--bg-elevated)]"
            />
          </Link>

          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <Link
                to={`/collection/${session.gameId}`}
                className="font-display font-extrabold text-2xl sm:text-3xl text-[var(--text-primary)] hover:text-[var(--accent-neon)] transition-colors block truncate"
              >
                {session.gameName}
              </Link>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                Completed
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-[var(--text-secondary)] tabular-nums">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[var(--accent-neon)]" />
                {formatDate(session.datePlayed)}
              </span>
              {session.durationMinutes && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[var(--accent-secondary)]" />
                  {formatDuration(session.durationMinutes)}
                </span>
              )}
              {session.location && (
                <span className="inline-flex items-center gap-1.5 truncate max-w-[240px]">
                  <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="truncate">{session.location}</span>
                </span>
              )}
            </div>

            {firstPlayer && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
                <span>
                  First player:{' '}
                  <strong className="text-[var(--text-primary)] font-bold">
                    {firstPlayer.playerName}
                  </strong>{' '}
                  ({FIRST_PLAYER_METHOD_LABELS[session.firstPlayerMethod] ||
                    session.firstPlayerMethod})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Player Results Table */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-xl text-[var(--text-primary)]">
              Leaderboard &amp; Rankings
            </h2>
            <Button variant="ghost" size="sm" onClick={handleOpenEdit}>
              <Edit3 className="w-3.5 h-3.5 mr-1" />
              Edit Scores &amp; Winner
            </Button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-elevated)] text-xs text-[var(--text-secondary)]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Rank</th>
                  <th className="py-3.5 px-4 font-semibold">Player</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Score</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--bg-surface)] tabular-nums">
                {sortedResults.map((entry, idx) => {
                  const savedPlayer = playersById[entry.playerId];
                  const isWin =
                    entry.isWinner || session.winnerId === entry.playerId;

                  return (
                    <tr
                      key={entry.playerId}
                      className={isWin ? 'bg-amber-500/[0.08]' : ''}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-[var(--text-secondary)]">
                        #{entry.rank || idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/players/${entry.playerId}`}
                          className="inline-flex items-center gap-2.5 font-display font-bold text-[var(--text-primary)] hover:text-[var(--accent-neon)] transition-colors"
                        >
                          <PlayerAvatar
                            player={savedPlayer}
                            name={entry.playerName}
                            size="sm"
                          />
                          <span>{entry.playerName}</span>
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-base text-[var(--text-primary)]">
                        {typeof entry.score === 'number' ? entry.score : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isWin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                            <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            Winner
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--text-secondary)]">Played</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Scoring Breakdown Details */}
        {hasBreakdown && breakdownCategories.length > 0 && (
          <Card className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xl shadow-inner">
                  📊
                </div>
                <div>
                  <h2 className="font-display font-bold text-xl text-[var(--text-primary)]">
                    Scoring Breakdown Details
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {scoringTemplate.displayName} · Detailed category score analysis
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-xl bg-[var(--bg-elevated)] text-[var(--accent-neon)] border border-[var(--border-subtle)] w-fit">
                {breakdownCategories.length} Categories
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
                    <th className="py-3 px-4 font-bold text-[var(--text-secondary)] min-w-[200px]">
                      Scoring Category
                    </th>
                    {session.players.map((p) => {
                      const savedPlayer = playersById[p.playerId];
                      const isLeader = p.isWinner || session.winnerId === p.playerId;
                      return (
                        <th
                          key={p.playerId}
                          className={cn(
                            'py-3 px-3 text-center min-w-[110px] transition-colors',
                            isLeader && 'bg-amber-500/10'
                          )}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <PlayerAvatar player={savedPlayer} name={p.playerName} size="sm" />
                            <span className="font-bold text-[var(--text-primary)] truncate max-w-[90px]">
                              {p.playerName}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] tabular-nums">
                  {breakdownCategories.map((cat) => {
                    const scoresInCat = session.players.map((p) => p.scoreBreakdown?.[cat.id] ?? 0);
                    const maxScoreInCat = Math.max(...scoresInCat);
                    const isPenalty = (cat.multiplier ?? 1) < 0;

                    return (
                      <tr key={cat.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 px-4 font-medium text-[var(--text-primary)]">
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none">{cat.icon || '🎲'}</span>
                            <span>{cat.name}</span>
                            {isPenalty && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold shrink-0">
                                - penalty
                              </span>
                            )}
                          </div>
                        </td>
                        {session.players.map((p) => {
                          const val = p.scoreBreakdown?.[cat.id];
                          const numVal = typeof val === 'number' ? val : 0;
                          const isTop = maxScoreInCat > 0 && numVal === maxScoreInCat;

                          return (
                            <td
                              key={p.playerId}
                              className={cn(
                                'py-2.5 px-3 text-center font-mono font-bold text-xs',
                                isTop ? 'text-amber-400 font-extrabold' : 'text-[var(--text-secondary)]',
                                isPenalty && numVal > 0 && 'text-rose-400'
                              )}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <span>{numVal}</span>
                                {isTop && !isPenalty && (
                                  <span className="text-xs" title="Highest in category">
                                    🥇
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-[var(--bg-elevated)] border-t-2 border-[var(--border-glow)] font-bold">
                    <td className="py-3 px-4 font-extrabold text-[var(--text-primary)]">
                      TOTAL SCORE
                    </td>
                    {session.players.map((p) => {
                      const isLeader = p.isWinner || session.winnerId === p.playerId;
                      return (
                        <td
                          key={p.playerId}
                          className={cn(
                            'py-3 px-3 text-center font-mono text-sm font-extrabold',
                            isLeader ? 'bg-amber-500/20 text-amber-300' : 'text-[var(--text-primary)]'
                          )}
                        >
                          <div className="flex items-center justify-center gap-1">
                            {isLeader && <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />}
                            <span>{p.score ?? 0}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )}

        {/* Notes & Memories */}
        {session.notes && (
          <Card className="p-6 space-y-2">
            <h2 className="font-display font-bold text-lg text-[var(--text-primary)]">
              Session Notes
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
              {session.notes}
            </p>
          </Card>
        )}

        {/* Photos Gallery */}
        {session.photos && session.photos.length > 0 && (
          <Card className="p-6 space-y-4">
            <h2 className="font-display font-bold text-lg text-[var(--text-primary)]">
              Game Night Photos ({session.photos.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {session.photos.map((photo, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setFullscreenPhoto(photo)}
                  className="group relative aspect-video rounded-2xl overflow-hidden border border-[var(--border-subtle)] cursor-pointer"
                >
                  <img
                    src={photo}
                    alt={`Session memory ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Maximize2 className="w-5 h-5 text-white" />
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Quick Rematch Callout */}
        <Card className="p-6 bg-gradient-to-r from-[var(--bg-surface)] via-[var(--bg-elevated)] to-[var(--bg-surface)] border-[var(--border-glow)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎲</span>
              <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
                Ready for another round with the crew?
              </h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Instantly launch a rematch with <strong>{session.gameName}</strong>, <strong>{session.players.length} players</strong> at <strong>{session.location || 'current venue'}</strong>, skipping directly to first player picker!
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={handleRematch}
            className="shrink-0 bg-[image:var(--gradient-hero)] text-white shadow-lg shadow-[var(--accent-glow)] font-bold"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Play Rematch
          </Button>
        </Card>

        {/* Fullscreen Photo Modal */}
        <Modal
          isOpen={Boolean(fullscreenPhoto)}
          onClose={() => setFullscreenPhoto(null)}
          title="Session Photo"
          maxWidthClass="max-w-4xl"
        >
          {fullscreenPhoto && (
            <img
              src={fullscreenPhoto}
              alt="Fullscreen session memory"
              className="w-full max-h-[75vh] object-contain rounded-xl mx-auto"
            />
          )}
        </Modal>

        {/* FULL EDIT SESSION MODAL */}
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title="Edit Session Details"
          maxWidthClass="max-w-2xl"
        >
          <form onSubmit={handleSaveEdit} className="space-y-5 text-sm">
            {/* 1. Date & Time, Duration, Location */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={editDatetime}
                  onChange={(e) => setEditDatetime(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                  placeholder="60"
                />
              </div>

              <div className="sm:col-span-2">
                <LocationSelector
                  selectedLocation={editLocation}
                  onSelectLocation={setEditLocation}
                  label="Venue Location"
                  placeholder="Select from list or type location..."
                />
              </div>
            </div>

            {/* 2. Players & Scores Section */}
            <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-[var(--text-primary)] text-sm">
                    Players, Scores &amp; Winners
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Choose quick total entry or category breakdown
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditScoreMode(editScoreMode === 'detailed' ? 'quick' : 'detailed')}
                    className="px-3 py-1 rounded-xl text-xs font-bold bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--accent-neon)] hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{editScoreMode === 'detailed' ? '⚡ Switch to Quick Entry' : '📊 Detailed Score Sheet'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAutoWinner}
                    className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-[var(--bg-elevated)] text-[var(--accent-secondary)] hover:brightness-110 border border-[var(--border-subtle)] cursor-pointer"
                  >
                    ⚡ Auto Highest Score
                  </button>
                </div>
              </div>

              {editScoreMode === 'detailed' ? (
                <div className="space-y-3 p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <div className="text-xs font-bold text-[var(--accent-neon)]">
                    📊 {scoringTemplate.displayName}
                  </div>
                  <ScoringSheetMatrix
                    players={editPlayers.map((ep) => {
                      const sp = playersById[ep.playerId];
                      return (
                        sp || {
                          id: ep.playerId,
                          name: ep.playerName,
                          avatar: '🎲',
                          color: '#f97316',
                          createdAt: new Date().toISOString(),
                        }
                      );
                    })}
                    initialCategories={scoringTemplate.categories}
                    initialBreakdowns={editBreakdowns}
                    onScoresUpdate={(totals, breakdowns) => {
                      setEditBreakdowns(breakdowns);
                      setEditPlayers((prev) =>
                        prev.map((p) => ({
                          ...p,
                          score: totals[p.playerId] !== undefined ? String(totals[p.playerId]) : p.score,
                        }))
                      );
                    }}
                  />
                </div>
              ) : null}

              {/* Player Rows */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {editPlayers.map((p) => {
                  const saved = playersById[p.playerId];
                  return (
                    <div
                      key={p.playerId}
                      className={cn(
                        'flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-colors',
                        p.isWinner
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'bg-[var(--bg-surface)] border-[var(--border-subtle)]'
                      )}
                    >
                      {/* Avatar & Name */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <PlayerAvatar player={saved} name={p.playerName} size="sm" />
                        <span className="font-bold text-xs text-[var(--text-primary)] truncate">
                          {p.playerName}
                        </span>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* First player toggle */}
                        <button
                          type="button"
                          onClick={() => handleSetFirstPlayer(p.playerId)}
                          title="Assign first player"
                          className={cn(
                            'px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer',
                            p.isFirstPlayer
                              ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                              : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                          )}
                        >
                          First
                        </button>

                        {/* Winner Crown button */}
                        <button
                          type="button"
                          onClick={() => handleToggleWinner(p.playerId)}
                          title={p.isWinner ? 'Remove winner status' : 'Set as winner'}
                          className={cn(
                            'p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold',
                            p.isWinner
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                              : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-amber-400'
                          )}
                        >
                          <Crown className="w-3.5 h-3.5 fill-current" />
                          <span className="text-[10px] hidden sm:inline">
                            {p.isWinner ? 'Winner' : 'Defeat'}
                          </span>
                        </button>

                        {/* Score Input */}
                        <input
                          type="number"
                          placeholder="Score"
                          value={p.score}
                          onChange={(e) => handleScoreChange(p.playerId, e.target.value)}
                          className="w-20 min-h-[36px] rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2.5 py-1 text-right font-mono font-bold text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                        />

                        {/* Remove Player Button */}
                        <button
                          type="button"
                          onClick={() => handleRemovePlayer(p.playerId)}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Remove from session"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add player row */}
              {availablePlayersToAdd.length > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <select
                    aria-label="Add player to session"
                    value={addPlayerSelectId}
                    onChange={(e) => setAddPlayerSelectId(e.target.value)}
                    className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] cursor-pointer"
                  >
                    <option value="">+ Add another friend to session...</option>
                    {availablePlayersToAdd.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleAddPlayer}
                    disabled={!addPlayerSelectId}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add
                  </Button>
                </div>
              )}
            </div>

            {/* 3. Notes */}
            <div className="space-y-1.5 pt-2 border-t border-[var(--border-subtle)]">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                Session notes
              </label>
              <textarea
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Strategies, fun memories, epic combos..."
                className="w-full rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <Button variant="ghost" size="sm" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                <Check className="w-4 h-4 mr-1.5" />
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </PageTransition>
  );
};

export default SessionDetailPage;
