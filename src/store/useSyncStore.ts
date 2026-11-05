import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SyncStatus = 'disabled' | 'idle' | 'syncing' | 'synced' | 'error';

export interface SyncStore {
  supabaseUrl: string;
  supabaseAnonKey: string;
  vaultId: string;
  autoSync: boolean;
  isEnabled: boolean;
  lastSyncedAt: string | null;
  syncStatus: SyncStatus;
  errorMessage: string | null;

  setCredentials: (url: string, anonKey: string, vaultId: string) => void;
  setAutoSync: (enabled: boolean) => void;
  setSyncStatus: (status: SyncStatus, errorMessage?: string | null) => void;
  setLastSyncedAt: (timestamp: string) => void;
  disconnect: () => void;
}

export const useSyncStore = create<SyncStore>()(
  persist(
    (set) => ({
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      vaultId: import.meta.env.VITE_SUPABASE_VAULT_ID || '',
      autoSync: true,
      isEnabled: false,
      lastSyncedAt: null,
      syncStatus: 'disabled',
      errorMessage: null,

      setCredentials: (url, anonKey, vaultId) =>
        set({
          supabaseUrl: url.trim(),
          supabaseAnonKey: anonKey.trim(),
          vaultId: vaultId.trim(),
          isEnabled: Boolean(url.trim() && anonKey.trim() && vaultId.trim()),
          syncStatus: 'idle',
          errorMessage: null,
        }),

      setAutoSync: (autoSync) => set({ autoSync }),

      setSyncStatus: (syncStatus, errorMessage = null) =>
        set({ syncStatus, errorMessage }),

      setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),

      disconnect: () =>
        set({
          supabaseUrl: '',
          supabaseAnonKey: '',
          vaultId: '',
          isEnabled: false,
          syncStatus: 'disabled',
          lastSyncedAt: null,
          errorMessage: null,
        }),
    }),
    {
      name: 'bg-vault-sync-settings',
    }
  )
);
