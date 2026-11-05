import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, ChevronUp } from 'lucide-react';
import { useThemeStore, AVAILABLE_THEMES } from '../../store/useThemeStore';
import { cn } from './cn';
import { motion, AnimatePresence } from 'motion/react';

export const ThemeSelector: React.FC<{ className?: string }> = ({ className }) => {
  const currentTheme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeThemeConfig = AVAILABLE_THEMES.find((t) => t.id === currentTheme) || AVAILABLE_THEMES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Choose Theme: Fitlo Nordic, Fitlo Dark Pine, Rayé Signature, Rayé Noir"
        className={cn(
          'w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-[1.5px] border-[var(--ink)] bg-[var(--bg-card)] shadow-[var(--shadow-brutal-xs)] hover:shadow-[var(--shadow-brutal-sm)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group select-none',
          isOpen && 'ring-2 ring-[var(--accent-primary)]',
          className
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm border border-[var(--ink)] bg-[var(--bg-surface)] shrink-0 group-hover:scale-105 transition-transform">
            {activeThemeConfig.icon}
          </span>
          <div className="text-left min-w-0">
            <p className="text-xs font-bold font-display tracking-tight text-[var(--text-primary)] truncate">
              {activeThemeConfig.name}
            </p>
            <p className="text-[10px] text-[var(--text-secondary)] font-medium truncate">
              Theme Palette
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center -space-x-1">
            <span
              className="w-3 h-3 rounded-full border border-[var(--ink)] shadow-xs"
              style={{ backgroundColor: activeThemeConfig.colors.accent }}
            />
            <span
              className="w-3 h-3 rounded-full border border-[var(--ink)] shadow-xs"
              style={{ backgroundColor: activeThemeConfig.colors.secondary }}
            />
            <span
              className="w-3 h-3 rounded-full border border-[var(--ink)] shadow-xs"
              style={{ backgroundColor: activeThemeConfig.colors.bg }}
            />
          </div>
          <ChevronUp
            className={cn(
              'w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform duration-200',
              isOpen ? 'rotate-180' : ''
            )}
          />
        </div>
      </button>

      {/* Popover Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-[var(--bg-card)] border-[1.5px] border-[var(--ink)] rounded-2xl shadow-[var(--shadow-brutal-lg)] z-50 space-y-1.5"
            role="menu"
          >
            <div className="px-2 py-1.5 flex items-center justify-between border-b border-[var(--border-divider)] mb-1">
              <span className="text-[10px] font-bold tracking-wider uppercase text-[var(--text-muted)] flex items-center gap-1.5">
                <Palette className="w-3 h-3" /> Select Theme
              </span>
              <span className="text-[9px] font-semibold text-[var(--text-muted)]">
                4 styles
              </span>
            </div>

            {AVAILABLE_THEMES.map((t) => {
              const isSelected = t.id === currentTheme;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTheme(t.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between p-2 rounded-xl text-left transition-all border cursor-pointer select-none',
                    isSelected
                      ? 'bg-[var(--accent-soft)] border-[var(--accent-primary)] text-[var(--text-primary)] font-bold shadow-xs'
                      : 'border-transparent hover:bg-[var(--bg-surface)] hover:border-[var(--border-divider)] text-[var(--text-secondary)]'
                  )}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base shrink-0">{t.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold leading-tight text-[var(--text-primary)] truncate">
                        {t.name}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] leading-tight truncate mt-0.5">
                        {t.id === 'fitlo' && 'Scandinavian Spruce & Clean Stone'}
                        {t.id === 'fitlo-dark' && 'Obsidian Pine & Mint Glow'}
                        {t.id === 'raye' && 'Cream, Summer Coral & Editorial'}
                        {t.id === 'noir' && 'Midnight Velvet & Butter'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <div className="flex items-center -space-x-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-[var(--ink)]"
                        style={{ backgroundColor: t.colors.accent }}
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-[var(--ink)]"
                        style={{ backgroundColor: t.colors.secondary }}
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-[var(--ink)]"
                        style={{ backgroundColor: t.colors.bg }}
                      />
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                    )}
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeSelector;
