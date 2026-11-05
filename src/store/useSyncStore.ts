import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SyncStatus = 'disabled' | 'idle' | 'syncing' | 'synced' | 'error';

export const DEFAULT_SUPABASE_URL = 'https://xxwdasgmfrseisbcarza.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_exmu-e2HUcITKdY02X-P6Q_BeX0v3z0';
export const DEFAULT_VAULT_ID = 'huy-vault-2026';

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
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL,
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY,
      vaultId: import.meta.env.VITE_SUPABASE_VAULT_ID || DEFAULT_VAULT_ID,
      autoSync: true,
      isEnabled: true,
      lastSyncedAt: null,
      syncStatus: 'idle',
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
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (!state.supabaseUrl) state.supabaseUrl = DEFAULT_SUPABASE_URL;
          if (!state.supabaseAnonKey) state.supabaseAnonKey = DEFAULT_SUPABASE_ANON_KEY;
          if (!state.vaultId) state.vaultId = DEFAULT_VAULT_ID;
          state.isEnabled = true;
          state.autoSync = true;
        }
      },
    }
  )
);
