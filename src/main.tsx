import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Clear temporary test theme cache keys so app cleanly boots into original theme
try {
  localStorage.removeItem('bg-vault-fitlo-theme-v4');
  localStorage.removeItem('bg-vault-theme-pref-v3');
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
      .catch(() => {
        // Service worker registration optional
      });
  });
}

createRoot(document.getElementById('root')!).render(<App />);

