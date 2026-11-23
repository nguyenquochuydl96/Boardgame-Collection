import React, { useState, useEffect, Suspense } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  Dices,
  Plus,
  Play,
  Settings,
  Smartphone,
  Cloud,
  CloudCheck,
  Sun,
  Moon,
  Sparkles,
  RefreshCw,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { BottomNavBar, NAV_ITEMS } from './BottomNavBar';
import { Button } from '../ui/Button';
import { PoweredByBGG } from '../ui/PoweredByBGG';
import { cn } from '../ui/cn';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useSyncStore } from '../../store/useSyncStore';
import { useGameStore } from '../../store/useGameStore';
import { useSessionStore } from '../../store/useSessionStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useLocationStore } from '../../store/useLocationStore';
import { isSyncApplyingRemote } from '../../lib/syncGuard';
import { ResumeSessionBanner } from '../session/ResumeSessionBanner';
import { PwaUpdateToast } from '../pwa/PwaUpdateToast';

// Lazy load modals on-demand to keep core AppShell bundle ultra-lightweight
const BGGConfigModal = React.lazy(() =>
  import('../game/BGGConfigModal').then((m) => ({ default: m.BGGConfigModal }))
);
const PwaInstallModal = React.lazy(() =>
  import('../pwa/PwaInstallModal').then((m) => ({ default: m.PwaInstallModal }))
);
const CloudSyncModal = React.lazy(() =>
  import('../sync/CloudSyncModal').then((m) => ({ default: m.CloudSyncModal }))
);

export interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const location = useLocation();
  const { isInstalled, deferredPrompt, install } = usePWAInstall();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showBGGModal, setShowBGGModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Desktop sidebar collapsible rail state (persisted)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bg-vault-sidebar-collapsed') === 'true';
    }
    return false;
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('bg-vault-sidebar-collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const handleForceAppUpdate = async () => {
    setIsUpdating(true);
    try {
      if (typeof window !== 'undefined' && (window as any).forceAppUpdate) {
        await (window as any).forceAppUpdate();
      } else {
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  };

  // Theme mode toggle: Warm Editorial Light & Warm Editorial Dark
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bg-vault-theme-mode');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const toggleTheme = () => {
    const next = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(next);
    try {
      localStorage.setItem('bg-vault-theme-mode', next);
      document.documentElement.setAttribute('data-theme', next);
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch {}
  };

  const isSyncEnabled = useSyncStore((s) => s.isEnabled);
  const autoSync = useSyncStore((s) => s.autoSync);
  const syncStatus = useSyncStore((s) => s.syncStatus);
  const syncHistoricalLocations = useLocationStore((s) => s.syncHistoricalLocations);
  const locationsCount = useLocationStore((s) => s.locations.length);

  // Automatically hydrate venue presets from sessions on boot if empty
  useEffect(() => {
    if (locationsCount === 0) {
      const currentSessions = useSessionStore.getState().sessions;
      if (currentSessions.length > 0) {
        syncHistoricalLocations(currentSessions);
      }
    }
  }, [locationsCount, syncHistoricalLocations]);

  // Run background migration of large base64 images to IndexedDB during idle time
  useEffect(() => {
    const runMigration = () => {
      import('../../lib/mediaStorage').then(({ migrateBase64ImagesToIdb }) => {
        migrateBase64ImagesToIdb()
          .then((res) => {
            if (res.migratedCount > 0) {
              console.info(
                `[AppShell] Migrated ${res.migratedCount} media images to IndexedDB (saved ${(res.savedBytes / 1024).toFixed(1)} KB).`
              );
            }
          })
          .catch((err) => {
            console.warn('[AppShell] Media migration warning:', err);
          });
      });
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const handle = (window as any).requestIdleCallback(runMigration, { timeout: 3000 });
      return () => {
        if ('cancelIdleCallback' in window) {
          (window as any).cancelIdleCallback(handle);
        }
      };
    } else {
      const timer = setTimeout(runMigration, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Check 1-click mobile import parameters and setup sync listeners
  useEffect(() => {
    let isCancelled = false;
    let unsubscribeRealtime: (() => void) | null = null;

    import('../../lib/supabaseSync').then((sync) => {
      if (isCancelled) return;
      const importedFromUrl = sync.checkUrlSyncParameters();
      if (importedFromUrl) {
        setShowSyncModal(true);
      } else if (isSyncEnabled && autoSync) {
        const localGamesCount = useGameStore.getState().games.length;
        const localSessionsCount = useSessionStore.getState().sessions.length;
        const isLocalEmpty = localGamesCount === 0 && localSessionsCount === 0;
        sync.pullVaultFromCloud(isLocalEmpty ? 'replace' : 'merge');
      }

      const unsub = sync.startVaultRealtimeSubscription();
      if (isCancelled) {
        unsub();
      } else {
        unsubscribeRealtime = unsub;
      }
    });

    return () => {
      isCancelled = true;
      if (unsubscribeRealtime) {
        unsubscribeRealtime();
      }
    };
  }, [isSyncEnabled, autoSync]);

  // Debounced auto-push when stores change locally
  useEffect(() => {
    if (!isSyncEnabled || !autoSync) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const triggerPush = () => {
      if (isSyncApplyingRemote()) return;
      const { hasCompletedInitialPull } = useSyncStore.getState();
      if (!hasCompletedInitialPull) return;

      const localGames = useGameStore.getState().games.length;
      const localSessions = useSessionStore.getState().sessions.length;
      if (localGames === 0 && localSessions === 0) return;

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (isSyncApplyingRemote()) return;
        const { hasCompletedInitialPull: ready } = useSyncStore.getState();
        if (!ready) return;
        const currentGames = useGameStore.getState().games.length;
        const currentSessions = useSessionStore.getState().sessions.length;
        if (currentGames === 0 && currentSessions === 0) return;

        import('../../lib/supabaseSync').then((sync) => {
          if (isSyncApplyingRemote()) return;
          sync.pushVaultToCloud();
        });
      }, 2500);
    };

    const unsubGames = useGameStore.subscribe(triggerPush);
    const unsubSessions = useSessionStore.subscribe(triggerPush);
    const unsubPlayers = usePlayerStore.subscribe(triggerPush);
    const unsubLocations = useLocationStore.subscribe(triggerPush);

    return () => {
      if (timer) clearTimeout(timer);
      unsubGames();
      unsubSessions();
      unsubPlayers();
      unsubLocations();
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

  const isNewSession = location.pathname.startsWith('/sessions/new');

  const getPageTitle = () => {
    if (location.pathname === '/') return 'Overview & Highlights';
    if (location.pathname.startsWith('/collection/add')) return 'Add New Game';
    if (location.pathname.startsWith('/collection/')) return 'Game Details';
    if (location.pathname.startsWith('/collection')) return 'Boardgame Vault';
    if (location.pathname.startsWith('/sessions/new')) return 'New Session Wizard';
    if (location.pathname.startsWith('/sessions/')) return 'Session Details';
    if (location.pathname.startsWith('/sessions')) return 'Tabletop Plays';
    if (location.pathname.startsWith('/players/')) return 'Player Profile';
    if (location.pathname.startsWith('/players')) return 'Players & Rivals';
    if (location.pathname.startsWith('/stats')) return 'Vault Analytics';
    return 'Vault';
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--bg)] text-[var(--ink)] transition-colors duration-200 overflow-x-hidden max-w-full">
      {/* Desktop Sidebar Navigation (Soft Sage Green in Light, Dark Olive in Dark) */}
      <aside
        aria-label="Sidebar navigation"
        className={cn(
          'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 z-30 bg-[var(--sidebar)] text-[var(--sidebar-ink)] border-r border-[var(--sidebar-line)] transition-all duration-300 ease-in-out',
          isSidebarCollapsed ? 'lg:w-20' : 'lg:w-60'
        )}
      >
        {/* Brand Header */}
        <div
          className={cn(
            'flex items-center h-20 border-b border-[var(--sidebar-line)] transition-all duration-300',
            isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-5'
          )}
        >
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none min-w-0"
            title="Heo's Board Game Vault"
          >
            {/* Terracotta / Soft Logo badge */}
            <div className="relative w-10 h-10 rounded-2xl bg-[var(--accent)] text-[var(--accent-ink)] flex items-center justify-center shadow-md shadow-[var(--accent)]/20 group-hover:scale-105 transition-transform duration-200 shrink-0">
              <Dices className="w-5 h-5 text-current drop-shadow-sm" />
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-[var(--sidebar)] flex items-center justify-center">
                <Sparkles className="w-2 h-2 text-slate-950" />
              </div>
            </div>

            {!isSidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-black text-sm tracking-tight text-[var(--sidebar-ink)] uppercase">
                    Heo's
                  </span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/15 text-[var(--sidebar-ink)]">
                    Vault
                  </span>
                </div>
                <span className="font-display font-semibold text-xs tracking-tight opacity-75 truncate leading-tight">
                  Board Games
                </span>
              </div>
            )}
          </Link>

          {!isSidebarCollapsed && (
            <button
              type="button"
              onClick={toggleSidebarCollapse}
              className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Collapse sidebar rail"
              aria-label="Collapse sidebar rail"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isTabActive(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={isSidebarCollapsed ? item.label : undefined}
                className={cn(
                  'relative flex items-center rounded-xl text-sm font-semibold transition-all duration-200 select-none group',
                  isSidebarCollapsed
                    ? 'justify-center p-3'
                    : 'gap-3.5 px-3.5 py-2.5',
                  active
                    ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-ink)] font-bold shadow-xs'
                    : 'text-[var(--sidebar-ink)] opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-105',
                    active ? 'text-[var(--accent)]' : 'opacity-85'
                  )}
                />
                {!isSidebarCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="p-3 border-t border-[var(--sidebar-line)] space-y-2">
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={toggleSidebarCollapse}
                className="p-2 rounded-xl text-[var(--sidebar-ink)] opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="w-5 h-5" />
              </button>

              <Link
                to="/sessions/new"
                className="w-10 h-10 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] flex items-center justify-center shadow-sm hover:scale-105 transition-transform"
                title="New Session"
              >
                <Play className="w-4 h-4 fill-current" />
              </Link>
            </div>
          ) : (
            <>
              {/* Quick Session CTAs */}
              <Link to="/sessions/new" className="block">
                <Button variant="primary" className="w-full justify-center rounded-xl font-bold">
                  <Play className="w-4 h-4 fill-current mr-1" />
                  New Session
                </Button>
              </Link>

              <Link to="/collection/add" className="block">
                <Button variant="secondary" className="w-full justify-center rounded-xl text-xs font-semibold bg-[var(--sidebar-active)] text-[var(--sidebar-ink)] border-0">
                  <Plus className="w-4 h-4 mr-1 text-[var(--accent)]" />
                  Add Game
                </Button>
              </Link>

              {/* Utility Tools Grid */}
              <div className="grid grid-cols-3 gap-1 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'justify-center text-xs transition-colors font-semibold px-1 rounded-lg',
                    isSyncEnabled
                      ? syncStatus === 'error'
                        ? 'text-rose-600 bg-rose-500/10'
                        : 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                      : 'opacity-70 hover:opacity-100'
                  )}
                  onClick={() => setShowSyncModal(true)}
                  title={isSyncEnabled ? 'Cloud Synced' : 'Cloud Sync'}
                >
                  {isSyncEnabled ? (
                    <CloudCheck className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <Cloud className="w-3.5 h-3.5 mr-1 shrink-0" />
                  )}
                  <span className="truncate">{isSyncEnabled ? 'Synced' : 'Cloud'}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-center text-xs opacity-70 hover:opacity-100 font-semibold px-1 rounded-lg"
                  onClick={() => setShowBGGModal(true)}
                  title="BoardGameGeek API Settings"
                >
                  <Settings className="w-3.5 h-3.5 mr-1 text-[#ff7722] shrink-0" />
                  <span className="truncate">BGG</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isUpdating}
                  className="justify-center text-xs opacity-70 hover:opacity-100 font-semibold px-1 rounded-lg cursor-pointer"
                  onClick={handleForceAppUpdate}
                  title="Làm mới ứng dụng & Tải bản cập nhật mới nhất (Xóa cache PWA)"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5 mr-1 shrink-0', isUpdating && 'animate-spin text-[var(--accent)]')} />
                  <span className="truncate">{isUpdating ? '...' : 'Update'}</span>
                </Button>
              </div>

              {!isInstalled && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center text-xs font-bold rounded-xl mt-1"
                  onClick={() => setShowInstallModal(true)}
                >
                  <Smartphone className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                  Install App
                </Button>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Mobile Top Header (1-line, safe-area-inset-top padding, clean layout) */}
      <header className="lg:hidden sticky top-0 z-30 h-14 pt-[env(safe-area-inset-top)] px-3 sm:px-4 flex items-center justify-between gap-2 bg-[var(--bg)] border-b border-[var(--line)]">
        <Link
          to="/"
          className="font-display font-bold text-sm tracking-tight text-[var(--ink)] whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span className="w-7 h-7 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] inline-flex items-center justify-center shrink-0 shadow-xs">
            <Dices className="w-4 h-4 text-current" />
          </span>
          <div className="flex flex-col">
            <span className="font-extrabold text-xs leading-none text-[var(--ink)]">Heo's Vault</span>
            <span className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-tight">Board Games</span>
          </div>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Mobile Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--card-2)] transition-colors cursor-pointer"
            title={`Switch to ${themeMode === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {themeMode === 'light' ? (
              <Moon className="w-4 h-4 text-[var(--ink)]" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          {/* Mobile Cloud Sync Icon */}
          <button
            type="button"
            onClick={() => setShowSyncModal(true)}
            className={cn(
              'p-1.5 rounded-xl transition-colors cursor-pointer relative',
              isSyncEnabled
                ? syncStatus === 'error'
                  ? 'text-rose-500 bg-rose-500/10'
                  : 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--card-2)]'
            )}
            title={isSyncEnabled ? 'Cloud Synced' : 'Connect Cloud Sync'}
          >
            {isSyncEnabled ? (
              <CloudCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Cloud className="w-4 h-4" />
            )}
            {isSyncEnabled && syncStatus === 'syncing' && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--accent)] animate-ping" />
            )}
          </button>

          {/* Mobile Force Refresh */}
          <button
            type="button"
            onClick={handleForceAppUpdate}
            disabled={isUpdating}
            className="p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--card-2)] transition-colors cursor-pointer"
            title="Làm mới ứng dụng & Tải bản cập nhật mới nhất (Xóa cache PWA)"
          >
            <RefreshCw className={cn('w-4 h-4', isUpdating && 'animate-spin text-[var(--accent)]')} />
          </button>

          {!isInstalled && (
            <button
              type="button"
              onClick={() => setShowInstallModal(true)}
              className="hidden sm:inline-flex px-2.5 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold items-center gap-1 transition-all shadow-xs shrink-0 cursor-pointer active:scale-95"
              title="Install on your mobile home screen"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Install</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowBGGModal(true)}
            className="hidden sm:inline-flex p-1.5 sm:p-2 rounded-full text-[var(--muted)] hover:text-[#ff7722] hover:bg-[var(--card-2)] transition-colors cursor-pointer"
            title="BGG API Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <Link
            to="/sessions/new"
            className="min-h-[32px] sm:min-h-[36px] px-2.5 sm:px-3.5 py-1.5 rounded-full bg-[var(--accent)] text-xs font-bold text-[var(--accent-ink)] inline-flex items-center gap-1 shadow-xs whitespace-nowrap shrink-0 active:scale-95 transition-transform"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">New Session</span>
            <span className="sm:hidden">Play</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        className={cn(
          'flex-1 overflow-x-hidden max-w-full transition-all duration-300 ease-in-out',
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-60',
          isNewSession
            ? 'pb-[calc(1.5rem+env(safe-area-inset-bottom))] lg:pb-8'
            : 'pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-12'
        )}
      >
        {/* Desktop Top Header Bar (Breadcrumb / Status / Theme Switcher) */}
        <div className="hidden lg:flex items-center justify-between px-8 h-16 border-b border-[var(--line)] bg-[var(--bg)]/90 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Vault
            </span>
            <span className="text-xs text-[var(--line)]">/</span>
            <h2 className="font-display font-bold text-sm text-[var(--ink)]">
              {getPageTitle()}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Desktop Theme Pill */}
            <button
              type="button"
              onClick={toggleTheme}
              className="px-3 py-1.5 rounded-full bg-[var(--card)] border border-[var(--line)] hover:bg-[var(--card-2)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title={`Switch to ${themeMode === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {themeMode === 'light' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-600" />
                  <span>Warm Cream</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-amber-300" />
                  <span>Deep Espresso</span>
                </>
              )}
            </button>

            {/* Cloud Sync Status Pill */}
            <button
              type="button"
              onClick={() => setShowSyncModal(true)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border shadow-xs',
                isSyncEnabled
                  ? syncStatus === 'error'
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-600'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-[var(--card)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'
              )}
            >
              {isSyncEnabled ? (
                <CloudCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Cloud className="w-3.5 h-3.5" />
              )}
              <span>{isSyncEnabled ? (syncStatus === 'syncing' ? 'Syncing...' : 'Synced') : 'Cloud Off'}</span>
            </button>

            {/* Force Refresh */}
            <button
              type="button"
              onClick={handleForceAppUpdate}
              disabled={isUpdating}
              className="p-1.5 rounded-full bg-[var(--card)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
              title="Làm mới ứng dụng & Tải bản cập nhật mới nhất (Xóa cache PWA)"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isUpdating && 'animate-spin text-[var(--accent)]')} />
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}

          {/* Persistent Compliance Footer */}
          <PoweredByBGG variant="footer" />
        </div>
      </main>

      {/* Floating Resume Session Banner & PWA Update Prompt */}
      <ResumeSessionBanner />
      <PwaUpdateToast />

      {!isNewSession && <BottomNavBar />}

      {/* Modals rendered on-demand */}
      {showBGGModal && (
        <Suspense fallback={null}>
          <BGGConfigModal
            isOpen={showBGGModal}
            onClose={() => setShowBGGModal(false)}
          />
        </Suspense>
      )}

      {showSyncModal && (
        <Suspense fallback={null}>
          <CloudSyncModal
            isOpen={showSyncModal}
            onClose={() => setShowSyncModal(false)}
          />
        </Suspense>
      )}

      {showInstallModal && (
        <Suspense fallback={null}>
          <PwaInstallModal
            isOpen={showInstallModal}
            onClose={() => setShowInstallModal(false)}
            deferredPrompt={deferredPrompt}
            onInstallSuccess={() => void install()}
          />
        </Suspense>
      )}
    </div>
  );
};

export default AppShell;
