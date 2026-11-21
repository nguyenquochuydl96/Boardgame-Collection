import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { useSyncStore } from '../store/useSyncStore';
import { useGameStore } from '../store/useGameStore';
import { useSessionStore } from '../store/useSessionStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLocationStore } from '../store/useLocationStore';
import { BoardGame, PlaySession, Player, GameLocation } from '../types';
import { setSyncApplyingRemote, isSyncApplyingRemote } from './syncGuard';
import { isIdbMediaRef, getMediaImage, saveMediaImage } from './mediaStorage';

export { isSyncApplyingRemote };

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';
let activeChannel: RealtimeChannel | null = null;

/**
 * Smart merge two arrays of entities with unique IDs.
 * Remote records take precedence for updated data, while local-only offline records are preserved.
 */
export function mergeById<T extends { id: string }>(localList: T[], remoteList: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of localList) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }
  for (const item of remoteList) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}

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
 * Convert large incoming base64 images to idb:// to protect LocalStorage quota on receiving devices
 */
async function processIncomingMedia(
  incomingPlayers?: Player[],
  incomingSessions?: PlaySession[]
): Promise<{ players: Player[]; sessions: PlaySession[] }> {
  const processedPlayers = incomingPlayers
    ? await Promise.all(
        incomingPlayers.map(async (p) => {
          if (
            p.avatar &&
            typeof p.avatar === 'string' &&
            p.avatar.startsWith('data:image/') &&
            !p.avatar.startsWith('data:image/svg+xml') &&
            p.avatar.length > 5000
          ) {
            const existingId = `player_avatar_${p.id}`;
            const idbRef = await saveMediaImage(p.avatar, existingId);
            return { ...p, avatar: idbRef };
          }
          return p;
        })
      )
    : [];

  const processedSessions = incomingSessions
    ? await Promise.all(
        incomingSessions.map(async (s) => {
          if (s.photos && s.photos.length > 0) {
            let changed = false;
            const newPhotos = await Promise.all(
              s.photos.map(async (photo, idx) => {
                if (
                  photo &&
                  typeof photo === 'string' &&
                  photo.startsWith('data:image/') &&
                  !photo.startsWith('data:image/svg+xml') &&
                  photo.length > 5000
                ) {
                  changed = true;
                  const existingId = `session_photo_${s.id}_${idx}`;
                  return await saveMediaImage(photo, existingId);
                }
                return photo;
              })
            );
            return changed ? { ...s, photos: newPhotos } : s;
          }
          return s;
        })
      )
    : [];

  return { players: processedPlayers, sessions: processedSessions };
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

  if (isSyncApplyingRemote()) {
    return { success: true };
  }

  setSyncStatus('syncing');

  try {
    const games = useGameStore.getState().games;
    const sessions = useSessionStore.getState().sessions;
    const players = usePlayerStore.getState().players;
    const locations = useLocationStore.getState().locations;
    const nowIso = new Date().toISOString();

    // Resolve idb:// references to data URLs before uploading to cloud so other devices can access images
    const cloudPlayers = await Promise.all(
      players.map(async (p) => {
        if (p.avatar && isIdbMediaRef(p.avatar)) {
          const resolved = await getMediaImage(p.avatar);
          return resolved ? { ...p, avatar: resolved } : p;
        }
        return p;
      })
    );

    const cloudSessions = await Promise.all(
      sessions.map(async (s) => {
        if (s.photos && s.photos.some((ph) => isIdbMediaRef(ph))) {
          const resolvedPhotos = await Promise.all(
            s.photos.map(async (ph) => {
              if (isIdbMediaRef(ph)) {
                const resolved = await getMediaImage(ph);
                return resolved || ph;
              }
              return ph;
            })
          );
          return { ...s, photos: resolvedPhotos };
        }
        return s;
      })
    );

    const payload: VaultPayload = {
      vault_id: vaultId,
      games,
      sessions: cloudSessions,
      players: cloudPlayers,
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
    setSyncApplyingRemote(true);
    try {
      const remoteGames = (data.games || []) as BoardGame[];
      const rawSessions = (data.sessions || []) as PlaySession[];
      const rawPlayers = (data.players || []) as Player[];
      const remoteLocations = (data.locations || []) as GameLocation[];

      const { players: remotePlayers, sessions: remoteSessions } = await processIncomingMedia(
        rawPlayers,
        rawSessions
      );

      if (mode === 'replace') {
        if (remoteGames.length > 0) {
          useGameStore.getState().bulkAddGames(remoteGames, true);
        }
        if (remoteSessions.length > 0) {
          useSessionStore.getState().bulkAddSessions(remoteSessions, true);
        }
        if (remotePlayers.length > 0) {
          usePlayerStore.getState().bulkAddPlayers(remotePlayers, true);
        }
        if (remoteLocations.length > 0) {
          useLocationStore.getState().bulkAddLocations(remoteLocations, true);
        }
      } else {
        // Smart merge: preserve local records created offline while applying remote updates
        const mergedGames = mergeById(useGameStore.getState().games, remoteGames);
        const mergedSessions = mergeById(useSessionStore.getState().sessions, remoteSessions);
        const mergedPlayers = mergeById(usePlayerStore.getState().players, remotePlayers);
        const mergedLocations = mergeById(useLocationStore.getState().locations, remoteLocations);

        if (mergedGames.length > 0) {
          useGameStore.getState().bulkAddGames(mergedGames, true);
        }
        if (mergedSessions.length > 0) {
          useSessionStore.getState().bulkAddSessions(mergedSessions, true);
        }
        if (mergedPlayers.length > 0) {
          usePlayerStore.getState().bulkAddPlayers(mergedPlayers, true);
        }
        if (mergedLocations.length > 0) {
          useLocationStore.getState().bulkAddLocations(mergedLocations, true);
        }
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
      setSyncApplyingRemote(false);
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
          setSyncApplyingRemote(true);
          processIncomingMedia(record.players, record.sessions)
            .then(({ players: processedPlayers, sessions: processedSessions }) => {
              if (record.games) useGameStore.getState().bulkAddGames(record.games, true);
              if (record.sessions) useSessionStore.getState().bulkAddSessions(processedSessions, true);
              if (record.players) usePlayerStore.getState().bulkAddPlayers(processedPlayers, true);
              if (record.locations) useLocationStore.getState().bulkAddLocations(record.locations, true);

              setLastSyncedAt(record.updated_at);
              setSyncStatus('synced');
            })
            .catch((err) => {
              console.warn('[supabaseSync] Error processing incoming realtime media:', err);
            })
            .finally(() => {
              setSyncApplyingRemote(false);
            });
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
