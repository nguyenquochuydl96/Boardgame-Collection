import React, { useEffect, useState } from 'react';

export const formatTimer = (secs: number): string => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// Decoupled 1Hz live timer widget: Runs internal interval to eliminate parent wizard re-renders
export const SessionLiveTimer: React.FC<{
  sessionStartTime: number;
  isTimerRunning: boolean;
  pausedDurationMs: number;
  pauseStartTime?: number;
  className?: string;
}> = React.memo(
  ({
    sessionStartTime,
    isTimerRunning,
    pausedDurationMs,
    pauseStartTime,
    className,
  }) => {
    const [secs, setSecs] = useState(() => {
      if (!isTimerRunning && pauseStartTime) {
        return Math.max(
          0,
          Math.floor((pauseStartTime - sessionStartTime - pausedDurationMs) / 1000)
        );
      }
      return Math.max(
        0,
        Math.floor((Date.now() - sessionStartTime - pausedDurationMs) / 1000)
      );
    });

    useEffect(() => {
      const update = () => {
        if (isTimerRunning) {
          setSecs(
            Math.max(
              0,
              Math.floor((Date.now() - sessionStartTime - pausedDurationMs) / 1000)
            )
          );
        } else if (pauseStartTime) {
          setSecs(
            Math.max(
              0,
              Math.floor((pauseStartTime - sessionStartTime - pausedDurationMs) / 1000)
            )
          );
        }
      };
      update();
      if (!isTimerRunning) return;
      const interval = window.setInterval(update, 1000);
      return () => window.clearInterval(interval);
    }, [isTimerRunning, sessionStartTime, pausedDurationMs, pauseStartTime]);

    return <span className={className}>{formatTimer(secs)}</span>;
  }
);
