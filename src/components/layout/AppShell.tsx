import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Dices, Plus, Play, Settings, Smartphone } from 'lucide-react';
import { BottomNavBar, NAV_ITEMS } from './BottomNavBar';
import { Button } from '../ui/Button';
import { ThemeSelector } from '../ui/ThemeSelector';
import { PoweredByBGG } from '../ui/PoweredByBGG';
import { BGGConfigModal } from '../game/BGGConfigModal';
import { PwaInstallModal } from '../pwa/PwaInstallModal';
import { cn } from '../ui/cn';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const location = useLocation();
  const { isInstalled, deferredPrompt, install } = usePWAInstall();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showBGGModal, setShowBGGModal] = useState(false);

  useEffect(() => {
    const handleOpenInstall = () => setShowInstallModal(true);
    window.addEventListener('open-pwa-install', handleOpenInstall);
    return () => window.removeEventListener('open-pwa-install', handleOpenInstall);
  }, []);

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

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-xs text-[var(--text-secondary)] hover:text-white"
            onClick={() => setShowBGGModal(true)}
          >
            <Settings className="w-3.5 h-3.5 mr-1 text-[#ff7722]" />
            Cài Đặt BGG API
          </Button>

          {/* Official Powered by BGG Badge in Sidebar */}
          <div className="pt-1">
            <PoweredByBGG variant="sidebar" />
          </div>

          {!isInstalled && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400 font-bold transition-all shadow-xs"
              onClick={() => setShowInstallModal(true)}
            >
              <Smartphone className="w-4 h-4 mr-1.5 text-emerald-400" />
              Cài App Điện Thoại
            </Button>
          )}
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-30 h-14 pt-[env(safe-area-inset-top)] px-3 sm:px-4 flex items-center justify-between gap-2 bg-[var(--bg-surface)]/90 backdrop-blur-xl border-b border-[var(--border-subtle)]">
        <Link
          to="/"
          className="font-display font-bold text-sm sm:text-base tracking-tight text-[var(--text-primary)] whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span className="w-7 h-7 rounded-lg bg-[image:var(--gradient-hero)] inline-flex items-center justify-center shrink-0 shadow-sm shadow-purple-500/30">
            <Dices className="w-4 h-4 text-white" />
          </span>
          <span className="hidden xs:inline">BoardGame Vault</span>
          <span className="xs:hidden">Vault</span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {!isInstalled && (
            <button
              type="button"
              onClick={() => setShowInstallModal(true)}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 text-xs font-bold inline-flex items-center gap-1 transition-all shadow-sm shrink-0 cursor-pointer active:scale-95"
              title="Cài đặt BoardGame Vault vào màn hình chính điện thoại"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cài App</span>
            </button>
          )}
          <ThemeSelector compact />
          <button
            type="button"
            onClick={() => setShowBGGModal(true)}
            className="p-1.5 sm:p-2 rounded-xl text-[var(--text-secondary)] hover:text-[#ff7722] hover:bg-white/[0.05] transition-colors cursor-pointer"
            title="Cài đặt BGG API"
          >
            <Settings className="w-4 h-4" />
          </button>
          <Link
            to="/sessions/new"
            className="min-h-[34px] sm:min-h-[38px] px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-[image:var(--gradient-hero)] text-xs font-semibold text-white inline-flex items-center gap-1 shadow-md shadow-[var(--accent-glow)] whitespace-nowrap shrink-0 active:scale-95 transition-transform"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="hidden xs:inline">New Session</span>
            <span className="xs:hidden">Trận Mới</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-64 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}

          {/* Persistent Compliance Footer */}
          <PoweredByBGG variant="footer" />
        </div>
      </main>

      <BottomNavBar />

      <BGGConfigModal
        isOpen={showBGGModal}
        onClose={() => setShowBGGModal(false)}
      />

      <PwaInstallModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        deferredPrompt={deferredPrompt}
        onInstallSuccess={() => void install()}
      />
    </div>
  );
};

export default AppShell;
