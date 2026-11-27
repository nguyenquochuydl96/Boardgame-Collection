import React, { useMemo, useState } from 'react';
import { ArrowLeft, Flag, Zap, Trophy, Dices } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { MysteryCardShuffle, PickerItem } from '../../picker/MysteryCardShuffle';
import { PlayerAvatar } from '../../player/PlayerAvatar';
import { cn } from '../../ui/cn';
import { BoardGame, Player, FirstPlayerMethod } from '../../../types';
import { findPreviousLoser, findPreviousWinner } from '../../../lib/utils';
import { useSessionStore } from '../../../store/useSessionStore';
import { useGameStore } from '../../../store/useGameStore';

interface Step4FirstPlayerProps {
  isRematchMode: boolean;
  selectedGame?: BoardGame;
  activeSessionPlayers: Player[];
  location: string;
  firstPlayerAnimStyle: 'card_shuffle' | 'manual' | string;
  setFirstPlayerAnimStyle: (style: any) => void;
  playerPickerItems: PickerItem[];
  firstPlayerId?: string;
  firstPlayerMethod: FirstPlayerMethod;
  setFirstPlayerId: (id: string) => void;
  setFirstPlayerMethod: (method: FirstPlayerMethod) => void;
  firstPlayerObj?: Player;
  onBackToStep3: () => void;
  onContinueToStep5: () => void;
}

export const Step4FirstPlayer: React.FC<Step4FirstPlayerProps> = React.memo(
  ({
    isRematchMode,
    selectedGame,
    activeSessionPlayers,
    location,
    firstPlayerAnimStyle,
    setFirstPlayerAnimStyle,
    playerPickerItems,
    firstPlayerId,
    firstPlayerMethod,
    setFirstPlayerId,
    setFirstPlayerMethod,
    firstPlayerObj: _firstPlayerObj,
    onBackToStep3,
    onContinueToStep5,
  }) => {
    const sessions = useSessionStore((s) => s.sessions);
    const games = useGameStore((s) => s.games);
    const gamesById = useMemo(
      () => new Map(games.map((game) => [game.id, game])),
      [games]
    );
    const [ruleReason, setRuleReason] = useState<string | null>(null);

    const handleSelectPreviousLoser = () => {
      const res = findPreviousLoser(activeSessionPlayers, sessions, selectedGame?.id, gamesById);
      if (res) {
        setFirstPlayerId(res.player.id);
        setFirstPlayerMethod('previous_loser');
        setRuleReason(`${res.player.name} — ${res.reason}`);
      } else {
        const randomPlayer = activeSessionPlayers[Math.floor(Math.random() * activeSessionPlayers.length)];
        if (randomPlayer) {
          setFirstPlayerId(randomPlayer.id);
          setFirstPlayerMethod('previous_loser');
          setRuleReason(`${randomPlayer.name} (no prior session found — picked randomly)`);
        }
      }
    };

    const handleSelectPreviousWinner = () => {
      const res = findPreviousWinner(activeSessionPlayers, sessions, selectedGame?.id);
      if (res) {
        setFirstPlayerId(res.player.id);
        setFirstPlayerMethod('previous_winner');
        setRuleReason(`${res.player.name} — ${res.reason}`);
      } else {
        const randomPlayer = activeSessionPlayers[Math.floor(Math.random() * activeSessionPlayers.length)];
        if (randomPlayer) {
          setFirstPlayerId(randomPlayer.id);
          setFirstPlayerMethod('previous_winner');
          setRuleReason(`${randomPlayer.name} (no prior session found — picked randomly)`);
        }
      }
    };

    const handleRandomPick = () => {
      const randomPlayer = activeSessionPlayers[Math.floor(Math.random() * activeSessionPlayers.length)];
      if (randomPlayer) {
        setFirstPlayerId(randomPlayer.id);
        setFirstPlayerMethod('random_wheel');
        setRuleReason(`Randomly picked: ${randomPlayer.name}`);
      }
    };

    return (
      <Card className="p-4 sm:p-6 md:p-8 space-y-6">
        {isRematchMode && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-transparent border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--ink)]">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🔄</span>
              <span>
                <strong className="text-[var(--warn)]">Rematch:</strong> Kept <strong>{selectedGame?.name}</strong>, <strong>{activeSessionPlayers.length} players</strong> and venue <strong>{location}</strong>. Draw cards or choose manually to pick a first player!
              </span>
            </div>
            <span className="font-mono text-[var(--good)] font-bold shrink-0 flex items-center gap-1">
              <span>⏱️</span> New timer running
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[var(--text-primary)] flex items-center gap-2.5">
              <Flag className="w-6 h-6 text-amber-500 shrink-0" />
              Step 4 — Who Goes First?
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
              Shuffle mystery cards or choose tabletop house rules for {activeSessionPlayers.length} players
            </p>
          </div>

          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-2 gap-1 sm:gap-1.5 p-1 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                setFirstPlayerAnimStyle('card_shuffle');
                setRuleReason(null);
              }}
              className={cn(
                'px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 select-none text-center',
                firstPlayerAnimStyle !== 'manual'
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-950 dark:text-amber-200 font-extrabold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              <span>🎴</span>
              <span className="truncate">Card Shuffle</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFirstPlayerAnimStyle('manual');
                setRuleReason(null);
              }}
              className={cn(
                'px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 select-none text-center',
                firstPlayerAnimStyle === 'manual'
                  ? 'bg-[var(--accent-glow)] border border-[var(--border-glow)] text-[var(--ink)] font-extrabold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              <span>✋</span>
              <span className="truncate">Manual</span>
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
            <Button variant="secondary" size="sm" onClick={onBackToStep3}>
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
                <span className="text-[10px] uppercase font-bold text-amber-500">Solo Mode</span>
                <p className="font-bold text-[var(--text-primary)] text-sm">{activeSessionPlayers[0].name} goes first</p>
              </div>
            </div>
            <div>
              <Button variant="primary" onClick={onContinueToStep5}>
                Continue to Score Entry (Step 5) 👉
              </Button>
            </div>
          </div>
        ) : firstPlayerAnimStyle === 'manual' ? (
          /* TAB 2: MANUAL & HOUSE RULES STAGE (ISOLATED) */
          <div className="p-4 sm:p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
                <Flag className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-[var(--text-primary)]">
                Manually Assign First Player
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                Select a player directly or use tabletop house rules from recent match history
              </p>
            </div>

            {/* Quick Tabletop House Rules */}
            <div className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--line)] space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
                <span>Tabletop House Rules:</span>
                {ruleReason && (
                  <span className="text-[11px] text-amber-700 dark:text-amber-300 font-bold truncate max-w-[280px]">
                    {ruleReason}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleSelectPreviousLoser}
                  className={cn(
                    'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2',
                    firstPlayerMethod === 'previous_loser'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-950 dark:text-amber-200 shadow-sm'
                      : 'bg-[var(--card-2)] border-[var(--line)] text-[var(--ink-2)] hover:text-[var(--ink)] hover:border-[var(--line-2)]'
                  )}
                >
                  <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">Previous Loser</p>
                    <p className="text-[10px] text-[var(--muted)] truncate">Last place in previous match</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleSelectPreviousWinner}
                  className={cn(
                    'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2',
                    firstPlayerMethod === 'previous_winner'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-950 dark:text-amber-200 shadow-sm'
                      : 'bg-[var(--card-2)] border-[var(--line)] text-[var(--ink-2)] hover:text-[var(--ink)] hover:border-[var(--line-2)]'
                  )}
                >
                  <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">Previous Winner</p>
                    <p className="text-[10px] text-[var(--muted)] truncate">Winner of previous match</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleRandomPick}
                  className={cn(
                    'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2',
                    firstPlayerMethod === 'random_wheel'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-950 dark:text-amber-200 shadow-sm'
                      : 'bg-[var(--card-2)] border-[var(--line)] text-[var(--ink-2)] hover:text-[var(--ink)] hover:border-[var(--line-2)]'
                  )}
                >
                  <Dices className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">Random Pick</p>
                    <p className="text-[10px] text-[var(--muted)] truncate">Pick one player at random</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Direct Player Selection Chips */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[var(--muted)] block text-center">
                Or click directly to assign:
              </span>
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
                        setRuleReason(null);
                      }}
                      className={cn(
                        'flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer',
                        isChosen
                          ? 'bg-amber-500/25 border-amber-400 text-[var(--ink)] shadow-lg ring-2 ring-amber-400/30'
                          : 'bg-[var(--card)] border-[var(--line)] text-[var(--ink-2)] hover:text-[var(--ink)] hover:border-[var(--line-2)]'
                      )}
                    >
                      <PlayerAvatar
                        avatar={p.avatar}
                        name={p.name}
                        color={p.color}
                        size="sm"
                      />
                      <span>{p.name}</span>
                      {isChosen && (
                        <span className="font-mono font-black text-[10px] px-1.5 py-0.5 rounded bg-amber-400 text-[#161311]">
                          1ST
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action continue button when player selected */}
            {firstPlayerId && (
              <div className="pt-4 border-t border-[var(--line)] flex justify-center">
                <Button
                  variant="primary"
                  onClick={onContinueToStep5}
                  className="bg-amber-500 hover:bg-amber-400 text-[#161311] font-extrabold shadow-lg px-6"
                >
                  Enter Scores 👉
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* TAB 1: CARD SHUFFLE STAGE (100% CLEAN - ZERO DUPLICATION) */
          <div className="p-4 sm:p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex flex-col items-center justify-center min-h-[380px] relative overflow-hidden">
            <MysteryCardShuffle
              items={playerPickerItems}
              onSelect={(winner) => {
                setFirstPlayerId(winner.id);
                setFirstPlayerMethod('random_wheel');
              }}
              mode="first_player"
            />

            {/* Clean, Non-Duplicated Action Button when First Player is Drawn */}
            {firstPlayerId && (
              <div className="mt-4 flex flex-col items-center gap-1.5">
                <Button
                  variant="primary"
                  size="md"
                  onClick={onContinueToStep5}
                  className="bg-amber-500 hover:bg-amber-400 text-[#161311] font-extrabold shadow-lg px-6"
                >
                  Enter Scores 👉
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    );
  }
);

export default Step4FirstPlayer;
