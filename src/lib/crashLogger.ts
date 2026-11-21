export type CrashSource = 'ErrorBoundary' | 'window.error' | 'unhandledrejection';

export interface CrashEntry {
  timestamp: string;
  route: string;
  source: CrashSource;
  message: string;
  stack?: string;
}

const CRASH_LOG_KEY = 'bg_vault_crash_log';
const CHUNK_RELOAD_KEY = 'bg_vault_last_chunk_reload';
const MAX_LOGS = 10;

/**
 * Retrieves the recorded crash entries from localStorage
 */
export function getCrashLogs(): CrashEntry[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(CRASH_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clears all crash history from localStorage
 */
export function clearCrashLogs(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(CRASH_LOG_KEY);
    }
  } catch {}
}

/**
 * Records a crash or unhandled error into localStorage and initiates safe auto-recovery if chunk failure
 */
export function recordCrash(source: CrashSource, error: unknown, componentStack?: string): void {
  try {
    const timestamp = new Date().toISOString();
    const route = typeof window !== 'undefined' ? `${window.location.pathname}${window.location.hash}` : '';
    let message = 'Unknown error';
    let stack: string | undefined = undefined;

    if (error instanceof Error) {
      message = error.message;
      stack = error.stack;
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      message = String((error as any).message);
      if ('stack' in error) {
        stack = String((error as any).stack);
      }
    } else {
      message = String(error);
    }

    if (componentStack) {
      stack = stack ? `${stack}\n\nComponent Stack:\n${componentStack}` : componentStack;
    }

    const entry: CrashEntry = {
      timestamp,
      route,
      source,
      message,
      stack,
    };

    const existing = getCrashLogs();
    const updated = [entry, ...existing].slice(0, MAX_LOGS);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CRASH_LOG_KEY, JSON.stringify(updated));
    }

    // Chunk load error detection & safe auto-recovery
    const isChunkError =
      message.includes('ChunkLoadError') ||
      message.includes('Failed to fetch dynamically imported module') ||
      message.includes('Importing a module script failed') ||
      message.includes('error loading dynamically imported module');

    if (isChunkError && typeof window !== 'undefined') {
      const now = Date.now();
      const lastReload = parseInt(sessionStorage.getItem(CHUNK_RELOAD_KEY) || '0', 10);
      // Prevent reload loop: at most once every 15 seconds
      if (now - lastReload > 15000) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
        console.warn('Chunk load error detected, triggering safe page reload...', message);
        window.location.reload();
      } else {
        console.error('Repeated chunk load failures within 15 seconds. Reload loop suppressed.');
      }
    }
  } catch (err) {
    console.error('Failed to record crash in crashLogger:', err);
  }
}

// Expose DevTools helpers on window
if (typeof window !== 'undefined') {
  (window as any).__getCrashLog = getCrashLogs;
  (window as any).__clearCrashLog = clearCrashLogs;
}
