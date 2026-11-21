import React from 'react';
import { UserPlus, Sparkles } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { PlayerChip } from '../../player/PlayerChip';
import { Player, PlaySession, PlayerScore } from '../../../types';

interface Step3PlayersProps {
  activeSessionPlayers: Player[];
  latestSession: PlaySession | null;
  lastSessionPlayers: PlayerScore[];
  onCopyPreviousSessionPlayers: () => void;
  allAvailablePlayers: Player[];
  selectedPlayerIds: string[];
  onTogglePlayer: (playerId: string) => void;
  onClearSelection: () => void;
  newGuestName: string;
  setNewGuestName: (val: string) => void;
  saveGuestToVault: boolean;
  setSaveGuestToVault: (val: boolean) => void;
  onAddGuestPlayer: (e: React.FormEvent) => void;
}

export const Step3Players: React.FC<Step3PlayersProps> = React.memo(
  ({
    activeSessionPlayers,
    latestSession,
    lastSessionPlayers,
    onCopyPreviousSessionPlayers,
    allAvailablePlayers,
    selectedPlayerIds,
    onTogglePlayer,
    onClearSelection,
    newGuestName,
    setNewGuestName,
    saveGuestToVault,
    setSaveGuestToVault,
    onAddGuestPlayer,
  }) => {
    return (
      <Card className="p-4 sm:p-6 md:p-8 space-y-6">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-[var(--text-primary)]">
            Step 3 — Select Players
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Tap cards to select participating players ({activeSessionPlayers.length} selected)
          </p>
        </div>

        {/* Quick Add from Last Session Suggestion */}
        {lastSessionPlayers.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-transparent border border-amber-500/30">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl shrink-0">👥</span>
              <div className="min-w-0 text-xs">
                <p className="font-bold text-[var(--text-primary)]">
                  Gợi ý từ ván gần nhất ({latestSession?.gameName || 'Session trước'}):
                </p>
                <p className="text-[var(--text-secondary)] truncate">
                  {lastSessionPlayers.map((p) => p.playerName).join(', ')} ({lastSessionPlayers.length} người)
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onCopyPreviousSessionPlayers}
              className="shrink-0 text-xs font-bold self-start sm:self-auto border-amber-500/40 hover:border-amber-400"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-400" />
              Lấy người chơi ván trước
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            {activeSessionPlayers.length === 0
              ? 'Chưa chọn người chơi nào'
              : `Đã chọn ${activeSessionPlayers.length} người chơi`}
          </span>
          {selectedPlayerIds.length > 0 && (
            <button
              type="button"
              onClick={onClearSelection}
              className="text-xs text-[var(--text-muted)] hover:text-rose-400 transition-colors cursor-pointer"
            >
              Bỏ chọn tất cả
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {allAvailablePlayers.map((player) => {
            const isSelected = selectedPlayerIds.includes(player.id);
            return (
              <PlayerChip
                key={player.id}
                player={player}
                selected={isSelected}
                onClick={() => onTogglePlayer(player.id)}
              />
            );
          })}
        </div>

        {/* Add Guest or New Player */}
        <form
          onSubmit={onAddGuestPlayer}
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
    );
  }
);
