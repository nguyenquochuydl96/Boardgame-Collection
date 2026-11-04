import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Dices, Plus, Play, Download } from 'lucide-react';
import { BottomNavBar, NAV_ITEMS } from './BottomNavBar';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ThemeSelector } from '../ui/ThemeSelector';
import { cn } from '../ui/cn';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const location = useLocation();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  const isTabActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors duration-300">
      {/* Desktop Sidebar Navigation */}
      <aside
        aria-label="Sidebar navigation"
        className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30 bg-[var(--bg-surface)]/95 backdrop-blur-xl border-r border-[var(--border-subtle)]"
      >
        <div className="flex items-center gap-3 px-6 h-20 border-b border-[var(--border-subtle)]">
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-[image:var(--gradient-hero)] flex items-center justify-center shadow-lg shadow-[var(--accent-glow)] group-hover:scale-105 transition-transform">
              <Dices className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-extrabold text-xl tracking-tight text-[var(--text-primary)] whitespace-nowrap">
              BoardGame Vault
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isTabActive(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'relative flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap',
                  active
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04]'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-nav-indicator"
                    className="absolute inset-0 rounded-xl bg-[image:var(--gradient-hero)] opacity-20 border border-[var(--border-glow)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon
                  className={cn(
                    'relative z-10 w-5 h-5 shrink-0',
                    active ? 'text-[var(--accent-neon)]' : 'text-[var(--text-secondary)]'
                  )}
                />
                <span className="relative z-10">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="p-4 border-t border-[var(--border-subtle)] space-y-2.5">
          {/* Theme Selector */}
          <div className="mb-2">
            <ThemeSelector />
          </div>

          <Link to="/sessions/new" className="block">
            <Button variant="primary" className="w-full justify-center">
              <Play className="w-4 h-4 fill-current" />
              New Session
            </Button>
          </Link>
          <Link to="/collection/add" className="block">
            <Button variant="secondary" className="w-full justify-center">
              <Plus className="w-4 h-4" />
              Add Game
            </Button>
          </Link>
          {!isInstalled && (isInstallable || isIOS) && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center"
              onClick={() => {
                if (isInstallable) {
                  void install();
                } else {
                  setShowIOSModal(true);
                }
              }}
            >
              <Download className="w-4 h-4" />
              Install Vault App
            </Button>
          )}
        </div>
      </aside>

      {/* Mobile Top Header (3-zone contract) */}
      <header className="lg:hidden sticky top-0 z-30 h-14 px-4 flex items-center justify-between gap-3 bg-[var(--bg-surface)]/90 backdrop-blur-xl border-b border-[var(--border-subtle)]">
        <Link
          to="/"
          className="font-display font-bold text-base tracking-tight text-[var(--text-primary)] whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span className="w-7 h-7 rounded-lg bg-[image:var(--gradient-hero)] inline-flex items-center justify-center">
            <Dices className="w-4 h-4 text-white" />
          </span>
          BoardGame Vault
        </Link>

        <div className="flex items-center gap-2 shrink-0">
          <ThemeSelector compact />
          <Link
            to="/sessions/new"
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[image:var(--gradient-hero)] text-xs font-semibold text-white inline-flex items-center gap-1.5 shadow-md shadow-[var(--accent-glow)] whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            New Session
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-64 pb-24 lg:pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </div>
      </main>

      <BottomNavBar />

      <Modal
        isOpen={showIOSModal}
        onClose={() => setShowIOSModal(false)}
        title="Install BoardGame Vault"
      >
        <div className="space-y-4 text-sm text-[var(--text-secondary)]">
          <p>
            Install BoardGame Vault on your home screen for instant offline access at game night:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-[var(--text-primary)]">
            <li>Tap the Share button in your browser toolbar.</li>
            <li>Select Add to Home Screen.</li>
          </ol>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => setShowIOSModal(false)}
          >
            Got It
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default AppShell;
