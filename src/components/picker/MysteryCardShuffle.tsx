import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Shuffle, Crown, RotateCcw, Play, Trophy, Users } from 'lucide-react';
import { Button } from '../ui/Button';
import {
  playTickSound,
  playFanfareSound,
  playCardSlideSound,
  playCardSnapSound,
  triggerConfetti,
} from '../../lib/soundEffects';
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
  onEnterGame?: (gameId: string) => void;
  mode?: 'first_player' | 'what_to_play';
}

type ShuffleStage = 'idle' | 'splitting' | 'riffling' | 'bridging' | 'fanning' | 'drawing' | 'revealed';

// Number of visual cards in the animated deck
const DECK_CARD_COUNT = 8;

/**
 * Bulletproof portrait avatar / cover renderer
 * Guaranteed zero text overflow, instant image error handling, and elegant fallback badge.
 */
const CardItemPortrait: React.FC<{ item: PickerItem; size?: number }> = ({ item, size = 84 }) => {
  const [imgError, setImgError] = useState(false);
  const imageSrc = resolveAvatarImage(item.thumbnail || item.avatar);

  if (imageSrc && !imgError) {
    return (
      <div
        className="rounded-2xl border-2 border-amber-400/80 shadow-2xl bg-slate-950 overflow-hidden shrink-0 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <img
          src={imageSrc}
          alt={item.name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Safe fallback initials or emoji (never base64 string)
  const safeEmoji = getSafeDisplayAvatar(item.avatar, '🎲');
  const accentColor = item.color || '#f59e0b';

  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: `${accentColor}25`,
        borderColor: `${accentColor}80`,
      }}
      className="rounded-2xl border-2 flex items-center justify-center text-3xl shadow-inner shrink-0 overflow-hidden"
    >
      <span className="truncate max-w-full px-1 select-none font-bold text-white">
        {safeEmoji}
      </span>
    </div>
  );
};

export const MysteryCardShuffle: React.FC<MysteryCardShuffleProps> = ({
  items,
  onSelect,
  onEnterGame,
  mode = 'first_player',
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

    // Pick winner upfront
    const chosen = items[Math.floor(Math.random() * items.length)];

    // 1. SPLIT DECK INTO 2 PILES (0.35s)
    setStage('splitting');
    playCardSlideSound();

    const t1 = setTimeout(() => {
      // 2. RAPID RIFFLE CASCADE INTERLEAVE (0.8s)
      setStage('riffling');
      let count = 0;
      const riffleInterval = setInterval(() => {
        count++;
        setCascadedCount(count);
        playTickSound(1.0 + count * 0.1);

        if (count >= DECK_CARD_COUNT) {
          clearInterval(riffleInterval);

          // 3. CASINO ARCH BRIDGE & FLUSH SNAP (0.35s)
          setStage('bridging');
          playCardSnapSound();

          const t2 = setTimeout(() => {
            // 4. MAGICIAN'S CARD FAN SPREAD (0.45s)
            setStage('fanning');
            playCardSlideSound();

            const t3 = setTimeout(() => {
              // 5. DRAW HERO CARD UPWARD (0.35s)
              setStage('drawing');
              setRevealedItem(chosen);
              playCardSlideSound();

              const t4 = setTimeout(() => {
                // 6. 3D FLIP REVEAL & FANFARE
                setStage('revealed');
                playFanfareSound();
                triggerConfetti();
                onSelect(chosen);
              }, 400);
              timerRef.current.push(t4);
            }, 450);
            timerRef.current.push(t3);
          }, 350);
          timerRef.current.push(t2);
        }
      }, 100);
    }, 380);

    timerRef.current.push(t1);
  };

  const handleReset = () => {
    clearTimers();
    setRevealedItem(null);
    setCascadedCount(0);
    setStage('idle');
  };

  return (
    <div className="flex flex-col items-center justify-center py-2 space-y-6 w-full max-w-lg mx-auto">
      {/* 3D Casino Tabletop Stage */}
      <div
        style={{ perspective: 1200 }}
        className="relative w-full h-84 flex items-center justify-center select-none"
      >
        {/* Physical Base Deck */}
        <div className="relative w-52 h-72 flex items-center justify-center">
          {/* Deck Cards (8 physical cards for realistic riffle interleave & fan) */}
          {Array.from({ length: DECK_CARD_COUNT }).map((_, i) => {
            const isLeftPile = i % 2 === 0;
            const hasInterleaved = cascadedCount > i;

            let x = 0;
            let y = (DECK_CARD_COUNT - 1 - i) * 1.5;
            let rot = (i - DECK_CARD_COUNT / 2) * 0.8;
            let scale = 1;
            let zIndex = i + 1;

            if (stage === 'splitting') {
              // Split into two neat piles angled inward like hands holding a deck
              x = isLeftPile ? -85 : 85;
              rot = isLeftPile ? -14 : 14;
              y = (DECK_CARD_COUNT - 1 - i) * 2;
            } else if (stage === 'riffling') {
              if (hasInterleaved) {
                // Dropped into center stack with micro flutter
                x = (Math.sin(i * 2) * 4);
                y = (DECK_CARD_COUNT - 1 - i) * 1.5;
                rot = (Math.cos(i * 1.5) * 2);
                zIndex = 10 + i;
              } else {
                // Still waiting on left/right side
                x = isLeftPile ? -80 : 80;
                rot = isLeftPile ? -12 : 12;
                y = (DECK_CARD_COUNT - 1 - i) * 2;
                zIndex = 5;
              }
            } else if (stage === 'bridging') {
              // Arch up into a bridge
              x = 0;
              y = -18 + (DECK_CARD_COUNT - 1 - i) * 1.5;
              rot = 0;
              zIndex = i + 1;
            } else if (stage === 'fanning') {
              // Spread out into an elegant card fan
              const offset = i - (DECK_CARD_COUNT - 1) / 2;
              x = offset * 20;
              rot = offset * 6.5;
              y = Math.abs(offset) * 2.5;
              zIndex = 10 + i;
            } else if (stage === 'drawing' || stage === 'revealed') {
              // Non-drawn cards fade slightly into the background table
              const offset = i - (DECK_CARD_COUNT - 1) / 2;
              x = offset * 18;
              rot = offset * 5;
              y = 35 + Math.abs(offset) * 2;
              scale = 0.92;
              zIndex = i;
            }

            return (
              <motion.div
                key={i}
                animate={{
                  x,
                  y,
                  rotate: rot,
                  scale,
                  opacity: (stage === 'drawing' || stage === 'revealed') ? 0.35 : 1,
                }}
                transition={{
                  type: 'spring',
                  stiffness: stage === 'riffling' ? 480 : 360,
                  damping: 24,
                }}
                style={{ zIndex }}
                className="absolute inset-0 rounded-2xl border-2 border-amber-400/40 bg-gradient-to-br from-[#161c2e] via-[#0d121f] to-[#06080e] p-2.5 shadow-2xl flex flex-col justify-between overflow-hidden"
              >
                {/* Gold Filigree & Casino Card Back Pattern */}
                <div className="w-full h-full rounded-xl border border-amber-400/30 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.18),transparent_72%)] flex flex-col items-center justify-between p-3 relative">
                  <div className="flex justify-between w-full text-xs font-mono text-amber-400/80 font-bold">
                    <span>♠</span>
                    <span>♦</span>
                  </div>

                  <div className="flex flex-col items-center space-y-1.5">
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-400/50 flex items-center justify-center text-amber-300 text-xl shadow-inner">
                      🎲
                    </div>
                    <span className="text-[10px] font-mono tracking-widest text-amber-300/90 uppercase font-black">
                      VAULT
                    </span>
                  </div>

                  <div className="flex justify-between w-full text-xs font-mono text-amber-400/80 font-bold">
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
                  y: 10,
                  scale: 0.9,
                  rotateY: 180,
                  opacity: 0,
                }}
                animate={{
                  x: 0,
                  y: -18,
                  scale: stage === 'revealed' ? 1.12 : 1.02,
                  rotateY: stage === 'revealed' ? 0 : 90,
                  opacity: 1,
                }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 280,
                  damping: 20,
                }}
                style={{
                  transformStyle: 'preserve-3d',
                  zIndex: 50,
                }}
                className="absolute inset-0 rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-[#1b2236] via-[#101422] to-[#07090f] p-4 shadow-2xl shadow-amber-500/40 flex flex-col items-center justify-between text-center overflow-hidden"
              >
                {/* Floating Crown Gold Laurel Header */}
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center shadow-xl shadow-amber-500/50 -mt-7 border-2 border-white/20 shrink-0">
                  <Crown className="w-5 h-5 fill-current" />
                </div>

                {/* Card Face Body */}
                <div className="flex-1 flex flex-col items-center justify-center my-1 space-y-2.5 w-full px-2 min-w-0">
                  <CardItemPortrait item={revealedItem} size={84} />

                  <div className="w-full min-w-0 px-1">
                    <div className="text-[10px] font-mono font-bold tracking-wider uppercase text-amber-300/80 mb-0.5">
                      {mode === 'first_player' ? '👑 First Player' : '🎯 Game Tonight'}
                    </div>
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

                {/* Bottom Lucky Badge or Direct Action Button */}
                <div className="w-full shrink-0 flex flex-col items-center gap-1.5 pt-1">
                  {mode === 'what_to_play' && onEnterGame ? (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onEnterGame(revealedItem.id)}
                      className="w-full text-xs shadow-lg py-1.5 font-bold"
                    >
                      <Play className="w-3.5 h-3.5 mr-1 fill-current" /> Start Game Session
                    </Button>
                  ) : (
                    <div className="text-[10px] font-mono text-emerald-300 font-extrabold bg-emerald-500/20 border border-emerald-500/40 px-3.5 py-1 rounded-full shadow-sm">
                      ✨ LUCKY PICK ✨
                    </div>
                  )}
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
            className="min-w-[210px] shadow-xl shadow-[var(--accent-glow)] text-xs sm:text-sm font-extrabold tracking-wide"
          >
            <Shuffle className={cn('w-4 h-4 mr-2', isBusy && 'animate-spin')} />
            {isBusy
              ? 'Shuffling deck...'
              : stage === 'revealed'
              ? 'Draw Another Card'
              : 'Shuffle & Draw Card'}
          </Button>

          {stage === 'revealed' && (
            <Button
              size="lg"
              variant="secondary"
              onClick={handleReset}
              className="text-xs"
              title="Reset deck"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>

        <p className="text-xs text-[var(--text-secondary)] tabular-nums">
          {items.length} cards in deck
        </p>
      </div>
    </div>
  );
};

export default MysteryCardShuffle;
