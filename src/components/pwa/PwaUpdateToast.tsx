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
      className="fixed z-50 top-4 right-4 left-4 sm:left-auto sm:max-w-md animate-in fade-in slide-in-from-top-3 duration-300 pointer-events-auto"
    >
      <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-[var(--card)] border-2 border-cyan-500/50 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 shrink-0">
            <Sparkles className="w-5 h-5 animate-spin-slow" />
          </div>
          <div className="min-w-0">
            <h4 className="font-display font-bold text-sm text-[var(--ink)] truncate">
              Đã có bản cập nhật mới
            </h4>
            <p className="text-xs text-[var(--muted)] truncate">
              Cập nhật ngay để trải nghiệm tính năng mới nhất
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="primary"
            size="sm"
            disabled={isUpdating}
            onClick={handleUpdateNow}
            className="text-xs font-bold py-1.5 px-3 h-8 shadow-sm flex items-center gap-1 bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? 'Đang tải...' : 'Cập nhật ngay'}</span>
          </Button>

          <button
            type="button"
            onClick={() => setNeedRefresh(false)}
            aria-label="Để sau"
            title="Để sau"
            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--card-2)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PwaUpdateToast;
