import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Home, Dices, Gamepad2, Users, BarChart3 } from 'lucide-react';
import { cn } from '../ui/cn';

export const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/collection', label: 'Vault', icon: Dices },
  { to: '/sessions', label: 'Plays', icon: Gamepad2 },
  { to: '/players', label: 'Players', icon: Users },
  { to: '/stats', label: 'Stats', icon: BarChart3 },
];

export const BottomNavBar: React.FC = () => {
  const location = useLocation();

  const isTabActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      aria-label="Mobile navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-surface)]/95 backdrop-blur-xl border-t border-[var(--border-subtle)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 items-center h-16 max-w-lg mx-auto px-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isTabActive(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'relative flex flex-col items-center justify-center min-h-[48px] min-w-[40px] rounded-xl transition-colors duration-300',
                active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              {active && (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  className="absolute inset-x-1 inset-y-1 rounded-xl bg-[var(--accent-glow)] border border-[var(--border-glow)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon
                className={cn(
                  'relative z-10 w-5 h-5 transition-transform duration-300',
                  active ? 'text-[var(--accent-neon)] scale-110' : 'text-[var(--text-secondary)]'
                )}
              />
              <span className="relative z-10 text-[10px] font-semibold mt-0.5 tracking-tight truncate max-w-[50px]">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
