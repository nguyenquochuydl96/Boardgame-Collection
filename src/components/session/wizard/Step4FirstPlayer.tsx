import React from 'react';
import { ArrowLeft, Crown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { MysteryCardShuffle, PickerItem } from '../../picker/MysteryCardShuffle';
import { PlayerAvatar } from '../../player/PlayerAvatar';
import { PlayerChip } from '../../player/PlayerChip';
import { cn } from '../../ui/cn';
import { BoardGame, Player, FirstPlayerMethod } from '../../../types';
import { FIRST_PLAYER_METHOD_LABELS } from '../../../lib/utils';

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
    firstPlayerObj,
    onBackToStep3,
    onContinueToStep5,
  }) => {
    return (
      <Card className="p-4 sm:p-6 md:p-8 space-y-6">
        {isRematchMode && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-transparent border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🔄</span>
              <span>
                <strong className="text-amber-300">Rematch:</strong> Kept <strong>{selectedGame?.name}</strong>, <strong>{activeSessionPlayers.length} players</strong> and venue <strong>{location}</strong>. Spin or draw to pick a new first player!
              </span>
            </div>
            <span className="font-mono text-emerald-400 font-bold shrink-0 flex items-center gap-1">
              <span>⏱️</span> New timer running
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[var(--text-primary)] flex items-center gap-2.5">
              <span>👑</span>
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
              onClick={() => setFirstPlayerAnimStyle('card_shuffle')}
              className={cn(
                'px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 select-none text-center',
                firstPlayerAnimStyle !== 'manual'
                  ? 'bg-amber-500/25 border border-amber-500/50 text-amber-300 shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              <span>🎴</span>
              <span className="truncate">Card Shuffle</span>
            </button>
            <button
              type="button"
              onClick={() => setFirstPlayerAnimStyle('manual')}
              className={cn(
                'px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 select-none text-center',
                firstPlayerAnimStyle === 'manual'
                  ? 'bg-[var(--accent-glow)] border border-[var(--border-glow)] text-[var(--accent-neon)] shadow-sm'
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
                <span className="text-[10px] uppercase font-bold text-amber-400">Solo Mode</span>
                <p className="font-bold text-[var(--text-primary)] text-sm">{activeSessionPlayers[0].name} goes first</p>
              </div>
            </div>
            <div>
              <Button variant="primary" onClick={onContinueToStep5}>
                Continue to Score Entry (Step 5) 👉
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex flex-col items-center justify-center min-h-[380px] relative overflow-hidden">
            {firstPlayerAnimStyle === 'manual' ? (
              <div className="w-full max-w-md py-6 space-y-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center text-2xl mx-auto shadow-inner">
                  👑
                </div>
                <div>
                  <h3 className="font-bold text-base text-[var(--text-primary)]">Manually Assign First Player</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Choose directly below or use custom tabletop house rules
                  </p>
                </div>
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
                        {isChosen && <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <MysteryCardShuffle
                items={playerPickerItems}
                onSelect={(winner) => {
                  setFirstPlayerId(winner.id);
                  setFirstPlayerMethod('random_wheel');
                }}
                mode="first_player"
              />
            )}

            {/* Spotlight Celebration Card when First Player is Picked */}
            <AnimatePresence>
              {firstPlayerObj && (
                <motion.div
                  initial={{ opacity: 0, y: 16, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/25 to-amber-600/20 border-2 border-amber-400 shadow-2xl w-full max-w-lg flex flex-col sm:flex-row items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative">
                      <PlayerAvatar
                        avatar={firstPlayerObj.avatar}
                        name={firstPlayerObj.name}
                        color={firstPlayerObj.color}
                        size="lg"
                      />
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg font-bold">
                        👑
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300">
                          First Player This Session!
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-[var(--text-primary)] font-medium">
                          {FIRST_PLAYER_METHOD_LABELS[firstPlayerMethod]}
                        </span>
                      </div>
                      <h4 className="font-display font-extrabold text-base sm:text-lg text-[var(--text-primary)] truncate">
                        {firstPlayerObj.name}
                      </h4>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onContinueToStep5}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-lg shrink-0 w-full sm:w-auto"
                  >
                    Enter Scores 👉
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Alternative Quick Manual Rule Selector */}
        {activeSessionPlayers.length > 1 && (
          <div className="pt-4 border-t border-[var(--line)] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[var(--muted)]">
                Alternative house rules:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    'random_wheel',
                    'manual',
                    'previous_loser',
                    'previous_winner',
                  ] as FirstPlayerMethod[]
                ).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFirstPlayerMethod(m)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer',
                      firstPlayerMethod === m
                        ? 'bg-amber-500/25 border-amber-400 text-amber-700 dark:text-amber-300'
                        : 'bg-[var(--card-2)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'
                    )}
                  >
                    {FIRST_PLAYER_METHOD_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {activeSessionPlayers.map((p) => (
                <PlayerChip
                  key={p.id}
                  player={p}
                  size="sm"
                  selected={firstPlayerId === p.id}
                  onClick={() => {
                    setFirstPlayerId(p.id);
                    if (firstPlayerMethod === 'random_wheel') {
                      setFirstPlayerMethod('manual');
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </Card>
    );
  }
);
