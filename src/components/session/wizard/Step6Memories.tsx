import React from 'react';
import { Camera, Sparkles, Crown, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from '../../ui/Card';
import { cn } from '../../ui/cn';
import { BoardGame, Player, PlayerScore } from '../../../types';
import { formatDate, formatDuration } from '../../../lib/utils';
import { useResolvedMedia } from '../../../hooks/useResolvedMedia';
import { getScoringTemplateForGame } from '../../../lib/scoringPresets';
import { GameCoverImage } from '../../game/GameCoverImage';

const SessionPhotoThumb: React.FC<{
  src: string;
  alt: string;
  onRemove: () => void;
}> = ({ src, alt, onRemove }) => {
  const resolved = useResolvedMedia(src);
  const [imgError, setImgError] = React.useState(false);

  return (
    <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--card-2)] group">
      {resolved && !imgError ? (
        <img
          src={resolved}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-[10px] text-[var(--muted)] text-center">
          <Camera className="w-5 h-5 mb-0.5 opacity-60" />
          <span className="truncate max-w-full">Photo</span>
        </div>
      )}
      <button
        type="button"
        aria-label="Remove photo"
        onClick={onRemove}
        className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/75 text-rose-300 hover:text-white flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity cursor-pointer z-10"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

interface Step6MemoriesProps {
  photos: string[];
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (idx: number) => void;
  notes: string;
  setNotes: (val: string) => void;
  selectedGame?: BoardGame;
  datePlayed: string;
  durationMinutes: string;
  location: string;
  firstPlayerId?: string;
  allAvailablePlayers: Player[];
  activeSessionPlayers: Player[];
  computedPlayerScores: PlayerScore[];
}

export const Step6Memories: React.FC<Step6MemoriesProps> = React.memo(
  ({
    photos,
    onPhotoUpload,
    onRemovePhoto,
    notes,
    setNotes,
    selectedGame,
    datePlayed,
    durationMinutes,
    location,
    firstPlayerId,
    allAvailablePlayers,
    activeSessionPlayers,
    computedPlayerScores,
  }) => {
    const scoringTemplate = React.useMemo(
      () => getScoringTemplateForGame(selectedGame?.name),
      [selectedGame?.name]
    );
    return (
      <div className="space-y-6">
        <Card className="p-4 sm:p-6 md:p-8 space-y-6">
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
                  onChange={onPhotoUpload}
                  className="hidden"
                />
              </label>

              {photos.map((src, idx) => (
                <SessionPhotoThumb
                  key={idx}
                  src={src}
                  alt={`Session upload ${idx + 1}`}
                  onRemove={() => onRemovePhoto(idx)}
                />
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
            className="p-6 rounded-3xl bg-[var(--card)] border border-[var(--line-2)] shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                <Sparkles className="w-4 h-4" />
                Ready to Record Session
              </span>
              <span className="text-xs text-[var(--muted)] tabular-nums">
                {formatDate(datePlayed)} ·{' '}
                {formatDuration(Number(durationMinutes) || 60)}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <GameCoverImage
                game={selectedGame}
                className="w-16 h-20 rounded-xl shrink-0 border border-[var(--line)]"
              />
              <div className="space-y-1">
                <h2 className="font-display font-extrabold text-xl text-[var(--ink)]">
                  {selectedGame.name}
                </h2>
                <p className="text-xs text-[var(--muted)]">
                  {location || 'Home Table'} · First turn:{' '}
                  <strong className="text-[var(--ink)]">
                    {allAvailablePlayers.find((p) => p.id === firstPlayerId)?.name ||
                      activeSessionPlayers[0]?.name}
                  </strong>
                </p>
              </div>
            </div>

            {scoringTemplate.isCoop && (
              <div className="flex items-center gap-2 pt-2 border-t border-[var(--line)]">
                <span className="text-base select-none">🤝</span>
                <span
                  className={cn(
                    'text-xs font-bold px-2.5 py-1 rounded-lg border',
                    computedPlayerScores.some((ps) => ps.isWinner)
                      ? 'bg-[var(--good-soft)] border-[var(--good)]/30 text-[var(--good)]'
                      : 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300'
                  )}
                >
                  {computedPlayerScores.some((ps) => ps.isWinner)
                    ? '🏆 Cooperative Victory — Team Won'
                    : '💀 Cooperative Defeat'}
                </span>
              </div>
            )}

            <div className={cn('flex flex-wrap gap-2', !scoringTemplate.isCoop && 'pt-2 border-t border-[var(--line)]')}>
              {computedPlayerScores.map((ps) => (
                <div
                  key={ps.playerId}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border',
                    ps.isWinner
                      ? scoringTemplate.isCoop
                        ? 'bg-[var(--good-soft)] border-[var(--good)]/40 text-[var(--good)] font-bold'
                        : 'bg-amber-500/20 border-amber-500/40 text-amber-800 dark:text-amber-300 font-bold'
                      : 'bg-[var(--card-2)] border-[var(--line)] text-[var(--ink)]'
                  )}
                >
                  {ps.isWinner && (
                    scoringTemplate.isCoop ? (
                      <span className="text-xs">🤝</span>
                    ) : (
                      <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    )
                  )}
                  <span>{ps.playerName}</span>
                  {typeof ps.score === 'number' && (
                    <span className="font-mono font-bold">{ps.score}</span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    );
  }
);
