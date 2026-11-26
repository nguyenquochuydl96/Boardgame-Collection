import { useEffect, useState } from 'react';
import type { SyncStatus } from '../store/useSyncStore';

export function getBrowserOnlineStatus(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

export function resolveEffectiveSyncStatus(
  storeStatus: SyncStatus,
  isOnline: boolean,
  hasConflict = false
): SyncStatus {
  if (!isOnline && !hasConflict && storeStatus !== 'conflict' && storeStatus !== 'disabled') {
    return 'offline';
  }
  return storeStatus;
}

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(getBrowserOnlineStatus);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
