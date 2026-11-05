import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';
import { cn } from './cn';

export const ThemeSelector: React.FC<{ className?: string }> = ({ className }) => {
  const currentTheme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const isNoir = currentTheme === 'noir';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isNoir ? 'Switch to Rayé Signature (Warm Cream)' : 'Switch to Rayé Noir (Midnight)'}
      className={cn(
        'w-full flex items-center justify-between px-3 py-2 rounded-xl border-[1.5px] border-[var(--ink)] bg-[var(--bg-card)] shadow-[var(--shadow-brutal-xs)] hover:shadow-[var(--shadow-brutal-sm)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group',
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="w-6 h-6 rounded-full flex items-center justify-center border border-[var(--ink)] bg-[var(--butter)] text-[var(--ink)] group-hover:rotate-12 transition-transform">
          {isNoir ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
        </span>
        <div className="text-left">
          <p className="text-xs font-bold font-display tracking-tight text-[var(--text-primary)]">
            {isNoir ? 'Rayé Noir' : 'Rayé Signature'}
          </p>
          <p className="text-[10px] text-[var(--text-secondary)] font-medium">
            {isNoir ? 'Midnight Lounge' : 'Sunlit Cream & Coral'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <span
          className={cn(
            'w-2 h-2 rounded-full border border-[var(--ink)] transition-colors',
            isNoir ? 'bg-zinc-600' : 'bg-[var(--coral)]'
          )}
        />
        <span
          className={cn(
            'w-2 h-2 rounded-full border border-[var(--ink)] transition-colors',
            isNoir ? 'bg-[var(--butter)]' : 'bg-[var(--teal)]'
          )}
        />
      </div>
    </button>
  );
};

export default ThemeSelector;
