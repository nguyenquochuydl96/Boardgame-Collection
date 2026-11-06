import React, { useState } from 'react';
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
} from 'lucide-react';
import { PageTransition } from '../components/layout/PageTransition';
import { GameStatusBadge } from '../components/game/GameStatusBadge';
import { SessionCard } from '../components/session/SessionCard';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useGameStore } from '../store/useGameStore';
import { useSessionStore } from '../store/useSessionStore';
import { usePlayerStore } from '../store/usePlayerStore';
import {
  calculateGameStats,
  formatDate,
  formatDuration,
  formatVND,
  formatNumberInput,
  parseNumberInput,
  getGameCoverImage,
  STATUS_CONFIG,
} from '../lib/utils';
import { GameStatus } from '../types';

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

  const gameSessions = React.useMemo(() => {
    return allSessions
      .filter((s) => s.gameId === game.id)
      .sort((a, b) => (b.datePlayed || '').localeCompare(a.datePlayed || ''));
  }, [allSessions, game.id]);

  const stats = React.useMemo(() => calculateGameStats(gameSessions), [gameSessions]);

  const playersById = React.useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])),
    [players]
  );

  const handleSaveNotes = () => {
    updateGame(game.id, { notes: notesDraft });
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateGame(game.id, {
      name: editName.trim() || game.name,
      purchasePrice: parseNumberInput(editPurchasePrice),
      sellPrice: parseNumberInput(editSellPrice),
      lentToName: editLentTo.trim() || undefined,
    });
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
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/collection"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Collection
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsStatusOpen(true)}
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
                setIsEditOpen(true);
              }}
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Hero Cover Section */}
        <div className="relative rounded-3xl overflow-hidden border border-[var(--line)] bg-[var(--card)] shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
            <div className="md:col-span-4 relative aspect-[4/3] md:aspect-auto bg-[var(--card-2)]">
              <img
                src={getGameCoverImage(game)}
                alt={game.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--card)] via-transparent to-transparent md:hidden" />
            </div>

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
                    <strong>
                      {game.minPlayers}–{game.maxPlayers}
                    </strong>{' '}
                    Players
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <strong>{game.playingTime}</strong> Mins
                  </span>
                </div>

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
                    <span className="text-xs text-[var(--muted)]">Added to Vault</span>
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
                      Tabletop game played at cafes or rented — excluded from total personal vault valuation.
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
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
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
                <div className="p-3.5 rounded-xl bg-[var(--card-2)] border border-[var(--line)]">
                  <span className="text-xs text-[var(--muted)]">Total Plays</span>
                  <p className="font-display font-extrabold text-2xl text-[var(--accent)] mt-1">
                    {stats.totalPlays}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--card-2)] border border-[var(--line)]">
                  <span className="text-xs text-[var(--muted)]">Avg Duration</span>
                  <p className="font-display font-extrabold text-2xl text-cyan-600 dark:text-cyan-400 mt-1">
                    {formatDuration(stats.averageDuration)}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--card-2)] border border-[var(--line)]">
                  <span className="text-xs text-[var(--muted)]">Highest Score</span>
                  <p className="font-mono font-extrabold text-xl text-emerald-600 dark:text-emerald-400 mt-1">
                    {stats.highestScore ? stats.highestScore.score : '—'}
                  </p>
                  {stats.highestScore && (
                    <span className="text-[11px] text-[var(--muted)] truncate block">
                      {stats.highestScore.playerName}
                    </span>
                  )}
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--card-2)] border border-[var(--line)]">
                  <span className="text-xs text-[var(--muted)]">Lowest Score</span>
                  <p className="font-mono font-extrabold text-xl text-rose-600 dark:text-rose-400 mt-1">
                    {stats.lowestScore ? stats.lowestScore.score : '—'}
                  </p>
                  {stats.lowestScore && (
                    <span className="text-[11px] text-[var(--muted)] truncate block">
                      {stats.lowestScore.playerName}
                    </span>
                  )}
                </div>
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
                            {pw.wins}W / {pw.plays}G
                          </span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 w-12 text-right">
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
                  Play History ({gameSessions.length})
                </h2>
                <Link to={`/sessions/new?gameId=${game.id}`}>
                  <Button variant="ghost" size="sm">
                    + Log Session
                  </Button>
                </Link>
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
                      Load More Sessions ({gameSessions.length - visibleSessionsCount} remaining)
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
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <Input
              label="Game Title"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
            <Input
              label="Purchase Price (VND)"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 1,450,000"
              value={editPurchasePrice}
              onChange={(e) => setEditPurchasePrice(formatNumberInput(e.target.value))}
            />
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
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
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
      </div>
    </PageTransition>
  );
};

export default GameDetailPage;
