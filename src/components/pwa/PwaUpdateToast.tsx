import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';
import { Button } from '../ui/Button';

export const PwaUpdateToast: React.FC = () => {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const handleNeedRefresh = () => {
      setNeedRefresh(true);
    };

    window.addEventListener('pwa-need-refresh', handleNeedRefresh);

    return () => {
      window.removeEventListener('pwa-need-refresh', handleNeedRefresh);
    };
  }, []);

  if (!needRefresh) return null;

  const handleUpdateNow = async () => {
    if (isUpdating) return;
    setIsUpdating(true);

    // Guaranteed fallback: force page reload after 1500ms if controllerchange event hangs or fails to fire (common on iOS Safari PWA)
    setTimeout(() => {
      window.location.reload();
    }, 1500);

    try {
      if (typeof window !== 'undefined' && (window as any).updatePwaSW) {
        await (window as any).updatePwaSW(true);
      } else if (typeof window !== 'undefined' && (window as any).forceAppUpdate) {
        await (window as any).forceAppUpdate();
      } else {
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed z-50 top-[calc(1rem+env(safe-area-inset-top))] right-4 left-4 sm:left-auto sm:max-w-md animate-in fade-in slide-in-from-top-3 duration-300 pointer-events-auto"
    >
      <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-[var(--card)] border border-[var(--line-2)] shadow-2xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] shrink-0">
            <Sparkles className="w-5 h-5 animate-spin-slow" />
          </div>
          <div className="min-w-0">
            <h4 className="font-display font-bold text-sm text-[var(--ink)] truncate">
              New Update Available
            </h4>
            <p className="text-xs text-[var(--muted)] truncate">
              Reload now to get the latest improvements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="primary"
            size="sm"
            disabled={isUpdating}
            onClick={handleUpdateNow}
            className="text-xs font-bold py-1.5 px-3 min-h-9 shadow-sm flex items-center gap-1 bg-[var(--accent)] hover:opacity-90 text-[var(--accent-ink)] rounded-full cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? 'Updating...' : 'Update Now'}</span>
          </Button>

          <button
            type="button"
            onClick={() => setNeedRefresh(false)}
            aria-label="Dismiss update notification"
            title="Dismiss"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--card-2)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PwaUpdateToast;
