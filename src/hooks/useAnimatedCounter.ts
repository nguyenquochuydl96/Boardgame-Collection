import { useEffect, useState } from 'react';

export function useAnimatedCounter(target: number, durationMs = 650): number {
  const [displayValue, setDisplayValue] = useState<number>(target);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setDisplayValue(target);
      return;
    }

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || durationMs <= 0) {
      setDisplayValue(target);
      return;
    }

    let startTimestamp: number | null = null;
    let animationFrameId: number;
    const startVal = 0;

    const step = (timestamp: number) => {
      if (startTimestamp === null) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / durationMs, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (target - startVal) * eased);
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setDisplayValue(target);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [target, durationMs]);

  return displayValue;
}

export default useAnimatedCounter;
