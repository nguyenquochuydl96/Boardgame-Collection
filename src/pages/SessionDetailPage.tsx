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

export const SessionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const session = useSessionStore((s) => s.sessions.find((x) => x.id === id));
  const updateSession = useSessionStore((s) => s.updateSession);
  const deleteSession = useSessionStore((s) => s.deleteSession);
  const players = usePlayerStore((s) => s.players);

  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editLocation, setEditLocation] = useState(session?.location || '');
  const [editDuration, setEditDuration] = useState(
    session?.durationMinutes?.toString() || '60'
  );
  const [editNotes, setEditNotes] = useState(session?.notes || '');

  if (!session) {
    return (
      <PageTransition>
        <Card className="p-8 text-center space-y-4">
          <h1 className="font-display font-bold text-2xl text-white">
            Session Not Found
          </h1>
          <p className="text-sm text-[#94a3b8]">
            This recorded play session could not be found.
          </p>
          <Link to="/sessions">
            <Button variant="primary">Back to Sessions</Button>
          </Link>
        </Card>
      </PageTransition>
    );
  }

  const playersById = Object.fromEntries(players.map((p) => [p.id, p]));
  const firstPlayer = session.players.find(
    (p) => p.playerId === session.firstPlayerId
  );

  const sortedResults = [...session.players].sort((a, b) => {
    if (a.isWinner && !b.isWinner) return -1;
    if (!a.isWinner && b.isWinner) return 1;
    if (typeof a.score === 'number' && typeof b.score === 'number') {
      return b.score - a.score;
    }
    return (a.rank || 99) - (b.rank || 99);
  });

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSession(session.id, {
      location: editLocation.trim() || undefined,
      durationMinutes: Number(editDuration) || session.durationMinutes,
      notes: editNotes.trim() || undefined,
    });
    setIsEditOpen(false);
  };

  const handleDelete = () => {
    deleteSession(session.id);
    navigate('/sessions');
  };

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/sessions"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#94a3b8] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sessions
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditLocation(session.location || '');
                setEditDuration(String(session.durationMinutes || 60));
                setEditNotes(session.notes || '');
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

        {/* Hero Banner */}
        <div className="rounded-3xl overflow-hidden bg-[#16162a] border border-white/15 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6 shadow-2xl">
          <Link to={`/collection/${session.gameId}`} className="shrink-0">
            <img
              src={session.gameThumbnail}
              alt={session.gameName}
              referrerPolicy="no-referrer"
              className="w-24 h-32 rounded-2xl object-cover border border-white/15 hover:scale-105 transition-transform"
            />
          </Link>

          <div className="space-y-3 flex-1">
            <Link
              to={`/collection/${session.gameId}`}
              className="font-display font-extrabold text-2xl sm:text-3xl text-white hover:text-[#a78bfa] transition-colors block"
            >
              {session.gameName}
            </Link>

            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-[#cbd5e1] tabular-nums">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#a78bfa]" />
                {formatDate(session.datePlayed)}
              </span>
              {session.durationMinutes && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#22d3ee]" />
                  {formatDuration(session.durationMinutes)}
                </span>
              )}
              {session.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#ec4899]" />
                  {session.location}
                </span>
              )}
            </div>

            {firstPlayer && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-[#1e1e35] border border-white/10 text-xs text-[#cbd5e1]">
                <Sparkles className="w-3.5 h-3.5 text-[#a78bfa]" />
                <span>
                  First Player: <strong className="text-white">{firstPlayer.playerName}</strong> (picked via{' '}
                  {FIRST_PLAYER_METHOD_LABELS[session.firstPlayerMethod] ||
                    session.firstPlayerMethod}
                  )
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Player Results Table */}
        <Card className="p-6 space-y-4">
          <h2 className="font-display font-bold text-xl text-white">
            Final Standings & Scores
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#1e1e35] text-xs text-[#94a3b8]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Rank</th>
                  <th className="py-3.5 px-4 font-semibold">Player</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Score</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] bg-[#16162a] tabular-nums">
                {sortedResults.map((entry, idx) => {
                  const savedPlayer = playersById[entry.playerId];
                  const isWin =
                    entry.isWinner || session.winnerId === entry.playerId;

                  return (
                    <tr
                      key={entry.playerId}
                      className={isWin ? 'bg-amber-500/[0.08]' : ''}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-[#94a3b8]">
                        #{entry.rank || idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/players/${entry.playerId}`}
                          className="inline-flex items-center gap-2.5 font-display font-bold text-white hover:text-[#a78bfa] transition-colors"
                        >
                          <PlayerAvatar
                            player={savedPlayer}
                            name={entry.playerName}
                            size="sm"
                          />
                          <span>{entry.playerName}</span>
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-base text-white">
                        {typeof entry.score === 'number' ? entry.score : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isWin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                            <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            Winner
                          </span>
                        ) : (
                          <span className="text-xs text-[#94a3b8]">Played</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Notes & Photos Gallery */}
        {session.notes && (
          <Card className="p-6 space-y-2">
            <h2 className="font-display font-bold text-lg text-white">
              Table Notes & Memories
            </h2>
            <p className="text-sm sm:text-base text-[#cbd5e1] leading-relaxed">
              {session.notes}
            </p>
          </Card>
        )}

        {session.photos && session.photos.length > 0 && (
          <Card className="p-6 space-y-4">
            <h2 className="font-display font-bold text-lg text-white">
              Session Photos ({session.photos.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {session.photos.map((photo, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setFullscreenPhoto(photo)}
                  className="group relative aspect-video rounded-2xl overflow-hidden border border-white/10 cursor-pointer"
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
              className="w-full max-h-[75vh] object-contain rounded-xl"
            />
          )}
        </Modal>

        {/* Edit Session Modal */}
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title="Edit Session Details"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <Input
              label="Location"
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
            />
            <Input
              label="Duration (Minutes)"
              type="number"
              value={editDuration}
              onChange={(e) => setEditDuration(e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#94a3b8]">
                Notes
              </label>
              <textarea
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full rounded-xl bg-[#1e1e35] border border-white/15 p-3 text-sm text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setIsEditOpen(false)}>
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

export default SessionDetailPage;
