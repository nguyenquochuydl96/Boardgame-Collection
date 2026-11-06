import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';
import { cn } from './cn';

export const ThemeSelector: React.FC<{ className?: string }> = ({ className }) => {
  const currentTheme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const isDark = currentTheme === 'fitlo-dark';

  return (
    <div
      className={cn(
        'w-full p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--line-2)] flex items-center gap-1 select-none',
        className
      )}
    >
      <button
        type="button"
        onClick={() => setTheme('fitlo')}
        aria-pressed={!isDark}
        className={cn(
          'flex-1 flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer',
          !isDark
            ? 'bg-[var(--bg-card)] text-[var(--accent-primary)] shadow-xs border border-[var(--line)]'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
        )}
      >
        <Sun className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">Nordic Light</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme('fitlo-dark')}
        aria-pressed={isDark}
        className={cn(
          'flex-1 flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer',
          isDark
            ? 'bg-[var(--bg-card)] text-[var(--accent-primary)] shadow-xs border border-[var(--line)]'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
        )}
      >
        <Moon className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">Dark Pine</span>
      </button>
    </div>
  );
};

export default ThemeSelector;
