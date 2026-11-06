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
      className="lg:hidden fixed bottom-[max(10px,env(safe-area-inset-bottom))] left-3 right-3 z-40 max-w-md mx-auto"
    >
      <div className="bg-[var(--card)]/95 backdrop-blur-xl rounded-[22px] shadow-[inset_0_0_0_1px_var(--line-2),var(--shadow-lg)] p-1.5 grid grid-cols-5 items-center">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isTabActive(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'relative flex flex-col items-center justify-center h-[52px] rounded-[16px] transition-colors duration-200 select-none cursor-pointer',
                active ? 'text-[var(--accent-ink)] font-bold' : 'text-[var(--muted)] hover:text-[var(--ink)] font-medium'
              )}
            >
              {active && (
                <motion.span
                  layoutId="fitlo-tabbar-pill"
                  className="absolute inset-0 rounded-[16px] bg-[var(--accent)] shadow-sm pointer-events-none"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
              <Icon
                className={cn(
                  'relative z-10 w-[20px] h-[20px] transition-transform duration-200',
                  active ? 'scale-105' : 'opacity-80'
                )}
              />
              <span className="relative z-10 text-[10px] mt-0.5 tracking-tight truncate max-w-[54px]">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavBar;
