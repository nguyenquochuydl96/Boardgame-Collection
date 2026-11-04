import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  UserPlus,
  Swords,
  Trophy,
  Gamepad2,
  Check,
} from 'lucide-react';
import { PageTransition } from '../components/layout/PageTransition';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PlayerAvatar } from '../components/player/PlayerAvatar';
import { PlayerCompareModal } from '../components/dashboard/PlayerCompareModal';
import { cn } from '../components/ui/cn';
import { usePlayerStore } from '../store/usePlayerStore';
import { useSessionStore } from '../store/useSessionStore';

const AVATAR_EMOJIS = ['🦊', '🦉', '🐉', '🐼', '🦁', '🐙', '🦄', '🐸', '🧙‍♂️', '🤖'];
const PLAYER_COLORS = [
  '#7c3aed',
  '#ec4899',
  '#22d3ee',
  '#10b981',
  '#f97316',
  '#2563eb',
  '#eab308',
  '#f43f5e',
];

export const PlayersPage: React.FC = () => {
  const players = usePlayerStore((s) => s.players);
  const addPlayer = usePlayerStore((s) => s.addPlayer);
  const sessions = useSessionStore((s) => s.sessions);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState(AVATAR_EMOJIS[0]);
  const [newColor, setNewColor] = useState(PLAYER_COLORS[0]);

  const [compareMode, setCompareMode] = useState(false);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  const handleCreatePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addPlayer({
      name: newName.trim(),
      avatar: newAvatar,
      color: newColor,
    });
    setNewName('');
    setIsAddModalOpen(false);
  };

  const toggleComparePlayer = (id: string) => {
    setSelectedCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedComparePlayers = players.filter((p) =>
    selectedCompareIds.includes(p.id)
  );

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
              Tabletop Players
            </h1>
            <p className="text-sm text-[#94a3b8]">
              Manage your regular gaming group and compare head-to-head records
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant={compareMode ? 'outline' : 'secondary'}
              onClick={() => {
                if (compareMode && selectedCompareIds.length >= 2) {
                  setIsCompareModalOpen(true);
                } else {
                  setCompareMode((c) => !c);
                  setSelectedCompareIds(players.slice(0, 2).map((p) => p.id));
                }
              }}
            >
              <Swords className="w-4 h-4 text-[#22d3ee]" />
              {compareMode
                ? `Compare Selected (${selectedCompareIds.length})`
                : 'Compare Players'}
            </Button>

            <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
              <UserPlus className="w-4 h-4" />
              Add Player
            </Button>
          </div>
        </div>

        {compareMode && (
          <div className="p-4 rounded-2xl bg-[#7c3aed]/15 border border-[#a78bfa]/40 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-white">
              Select 2 or more players below to inspect head-to-head rivalries.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCompareMode(false);
                  setSelectedCompareIds([]);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={selectedCompareIds.length < 2}
                onClick={() => setIsCompareModalOpen(true)}
              >
                Open Comparison ({selectedCompareIds.length})
              </Button>
            </div>
          </div>
        )}

        {/* Players Grid */}
        {players.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {players.map((player) => {
              const playerSessions = sessions.filter((s) =>
                s.players.some((p) => p.playerId === player.id)
              );
              const totalGames = playerSessions.length;
              const wins = playerSessions.filter((s) => {
                const entry = s.players.find((p) => p.playerId === player.id);
                return Boolean(entry?.isWinner || s.winnerId === player.id);
              }).length;
              const winRate =
                totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

              const isSelectedForCompare = selectedCompareIds.includes(
                player.id
              );

              return (
                <motion.div
                  key={player.id}
                  whileHover={{ scale: 1.02, y: -3 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className={cn(
                      'p-5 flex flex-col justify-between gap-4 relative h-full',
                      isSelectedForCompare &&
                        'border-[#22d3ee] ring-2 ring-[#22d3ee]/30'
                    )}
                  >
                    {compareMode && (
                      <button
                        type="button"
                        aria-label={`Select ${player.name} for comparison`}
                        onClick={() => toggleComparePlayer(player.id)}
                        className={cn(
                          'absolute top-4 right-4 w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer transition-colors',
                          isSelectedForCompare
                            ? 'bg-[#22d3ee] border-[#22d3ee] text-slate-950'
                            : 'bg-[#16162a] border-white/20 text-transparent'
                        )}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}

                    <Link
                      to={`/players/${player.id}`}
                      className="flex items-center gap-3.5 group"
                    >
                      <PlayerAvatar player={player} size="lg" />
                      <div className="min-w-0">
                        <h2 className="font-display font-bold text-lg text-white truncate group-hover:text-[#a78bfa] transition-colors">
                          {player.name}
                        </h2>
                        <span
                          style={{ color: player.color }}
                          className="text-xs font-semibold"
                        >
                          Tabletop Member
                        </span>
                      </div>
                    </Link>

                    <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-white/[0.06] tabular-nums">
                      <div className="p-2.5 rounded-xl bg-[#16162a]">
                        <span className="text-[11px] text-[#94a3b8] inline-flex items-center gap-1">
                          <Gamepad2 className="w-3 h-3 text-[#a78bfa]" />
                          Played
                        </span>
                        <p className="font-display font-extrabold text-xl text-white mt-0.5">
                          {totalGames}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#16162a]">
                        <span className="text-[11px] text-[#94a3b8] inline-flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-amber-400" />
                          Win Rate
                        </span>
                        <p className="font-display font-extrabold text-xl text-emerald-400 mt-0.5">
                          {winRate}%
                        </p>
                      </div>
                    </div>

                    <Link
                      to={`/players/${player.id}`}
                      className="text-xs font-semibold text-[#a78bfa] hover:text-white transition-colors"
                    >
                      View Full Player Profile →
                    </Link>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center space-y-4">
            <h2 className="font-display font-bold text-xl text-white">
              No Players Added Yet
            </h2>
            <p className="text-sm text-[#94a3b8]">
              Add your friends and family to start tracking scores and win rates.
            </p>
            <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
              <UserPlus className="w-4 h-4" />
              Add First Player
            </Button>
          </Card>
        )}

        {/* Add Player Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Add New Player"
        >
          <form onSubmit={handleCreatePlayer} className="space-y-5">
            <Input
              label="Player Name *"
              placeholder="e.g., Hải Đăng"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              autoFocus
            />

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#94a3b8]">
                Choose Avatar Emoji
              </label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewAvatar(emoji)}
                    className={cn(
                      'w-11 h-11 rounded-xl text-xl flex items-center justify-center border transition-all cursor-pointer',
                      newAvatar === emoji
                        ? 'bg-[#7c3aed]/30 border-[#a78bfa] scale-105'
                        : 'bg-[#1e1e35] border-white/10 hover:border-white/30'
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#94a3b8]">
                Signature Color
              </label>
              <div className="flex flex-wrap gap-2.5">
                {PLAYER_COLORS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Select color ${hex}`}
                    onClick={() => setNewColor(hex)}
                    style={{ backgroundColor: hex }}
                    className={cn(
                      'w-9 h-9 rounded-full border-2 transition-transform cursor-pointer',
                      newColor === hex
                        ? 'border-white scale-110 shadow-lg'
                        : 'border-transparent opacity-75 hover:opacity-100'
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Create Player
              </Button>
            </div>
          </form>
        </Modal>

        {/* Player Compare Modal */}
        <PlayerCompareModal
          isOpen={isCompareModalOpen}
          onClose={() => setIsCompareModalOpen(false)}
          players={selectedComparePlayers}
          sessions={sessions}
        />
      </div>
    </PageTransition>
  );
};

export default PlayersPage;
