import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Shuffle, Crown, RotateCcw, Dices } from 'lucide-react';
import { Button } from '../ui/Button';
import { playTickSound, playFanfareSound, triggerConfetti } from '../../lib/soundEffects';
import { resolveAvatarImage, getSafeDisplayAvatar } from '../../lib/utils';
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

type ShuffleStage = 'idle' | 'splitting' | 'riffling' | 'squaring' | 'revealed';

export const MysteryCardShuffle: React.FC<MysteryCardShuffleProps> = ({
  items,
  onSelect,
}) => {
  const [stage, setStage] = useState<ShuffleStage>('idle');
  const [revealedItem, setRevealedItem] = useState<PickerItem | null>(null);
  const [riffleTick, setRiffleTick] = useState(0);

  const isBusy = stage !== 'idle' && stage !== 'revealed';

  const handleStartShuffle = () => {
    if (isBusy || items.length === 0) return;

    setRevealedItem(null);
    setStage('splitting');
    playTickSound(0.9);

    // Pick a winner upfront
    const chosen = items[Math.floor(Math.random() * items.length)];

    // Phase 1: Split into 2 piles (0.4s)
    setTimeout(() => {
      setStage('riffling');

      // Phase 2: Riffle cards back and forth (1.4s)
      let ticks = 0;
      const riffleInterval = setInterval(() => {
        ticks++;
        setRiffleTick(ticks);
        playTickSound(1 + (ticks % 4) * 0.2);

        if (ticks >= 8) {
          clearInterval(riffleInterval);
          // Phase 3: Square deck (0.3s)
          setStage('squaring');
          playTickSound(0.8);

          setTimeout(() => {
            // Phase 4: Reveal top card with 3D Flip
            setRevealedItem(chosen);
            setStage('revealed');
            playFanfareSound();
            triggerConfetti();
            onSelect(chosen);
          }, 350);
        }
      }, 140);
    }, 420);
  };

  const handleReset = () => {
    setRevealedItem(null);
    setStage('idle');
  };

  // Helper to render card face safely
  const renderCardVisual = (item: PickerItem) => {
    const imageSrc = resolveAvatarImage(item.thumbnail || item.avatar);

    if (imageSrc) {
      return (
        <img
          src={imageSrc}
          alt={item.name}
          className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-400/60 shadow-lg"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />
      );
    }

    return (
      <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-3xl flex items-center justify-center border-2 border-amber-400/40 shadow-inner">
        <span>{getSafeDisplayAvatar(item.avatar, '👑')}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center py-4 space-y-6 w-full max-w-lg mx-auto">
      {/* 3D Tabletop Stage */}
      <div
        style={{ perspective: 1200 }}
        className="relative w-full h-72 flex items-center justify-center select-none"
      >
        <AnimatePresence mode="wait">
          {stage !== 'revealed' ? (
            /* --- THE PHYSICAL CARD DECK --- */
            <div className="relative w-44 h-60 flex items-center justify-center">
              {/* Stacked Cards */}
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const isLeftPile = i < 3;
                let x = 0;
                let y = (5 - i) * 2;
                let rot = (i - 2.5) * 1.5;
                let scale = 1;

                if (stage === 'splitting') {
                  x = isLeftPile ? -65 : 65;
                  rot = isLeftPile ? -12 : 12;
                  y = isLeftPile ? -4 : 4;
                } else if (stage === 'riffling') {
                  // Cards alternately flutter toward the center
                  const isFlicking = (i + riffleTick) % 2 === 0;
                  x = isFlicking ? 0 : isLeftPile ? -45 : 45;
                  rot = isFlicking ? (Math.random() - 0.5) * 6 : isLeftPile ? -8 : 8;
                  y = isFlicking ? -8 : (5 - i) * 2;
                  scale = isFlicking ? 1.04 : 1;
                } else if (stage === 'squaring') {
                  x = 0;
                  y = (5 - i) * 1.5;
                  rot = 0;
                  scale = 1;
                }

                return (
                  <motion.div
                    key={i}
                    animate={{ x, y, rotate: rot, scale }}
                    transition={{
                      type: 'spring',
                      stiffness: stage === 'riffling' ? 420 : 320,
                      damping: 24,
                    }}
                    style={{
                      zIndex: stage === 'riffling' && (i + riffleTick) % 2 === 0 ? 25 : i + 5,
                    }}
                    className="absolute inset-0 rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-[#1b2234] via-[#101420] to-[#0a0d14] p-3 shadow-xl flex flex-col justify-between overflow-hidden"
                  >
                    {/* Ornate Gold Border & Card Back Art */}
                    <div className="w-full h-full rounded-xl border border-amber-400/25 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.12),transparent_70%)] flex flex-col items-center justify-between p-3 relative">
                      <div className="flex justify-between w-full text-[10px] font-mono text-amber-400/60 font-bold">
                        <span>♠</span>
                        <span>♦</span>
                      </div>

                      <div className="flex flex-col items-center space-y-1">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-300 text-lg shadow-inner">
                          🎲
                        </div>
                        <span className="text-[9px] font-mono tracking-widest text-amber-300/80 uppercase font-extrabold">
                          VAULT
                        </span>
                      </div>

                      <div className="flex justify-between w-full text-[10px] font-mono text-amber-400/60 font-bold">
                        <span>♣</span>
                        <span>♥</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* --- REVEALED 3D WINNER CARD --- */
            revealedItem && (
              <motion.div
                key={revealedItem.id}
                initial={{
                  scale: 0.8,
                  rotateY: 90,
                  y: 20,
                  opacity: 0,
                }}
                animate={{
                  scale: 1,
                  rotateY: 0,
                  y: 0,
                  opacity: 1,
                }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 22,
                }}
                style={{ transformStyle: 'preserve-3d' }}
                className="relative w-60 h-72 rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-[#1e2333] via-[#131722] to-[#0a0d14] p-4 shadow-2xl shadow-amber-500/30 flex flex-col items-center justify-between text-center z-30"
              >
                {/* Floating Crown Badge */}
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center shadow-xl shadow-amber-500/40 -mt-8 border-2 border-white/20">
                  <Crown className="w-5 h-5 fill-current" />
                </div>

                {/* Card Visual / Avatar */}
                <div className="flex-1 flex flex-col items-center justify-center my-2 space-y-2 w-full px-2">
                  {renderCardVisual(revealedItem)}

                  <div className="w-full">
                    <h3 className="font-display font-extrabold text-base sm:text-lg text-white truncate max-w-full">
                      {revealedItem.name}
                    </h3>
                    {revealedItem.subtitle && (
                      <p className="text-xs text-amber-300/90 font-medium truncate mt-0.5">
                        {revealedItem.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Tag */}
                <div className="text-[11px] font-mono text-emerald-300 font-bold bg-emerald-500/20 border border-emerald-500/40 px-3.5 py-1 rounded-full shadow-sm">
                  ✨ LỰA CHỌN MAY MẮN ✨
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>

      {/* Action Controls */}
      <div className="flex flex-col items-center gap-2.5">
        <Button
          size="lg"
          variant="primary"
          onClick={handleStartShuffle}
          disabled={isBusy || items.length === 0}
          className="min-w-[220px] shadow-xl shadow-[var(--accent-glow)] text-sm font-extrabold tracking-wide"
        >
          <Shuffle className={cn('w-4 h-4 mr-2', isBusy && 'animate-spin')} />
          {isBusy
            ? 'Đang xáo bài...'
            : stage === 'revealed'
            ? 'Xáo & Rút Lại'
            : 'Xáo & Rút Thẻ May Mắn'}
        </Button>

        <p className="text-xs text-[var(--text-secondary)] tabular-nums">
          {items.length} lựa chọn trong cỗ bài
        </p>
      </div>
    </div>
  );
};

export default MysteryCardShuffle;
