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
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-card)] border-t-[1.5px] border-[var(--ink)] shadow-[0_-2px_0_var(--ink)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 items-center h-16 max-w-lg mx-auto px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isTabActive(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'relative flex flex-col items-center justify-center min-h-[48px] py-1 rounded-xl transition-all duration-200 select-none',
                active ? 'text-[var(--ink)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              {active && (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  className="absolute inset-x-1 inset-y-1 rounded-xl bg-[var(--coral)] border-[1.5px] border-[var(--ink)] shadow-[2px_2px_0_var(--ink)]"
                  transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                />
              )}
              <Icon
                className={cn(
                  'relative z-10 w-5 h-5 transition-transform duration-200',
                  active ? 'text-[var(--ink)] scale-110' : 'text-[var(--text-secondary)]'
                )}
              />
              <span className={cn(
                'relative z-10 text-[10px] font-bold font-display uppercase tracking-tight mt-0.5 truncate max-w-[54px]',
                active ? 'text-[var(--ink)]' : 'text-[var(--text-secondary)]'
              )}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
