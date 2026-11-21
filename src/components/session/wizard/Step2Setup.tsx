import React from 'react';
import { Clock, Pause, Play, RotateCcw } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { LocationSelector } from '../LocationSelector';
import { SessionLiveTimer } from './SessionLiveTimer';
import { cn } from '../../ui/cn';

interface Step2SetupProps {
  datePlayed: string;
  setDatePlayed: (val: string) => void;
  location: string;
  setLocation: (val: string) => void;
  durationMinutes: string;
  setDurationMinutes: (val: string) => void;
  sessionStartTime: number;
  isTimerRunning: boolean;
  pausedDurationMs: number;
  pauseStartTime?: number;
  onToggleTimer: () => void;
  onResetTimer: () => void;
}

export const Step2Setup: React.FC<Step2SetupProps> = React.memo(
  ({
    datePlayed,
    setDatePlayed,
    location,
    setLocation,
    durationMinutes,
    setDurationMinutes,
    sessionStartTime,
    isTimerRunning,
    pausedDurationMs,
    pauseStartTime,
    onToggleTimer,
    onResetTimer,
  }) => {
    return (
      <Card className="p-4 sm:p-6 md:p-8 space-y-6">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-[var(--text-primary)]">
            Step 2 — Session Setup
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Select play date, venue location, and track game time
          </p>
        </div>

        <div className="space-y-4">
          <Input
            label="Date Played"
            type="date"
            value={datePlayed}
            onChange={(e) => setDatePlayed(e.target.value)}
          />

          {/* Location Selector from permanent list */}
          <LocationSelector
            selectedLocation={location}
            onSelectLocation={(loc) => setLocation(loc)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
          <div className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-3">
            <label
              htmlFor="manual-duration-input"
              className="block text-xs font-semibold text-[var(--text-secondary)]"
            >
              Duration (Minutes - Auto or manual adjustment)
            </label>
            <input
              id="manual-duration-input"
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="w-full min-h-[44px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-4 py-2 font-mono font-bold text-xl text-[var(--text-primary)] tabular-nums focus:outline-none focus:border-[var(--accent-primary)]"
            />
            <div className="flex flex-wrap gap-2">
              {[30, 45, 60, 90, 120].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDurationMinutes(String(preset))}
                  className="px-3 py-1 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--accent-glow)] text-xs font-mono text-[var(--text-primary)] border border-[var(--border-subtle)] cursor-pointer"
                >
                  {preset}m
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    isTimerRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  )}
                />
                Stopwatch Active
              </span>
              <Clock className="w-4 h-4 text-[var(--accent-neon)]" />
            </div>
            <p className="font-mono font-extrabold text-3xl text-[var(--accent-neon)] tabular-nums">
              <SessionLiveTimer
                sessionStartTime={sessionStartTime}
                isTimerRunning={isTimerRunning}
                pausedDurationMs={pausedDurationMs}
                pauseStartTime={pauseStartTime}
              />
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant={isTimerRunning ? 'secondary' : 'primary'}
                size="sm"
                onClick={onToggleTimer}
              >
                {isTimerRunning ? (
                  <>
                    <Pause className="w-4 h-4 mr-1" />
                    Pause Timer
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-1 fill-current" />
                    Resume Timer
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onResetTimer}
                className="text-xs text-[var(--text-secondary)]"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }
);
