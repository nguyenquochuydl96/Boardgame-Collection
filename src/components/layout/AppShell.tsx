import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Dices,
  Plus,
  Play,
  Settings,
  Cloud,
  CloudCheck,
  Sparkles,
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

  const isSyncEnabled = useSyncStore((s) => s.isEnabled);
  const autoSync = useSyncStore((s) => s.autoSync);
  const syncStatus = useSyncStore((s) => s.syncStatus);
  const gamesCount = useGameStore((s) => s.games.length);
  const sessionsCount = useSessionStore((s) => s.sessions.length);

  // Check 1-click mobile import parameters and setup sync listeners
  useEffect(() => {
    const importedFromUrl = checkUrlSyncParameters();
    if (importedFromUrl) {
      setShowSyncModal(true);
    } else if (isSyncEnabled && autoSync) {
      pullVaultFromCloud('replace');
    }

    const unsubscribeRealtime = startVaultRealtimeSubscription();
    return () => {
      unsubscribeRealtime();
    };
  }, [isSyncEnabled, autoSync]);

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
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors duration-300 relative selection:bg-[var(--coral)] selection:text-[var(--ink)]">
      {/* Film Grain Texture Overlay for authentic printed editorial feel */}
      <div className="raye-grain" aria-hidden="true" />

      {/* Signature Rayé Running Marquee Ticker */}
      <header className="z-40 bg-[var(--ink)] text-[var(--cream)] border-b-[1.5px] border-[var(--ink)] raye-marquee overflow-hidden py-1.5 text-xs font-bold tracking-wider uppercase select-none">
        <div className="raye-marquee-track flex items-center gap-8 px-4">
          <span className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[var(--coral)] animate-ping" />
            <span>RAYÉ × TABLETOP ARCHIVE</span>
          </span>
          <span className="text-[var(--coral)]">•</span>
          <span>{gamesCount} BOARD GAMES CURATED</span>
          <span className="text-[var(--coral)]">•</span>
          <span>{sessionsCount} PLAY SESSIONS LOGGED</span>
          <span className="text-[var(--coral)]">•</span>
          <span className="text-[var(--butter)] font-serif italic lowercase tracking-normal text-sm">
            slow, sunny afternoons & tabletop battles
          </span>
          <span className="text-[var(--coral)]">•</span>
          <span>REALTIME SUPABASE CLOUD SYNCED</span>
          <span className="text-[var(--coral)]">•</span>
          <span>ROLL FOR INITIATIVE</span>
          <span className="text-[var(--coral)]">•</span>

          {/* Repeat set for seamless infinite loop */}
          <span className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[var(--coral)] animate-ping" />
            <span>RAYÉ × TABLETOP ARCHIVE</span>
          </span>
          <span className="text-[var(--coral)]">•</span>
          <span>{gamesCount} BOARD GAMES CURATED</span>
          <span className="text-[var(--coral)]">•</span>
          <span>{sessionsCount} PLAY SESSIONS LOGGED</span>
          <span className="text-[var(--coral)]">•</span>
          <span className="text-[var(--butter)] font-serif italic lowercase tracking-normal text-sm">
            slow, sunny afternoons & tabletop battles
          </span>
          <span className="text-[var(--coral)]">•</span>
          <span>REALTIME SUPABASE CLOUD SYNCED</span>
          <span className="text-[var(--coral)]">•</span>
          <span>ROLL FOR INITIATIVE</span>
          <span className="text-[var(--coral)]">•</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Desktop Sidebar Navigation */}
        <aside
          aria-label="Sidebar navigation"
          className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:top-8 lg:bottom-0 z-30 bg-[var(--bg-card)] border-r-[1.5px] border-[var(--ink)] shadow-[4px_0_0_var(--ink)]"
        >
          {/* Logo Header */}
          <div className="flex items-center justify-between px-6 h-20 border-b-[1.5px] border-[var(--ink)] bg-[var(--coral)] text-[var(--ink)]">
            <Link
              to="/"
              className="flex items-center gap-3 group focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--butter)] border-[1.5px] border-[var(--ink)] shadow-[2px_2px_0_var(--ink)] flex items-center justify-center group-hover:rotate-6 transition-transform">
                <Dices className="w-5 h-5 text-[var(--ink)]" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-black text-xl tracking-tighter uppercase leading-none">
                  Rayé <span className="font-serif italic lowercase font-normal text-2xl">vault</span>
                </span>
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-80 mt-0.5">
                  Curated Tabletop
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links with Rayé wipe effect */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isTabActive(item.to);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'group relative flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold font-display uppercase tracking-wide transition-all duration-200 border-[1.5px]',
                    active
                      ? 'bg-[var(--ink)] text-[var(--cream)] border-[var(--ink)] shadow-[3px_3px_0_var(--coral)] translate-x-1'
                      : 'bg-transparent text-[var(--text-secondary)] border-transparent hover:border-[var(--ink)] hover:bg-[var(--paper)] hover:text-[var(--text-primary)] hover:shadow-[2px_2px_0_var(--ink)]'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 shrink-0 transition-transform group-hover:scale-110',
                      active ? 'text-[var(--coral)]' : 'text-[var(--text-secondary)]'
                    )}
                  />
                  <span className="flex-1">{item.label}</span>
                  {active && (
                    <span className="w-2 h-2 rounded-full bg-[var(--butter)] border border-[var(--ink)]" />
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Sidebar Footer Controls */}
          <div className="p-4 border-t-[1.5px] border-[var(--ink)] bg-[var(--bg-surface)] space-y-2.5">
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
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                  : ''
              )}
              onClick={() => setShowSyncModal(true)}
            >
              {isSyncEnabled ? (
                <CloudCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Cloud className="w-3.5 h-3.5 mr-1.5 text-[var(--coral)]" />
              )}
              <span>{isSyncEnabled ? 'Cloud Synced' : 'Cloud Sync'}</span>
              {isSyncEnabled && syncStatus === 'syncing' && (
                <span className="w-2 h-2 rounded-full bg-[var(--coral)] animate-ping ml-1" />
              )}
            </Button>

            {/* BGG Config Button */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setShowBGGModal(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                aria-label="Configure BoardGameGeek account sync"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>BGG Sync</span>
              </button>
              <PoweredByBGG />
            </div>
          </div>
        </aside>

        {/* Mobile Top Header */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-[var(--coral)] text-[var(--ink)] border-b-[1.5px] border-[var(--ink)] shadow-[0_2px_0_var(--ink)]">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--butter)] border border-[var(--ink)] flex items-center justify-center shadow-[1.5px_1.5px_0_var(--ink)]">
              <Dices className="w-4 h-4 text-[var(--ink)]" />
            </div>
            <span className="font-display font-black text-lg tracking-tight uppercase">
              Rayé <span className="font-serif italic lowercase font-normal text-xl">vault</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSyncModal(true)}
              className="p-1.5 rounded-full bg-[var(--cream)] border border-[var(--ink)] text-[var(--ink)] shadow-[1.5px_1.5px_0_var(--ink)] cursor-pointer"
              title="Cloud Sync"
            >
              {isSyncEnabled ? (
                <CloudCheck className="w-4 h-4 text-emerald-600" />
              ) : (
                <Cloud className="w-4 h-4 text-[var(--coral-deep)]" />
              )}
            </button>

            <Link
              to="/sessions/new"
              className="w-8 h-8 rounded-full bg-[var(--teal)] text-[var(--cream)] border border-[var(--ink)] flex items-center justify-center shadow-[1.5px_1.5px_0_var(--ink)]"
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
