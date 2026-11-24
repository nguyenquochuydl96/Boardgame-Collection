import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Clock,
  Star,
  Wallet,
  UserCheck,
  Play,
  Edit3,
  Trash2,
  Trophy,
  Save,
  Coffee,
  ArrowUpRight,
  Upload,
  RotateCcw,
} from 'lucide-react';
import { PageTransition } from '../components/layout/PageTransition';
import { GameStatusBadge } from '../components/game/GameStatusBadge';
import { GameCoverImage } from '../components/game/GameCoverImage';
import { SessionCard } from '../components/session/SessionCard';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { cn } from '../components/ui/cn';
import { useGameStore } from '../store/useGameStore';
import { useSessionStore } from '../store/useSessionStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { saveMediaImage } from '../lib/mediaStorage';
import {
  calculateGameStats,
  formatDate,
  formatDuration,
  formatNumber,
  formatPlayerRange,
  formatVND,
  formatNumberInput,
  parseNumberInput,
  pluralize,
  STATUS_CONFIG,
  resolveGameScoringMode,
} from '../lib/utils';
import { GameStatus, GameScoringMode } from '../types';

export const GameDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const game = useGameStore((s) => s.games.find((g) => g.id === id));
  const updateGame = useGameStore((s) => s.updateGame);
  const deleteGame = useGameStore((s) => s.deleteGame);

  const allSessions = useSessionStore((s) => s.sessions);
  const players = usePlayerStore((s) => s.players);

  const [notesDraft, setNotesDraft] = useState(game?.notes || '');
  const [notesSaved, setNotesSaved] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [visibleSessionsCount, setVisibleSessionsCount] = useState(15);

  // Edit modal state
  const [editName, setEditName] = useState(game?.name || '');
  const [editPurchasePrice, setEditPurchasePrice] = useState(
    game?.purchasePrice ? formatNumberInput(game.purchasePrice) : ''
  );
  const [editSellPrice, setEditSellPrice] = useState(
    game?.sellPrice ? formatNumberInput(game.sellPrice) : ''
  );
  const [editLentTo, setEditLentTo] = useState(game?.lentToName || '');
  const [editMinPlayers, setEditMinPlayers] = useState<string>(String(game?.minPlayers ?? 1));
  const [editMaxPlayers, setEditMaxPlayers] = useState<string>(String(game?.maxPlayers ?? 4));
  const [editPlayingTime, setEditPlayingTime] = useState<string>(String(game?.playingTime ?? 60));
  const [editBggRating, setEditBggRating] = useState<string>(
    game?.bggRating !== undefined ? String(game.bggRating) : ''
  );
  const [editTags, setEditTags] = useState<string>((game?.tags || []).join(', '));
  const [editCoverUrl, setEditCoverUrl] = useState<string>(game?.image || game?.thumbnail || '');
  const [editScoringMode, setEditScoringMode] = useState<GameScoringMode | 'auto'>(
    game?.scoringMode || 'auto'
  );
  const [editError, setEditError] = useState<string | null>(null);

  const autoResolvedMode = React.useMemo(() => {
    if (!game) return 'points';
    return resolveGameScoringMode({ ...game, scoringMode: undefined }, allSessions);
  }, [game, allSessions]);

  const gameSessions = React.useMemo(() => {
    if (!game) return [];
    return allSessions
      .filter((s) => s.gameId === game.id)
      .sort((a, b) => (b.datePlayed || '').localeCompare(a.datePlayed || ''));
  }, [allSessions, game?.id]);

  const stats = React.useMemo(() => calculateGameStats(gameSessions), [gameSessions]);

  const playersById = React.useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])),
    [players]
  );

  useEffect(() => {
    setNotesDraft(game?.notes || '');
    if (game) {
      setEditScoringMode(game.scoringMode || 'auto');
    }
  }, [game?.id, game?.notes, game?.scoringMode]);

  if (!game) {
    return (
      <PageTransition>
        <Card className="p-8 text-center space-y-4 bg-[var(--card)] border border-[var(--line)]">
          <h1 className="font-display font-bold text-2xl text-[var(--ink)]">
            Game Not Found
          </h1>
          <p className="text-sm text-[var(--muted)]">
            This boardgame may have been removed from your collection.
          </p>
          <Link to="/collection">
            <Button variant="primary">Back to Collection</Button>
          </Link>
        </Card>
      </PageTransition>
    );
  }

  const handleSaveNotes = () => {
    updateGame(game.id, { notes: notesDraft });
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      try {
        const ref = await saveMediaImage(dataUrl);
        setEditCoverUrl(ref);
      } catch {
        setEditCoverUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const minP = Math.max(1, Number(editMinPlayers) || 1);
    const maxP = Math.max(1, Number(editMaxPlayers) || 1);
    if (minP > maxP) {
      setEditError('Min players cannot be greater than Max players.');
      return;
    }

    const parsedPlaytime = Math.max(5, Number(editPlayingTime) || game.playingTime || 60);
    const parsedBgg =
      editBggRating.trim() !== '' && !isNaN(Number(editBggRating))
        ? Math.min(10, Math.max(0, Number(editBggRating)))
        : undefined;
    const parsedTags = editTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const trimmedCover = editCoverUrl.trim();

    updateGame(game.id, {
      name: editName.trim() || game.name,
      purchasePrice: parseNumberInput(editPurchasePrice),
      sellPrice: parseNumberInput(editSellPrice),
      lentToName: editLentTo.trim() || undefined,
      minPlayers: minP,
      maxPlayers: maxP,
      playingTime: parsedPlaytime,
      bggRating: parsedBgg,
      tags: parsedTags.length > 0 ? parsedTags : undefined,
      scoringMode: editScoringMode === 'auto' ? undefined : editScoringMode,
      image: trimmedCover || undefined,
      thumbnail: trimmedCover || undefined,
    });
    setEditError(null);
    setIsEditOpen(false);
  };

  const handleDelete = () => {
    if (!game) return;
    const gameId = game.id;
    navigate('/collection', { replace: true });
    setTimeout(() => {
      deleteGame(gameId);
    }, 50);
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Back button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link
            to="/collection"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Collection
          </Link>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsStatusOpen(true)}
              className="text-xs sm:text-sm px-2.5 sm:px-3"
            >
              Change Status
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditName(game.name);
                setEditPurchasePrice(game.purchasePrice ? formatNumberInput(game.purchasePrice) : '');
                setEditSellPrice(game.sellPrice ? formatNumberInput(game.sellPrice) : '');
                setEditLentTo(game.lentToName || '');
                setEditMinPlayers(String(game.minPlayers || 1));
                setEditMaxPlayers(String(game.maxPlayers || 4));
                setEditPlayingTime(String(game.playingTime || 60));
                setEditBggRating(game.bggRating !== undefined ? String(game.bggRating) : '');
                setEditTags((game.tags || []).join(', '));
                setEditCoverUrl(game.image || game.thumbnail || '');
                setEditError(null);
                setIsEditOpen(true);
              }}
              className="text-xs sm:text-sm px-2.5 sm:px-3"
            >
              <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="text-xs sm:text-sm px-2.5 sm:px-3"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
              Delete
            </Button>
          </div>
        </div>

        {/* Hero Cover Section */}
        <div className="relative rounded-3xl overflow-hidden border border-[var(--line)] bg-[var(--card)] shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
            <GameCoverImage
              game={game}
              loading="eager"
              className="md:col-span-4 aspect-[4/3] md:aspect-auto min-h-[240px]"
              fallbackIconClassName="w-12 h-12"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--card)]/70 via-transparent to-transparent md:hidden pointer-events-none" />
            </GameCoverImage>

            <div className="md:col-span-8 p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <GameStatusBadge status={game.status} />
                  <span className="text-xs text-[var(--muted)] tabular-nums font-semibold">
                    Published {game.yearPublished}
                  </span>
                  {game.bggRating && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                      {game.bggRating.toFixed(1)} / 10 BGG
                    </span>
                  )}
                </div>

                <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-[var(--ink)]">
                  {game.name}
                </h1>

                <p className="text-sm sm:text-base text-[var(--ink-2)] leading-relaxed">
                  {game.description}
                </p>
              </div>

              {/* Info Row & Primary CTA */}
              <div className="pt-4 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-5 text-sm text-[var(--ink)] tabular-nums">
                  <span className="inline-flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <strong>{formatPlayerRange(game.minPlayers, game.maxPlayers, 'full')}</strong>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <strong>{game.playingTime}</strong> {game.playingTime === 1 ? 'Min' : 'Mins'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {gameSessions.length > 0 && (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        navigate('/sessions/new', {
                          state: { rematchSession: gameSessions[0] },
                        })
                      }
                      className="min-h-[40px] px-3 font-bold"
                      title="Play again with same players and venue from most recent session"
                    >
                      <RotateCcw className="w-4 h-4 mr-1.5" />
                      Play Again
                    </Button>
                  )}
                  <Link to={`/sessions/new?gameId=${game.id}`}>
                    <Button variant="primary">
                      <Play className="w-4 h-4 fill-current" />
                      Record New Session
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial & Lent Info + Game Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Valuation, Lent Info, Notes */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="p-6 space-y-4 bg-[var(--card)] border border-[var(--line)]">
              <div className="flex items-center gap-2.5">
                <Wallet className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                <h2 className="font-display font-bold text-lg text-[var(--ink)]">
                  Financial &amp; Status Details
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3 tabular-nums">
                <div className="p-3.5 rounded-xl bg-[var(--card-2)] border border-[var(--line)]">
                  <span className="text-xs text-[var(--muted)]">Purchase Price</span>
                  <p className="font-mono font-bold text-base sm:text-lg text-[var(--ink)] mt-1">
                    {formatVND(game.purchasePrice)}
                  </p>
                </div>

                {game.status === 'sold' ? (
                  <div className="p-3.5 rounded-xl bg-pink-500/10 border border-pink-500/30">
                    <span className="text-xs text-pink-700 dark:text-pink-300">Sell Price</span>
                    <p className="font-mono font-bold text-base sm:text-lg text-pink-700 dark:text-pink-200 mt-1">
                      {formatVND(game.sellPrice)}
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-[var(--card-2)] border border-[var(--line)]">
                    <span className="text-xs text-[var(--muted)]">Added to Collection</span>
                    <p className="font-semibold text-sm text-[var(--ink)] mt-1">
                      {formatDate(game.addedDate)}
                    </p>
                  </div>
                )}
              </div>

              {game.status === 'rented' && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/35 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                    <Coffee className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-amber-700 dark:text-amber-300 font-bold">Rented / Cafe Play</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      Tabletop game played at cafes or rented — excluded from total personal collection valuation.
                    </p>
                  </div>
                </div>
              )}

              {game.status === 'lent_out' && (
                <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/35 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0" />
                    <div>
                      <p className="text-xs text-orange-700 dark:text-orange-300 font-semibold">
                        Currently Lent Out To
                      </p>
                      <p className="font-display font-bold text-base text-[var(--ink)]">
                        {game.lentToName || 'Friend'}
                      </p>
                    </div>
                  </div>
                  {game.lentDate && (
                    <span className="text-xs text-orange-700 dark:text-orange-300 tabular-nums">
                      Since {formatDate(game.lentDate)}
                    </span>
                  )}
                </div>
              )}
            </Card>

            {/* Editable My Notes */}
            <Card className="p-6 space-y-4 bg-[var(--card)] border border-[var(--line)]">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-lg text-[var(--ink)]">
                  My Notes
                </h2>
                {notesSaved && (
                  <span className="text-xs font-semibold text-[var(--good)]">
                    Saved!
                  </span>
                )}
              </div>
              <textarea
                aria-label="My notes for this boardgame"
                rows={4}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Sleeve sizes, expansions included, favorite house rules..."
                className="w-full rounded-xl bg-[var(--card-2)] border border-[var(--line)] p-3.5 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSaveNotes}
              >
                <Save className="w-4 h-4" />
                Save Notes
              </Button>
            </Card>
          </div>

          {/* Right Column: Game Stats & Win Rates + Play History */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="p-6 space-y-5 bg-[var(--card)] border border-[var(--line)]">
              <h2 className="font-display font-bold text-lg text-[var(--ink)]">
                Stats for {game.name}
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
                {stats.totalPlays > 0 ? (
                  <Link
                    to={`/sessions?gameId=${game.id}`}
                    className="p-3.5 rounded-xl bg-[var(--card-2)] border border-[var(--line)] hover:border-[var(--accent)] hover:shadow-md transition-all group block cursor-pointer"
                    title={`View all ${pluralize(stats.totalPlays, 'session')} of ${game.name}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--muted)]">Total Plays</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors" />
                    </div>
                    <p className="font-display font-extrabold text-2xl text-[var(--accent)] mt-1">
                      {formatNumber(stats.totalPlays)}
                    </p>
                  </Link>
                ) : (
                  <div className="p-3.5 rounded-xl bg-[var(--card-2)] border border-[var(--line)]">
                    <span className="text-xs text-[var(--muted)]">Total Plays</span>
                    <p className="font-display font-extrabold text-2xl text-[var(--accent)] mt-1">
                      {formatNumber(stats.totalPlays)}
                    </p>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-[var(--card-2)] border border-[var(--line)]">
                  <span className="text-xs text-[var(--muted)]">Avg Duration</span>
                  <p className="font-display font-extrabold text-2xl text-cyan-600 dark:text-cyan-400 mt-1">
                    {formatDuration(stats.averageDuration)}
                  </p>
                </div>

                {stats.highestScore?.sessionId ? (
                  <Link
                    to={`/sessions/${stats.highestScore.sessionId}`}
                    className="p-3.5 rounded-xl bg-[var(--card-2)] border border-[var(--line)] hover:border-[var(--accent)] hover:shadow-md transition-all group block cursor-pointer"
                    title={`View record session of ${stats.highestScore.playerName} (${formatNumber(stats.highestScore.score)} pts)`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--muted)]">Highest Score</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors" />
                    </div>
                    <p className="font-mono font-extrabold text-xl text-[var(--accent)] mt-1">
                      {formatNumber(stats.highestScore.score)}
                    </p>
                    <span className="text-[11px] text-[var(--muted)] group-hover:text-[var(--accent)] truncate block transition-colors">
                      {stats.highestScore.playerName}
                    </span>
                  </Link>
                ) : (
                  <div className="p-3.5 rounded-xl bg-[var(--card-2)] border border-[var(--line)]">
                    <span className="text-xs text-[var(--muted)]">Highest Score</span>
                    <p className="font-mono font-extrabold text-xl text-[var(--accent)] mt-1">
                      {stats.highestScore ? formatNumber(stats.highestScore.score) : '—'}
                    </p>
                    {stats.highestScore && (
                      <span className="text-[11px] text-[var(--muted)] truncate block">
                        {stats.highestScore.playerName}
                      </span>
                    )}
                  </div>
                )}

                {stats.lowestScore?.sessionId ? (
                  <Link
                    to={`/sessions/${stats.lowestScore.sessionId}`}
                    className="p-3.5 rounded-xl bg-[var(--card-2)] border border-[var(--line)] hover:border-rose-500/60 hover:shadow-md transition-all group block cursor-pointer"
                    title={`View session of ${stats.lowestScore.playerName} (${formatNumber(stats.lowestScore.score)} pts)`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--muted)]">Lowest Score</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[var(--muted)] group-hover:text-rose-500 transition-colors" />
                    </div>
                    <p className="font-mono font-extrabold text-xl text-rose-600 dark:text-rose-400 mt-1">
                      {formatNumber(stats.lowestScore.score)}
                    </p>
                    <span className="text-[11px] text-[var(--muted)] group-hover:text-rose-500 truncate block transition-colors">
                      {stats.lowestScore.playerName}
                    </span>
                  </Link>
                ) : (
                  <div className="p-3.5 rounded-xl bg-[var(--card-2)] border border-[var(--line)]">
                    <span className="text-xs text-[var(--muted)]">Lowest Score</span>
                    <p className="font-mono font-extrabold text-xl text-rose-600 dark:text-rose-400 mt-1">
                      {stats.lowestScore ? formatNumber(stats.lowestScore.score) : '—'}
                    </p>
                    {stats.lowestScore && (
                      <span className="text-[11px] text-[var(--muted)] truncate block">
                        {stats.lowestScore.playerName}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Win rate per player mini list */}
              {stats.playerWinRates.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                    Win Rate Per Player
                  </h3>
                  <div className="space-y-2">
                    {stats.playerWinRates.map((pw) => (
                      <div
                        key={pw.playerId}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--card-2)] border border-[var(--line)] text-xs sm:text-sm tabular-nums"
                      >
                        <div className="flex items-center gap-2 font-semibold text-[var(--ink)]">
                          <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                          <span>{pw.playerName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[var(--muted)]">
                            {formatNumber(pw.wins)}W / {formatNumber(pw.plays)}G
                          </span>
                          <span className="font-mono font-bold text-[var(--good)] w-12 text-right">
                            {pw.winRate}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Play History Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-lg text-[var(--ink)]">
                  Play History ({formatNumber(gameSessions.length)})
                </h2>
                <div className="flex items-center gap-2">
                  {gameSessions.length > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        navigate('/sessions/new', {
                          state: { rematchSession: gameSessions[0] },
                        })
                      }
                      className="font-bold text-xs"
                      title="Play again with same players and venue from most recent session"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Play Again
                    </Button>
                  )}
                  <Link to={`/sessions/new?gameId=${game.id}`}>
                    <Button variant="ghost" size="sm">
                      + Log Session
                    </Button>
                  </Link>
                </div>
              </div>

              {gameSessions.length > 0 ? (
                <div className="space-y-3">
                  {gameSessions.slice(0, visibleSessionsCount).map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      playersById={playersById}
                    />
                  ))}
                  {visibleSessionsCount < gameSessions.length && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setVisibleSessionsCount((prev) => prev + 20)}
                      className="w-full justify-center"
                    >
                      Load More Sessions ({formatNumber(gameSessions.length - visibleSessionsCount)} remaining)
                    </Button>
                  )}
                </div>
              ) : (
                <Card className="p-8 text-center space-y-3">
                  <p className="text-sm text-[var(--muted)]">
                    No sessions recorded for {game.name} yet.
                  </p>
                  <Link to={`/sessions/new?gameId=${game.id}`}>
                    <Button variant="primary" size="sm">
                      Record First Play
                    </Button>
                  </Link>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Change Status Modal */}
        <Modal
          isOpen={isStatusOpen}
          onClose={() => setIsStatusOpen(false)}
          title="Change Game Status"
        >
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(STATUS_CONFIG) as GameStatus[]).map((st) => {
              const cfg = STATUS_CONFIG[st];
              const active = game.status === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    updateGame(game.id, { status: st });
                    setIsStatusOpen(false);
                  }}
                  style={{
                    borderColor: active ? cfg.color : 'var(--line)',
                    backgroundColor: active ? cfg.bg : 'var(--card-2)',
                  }}
                  className="p-3.5 rounded-xl border text-left transition-all cursor-pointer hover:border-[var(--line-2)]"
                >
                  <p
                    style={{ color: cfg.color }}
                    className="font-display font-bold text-sm"
                  >
                    {cfg.label}
                  </p>
                </button>
              );
            })}
          </div>
        </Modal>

        {/* Edit Details Modal */}
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title={`Edit ${game.name}`}
          maxWidthClass="max-w-lg"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <Input
              label="Game Title"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />

            {/* Players & Playtime */}
            <div className="grid grid-cols-3 gap-2.5">
              <Input
                label="Min Players"
                type="number"
                min={1}
                max={99}
                value={editMinPlayers}
                onChange={(e) => {
                  setEditMinPlayers(e.target.value);
                  setEditError(null);
                }}
              />
              <Input
                label="Max Players"
                type="number"
                min={1}
                max={99}
                value={editMaxPlayers}
                onChange={(e) => {
                  setEditMaxPlayers(e.target.value);
                  setEditError(null);
                }}
              />
              <Input
                label="Playtime (min)"
                type="number"
                min={5}
                value={editPlayingTime}
                onChange={(e) => setEditPlayingTime(e.target.value)}
              />
            </div>

            {editError && (
              <p className="text-xs font-bold text-[var(--bad)] bg-[var(--bad-soft)] border border-[var(--bad)]/30 rounded-xl px-3 py-2">
                {editError}
              </p>
            )}

            {/* BGG Rating & Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="BGG Rating (0–10)"
                type="number"
                step="0.1"
                min={0}
                max={10}
                placeholder="e.g. 8.4"
                value={editBggRating}
                onChange={(e) => setEditBggRating(e.target.value)}
              />
              <Input
                label="Purchase Price (VND)"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 1,450,000"
                value={editPurchasePrice}
                onChange={(e) => setEditPurchasePrice(formatNumberInput(e.target.value))}
              />
            </div>

            {game.status === 'sold' && (
              <Input
                label="Sell Price (VND)"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 950,000"
                value={editSellPrice}
                onChange={(e) => setEditSellPrice(formatNumberInput(e.target.value))}
              />
            )}
            {game.status === 'lent_out' && (
              <Input
                label="Lent To (Borrower Name)"
                value={editLentTo}
                onChange={(e) => setEditLentTo(e.target.value)}
              />
            )}

            {/* Tags */}
            <Input
              label="Tags (comma separated)"
              placeholder="e.g. Euro, Engine Building, Co-op"
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
            />

            {/* Scoring Style */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--muted)]">
                Scoring Style
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-[var(--card-2)] border border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setEditScoringMode('auto')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer',
                    editScoringMode === 'auto'
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-xs'
                      : 'text-[var(--muted)] hover:text-[var(--ink)]'
                  )}
                >
                  Auto ({autoResolvedMode === 'coop' ? 'Co-op' : autoResolvedMode === 'win_only' ? 'Win-Loss' : 'Points'})
                </button>
                <button
                  type="button"
                  onClick={() => setEditScoringMode('points')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer',
                    editScoringMode === 'points'
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-xs'
                      : 'text-[var(--muted)] hover:text-[var(--ink)]'
                  )}
                >
                  🎯 Points
                </button>
                <button
                  type="button"
                  onClick={() => setEditScoringMode('win_only')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer',
                    editScoringMode === 'win_only'
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-xs'
                      : 'text-[var(--muted)] hover:text-[var(--ink)]'
                  )}
                >
                  🏆 Win / Loss
                </button>
                <button
                  type="button"
                  onClick={() => setEditScoringMode('coop')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer',
                    editScoringMode === 'coop'
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-xs'
                      : 'text-[var(--muted)] hover:text-[var(--ink)]'
                  )}
                >
                  🤝 Co-op
                </button>
              </div>
            </div>

            {/* Cover Image URL or Upload */}
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label="Cover Image URL"
                    placeholder="https://... or upload below"
                    value={editCoverUrl.startsWith('idb://') ? 'Custom uploaded cover (stored locally)' : editCoverUrl}
                    onChange={(e) => setEditCoverUrl(e.target.value)}
                    disabled={editCoverUrl.startsWith('idb://')}
                  />
                </div>
                <label className="min-h-[42px] px-3 py-2 rounded-xl bg-[var(--card-2)] hover:bg-[var(--card-3)] border border-[var(--line)] text-xs font-bold text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors">
                  <Upload className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    className="hidden"
                  />
                </label>
              </div>
              {editCoverUrl.startsWith('idb://') && (
                <button
                  type="button"
                  onClick={() => setEditCoverUrl('')}
                  className="text-[11px] font-semibold text-[var(--bad)] hover:underline cursor-pointer"
                >
                  Clear uploaded cover
                </button>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
        <ConfirmModal
          isOpen={isDeleteConfirmOpen}
          title="Delete Game?"
          message={`Remove "${game.name}" from your collection? Existing play sessions will remain in your history.`}
          confirmLabel="Delete Game"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={() => {
            setIsDeleteConfirmOpen(false);
            handleDelete();
          }}
          onCancel={() => setIsDeleteConfirmOpen(false)}
        />
      </div>
    </PageTransition>
  );
};

export default GameDetailPage;
