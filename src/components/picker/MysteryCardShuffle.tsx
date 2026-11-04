import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Shuffle, Crown, Play } from 'lucide-react';
import { Button } from '../ui/Button';
import { playTickSound, playFanfareSound, triggerConfetti } from '../../lib/soundEffects';
import { cn } from '../ui/cn';

export interface PickerItem {
  id: string;
  name: string;
  subtitle?: string;
  thumbnail?: string;
  avatar?: string;
  color?: string;
}

export interface MysteryCardShuffleProps {
  items: PickerItem[];
  onSelect: (item: PickerItem) => void;
}

export const MysteryCardShuffle: React.FC<MysteryCardShuffleProps> = ({
  items,
  onSelect,
}) => {
  const [isShuffling, setIsShuffling] = useState(false);
  const [revealedItem, setRevealedItem] = useState<PickerItem | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const handleStartShuffle = () => {
    if (isShuffling || items.length === 0) return;

    setIsShuffling(true);
    setRevealedItem(null);

    // Rapid shuffle sequence
    let currentSpeed = 60; // ms
    let iterations = 0;
    const maxIterations = 28 + Math.floor(Math.random() * 8);

    const step = () => {
      iterations++;
      setHighlightIndex((prev) => (prev + 1) % items.length);
      playTickSound(1 + (iterations / maxIterations) * 0.4);

      if (iterations < maxIterations) {
        // Exponential deceleration
        if (iterations > maxIterations - 12) {
          currentSpeed += 35;
        } else if (iterations > maxIterations - 6) {
          currentSpeed += 70;
        }
        setTimeout(step, currentSpeed);
      } else {
        // Pick final item
        const finalItem = items[Math.floor(Math.random() * items.length)];
        setTimeout(() => {
          setRevealedItem(finalItem);
          setIsShuffling(false);
          playFanfareSound();
          triggerConfetti();
          onSelect(finalItem);
        }, 300);
      }
    };

    step();
  };

  // Preview pool (at most 8 cards shown visually in the deck)
  const displayDeck = items.slice(0, 8);

  return (
    <div className="flex flex-col items-center justify-center py-6 space-y-6">
      {/* 3D Card Stage */}
      <div className="relative w-full max-w-sm h-64 flex items-center justify-center [perspective:1000px]">
        <AnimatePresence mode="wait">
          {!revealedItem ? (
            /* Shuffling Deck */
            <div className="relative w-40 h-56 flex items-center justify-center">
              {displayDeck.map((item, idx) => {
                const isCurrent = idx === highlightIndex % displayDeck.length;
                const offset = (idx - 3) * 6;
                const rot = (idx - 3) * 4;

                return (
                  <motion.div
                    key={item.id}
                    animate={
                      isShuffling
                        ? {
                            x: [0, (Math.random() - 0.5) * 80, 0],
                            y: [0, (Math.random() - 0.5) * 40, 0],
                            rotate: [rot, rot + (Math.random() - 0.5) * 20, rot],
                            scale: isCurrent ? 1.08 : 1,
                          }
                        : {
                            x: offset,
                            y: Math.abs(idx - 3) * 2,
                            rotate: rot,
                            scale: 1,
                          }
                    }
                    transition={{
                      duration: isShuffling ? 0.12 : 0.4,
                      ease: 'easeInOut',
                    }}
                    className={cn(
                      'absolute inset-0 rounded-2xl border-2 p-3 shadow-xl transition-colors cursor-pointer select-none',
                      isCurrent && isShuffling
                        ? 'border-[var(--accent-neon)] bg-[image:var(--gradient-hero)] shadow-2xl shadow-[var(--accent-glow)] z-20'
                        : 'border-white/15 bg-[var(--bg-elevated)] z-10'
                    )}
                    style={{
                      transformOrigin: 'bottom center',
                    }}
                  >
                    <div className="w-full h-full rounded-xl border border-white/10 bg-slate-950/40 flex flex-col items-center justify-center p-2 text-center overflow-hidden">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg mb-2">
                        🎲
                      </div>
                      <div className="text-[10px] font-mono tracking-widest text-[var(--accent-secondary)] uppercase">
                        Vault Card
                      </div>
                      <div className="text-xs font-bold text-white truncate max-w-[120px] mt-1 opacity-60">
                        ? ? ?
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* Revealed Golden Card */
            <motion.div
              key={revealedItem.id}
              initial={{ scale: 0.2, rotateY: 180, opacity: 0 }}
              animate={{ scale: 1.1, rotateY: 0, opacity: 1 }}
              transition={{
                type: 'spring',
                stiffness: 260,
                damping: 20,
              }}
              className="relative w-56 h-64 rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-amber-500/25 to-slate-950 p-4 shadow-2xl shadow-amber-500/30 flex flex-col items-center justify-between text-center z-30"
            >
              {/* Top Crown Badge */}
              <div className="w-9 h-9 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg -mt-7">
                <Crown className="w-5 h-5 fill-current" />
              </div>

              {/* Card Content */}
              <div className="flex-1 flex flex-col items-center justify-center my-2 space-y-2">
                {revealedItem.thumbnail ? (
                  <img
                    src={revealedItem.thumbnail}
                    alt={revealedItem.name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-400/50 shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-3xl flex items-center justify-center border border-amber-400/40">
                    {revealedItem.avatar || '👑'}
                  </div>
                )}
                <div>
                  <h3 className="font-display font-extrabold text-base sm:text-lg text-white line-clamp-2">
                    {revealedItem.name}
                  </h3>
                  {revealedItem.subtitle && (
                    <p className="text-xs text-amber-300 font-semibold mt-0.5">
                      {revealedItem.subtitle}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full">
                ✨ LỰA CHỌN MAY MẮN ✨
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-3">
        <Button
          size="lg"
          variant="primary"
          onClick={handleStartShuffle}
          disabled={isShuffling || items.length === 0}
          className="min-w-[200px] shadow-xl shadow-[var(--accent-glow)] text-sm font-extrabold tracking-wide"
        >
          <Shuffle className={cn('w-4 h-4 mr-2', isShuffling && 'animate-spin')} />
          {isShuffling ? 'Đang xáo bài bí ẩn...' : revealedItem ? 'Rút Lại Lần Nữa' : 'Xáo & Rút Thẻ May Mắn'}
        </Button>
        <p className="text-xs text-[var(--text-secondary)]">
          {items.length} lựa chọn trong cỗ bài
        </p>
      </div>
    </div>
  );
};
