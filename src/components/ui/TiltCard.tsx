import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from 'motion/react';
import { cn } from './cn';

export interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  glare?: boolean;
  maxTilt?: number;
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  style = {},
  onClick,
  glare = true,
  maxTilt = 6,
  ...props
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Normalized pointer coordinates from 0 to 1 (center is 0.5)
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  // Smooth springs for 3D rotation angles (-maxTilt to +maxTilt)
  const rotateXSpring = useSpring(useTransform(y, [0, 1], [maxTilt, -maxTilt]), {
    damping: 24,
    stiffness: 280,
  });
  const rotateYSpring = useSpring(useTransform(x, [0, 1], [-maxTilt, maxTilt]), {
    damping: 24,
    stiffness: 280,
  });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const py = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    x.set(px);
    y.set(py);
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    setIsHovered(true);
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    x.set(0.5);
    y.set(0.5);
  };

  // Metallic glass reflection coordinates
  const glareXPercent = useTransform(x, [0, 1], [0, 100]);
  const glareYPercent = useTransform(y, [0, 1], [0, 100]);
  const backgroundSheen = useMotionTemplate`radial-gradient(circle at ${glareXPercent}% ${glareYPercent}%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 35%, transparent 65%)`;

  return (
    <div style={{ perspective: 1000 }} className="relative h-full">
      <motion.div
        ref={ref}
        style={{
          rotateX: rotateXSpring,
          rotateY: rotateYSpring,
          transformStyle: 'preserve-3d',
          ...style,
        }}
        whileHover={{
          scale: 1.025,
          y: -4,
          transition: { duration: 0.2, ease: 'easeOut' },
        }}
        whileTap={{ scale: 0.98 }}
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={onClick}
        className={cn(
          'relative overflow-hidden rounded-2xl transition-shadow duration-300',
          isHovered
            ? 'shadow-2xl shadow-[var(--accent-glow)] border-[var(--border-glow)]'
            : 'shadow-md border-[var(--border-subtle)]',
          className
        )}
        {...(props as any)}
      >
        {/* Dynamic metallic sheen reflection overlay */}
        {glare && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 transition-opacity duration-300"
            style={{
              opacity: isHovered ? 1 : 0,
              background: backgroundSheen,
            }}
          />
        )}

        {/* Content elevated in Z-space */}
        <div style={{ transform: 'translateZ(10px)' }} className="relative z-10 h-full">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

export default TiltCard;
