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
      // Do not disrupt user if they are currently creating a session or have active form
      const isCreatingSession = window.location.pathname.includes('/new-session') ||
        Boolean(localStorage.getItem('boardgame_session_draft'));
      if (!isCreatingSession && !refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }
}

createRoot(document.getElementById('root')!).render(<App />);
