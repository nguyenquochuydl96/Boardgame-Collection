import React, { useState, useRef } from 'react';
import { motion, useAnimation } from 'motion/react';
import { RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { PickerItem } from './MysteryCardShuffle';
import { playTickSound, playFanfareSound, triggerConfetti } from '../../lib/soundEffects';
import { resolveAvatarImage, getSafeDisplayAvatar } from '../../lib/utils';

export interface LuckyWheelProps {
  items: PickerItem[];
  onSelect: (item: PickerItem) => void;
}

const SLICE_COLORS = [
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f97316', // Orange
  '#3b82f6', // Blue
  '#e11d48', // Rose
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

export const LuckyWheel: React.FC<LuckyWheelProps> = ({ items, onSelect }) => {
  const controls = useAnimation();
  const [isSpinning, setIsSpinning] = useState(false);
  const [winnerItem, setWinnerItem] = useState<PickerItem | null>(null);
  const currentRotationRef = useRef(0);

  const count = Math.max(items.length, 1);
  const sliceAngle = 360 / count;

  const handleSpin = async () => {
    if (isSpinning || items.length === 0) return;
    setIsSpinning(true);
    setWinnerItem(null);

    const winnerIndex = Math.floor(Math.random() * items.length);
    const chosen = items[winnerIndex];

    // Align segment center with 360 deg at top pointer (0 deg)
    const segmentCenter = winnerIndex * sliceAngle + sliceAngle / 2;
    const randomJitter = (Math.random() - 0.5) * (sliceAngle * 0.4);
    const targetAlignment = (360 - segmentCenter + randomJitter + 360) % 360;

    const extraFullSpins = (5 + Math.floor(Math.random() * 3)) * 360;
    const baseMod = currentRotationRef.current % 360;
    const delta = (targetAlignment - baseMod + 360) % 360;
    const nextRotation = currentRotationRef.current + extraFullSpins + delta;

    currentRotationRef.current = nextRotation;

    // Tick audio during spin
    const spinDuration = 4.2; // seconds
    let elapsed = 0;
    const interval = 120;
    const ticker = setInterval(() => {
      elapsed += interval;
      playTickSound(1 + (elapsed / (spinDuration * 1000)) * 0.3);
      if (elapsed >= spinDuration * 1000 - 300) {
        clearInterval(ticker);
      }
    }, interval);

    await controls.start({
      rotate: nextRotation,
      transition: {
        duration: spinDuration,
        ease: [0.15, 0.9, 0.25, 1],
      },
    });

    clearInterval(ticker);
    setIsSpinning(false);
    setWinnerItem(chosen);
    playFanfareSound();
    triggerConfetti();
    onSelect(chosen);
  };

  const radius = 138;
  const center = 150;
  const avatarR = count > 10 ? 10 : count > 6 ? 12 : 14;

  if (items.length === 0) {
    return (
      <div className="text-center p-6 space-y-2">
        <span className="text-3xl">⚠️</span>
        <p className="font-bold text-sm text-[var(--text-primary)]">
          No items on the wheel yet
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-4 space-y-6 w-full">
      {/* Wheel Stage */}
      <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center select-none">
        {/* Top Pointer Arrow */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none drop-shadow-xl">
          <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-amber-400" />
        </div>

        {/* Outer Glow Ring */}
        <div className="absolute inset-0 rounded-full border-4 border-amber-400/50 shadow-2xl shadow-amber-500/25 pointer-events-none" />

        {/* Animated Rotating Wheel Wrapper */}
        <motion.div
          animate={controls}
          style={{ rotate: 0 }}
          className="relative w-full h-full rounded-full overflow-hidden shadow-2xl bg-[#16162a]"
        >
          <svg
            className="w-full h-full"
            viewBox="0 0 300 300"
          >
            <defs>
              {items.map((item, idx) => {
                const imageSrc = resolveAvatarImage(item.thumbnail || item.avatar);
                if (!imageSrc) return null;
                const midAngle = idx * sliceAngle + sliceAngle / 2;
                const pos = polarToCartesian(center, center, radius * 0.74, midAngle);
                return (
                  <clipPath key={`clip-${item.id}-${idx}`} id={`avatar-clip-${idx}`}>
                    <circle cx={pos.x} cy={pos.y} r={avatarR} />
                  </clipPath>
                );
              })}
            </defs>

            {items.map((item, idx) => {
              const startAngle = idx * sliceAngle;
              const endAngle = (idx + 1) * sliceAngle;
              const pathData = describeArcSector(center, center, radius, startAngle, endAngle);
              const midAngle = startAngle + sliceAngle / 2;
              const textAngle = midAngle + (midAngle > 90 && midAngle < 270 ? 180 : 0);

              const avatarPos = polarToCartesian(center, center, radius * 0.74, midAngle);
              const textPos = polarToCartesian(center, center, radius * 0.42, midAngle);
              const color = item.color || SLICE_COLORS[idx % SLICE_COLORS.length];
              const imageSrc = resolveAvatarImage(item.thumbnail || item.avatar);

              return (
                <g key={`item-${item.id}-${idx}`}>
                  {/* Sector Slice */}
                  <path
                    d={pathData}
                    fill={color}
                    stroke="rgba(0,0,0,0.35)"
                    strokeWidth="2"
                  />

                  {/* Avatar Circle on Slice */}
                  {imageSrc ? (
                    <g>
                      <circle
                        cx={avatarPos.x}
                        cy={avatarPos.y}
                        r={avatarR + 1}
                        fill="#ffffff"
                        stroke="rgba(0,0,0,0.5)"
                        strokeWidth="1.5"
                      />
                      <image
                        href={imageSrc}
                        x={avatarPos.x - avatarR}
                        y={avatarPos.y - avatarR}
                        width={avatarR * 2}
                        height={avatarR * 2}
                        clipPath={`url(#avatar-clip-${idx})`}
                        preserveAspectRatio="xMidYMid slice"
                      />
                    </g>
                  ) : (
                    <g>
                      <circle
                        cx={avatarPos.x}
                        cy={avatarPos.y}
                        r={avatarR}
                        fill="rgba(0,0,0,0.35)"
                        stroke="#ffffff"
                        strokeWidth="1"
                      />
                      <text
                        x={avatarPos.x}
                        y={avatarPos.y + 0.5}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={avatarR * 1.25}
                        transform={`rotate(${textAngle}, ${avatarPos.x}, ${avatarPos.y})`}
                      >
                        {getSafeDisplayAvatar(item.avatar, '🎲')}
                      </text>
                    </g>
                  )}

                  {/* Player or Game Name (Never raw base64 string) */}
                  <text
                    x={textPos.x}
                    y={textPos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#ffffff"
                    fontSize={count > 12 ? '8.5' : count > 8 ? '10' : '11.5'}
                    fontWeight="800"
                    fontFamily="Outfit, sans-serif"
                    transform={`rotate(${textAngle}, ${textPos.x}, ${textPos.y})`}
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}
                  >
                    {item.name.length > 9 ? item.name.slice(0, 8) + '…' : item.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </motion.div>

        {/* Center Spin Hub Button */}
        <button
          type="button"
          onClick={handleSpin}
          disabled={isSpinning || items.length === 0}
          className="absolute z-20 w-16 h-16 rounded-full bg-[var(--bg-elevated)] border-4 border-amber-400 text-white font-extrabold text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 select-none"
        >
          {isSpinning ? '...' : 'SPIN'}
        </button>
      </div>

      {/* Spin Button */}
      <div className="flex flex-col items-center gap-2">
        <Button
          size="lg"
          variant="primary"
          onClick={handleSpin}
          disabled={isSpinning || items.length === 0}
          className="min-w-[200px] shadow-xl shadow-[var(--accent-glow)] text-sm font-extrabold tracking-wide"
        >
          <RotateCcw className={`w-4 h-4 mr-2 ${isSpinning ? 'animate-spin' : ''}`} />
          {isSpinning ? 'Spinning the wheel...' : winnerItem ? 'Spin Again' : 'Spin the Wheel'}
        </Button>

        <p className="text-xs text-[var(--text-secondary)]">
          {items.length} choices on the wheel
        </p>
      </div>
    </div>
  );
};
