import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { useSyncStore } from '../store/useSyncStore';
import { useGameStore } from '../store/useGameStore';
import { useSessionStore } from '../store/useSessionStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLocationStore } from '../store/useLocationStore';
import { BoardGame, PlaySession, Player, GameLocation } from '../types';

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';
let activeChannel: RealtimeChannel | null = null;
let isApplyingRemoteChange = false;

export const SQL_SETUP_SCRIPT = `-- ==========================================
-- BOARDGAME VAULT REAL-TIME CLOUD SYNC SETUP
-- Paste this script into Supabase SQL Editor and click RUN
-- ==========================================

-- 1. Create vaults storage table
CREATE TABLE IF NOT EXISTS public.vaults (
  vault_id text PRIMARY KEY,
  games jsonb NOT NULL DEFAULT '[]'::jsonb,
  sessions jsonb NOT NULL DEFAULT '[]'::jsonb,
  players jsonb NOT NULL DEFAULT '[]'::jsonb,
  locations jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.vaults ENABLE ROW LEVEL SECURITY;

-- 3. Allow read, insert, and update operations by vault_id
DROP POLICY IF EXISTS "Allow all operations with vault_id" ON public.vaults;
CREATE POLICY "Allow all operations with vault_id" ON public.vaults
  FOR ALL USING (true) WITH CHECK (true);

-- 4. Enable Supabase Realtime for instant multi-device syncing
ALTER PUBLICATION supabase_realtime ADD TABLE vaults;
`;

/**
 * Get or create Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient | null {
  const { supabaseUrl, supabaseAnonKey, isEnabled } = useSyncStore.getState();

  if (!isEnabled || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  if (cachedClient && cachedUrl === supabaseUrl && cachedKey === supabaseAnonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 10 } },
    });
    cachedUrl = supabaseUrl;
    cachedKey = supabaseAnonKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Test connectivity and check if the `vaults` table exists
 */
export async function testSupabaseConnection(
  url: string,
  anonKey: string
): Promise<{ success: boolean; message: string }> {
  try {
    const testClient = createClient(url, anonKey, {
      auth: { persistSession: false },
    });

    const { error } = await testClient.from('vaults').select('vault_id').limit(1);

    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          message:
            'Connected to Supabase, but the "vaults" table was not found. Please run the SQL setup script in your Supabase SQL editor.',
        };
      }
      return {
        success: false,
        message: `Supabase error: ${error.message} (${error.code || 'API Error'})`,
      };
    }

    return { success: true, message: 'Successfully connected to Supabase and verified vaults table!' };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Could not reach Supabase endpoint. Check your URL and connection.',
    };
  }
}

export interface VaultPayload {
  vault_id: string;
  games: BoardGame[];
  sessions: PlaySession[];
  players: Player[];
  locations: GameLocation[];
  updated_at: string;
}

/**
 * Push current local state to Supabase Cloud
 */
export async function pushVaultToCloud(): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  const { vaultId, isEnabled, setSyncStatus, setLastSyncedAt } = useSyncStore.getState();

  if (!client || !isEnabled || !vaultId) {
    return { success: false, error: 'Sync is not configured or disabled' };
  }

  if (isApplyingRemoteChange) {
    return { success: true };
  }

  setSyncStatus('syncing');

  try {
    const games = useGameStore.getState().games;
    const sessions = useSessionStore.getState().sessions;
    const players = usePlayerStore.getState().players;
    const locations = useLocationStore.getState().locations;
    const nowIso = new Date().toISOString();

    const payload: VaultPayload = {
      vault_id: vaultId,
      games,
      sessions,
      players,
      locations,
      updated_at: nowIso,
    };

    const { error } = await client.from('vaults').upsert(payload, { onConflict: 'vault_id' });

    if (error) {
      setSyncStatus('error', error.message);
      return { success: false, error: error.message };
    }

    setLastSyncedAt(nowIso);
    setSyncStatus('synced');
    return { success: true };
  } catch (err: any) {
    const msg = err?.message || 'Unknown network error';
    setSyncStatus('error', msg);
    return { success: false, error: msg };
  }
}

/**
 * Pull latest state from Supabase Cloud and update local stores
 */
export async function pullVaultFromCloud(mode: 'replace' | 'merge' = 'replace'): Promise<{
  success: boolean;
  error?: string;
  count?: { games: number; sessions: number; players: number };
}> {
  const client = getSupabaseClient();
  const { vaultId, isEnabled, setSyncStatus, setLastSyncedAt } = useSyncStore.getState();

  if (!client || !isEnabled || !vaultId) {
    return { success: false, error: 'Sync is not configured' };
  }

  setSyncStatus('syncing');

  try {
    const { data, error } = await client
      .from('vaults')
      .select('*')
      .eq('vault_id', vaultId)
      .maybeSingle();

    if (error) {
      setSyncStatus('error', error.message);
      return { success: false, error: error.message };
    }

    if (!data) {
      // Remote vault does not exist yet. Push local data to create it.
      const pushRes = await pushVaultToCloud();
      return {
        success: pushRes.success,
        error: pushRes.error,
        count: {
          games: useGameStore.getState().games.length,
          sessions: useSessionStore.getState().sessions.length,
          players: usePlayerStore.getState().players.length,
        },
      };
    }

    // Apply remote data
    isApplyingRemoteChange = true;
    try {
      const remoteGames = (data.games || []) as BoardGame[];
      const remoteSessions = (data.sessions || []) as PlaySession[];
      const remotePlayers = (data.players || []) as Player[];
      const remoteLocations = (data.locations || []) as GameLocation[];

      const replace = mode === 'replace';

      if (remoteGames.length > 0) {
        useGameStore.getState().bulkAddGames(remoteGames, replace);
      }
      if (remoteSessions.length > 0) {
        useSessionStore.getState().bulkAddSessions(remoteSessions, replace);
      }
      if (remotePlayers.length > 0) {
        usePlayerStore.getState().bulkAddPlayers(remotePlayers, replace);
      }
      if (remoteLocations.length > 0) {
        useLocationStore.getState().bulkAddLocations(remoteLocations, replace);
      }

      setLastSyncedAt(data.updated_at || new Date().toISOString());
      setSyncStatus('synced');

      return {
        success: true,
        count: {
          games: remoteGames.length,
          sessions: remoteSessions.length,
          players: remotePlayers.length,
        },
      };
    } finally {
      setTimeout(() => {
        isApplyingRemoteChange = false;
      }, 500);
    }
  } catch (err: any) {
    const msg = err?.message || 'Failed to pull cloud vault data';
    setSyncStatus('error', msg);
    return { success: false, error: msg };
  }
}

/**
 * Listen for real-time changes published by Supabase Realtime channel
 */
export function startVaultRealtimeSubscription(): () => void {
  const client = getSupabaseClient();
  const { vaultId, isEnabled, autoSync, setLastSyncedAt, setSyncStatus } =
    useSyncStore.getState();

  if (!client || !isEnabled || !vaultId || !autoSync) {
    return () => {};
  }

  // Cleanup existing channel
  if (activeChannel) {
    client.removeChannel(activeChannel);
    activeChannel = null;
  }

  activeChannel = client
    .channel(`vault-${vaultId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'vaults',
        filter: `vault_id=eq.${vaultId}`,
      },
      (payload) => {
        if (!payload.new) return;
        const record = payload.new as VaultPayload;
        const localLastSynced = useSyncStore.getState().lastSyncedAt;

        // If this update was triggered by another device (normalize timestamps to avoid self-reflection loop)
        const recordTime = record.updated_at ? new Date(record.updated_at).getTime() : 0;
        const localTime = localLastSynced ? new Date(localLastSynced).getTime() : 0;
        const isSelfReflection = Math.abs(recordTime - localTime) < 1500;

        if (record.updated_at && !isSelfReflection) {
          isApplyingRemoteChange = true;
          try {
            if (record.games) useGameStore.getState().bulkAddGames(record.games, true);
            if (record.sessions) useSessionStore.getState().bulkAddSessions(record.sessions, true);
            if (record.players) usePlayerStore.getState().bulkAddPlayers(record.players, true);
            if (record.locations) useLocationStore.getState().bulkAddLocations(record.locations, true);

            setLastSyncedAt(record.updated_at);
            setSyncStatus('synced');
          } finally {
            setTimeout(() => {
              isApplyingRemoteChange = false;
            }, 500);
          }
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setSyncStatus('synced');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setSyncStatus('error', 'Realtime sync channel disconnected');
      }
    });

  return () => {
    if (activeChannel && client) {
      client.removeChannel(activeChannel);
      activeChannel = null;
    }
  };
}

/**
 * Generate a 1-click mobile import link with credentials encoded in query string
 */
export function generateMobileSyncLink(): string {
  const { supabaseUrl, supabaseAnonKey, vaultId } = useSyncStore.getState();
  if (!supabaseUrl || !supabaseAnonKey || !vaultId) return '';

  const origin = window.location.origin;
  const pathname = window.location.pathname;
  const params = new URLSearchParams({
    sync_url: supabaseUrl,
    sync_key: supabaseAnonKey,
    sync_vault: vaultId,
  });

  return `${origin}${pathname}?${params.toString()}#sync`;
}

/**
 * Check and apply URL query parameters if present (for 1-click setup from QR/Link)
 */
export function checkUrlSyncParameters(): boolean {
  if (typeof window === 'undefined') return false;

  const urlParams = new URLSearchParams(window.location.search);
  const syncUrl = urlParams.get('sync_url');
  const syncKey = urlParams.get('sync_key');
  const syncVault = urlParams.get('sync_vault');

  if (syncUrl && syncKey && syncVault) {
    useSyncStore.getState().setCredentials(syncUrl, syncKey, syncVault);

    // Clean up URL without reload
    urlParams.delete('sync_url');
    urlParams.delete('sync_key');
    urlParams.delete('sync_vault');
    const newSearch = urlParams.toString() ? `?${urlParams.toString()}` : '';
    window.history.replaceState({}, '', `${window.location.pathname}${newSearch}${window.location.hash}`);

    // Trigger initial pull
    setTimeout(() => {
      pullVaultFromCloud('replace');
    }, 500);

    return true;
  }

  return false;
}
