import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Purge obsolete theme cache keys from legacy version
try {
  localStorage.removeItem('bg-vault-theme-pref');
} catch {}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        reg.update();
      })
      .catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(<App />);

