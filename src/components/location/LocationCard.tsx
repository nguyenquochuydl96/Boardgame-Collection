import React, { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Star,
  Edit3,
  Trash2,
  Dices,
  Calendar,
  Gamepad2,
  ExternalLink,
  Info,
} from 'lucide-react';
import { GameLocation } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { formatDate } from '../../lib/utils';
import { cn } from '../ui/cn';

export interface LocationMetrics {
  sessionCount: number;
  topGame?: { name: string; count: number };
  lastPlayedDate?: string;
}

export interface LocationCardProps {
  location: GameLocation;
  metrics?: LocationMetrics;
  onEdit: (location: GameLocation) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

const LocationCardComponent: React.FC<LocationCardProps> = ({
  location,
  metrics,
  onEdit,
  onDelete,
  onSetDefault,
}) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const sessionCount = metrics?.sessionCount || 0;
  const topGame = metrics?.topGame;
  const lastPlayedDate = metrics?.lastPlayedDate;

  return (
    <div className="h-full transition-transform duration-200 hover:-translate-y-1 active:scale-[0.99]">
      <Card
        className={cn(
          'p-5 flex flex-col justify-between gap-4 h-full relative transition-all border-2 group',
          location.isDefault
            ? 'border-amber-400/50 bg-gradient-to-b from-amber-500/5 via-[var(--bg-card)] to-transparent ring-1 ring-amber-400/30'
            : 'hover:border-[var(--border-glow)]'
        )}
      >
        <div>
          {/* Header row: Default badge & actions */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              {location.isDefault ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-sm">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  Default Venue
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onSetDefault(location.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--bg-surface)] hover:bg-amber-500/15 border border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--text-secondary)] hover:text-amber-300 transition-colors cursor-pointer"
                  title="Set as default venue"
                >
                  <Star className="w-3 h-3 text-[var(--text-muted)] group-hover:text-amber-400" />
                  Set Default
                </button>
              )}
            </div>

            {/* Edit & Delete Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onEdit(location)}
                className="w-7 h-7 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--accent-glow)] text-[var(--text-secondary)] hover:text-[var(--accent-neon)] border border-[var(--border-subtle)] flex items-center justify-center transition-colors cursor-pointer"
                title="Edit venue"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="w-7 h-7 rounded-lg bg-[var(--bg-surface)] hover:bg-rose-500/20 text-[var(--text-secondary)] hover:text-rose-400 border border-[var(--border-subtle)] flex items-center justify-center transition-colors cursor-pointer"
                title="Delete venue"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Location Title & Address */}
          <div className="space-y-1.5">
            <h3 className="font-display font-bold text-lg text-[var(--text-primary)] group-hover:text-[var(--accent-neon)] transition-colors flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="truncate">{location.name}</span>
            </h3>

            {location.address && (
              <p className="text-xs text-[var(--text-secondary)] pl-6">
                {location.address}
              </p>
            )}

            {location.notes && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{location.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)]">
          <div className="grid grid-cols-2 gap-2 text-center tabular-nums">
            <div className="p-2.5 rounded-xl bg-[var(--bg-surface)]">
              <span className="text-[11px] text-[var(--text-secondary)] inline-flex items-center gap-1 font-medium">
                <Dices className="w-3 h-3 text-[var(--accent-neon)]" />
                Plays Logged
              </span>
              <p className="font-display font-extrabold text-lg text-[var(--text-primary)] mt-0.5">
                {sessionCount}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-[var(--bg-surface)]">
              <span className="text-[11px] text-[var(--text-secondary)] inline-flex items-center gap-1 font-medium">
                <Gamepad2 className="w-3 h-3 text-amber-400" />
                Top Board Game
              </span>
              <p className="font-display font-bold text-xs text-[var(--text-primary)] mt-1 truncate px-1">
                {topGame ? `${topGame.name} (${topGame.count})` : 'None'}
              </p>
            </div>
          </div>

          {lastPlayedDate && (
            <p className="text-[11px] text-[var(--text-muted)] flex items-center justify-between px-1">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[var(--accent-primary)]" />
                Last played:
              </span>
              <span className="font-semibold text-[var(--text-secondary)]">
                {formatDate(lastPlayedDate)}
              </span>
            </p>
          )}

          {/* Filter link to see all sessions played at this location */}
          {sessionCount > 0 ? (
            <Link
              to={`/sessions?search=${encodeURIComponent(location.name)}`}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--accent-glow)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors"
            >
              <span>View {sessionCount} plays at this venue</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          ) : (
            <div className="text-center py-1.5 text-[11px] text-[var(--text-muted)] italic">
              No plays recorded at this venue yet
            </div>
          )}
        </div>

        {/* Delete Confirmation Popup */}
        {isConfirmingDelete && (
          <div className="absolute inset-0 bg-[var(--card)]/98 rounded-2xl p-4 flex flex-col justify-center items-center text-center space-y-3 z-20 border-2 border-rose-500/50 animate-in fade-in zoom-in-95 duration-150">
            <p className="text-xs font-bold text-[var(--text-primary)]">
              Confirm venue deletion:
            </p>
            <p className="text-xs font-extrabold text-rose-400 truncate max-w-full px-2">
              "{location.name}"?
            </p>
            {sessionCount > 0 && (
              <p className="text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                Note: {sessionCount} logged sessions will keep this venue name.
              </p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsConfirmingDelete(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  onDelete(location.id);
                  setIsConfirmingDelete(false);
                }}
              >
                Delete Venue
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export const LocationCard = memo(LocationCardComponent);
export default LocationCard;
