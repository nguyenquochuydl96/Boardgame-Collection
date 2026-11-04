import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Home, Dices, Gamepad2, Users, BarChart3 } from 'lucide-react';
import { cn } from '../ui/cn';

export const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/collection', label: 'Collection', icon: Dices },
  { to: '/sessions', label: 'Sessions', icon: Gamepad2 },
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
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#16162a]/90 backdrop-blur-xl border-t border-white/[0.08]"
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
                'relative flex flex-col items-center justify-center min-h-[48px] min-w-[48px] rounded-xl transition-colors duration-300',
                active ? 'text-white' : 'text-[#94a3b8] hover:text-[#f1f5f9]'
              )}
            >
              {active && (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  className="absolute inset-x-2 inset-y-1 rounded-xl bg-[#7c3aed]/20 border border-[#7c3aed]/40"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon
                className={cn(
                  'relative z-10 w-5 h-5 transition-transform duration-300',
                  active && 'text-[#a78bfa] scale-110'
                )}
              />
              <span
                className={cn(
                  'relative z-10 text-[11px] font-semibold mt-0.5 tracking-tight whitespace-nowrap',
                  active ? 'text-[#f1f5f9]' : 'text-[#94a3b8]'
                )}
              >
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
