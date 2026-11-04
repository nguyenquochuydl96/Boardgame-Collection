import React, { useState, useRef } from 'react';
import { motion, useAnimation, AnimatePresence } from 'motion/react';
import { Sparkles, RotateCcw, Shuffle } from 'lucide-react';
import { Player } from '../../types';
import { Button } from '../ui/Button';

export interface RandomPlayerWheelProps {
  players: Player[];
  selectedPlayerId?: string;
  onSelectFirstPlayer: (playerId: string, method: 'random_wheel' | 'manual') => void;
}

const FALLBACK_COLORS = [
  '#7c3aed',
  '#ec4899',
  '#22d3ee',
  '#10b981',
  '#f97316',
  '#2563eb',
  '#eab308',
  '#a855f7',
];

function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

function describeArcSector(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  if (endAngle - startAngle >= 360) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
  }
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M',
    cx,
    cy,
    'L',
    start.x,
    start.y,
    'A',
    r,
    r,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
    'Z',
  ].join(' ');
}

export const RandomPlayerWheel: React.FC<RandomPlayerWheelProps> = ({
  players,
  selectedPlayerId,
  onSelectFirstPlayer,
}) => {
  const controls = useAnimation();
  const [isSpinning, setIsSpinning] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const currentRotationRef = useRef(0);

  const count = Math.max(players.length, 1);
  const sliceAngle = 360 / count;

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId);

  const handleSpin = async () => {
    if (isSpinning || players.length === 0) return;
    setIsSpinning(true);

    const winnerIndex = Math.floor(Math.random() * players.length);
    const chosenPlayer = players[winnerIndex];

    // Segment winnerIndex spans [winnerIndex * sliceAngle, (winnerIndex + 1) * sliceAngle]
    // To land under the top pointer (0 deg), we rotate so the segment center aligns with 360 deg
    const segmentCenter = winnerIndex * sliceAngle + sliceAngle / 2;
    const randomJitter = (Math.random() - 0.5) * (sliceAngle * 0.5);
    const targetAlignment = (360 - segmentCenter + randomJitter + 360) % 360;

    const extraFullSpins = (5 + Math.floor(Math.random() * 3)) * 360;
    const baseMod = currentRotationRef.current % 360;
    const delta = (targetAlignment - baseMod + 360) % 360;
    const nextRotation = currentRotationRef.current + extraFullSpins + delta;

    currentRotationRef.current = nextRotation;

    await controls.start({
      rotate: nextRotation,
      transition: {
        duration: 3.4,
        ease: [0.12, 0.82, 0.18, 1], // Realistic physics deceleration
      },
    });

    setIsSpinning(false);
    setConfettiKey((k) => k + 1);
    onSelectFirstPlayer(chosenPlayer.id, 'random_wheel');
  };

  const handlePickInstant = () => {
    if (isSpinning || players.length === 0) return;
    const winnerIndex = Math.floor(Math.random() * players.length);
    const chosenPlayer = players[winnerIndex];
    setConfettiKey((k) => k + 1);
    onSelectFirstPlayer(chosenPlayer.id, 'random_wheel');
  };

  if (players.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl bg-[#16162a] border border-white/10">
        <p className="text-sm text-[#94a3b8]">
          Please select at least 1 player in Step 3 before spinning the wheel.
        </p>
      </div>
    );
  }

  // Generate 24 deterministic confetti particles on win
  const confettiParticles = Array.from({ length: 24 }, (_, idx) => {
    const angle = (idx / 24) * Math.PI * 2;
    const distance = 90 + (idx % 4) * 35;
    return {
      id: idx,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      color: FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
      rotate: (idx * 47) % 360,
    };
  });

  return (
    <div className="flex flex-col items-center space-y-6 py-2">
      {/* Wheel Stage */}
      <div className="relative flex items-center justify-center w-72 h-72 sm:w-80 sm:h-80">
        {/* Outer Neon Glow Ring */}
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-35 pointer-events-none"
          style={{
            background:
              'conic-gradient(from 0deg, #7c3aed, #2563eb, #22d3ee, #10b981, #ec4899, #7c3aed)',
          }}
        />

        {/* Top Pointer Indicator */}
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]"
          aria-hidden="true"
        >
          <svg width="34" height="36" viewBox="0 0 34 36" fill="none">
            <path
              d="M17 34L3 6C1.8 3.6 3.5 1 6.2 1H27.8C30.5 1 32.2 3.6 31 6L17 34Z"
              fill="#f8fafc"
              stroke="#7c3aed"
              strokeWidth="3"
            />
          </svg>
        </div>

        {/* Spinning SVG Wheel */}
        <motion.div
          animate={controls}
          style={{ rotate: 0 }}
          className="relative w-full h-full rounded-full p-2 bg-[#16162a] border-4 border-white/15 shadow-2xl"
        >
          <svg
            viewBox="0 0 300 300"
            className="w-full h-full rounded-full overflow-visible"
          >
            {players.map((player, index) => {
              const startAngle = index * sliceAngle;
              const endAngle = (index + 1) * sliceAngle;
              const midAngle = startAngle + sliceAngle / 2;
              const segColor =
                player.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
              const isSelected =
                !isSpinning && selectedPlayerId === player.id;

              const labelPos = polarToCartesian(150, 150, 92, midAngle);
              const textRotation = midAngle - 90;

              return (
                <g key={player.id}>
                  <path
                    d={describeArcSector(150, 150, 144, startAngle, endAngle)}
                    fill={segColor}
                    fillOpacity={isSelected ? 1 : 0.82}
                    stroke="#0f0f1a"
                    strokeWidth="3"
                  />
                  {isSelected && (
                    <path
                      d={describeArcSector(150, 150, 144, startAngle, endAngle)}
                      fill="white"
                      fillOpacity={0.18}
                      stroke="#ffffff"
                      strokeWidth="3"
                    />
                  )}
                  <g
                    transform={`translate(${labelPos.x}, ${labelPos.y}) rotate(${textRotation})`}
                  >
                    <text
                      x="0"
                      y="5"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontFamily="Outfit, sans-serif"
                      fontWeight="800"
                      fontSize={players.length > 6 ? '11' : '13'}
                      style={{ textShadow: '0 1px 4px rgba(0,0,0,0.65)' }}
                    >
                      {player.avatar ? `${player.avatar} ` : ''}
                      {player.name.length > 10
                        ? `${player.name.slice(0, 9)}…`
                        : player.name}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </motion.div>

        {/* Center SPIN Button */}
        <motion.button
          type="button"
          whileHover={{ scale: isSpinning ? 1 : 1.06 }}
          whileTap={{ scale: isSpinning ? 1 : 0.94 }}
          disabled={isSpinning}
          onClick={() => void handleSpin()}
          className="absolute z-20 w-20 h-20 rounded-full bg-[image:var(--gradient-hero)] text-white font-display font-extrabold text-base tracking-wider shadow-[0_0_25px_rgba(124,58,237,0.75)] border-4 border-[#0f0f1a] flex items-center justify-center cursor-pointer disabled:opacity-70"
        >
          {isSpinning ? '...' : 'SPIN'}
        </motion.button>

        {/* Confetti Particle Explosion */}
        <AnimatePresence>
          {confettiKey > 0 && !isSpinning && (
            <div
              key={confettiKey}
              className="absolute inset-0 pointer-events-none flex items-center justify-center z-40"
            >
              {confettiParticles.map((pt) => (
                <motion.span
                  key={pt.id}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
                  animate={{
                    x: pt.x,
                    y: pt.y,
                    scale: [0, 1.2, 0.8],
                    opacity: [1, 1, 0],
                    rotate: pt.rotate,
                  }}
                  transition={{ duration: 1.1, ease: 'easeOut' }}
                  style={{ backgroundColor: pt.color }}
                  className="absolute w-3 h-3 rounded-sm shadow-sm"
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Winner Banner */}
      <AnimatePresence mode="wait">
        {selectedPlayer && !isSpinning && (
          <motion.div
            key={selectedPlayer.id}
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="px-6 py-4 rounded-2xl bg-gradient-to-r from-[#7c3aed]/25 via-[#2563eb]/25 to-[#22d3ee]/25 border border-[#a78bfa]/50 text-center shadow-lg shadow-[#7c3aed]/15"
          >
            <p className="font-display font-extrabold text-xl sm:text-2xl text-white">
              🎉 {selectedPlayer.name} goes first!
            </p>
            <p className="text-xs text-[#cbd5e1] mt-1">
              Ready to kick off the first turn
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Controls: Re-spin + Instant Pick Random + Manual Chips */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="primary"
          size="md"
          disabled={isSpinning}
          onClick={() => void handleSpin()}
        >
          {selectedPlayer ? (
            <>
              <RotateCcw className="w-4 h-4" />
              Re-Spin Wheel
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Spin the Wheel
            </>
          )}
        </Button>

        <Button
          variant="secondary"
          size="md"
          disabled={isSpinning}
          onClick={handlePickInstant}
        >
          <Shuffle className="w-4 h-4 text-[#22d3ee]" />
          Pick Random
        </Button>
      </div>
    </div>
  );
};

export default RandomPlayerWheel;
