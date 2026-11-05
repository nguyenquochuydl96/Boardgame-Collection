import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { useThemeStore, AVAILABLE_THEMES, AppTheme } from '../../store/useThemeStore';
import { cn } from './cn';

export interface ThemeSelectorProps {
  compact?: boolean;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ compact = false }) => {
  const currentThemeId = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentTheme =
    AVAILABLE_THEMES.find((t) => t.id === currentThemeId) || AVAILABLE_THEMES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (id: AppTheme) => {
    setTheme(id);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-xl transition-all cursor-pointer border',
          'bg-[var(--bg-elevated)] border-[var(--border-subtle)] hover:border-[var(--border-glow)] text-[var(--text-primary)]',
          compact
            ? 'p-2 min-h-[38px] min-w-[38px] justify-center'
            : 'px-3 py-2 text-xs font-semibold w-full justify-between'
        )}
        aria-label="Select Theme"
      >
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{currentTheme.icon}</span>
          {!compact && (
            <span className="truncate max-w-[120px] font-medium">
              {currentTheme.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
            style={{ backgroundColor: currentTheme.colors.accent }}
          />
          {!compact && <Palette className="w-3.5 h-3.5 text-[var(--text-secondary)]" />}
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-2 w-72 rounded-2xl p-2 shadow-2xl backdrop-blur-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 animate-in fade-in zoom-in-95 duration-150',
            compact ? 'right-0 top-full' : 'bottom-full mb-2 left-0'
          )}
        >
          <div className="px-3 py-2 border-b border-[var(--border-subtle)] mb-1">
            <p className="text-xs font-bold text-[var(--text-primary)]">Theme & Appearance</p>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Select your favorite look and ambient style
            </p>
          </div>

          <div className="space-y-1">
            {AVAILABLE_THEMES.map((theme) => {
              const isSelected = theme.id === currentThemeId;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleSelect(theme.id)}
                  className={cn(
                    'w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer group',
                    isSelected
                      ? 'bg-[var(--accent-glow)] border border-[var(--border-glow)] text-[var(--text-primary)]'
                      : 'hover:bg-white/[0.04] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg leading-none">{theme.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-[var(--text-primary)] truncate">
                          {theme.name}
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-[var(--accent-neon)] shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)] truncate">
                        {theme.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Color dots preview */}
                  <div className="flex items-center -space-x-1 shrink-0 ml-2">
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-sm"
                      style={{ backgroundColor: theme.colors.bg }}
                    />
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-sm"
                      style={{ backgroundColor: theme.colors.surface }}
                    />
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-sm z-10"
                      style={{ backgroundColor: theme.colors.accent }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;
