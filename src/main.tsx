import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';
import { recordCrash } from './lib/crashLogger';

// Register global blackbox crash listeners as early as possible
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    recordCrash('window.error', event.error || event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    recordCrash('unhandledrejection', event.reason);
  });
}

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

// Service worker registration with onNeedRefresh notification banner
let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null = null;

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
    let swReg: ServiceWorkerRegistration | undefined;

    const checkSWUpdate = () => {
      if (swReg) {
        swReg.update().catch(() => {});
        return;
      }
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => {
          reg.update().catch(() => {});
        });
      });
    };

    updateServiceWorker = registerSW({
      immediate: true,
      onNeedRefresh() {
        // Dispatches event to display non-disruptive update banner in AppShell
        window.dispatchEvent(new CustomEvent('pwa-need-refresh'));
      },
      onOfflineReady() {
        console.info('[PWA] HEO — Board Game Collection is ready for offline use');
      },
      onRegisteredSW(_swUrl, registration) {
        swReg = registration;
      },
    });

    (window as any).updatePwaSW = async (reloadPage = true) => {
      // Guaranteed fallback: force page reload after 1500ms if controllerchange does not fire (common on iOS Safari PWA)
      if (reloadPage && typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }

      try {
        if (updateServiceWorker) {
          await updateServiceWorker(reloadPage);
        } else {
          await forceAppUpdate();
        }
      } catch (err) {
        console.warn('[PWA] updateServiceWorker error, falling back to reload:', err);
        if (reloadPage && typeof window !== 'undefined') {
          window.location.reload();
        }
      }
    };

    // Single unified update check lifecycle (load, foreground return, reconnect, and 15-min interval)
    window.addEventListener('load', checkSWUpdate);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkSWUpdate();
      }
    });
    window.addEventListener('online', checkSWUpdate);
    setInterval(checkSWUpdate, 15 * 60 * 1000);
  }
}

createRoot(document.getElementById('root')!).render(<App />);
