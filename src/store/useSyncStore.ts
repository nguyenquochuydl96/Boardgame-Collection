import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SyncStatus = 'disabled' | 'idle' | 'syncing' | 'synced' | 'error' | 'conflict' | 'pending' | 'offline';
export type SyncConflict = {
  reason: string;
  remoteUpdatedAt: string | null;
  remoteCounts?: { games: number; sessions: number; players: number; locations: number };
};

// This is a last-seen opaque value, not a server-generated revision or a clock.
export interface SyncBaseline {
  url: string;
  vaultId: string;
  updatedAt: string;
}

export const DEFAULT_SUPABASE_URL = 'https://xxwdasgmfrseisbcarza.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_exmu-e2HUcITKdY02X-P6Q_BeX0v3z0';
export const DEFAULT_VAULT_ID = 'huy-vault-2026';

export interface SyncStore {
  supabaseUrl: string;
  supabaseAnonKey: string;
  vaultId: string;
  autoSync: boolean;
  isEnabled: boolean;
  hasManuallyDisconnected: boolean;
  hasCompletedInitialPull: boolean;
  lastSyncedAt: string | null;
  syncStatus: SyncStatus;
  errorMessage: string | null;
  syncConflict: SyncConflict | null;
  syncBaseline: SyncBaseline | null;
  pendingChanges: boolean;
  localRevision: number;

  setSyncConflict: (conflict: SyncConflict | null) => void;
  markLocalChange: () => void;
  acknowledgeSync: (baseline: SyncBaseline, sentRevision: number, stillDirty?: boolean) => void;
  setCredentials: (url: string, anonKey: string, vaultId: string) => void;
  setAutoSync: (enabled: boolean) => void;
  setSyncStatus: (status: SyncStatus, errorMessage?: string | null) => void;
  setLastSyncedAt: (timestamp: string) => void;
  setHasCompletedInitialPull: (completed: boolean) => void;
  disconnect: () => void;
}

export const useSyncStore = create<SyncStore>()(
  persist(
    (set) => ({
      supabaseUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || DEFAULT_SUPABASE_URL,
      supabaseAnonKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || DEFAULT_SUPABASE_ANON_KEY,
      vaultId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_VAULT_ID) || DEFAULT_VAULT_ID,
      autoSync: true,
      isEnabled: true,
      hasManuallyDisconnected: false,
      hasCompletedInitialPull: false,
      lastSyncedAt: null,
      syncStatus: 'idle',
      errorMessage: null,
      syncConflict: null,
      syncBaseline: null,
      pendingChanges: false,
      localRevision: 0,

      setCredentials: (url, anonKey, vaultId) => set((state) => {
        const nextUrl = url.trim();
        const nextId = vaultId.trim();
        const changed = state.supabaseUrl !== nextUrl || state.vaultId !== nextId;
        return {
          supabaseUrl: nextUrl,
          supabaseAnonKey: anonKey.trim(),
          vaultId: nextId,
          isEnabled: Boolean(nextUrl && anonKey.trim() && nextId),
          hasManuallyDisconnected: false,
          ...(changed ? {
            hasCompletedInitialPull: false,
            lastSyncedAt: null,
            syncBaseline: null,
            syncConflict: null,
            syncStatus: state.pendingChanges ? 'pending' as const : 'idle' as const,
            errorMessage: null,
          } : {}),
        };
      }),

      setAutoSync: (autoSync) => set({ autoSync }),

      setSyncStatus: (syncStatus, errorMessage = null) => set((state) => ({
        syncStatus: syncStatus === 'synced' && state.syncConflict ? 'conflict' :
          syncStatus === 'synced' && state.pendingChanges ? 'pending' : syncStatus,
        errorMessage,
      })),
      setSyncConflict: (syncConflict) => set((state) => ({
        syncConflict,
        syncStatus: syncConflict ? 'conflict' : state.pendingChanges ? 'pending' : 'idle',
        errorMessage: null,
      })),
      markLocalChange: () => set((state) => ({
        pendingChanges: true,
        localRevision: (state.localRevision || 0) + 1,
        syncStatus: state.syncConflict ? 'conflict' : state.isEnabled ? 'pending' : 'disabled',
      })),
      acknowledgeSync: (syncBaseline, sentRevision, stillDirty = false) => set((state) => {
        const pendingChanges = stillDirty || state.localRevision !== sentRevision;
        return {
          syncBaseline,
          lastSyncedAt: syncBaseline.updatedAt,
          hasCompletedInitialPull: true,
          pendingChanges,
          syncConflict: null,
          syncStatus: pendingChanges ? 'pending' : 'synced',
          errorMessage: null,
        };
      }),
      setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),

      setHasCompletedInitialPull: (hasCompletedInitialPull) => set({ hasCompletedInitialPull }),

      disconnect: () =>
        set({
          supabaseUrl: '',
          supabaseAnonKey: '',
          vaultId: '',
          isEnabled: false,
          autoSync: false,
          hasManuallyDisconnected: true,
          hasCompletedInitialPull: false,
          syncStatus: 'disabled',
          lastSyncedAt: null,
          syncBaseline: null,
          syncConflict: null,
          errorMessage: null,
        }),
    }),
    {
      name: 'bg-vault-sync-settings',
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (!state.hasManuallyDisconnected && !state.supabaseUrl) {
            state.supabaseUrl = DEFAULT_SUPABASE_URL;
            state.supabaseAnonKey = DEFAULT_SUPABASE_ANON_KEY;
            state.vaultId = DEFAULT_VAULT_ID;
            state.isEnabled = true;
            state.autoSync = true;
          }
          // Legacy lastSyncedAt is not evidence of a known base.
          state.syncStatus = !state.isEnabled ? 'disabled' : state.syncConflict ? 'conflict' :
            state.pendingChanges ? 'pending' : 'idle';
        }
      },
    }
  )
);
