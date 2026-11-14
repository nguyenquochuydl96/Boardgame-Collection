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

  // Theme mode toggle: Fitlo Light & Fitlo Dark
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

  // Automatically hydrate venue presets from sessions on boot if empty (non-reactive to avoid layout re-renders)
  useEffect(() => {
    if (locationsCount === 0) {
      const currentSessions = useSessionStore.getState().sessions;
      if (currentSessions.length > 0) {
        syncHistoricalLocations(currentSessions);
      }
    }
  }, [locationsCount, syncHistoricalLocations]);

  // Check 1-click mobile import parameters and setup sync listeners
  useEffect(() => {
    let unsubscribeRealtime: (() => void) | null = null;

    import('../../lib/supabaseSync').then((sync) => {
      const importedFromUrl = sync.checkUrlSyncParameters();
      if (importedFromUrl) {
        setShowSyncModal(true);
      } else if (isSyncEnabled && autoSync) {
        // Pull latest cloud updates on app launch
        sync.pullVaultFromCloud('replace');
      }

      // Subscribe to multi-device Realtime events
      unsubscribeRealtime = sync.startVaultRealtimeSubscription();
    });

    return () => {
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
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        import('../../lib/supabaseSync').then((sync) => {
          sync.pushVaultToCloud();
        });
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--bg)] text-[var(--ink)] transition-colors duration-200">
      {/* Desktop Sidebar Navigation */}
      <aside
        aria-label="Sidebar navigation"
        className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30 bg-[var(--bg)] border-r border-[var(--line)]"
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-5 h-20 border-b border-[var(--line)]">
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none min-w-0"
          >
            {/* Distinctive stylized logo badge */}
            <div className="relative w-10 h-10 rounded-[13px] bg-gradient-to-br from-[#0b7a73] via-[#08665f] to-[#043d39] dark:from-[#3cc2b5] dark:via-[#2ea69a] dark:to-[#175d56] flex items-center justify-center text-white dark:text-[#05201d] shadow-md shadow-[var(--accent)]/20 group-hover:scale-105 transition-transform duration-200 shrink-0 ring-2 ring-white/10 dark:ring-black/20">
              <Dices className="w-5 h-5 text-current drop-shadow-sm" />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-[var(--bg)] flex items-center justify-center">
                <Sparkles className="w-2 h-2 text-slate-950" />
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-display font-black text-sm tracking-tight text-[var(--accent)] uppercase">
                  Heo's
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)]">
                  Vault
                </span>
              </div>
              <span className="font-display font-extrabold text-sm tracking-tight text-[var(--ink)] truncate leading-tight">
                Board Game Collection
              </span>
            </div>
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
                  'relative flex items-center gap-3.5 px-4 py-2.5 rounded-[14px] text-sm font-semibold transition-all duration-200 whitespace-nowrap',
                  active
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-md shadow-[var(--accent)]/20 font-bold'
                    : 'text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--card-2)]'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0',
                    active ? 'text-current' : 'text-[var(--muted)]'
                  )}
                />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="p-4 border-t border-[var(--line)] space-y-2.5">
          {/* Fitlo Theme Mode Toggle (High Contrast) */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--card-2)] shadow-[inset_0_0_0_1px_var(--line)] text-xs font-semibold text-[var(--ink-2)]">
            <span className="flex items-center gap-2 font-bold text-[var(--ink)]">
              {themeMode === 'light' ? (
                <Sun className="w-3.5 h-3.5 text-amber-600" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-teal-400" />
              )}
              <span>{themeMode === 'light' ? 'Light Mode' : 'Dark Mode'}</span>
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              className="px-2.5 py-1 rounded-lg bg-[var(--card)] text-[var(--ink)] shadow-[inset_0_0_0_1px_var(--line-2)] hover:bg-[var(--card-3)] transition-colors cursor-pointer text-xs font-extrabold"
            >
              Switch
            </button>
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

          {/* Cloud Sync, BGG Settings & Force Update compact 3-column grid */}
          <div className="grid grid-cols-3 gap-1 pt-0.5">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'justify-center text-xs transition-colors font-semibold px-1.5',
                isSyncEnabled
                  ? syncStatus === 'error'
                    ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
                    : 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              )}
              onClick={() => setShowSyncModal(true)}
              title={isSyncEnabled ? 'Cloud Synced' : 'Cloud Sync'}
            >
              {isSyncEnabled ? (
                <CloudCheck className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <Cloud className="w-3.5 h-3.5 mr-1 text-cyan-600 dark:text-cyan-400 shrink-0" />
              )}
              <span className="truncate">{isSyncEnabled ? 'Synced' : 'Cloud'}</span>
              {isSyncEnabled && syncStatus === 'syncing' && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping ml-1 shrink-0" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="justify-center text-xs text-[var(--muted)] hover:text-[var(--ink)] font-semibold px-1.5"
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
              className="justify-center text-xs text-[var(--muted)] hover:text-cyan-500 font-semibold px-1.5 cursor-pointer"
              onClick={handleForceAppUpdate}
              title="Làm mới ứng dụng & Tải bản cập nhật mới nhất (Xóa cache PWA)"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 mr-1 shrink-0", isUpdating && "animate-spin text-cyan-500")} />
              <span className="truncate">{isUpdating ? '...' : 'Update'}</span>
            </Button>
          </div>

          {/* Official Powered by BGG Badge in Sidebar */}
          <div className="pt-1">
            <PoweredByBGG variant="sidebar" />
          </div>

          {!isInstalled && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center text-xs font-bold"
              onClick={() => setShowInstallModal(true)}
            >
              <Smartphone className="w-4 h-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />
              Install Mobile App
            </Button>
          )}
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-30 h-14 pt-[env(safe-area-inset-top)] px-3 sm:px-4 flex items-center justify-between gap-2 bg-[var(--bg)] shadow-sm border-b border-[var(--line)]">
        <Link
          to="/"
          className="font-display font-bold text-sm tracking-tight text-[var(--ink)] whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span className="w-7 h-7 rounded-[9px] bg-[var(--accent)] text-[var(--accent-ink)] inline-flex items-center justify-center shrink-0 shadow-sm">
            <Dices className="w-4 h-4 text-current" />
          </span>
          <div className="flex flex-col">
            <span className="font-extrabold text-xs leading-none text-[var(--ink)]">Heo's Collection</span>
            <span className="text-[9px] font-bold text-[var(--accent-text)] uppercase tracking-tight">Board Games</span>
          </div>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Mobile Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--card-2)] transition-colors cursor-pointer"
            title={`Switch to ${themeMode === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {themeMode === 'light' ? (
              <Moon className="w-4 h-4 text-[var(--ink)]" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          {!isInstalled && (
            <button
              type="button"
              onClick={() => setShowInstallModal(true)}
              className="hidden sm:inline-flex px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold items-center gap-1 transition-all shadow-sm shrink-0 cursor-pointer active:scale-95"
              title="Install on your mobile home screen"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Install</span>
            </button>
          )}

          {/* Mobile Cloud Sync Icon */}
          <button
            type="button"
            onClick={() => setShowSyncModal(true)}
            className={cn(
              'p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer relative',
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
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            )}
          </button>

          {/* Mobile Force Refresh / Update PWA button (1-tap cache purge for iOS) */}
          <button
            type="button"
            onClick={handleForceAppUpdate}
            disabled={isUpdating}
            className="p-1.5 sm:p-2 rounded-xl text-[var(--muted)] hover:text-cyan-500 hover:bg-[var(--card-2)] transition-colors cursor-pointer"
            title="Làm mới ứng dụng & Tải bản cập nhật mới nhất (Xóa cache PWA)"
          >
            <RefreshCw className={cn("w-4 h-4", isUpdating && "animate-spin text-cyan-500")} />
          </button>

          <button
            type="button"
            onClick={() => setShowBGGModal(true)}
            className="hidden sm:inline-flex p-1.5 sm:p-2 rounded-xl text-[var(--muted)] hover:text-[#ff7722] hover:bg-[var(--card-2)] transition-colors cursor-pointer"
            title="BGG API Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <Link
            to="/sessions/new"
            className="min-h-[32px] sm:min-h-[38px] px-2 sm:px-3.5 py-1.5 rounded-xl bg-[var(--accent)] text-xs font-bold text-[var(--accent-ink)] inline-flex items-center gap-1 shadow-sm whitespace-nowrap shrink-0 active:scale-95 transition-transform"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">New Session</span>
            <span className="sm:hidden">Play</span>
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
