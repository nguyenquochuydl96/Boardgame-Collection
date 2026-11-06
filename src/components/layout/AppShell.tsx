import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  Dices,
  Plus,
  Play,
  Settings,
  Cloud,
  CloudCheck,
  Moon,
  Sun,
} from 'lucide-react';
import { BottomNavBar, NAV_ITEMS } from './BottomNavBar';
import { Button } from '../ui/Button';
import { ThemeSelector } from '../ui/ThemeSelector';
import { PoweredByBGG } from '../ui/PoweredByBGG';
import { BGGConfigModal } from '../game/BGGConfigModal';
import { PwaInstallModal } from '../pwa/PwaInstallModal';
import { CloudSyncModal } from '../sync/CloudSyncModal';
import { cn } from '../ui/cn';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useSyncStore } from '../../store/useSyncStore';
import { useGameStore } from '../../store/useGameStore';
import { useSessionStore } from '../../store/useSessionStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useThemeStore } from '../../store/useThemeStore';
import {
  pullVaultFromCloud,
  pushVaultToCloud,
  startVaultRealtimeSubscription,
  checkUrlSyncParameters,
} from '../../lib/supabaseSync';

export interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const location = useLocation();
  const { isInstalled, deferredPrompt, install } = usePWAInstall();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showBGGModal, setShowBGGModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === 'fitlo-dark';

  const isSyncEnabled = useSyncStore((s) => s.isEnabled);
  const autoSync = useSyncStore((s) => s.autoSync);
  const syncStatus = useSyncStore((s) => s.syncStatus);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);

  // Sync on startup once URL parameters are parsed
  useEffect(() => {
    checkUrlSyncParameters();
    if (useSyncStore.getState().isEnabled) {
      pullVaultFromCloud().catch(() => {});
      startVaultRealtimeSubscription();
    }
  }, []);

  // Debounced auto-push when stores change locally
  useEffect(() => {
    if (!isSyncEnabled || !autoSync) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const triggerPush = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        pushVaultToCloud();
      }, 2500);
    };

    const unsubGames = useGameStore.subscribe(triggerPush);
    const unsubSessions = useSessionStore.subscribe(triggerPush);
    const unsubPlayers = usePlayerStore.subscribe(triggerPush);

    return () => {
      if (timer) clearTimeout(timer);
      unsubGames();
      unsubSessions();
      unsubPlayers();
    };
  }, [isSyncEnabled, autoSync]);

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
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors duration-300 relative">
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Desktop Sidebar Navigation */}
        <aside
          aria-label="Sidebar navigation"
          className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:top-0 lg:bottom-0 z-30 bg-[var(--bg-card)] border-r border-[var(--line)] shadow-xs"
        >
          {/* Logo Header */}
          <div className="flex items-center justify-between px-6 h-18 border-b border-[var(--line)] bg-[var(--bg-card)]">
            <Link
              to="/"
              className="flex items-center gap-3 group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary)] text-[var(--accent-ink)] shadow-md shadow-[var(--accent-primary)]/25 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Dices className="w-5 h-5 text-current" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-lg tracking-tight leading-none text-[var(--text-primary)]">
                  BoardGame <span className="text-[var(--accent-primary)] font-extrabold">Vault</span>
                </span>
                <span className="text-[10px] font-semibold text-[var(--text-muted)] tracking-wider uppercase mt-1">
                  Tabletop Archive
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isTabActive(item.to);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'group relative flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 select-none',
                    active
                      ? 'bg-[var(--accent-primary)] text-[var(--accent-ink)] shadow-sm shadow-[var(--accent-primary)]/20'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 shrink-0 transition-transform group-hover:scale-105',
                      active ? 'text-[var(--accent-ink)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'
                    )}
                  />
                  <span className="flex-1">{item.label}</span>
                  {active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-ink)]" />
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Sidebar Footer Controls */}
          <div className="p-4 border-t border-[var(--line)] bg-[var(--bg-card)] space-y-2.5">
            <ThemeSelector />

            <Link to="/sessions/new" className="block">
              <Button variant="primary" size="md" className="w-full justify-center" withArrowDot>
                <Play className="w-4 h-4 fill-current mr-1" />
                New Session
              </Button>
            </Link>
            <Link to="/collection/add" className="block">
              <Button variant="secondary" size="md" className="w-full justify-center">
                <Plus className="w-4 h-4 mr-1" />
                Add Game
              </Button>
            </Link>

            {/* Cloud Sync Button */}
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'w-full justify-center text-xs transition-colors',
                isSyncEnabled
                  ? syncStatus === 'error'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'text-[var(--text-secondary)]'
              )}
              onClick={() => setShowSyncModal(true)}
            >
              {isSyncEnabled ? (
                <>
                  <CloudCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'error' ? 'Sync Error' : 'Cloud Synced'}
                  </span>
                  {lastSyncedAt && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1.5" />
                  )}
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 mr-1.5 text-[var(--text-muted)]" />
                  <span>Setup Cloud Sync</span>
                </>
              )}
            </Button>

            {/* BGG Configuration Button */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              onClick={() => setShowBGGModal(true)}
            >
              <Settings className="w-3.5 h-3.5 mr-1.5" />
              <span>BGG Settings</span>
            </Button>

            {/* Powered by BGG badge */}
            <div className="pt-2 border-t border-[var(--line)]">
              <PoweredByBGG />
            </div>

            {/* PWA Install Button */}
            {!isInstalled && deferredPrompt && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center text-xs text-[var(--accent-primary)] border-[var(--accent-primary)]/30 hover:bg-[var(--accent-soft)]"
                onClick={() => setShowInstallModal(true)}
              >
                Install Mobile App
              </Button>
            )}
          </div>
        </aside>

        {/* Mobile Top Header */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-[var(--bg-card)]/90 backdrop-blur-md text-[var(--text-primary)] border-b border-[var(--line)] shadow-xs">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--accent-primary)] text-[var(--accent-ink)] flex items-center justify-center shadow-xs">
              <Dices className="w-4 h-4 text-current" />
            </div>
            <span className="font-display font-bold text-base tracking-tight text-[var(--text-primary)]">
              BoardGame <span className="text-[var(--accent-primary)] font-extrabold">Vault</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title={isDark ? 'Switch to Light' : 'Switch to Dark'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setShowSyncModal(true)}
              className="p-2 rounded-xl bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Cloud Sync"
            >
              {isSyncEnabled ? (
                <CloudCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Cloud className="w-4 h-4 text-[var(--text-muted)]" />
              )}
            </button>

            <Link
              to="/sessions/new"
              className="w-8 h-8 rounded-xl bg-[var(--accent-primary)] text-[var(--accent-ink)] flex items-center justify-center shadow-xs"
              title="New Session"
            >
              <Plus className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* Main Content Area */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 lg:pl-72 pb-24 lg:pb-12 focus:outline-none"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNavBar />

      {/* Modals */}
      <CloudSyncModal isOpen={showSyncModal} onClose={() => setShowSyncModal(false)} />
      <BGGConfigModal isOpen={showBGGModal} onClose={() => setShowBGGModal(false)} />
      <PwaInstallModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        deferredPrompt={deferredPrompt}
        onInstallSuccess={() => install()}
      />
    </div>
  );
};

export default AppShell;
