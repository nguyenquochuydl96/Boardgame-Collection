import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Aggressively clear all legacy theme preferences, attributes and stale caches on boot
try {
  localStorage.removeItem('bg-vault-fitlo-theme-v4');
  localStorage.removeItem('bg-vault-theme-pref-v3');
  localStorage.removeItem('bg-vault-theme-pref');
  localStorage.removeItem('bg-vault-theme');
  document.documentElement.removeAttribute('data-theme');
  document.body?.removeAttribute('data-theme');
} catch {}

// Invalidate legacy service worker caches and ensure immediate updates
if (typeof window !== 'undefined') {
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
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((reg) => {
        reg.update();
      });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }
}

createRoot(document.getElementById('root')!).render(<App />);
