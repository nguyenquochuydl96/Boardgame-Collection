import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Initialize Fitlo design system theme mode (default to light or saved preference)
try {
  // Clear obsolete old cache keys from other legacy experiments
  localStorage.removeItem('bg-vault-fitlo-theme-v4');
  localStorage.removeItem('bg-vault-theme-pref-v3');
  localStorage.removeItem('bg-vault-theme-pref');
  localStorage.removeItem('bg-vault-theme');

  const savedMode = localStorage.getItem('bg-vault-theme-mode') || 'light';
  document.documentElement.setAttribute('data-theme', savedMode);
  if (savedMode === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
} catch {}

// Force purge all service worker caches and reload newest version (available globally)
export async function forceAppUpdate(): Promise<void> {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch (err) {
    console.error('Failed to clear app cache:', err);
  }
  window.location.reload();
}

// Invalidate legacy service worker caches and ensure immediate updates
if (typeof window !== 'undefined') {
  (window as any).forceAppUpdate = forceAppUpdate;

  if ('caches' in window) {
    caches.keys().then((keys) => {
      keys.forEach((key) => {
        if (key.includes('bg-vault') || key.includes('v1')) {
          caches.delete(key);
        }
      });
    });
  }

  if ('serviceWorker' in navigator) {
    const checkSWUpdate = () => {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => {
          reg.update().catch(() => {});
        });
      });
    };

    // Check immediately when page finishes loading
    window.addEventListener('load', checkSWUpdate);

    // CRITICAL FOR IOS PWA: Check whenever the app returns from background / unlocked
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkSWUpdate();
      }
    });

    // Check when network connection is re-established
    window.addEventListener('online', checkSWUpdate);

    // Periodic background check every 10 minutes
    setInterval(checkSWUpdate, 10 * 60 * 1000);

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Do not disrupt user if they are currently on the active new session creation form
      const isCreatingSession =
        window.location.pathname.includes('/sessions/new') ||
        window.location.pathname.includes('/new-session');
      if (!isCreatingSession && !refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }
}

createRoot(document.getElementById('root')!).render(<App />);
