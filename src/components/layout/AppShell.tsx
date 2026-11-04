import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Dices, Plus, Play, Download } from 'lucide-react';
import { BottomNavBar, NAV_ITEMS } from './BottomNavBar';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0f0f1a] text-[#f1f5f9]">
      {/* Desktop Sidebar Navigation */}
      <aside
        aria-label="Sidebar navigation"
        className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30 bg-[#16162a]/90 backdrop-blur-xl border-r border-white/[0.08]"
      >
        <div className="flex items-center gap-3 px-6 h-20 border-b border-white/[0.08]">
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-[image:var(--gradient-hero)] flex items-center justify-center shadow-lg shadow-[#7c3aed]/30 group-hover:scale-105 transition-transform">
              <Dices className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-extrabold text-xl tracking-tight text-white whitespace-nowrap">
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
                    ? 'text-white'
                    : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04]'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-nav-indicator"
                    className="absolute inset-0 rounded-xl bg-[image:var(--gradient-hero)] opacity-20 border border-[#a78bfa]/40"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon
                  className={cn(
                    'relative z-10 w-5 h-5 shrink-0',
                    active ? 'text-[#a78bfa]' : 'text-[#94a3b8]'
                  )}
                />
                <span className="relative z-10">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/[0.08] space-y-2.5">
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
      <header className="lg:hidden sticky top-0 z-30 h-14 px-4 flex items-center justify-between gap-4 bg-[#16162a]/85 backdrop-blur-xl border-b border-white/[0.08]">
        <Link
          to="/"
          className="font-display font-bold text-base tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span className="w-7 h-7 rounded-lg bg-[image:var(--gradient-hero)] inline-flex items-center justify-center">
            <Dices className="w-4 h-4 text-white" />
          </span>
          BoardGame Vault
        </Link>

        <div className="flex items-center gap-2 shrink-0">
          {!isInstalled && isInstallable && (
            <button
              type="button"
              onClick={() => void install()}
              className="min-h-[38px] px-3 rounded-xl bg-white/10 text-xs font-semibold text-white hover:bg-white/15 transition-colors whitespace-nowrap"
            >
              Install
            </button>
          )}
          <Link
            to="/sessions/new"
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[image:var(--gradient-hero)] text-xs font-semibold text-white inline-flex items-center gap-1.5 shadow-md shadow-[#7c3aed]/25 whitespace-nowrap shrink-0"
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
        <div className="space-y-4 text-sm text-[#94a3b8]">
          <p>
            Install BoardGame Vault on your home screen for instant offline access at game night:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-[#f1f5f9]">
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
