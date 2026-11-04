import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Shuffle, Crown, RotateCcw } from 'lucide-react';
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

type ShuffleStage = 'idle' | 'splitting' | 'riffling' | 'squaring' | 'drawing' | 'revealed';

export const MysteryCardShuffle: React.FC<MysteryCardShuffleProps> = ({
  items,
  onSelect,
}) => {
  const [stage, setStage] = useState<ShuffleStage>('idle');
  const [revealedItem, setRevealedItem] = useState<PickerItem | null>(null);
  const [cascadedCount, setCascadedCount] = useState(0);
  const timerRef = useRef<NodeJS.Timeout[]>([]);

  const isBusy = stage !== 'idle' && stage !== 'revealed';

  const clearTimers = () => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const handleStartShuffle = () => {
    if (isBusy || items.length === 0) return;

    clearTimers();
    setRevealedItem(null);
    setCascadedCount(0);
    setStage('splitting');
    playTickSound(0.9);

    // Pick a winner upfront
    const chosen = items[Math.floor(Math.random() * items.length)];

    // Step 1: Split into 2 piles (0.45s)
    const t1 = setTimeout(() => {
      setStage('riffling');

      // Step 2: Cascading interleave riffle (6 cards alternating left/right)
      let count = 0;
      const riffleInterval = setInterval(() => {
        count++;
        setCascadedCount(count);
        playTickSound(1.0 + count * 0.12);

        if (count >= 6) {
          clearInterval(riffleInterval);

          // Step 3: Square deck & Table Tap (0.4s)
          setStage('squaring');
          playTickSound(0.85);

          const t2 = setTimeout(() => {
            playTickSound(0.95);

            // Step 4: Draw top card & begin 3D Flip (0.4s)
            setStage('drawing');
            setRevealedItem(chosen);

            const t3 = setTimeout(() => {
              // Step 5: Revealed & Confetti
              setStage('revealed');
              playFanfareSound();
              triggerConfetti();
              onSelect(chosen);
            }, 450);
            timerRef.current.push(t3);
          }, 380);
          timerRef.current.push(t2);
        }
      }, 120);
    }, 450);

    timerRef.current.push(t1);
  };

  const handleReset = () => {
    clearTimers();
    setRevealedItem(null);
    setCascadedCount(0);
    setStage('idle');
  };

  // Safe Avatar or Image Renderer
  const renderCardAvatar = (item: PickerItem) => {
    const imageSrc = resolveAvatarImage(item.thumbnail || item.avatar);

    if (imageSrc) {
      return (
        <img
          src={imageSrc}
          alt={item.name}
          className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-400/70 shadow-xl bg-slate-950"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />
      );
    }

    return (
      <div className="w-18 h-18 rounded-2xl bg-amber-500/20 text-3xl flex items-center justify-center border-2 border-amber-400/50 shadow-inner">
        <span>{getSafeDisplayAvatar(item.avatar, '🎲')}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center py-2 space-y-6 w-full max-w-lg mx-auto">
      {/* 3D Casino Tabletop Stage */}
      <div
        style={{ perspective: 1200 }}
        className="relative w-full h-80 flex items-center justify-center select-none"
      >
        {/* Physical Base Deck */}
        <div className="relative w-48 h-64 flex items-center justify-center">
          {/* Deck Cards (6 cards for realistic riffle interleave) */}
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const isLeftPile = i % 2 === 0;
            const hasInterleaved = cascadedCount > i;

            let x = 0;
            let y = (5 - i) * 1.5;
            let rot = (i - 2.5) * 1;
            let scale = 1;
            let zIndex = i + 1;

            if (stage === 'splitting') {
              x = isLeftPile ? -70 : 70;
              rot = isLeftPile ? -10 : 10;
              y = (5 - i) * 2;
            } else if (stage === 'riffling') {
              if (hasInterleaved) {
                // Card has dropped into the center stack
                x = 0;
                y = (5 - i) * 1.5;
                rot = (Math.sin(i) * 1.5);
                zIndex = 10 + i;
              } else {
                // Card is still waiting in its side pile
                x = isLeftPile ? -65 : 65;
                rot = isLeftPile ? -9 : 9;
                y = (5 - i) * 2;
                zIndex = 5;
              }
            } else if (stage === 'squaring') {
              x = 0;
              y = (5 - i) * 1.5;
              rot = 0;
              zIndex = i + 1;
            }

            return (
              <motion.div
                key={i}
                animate={{
                  x,
                  y: stage === 'squaring' ? [y - 12, y, y - 6, y] : y,
                  rotate: rot,
                  scale,
                }}
                transition={{
                  type: 'spring',
                  stiffness: stage === 'riffling' ? 450 : 350,
                  damping: 26,
                  duration: stage === 'squaring' ? 0.35 : undefined,
                }}
                style={{ zIndex }}
                className="absolute inset-0 rounded-2xl border border-amber-400/40 bg-gradient-to-br from-[#1a2133] via-[#0f1422] to-[#07090f] p-2.5 shadow-2xl flex flex-col justify-between overflow-hidden"
              >
                {/* Gold Filigree & Casino Card Back Pattern */}
                <div className="w-full h-full rounded-xl border border-amber-400/30 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.15),transparent_70%)] flex flex-col items-center justify-between p-3 relative">
                  <div className="flex justify-between w-full text-[10px] font-mono text-amber-400/70 font-bold">
                    <span>♠</span>
                    <span>♦</span>
                  </div>

                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/50 flex items-center justify-center text-amber-300 text-lg shadow-inner">
                      🎲
                    </div>
                    <span className="text-[9px] font-mono tracking-widest text-amber-300/80 uppercase font-extrabold">
                      VAULT
                    </span>
                  </div>

                  <div className="flex justify-between w-full text-[10px] font-mono text-amber-400/70 font-bold">
                    <span>♣</span>
                    <span>♥</span>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* THE DRAWN TOP CARD & 3D REVEAL */}
          <AnimatePresence>
            {(stage === 'drawing' || stage === 'revealed') && revealedItem && (
              <motion.div
                key="drawn-winner-card"
                initial={{
                  x: 0,
                  y: 0,
                  scale: 1,
                  rotateY: 180,
                  opacity: 0.9,
                }}
                animate={{
                  x: 0,
                  y: -10,
                  scale: stage === 'revealed' ? 1.15 : 1.05,
                  rotateY: stage === 'revealed' ? 0 : 90,
                  opacity: 1,
                }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 280,
                  damping: 22,
                }}
                style={{
                  transformStyle: 'preserve-3d',
                  zIndex: 40,
                }}
                className="absolute inset-0 rounded-2xl border-2 border-amber-400 bg-gradient-to-b from-[#1e2333] via-[#121622] to-[#090c12] p-3 shadow-2xl shadow-amber-500/30 flex flex-col items-center justify-between text-center overflow-hidden"
              >
                {/* Floating Crown Badge */}
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/40 -mt-6 border-2 border-white/20 shrink-0">
                  <Crown className="w-4 h-4 fill-current" />
                </div>

                {/* Card Face Body */}
                <div className="flex-1 flex flex-col items-center justify-center my-1 space-y-2 w-full px-1 min-w-0">
                  {renderCardAvatar(revealedItem)}

                  <div className="w-full min-w-0 px-1">
                    <h3 className="font-display font-extrabold text-sm sm:text-base text-white truncate max-w-full">
                      {revealedItem.name}
                    </h3>
                    {revealedItem.subtitle && (
                      <p className="text-[11px] text-amber-300/90 font-medium truncate mt-0.5">
                        {revealedItem.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Lucky Badge */}
                <div className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-500/20 border border-emerald-500/40 px-3 py-0.5 rounded-full shadow-sm shrink-0">
                  ✨ LỰA CHỌN MAY MẮN ✨
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex flex-col items-center gap-2.5">
        <div className="flex items-center gap-2">
          <Button
            size="lg"
            variant="primary"
            onClick={handleStartShuffle}
            disabled={isBusy || items.length === 0}
            className="min-w-[200px] shadow-xl shadow-[var(--accent-glow)] text-xs sm:text-sm font-extrabold tracking-wide"
          >
            <Shuffle className={cn('w-4 h-4 mr-2', isBusy && 'animate-spin')} />
            {isBusy
              ? 'Đang xáo bài...'
              : stage === 'revealed'
              ? 'Rút Thẻ Khác'
              : 'Xáo & Rút Thẻ May Mắn'}
          </Button>

          {stage === 'revealed' && (
            <Button
              size="lg"
              variant="secondary"
              onClick={handleReset}
              className="text-xs"
              title="Đặt lại cỗ bài"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>

        <p className="text-xs text-[var(--text-secondary)] tabular-nums">
          {items.length} lựa chọn trong cỗ bài
        </p>
      </div>
    </div>
  );
};

export default MysteryCardShuffle;
