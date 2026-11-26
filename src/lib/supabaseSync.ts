import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { useSyncStore } from '../store/useSyncStore';
import { useGameStore } from '../store/useGameStore';
import { useSessionStore } from '../store/useSessionStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLocationStore } from '../store/useLocationStore';
import { BoardGame, PlaySession, Player, GameLocation } from '../types';
import { setSyncApplyingRemote, isSyncApplyingRemote } from './syncGuard';
import { backupSyncSide, saveIncomingSyncMedia } from './syncPrivate';
import { resolvePortableVaultMedia } from './portableVaultMedia';
import {
  getGameThumbnail,
  isLowResBGGThumbnail,
  BGG_OFFICIAL_IRON_CLAYS,
  deduplicateLocationsList,
} from './utils';

export { isSyncApplyingRemote };

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';
let activeChannel: RealtimeChannel | null = null;
let operationTail: Promise<unknown> = Promise.resolve();

function serialize<T>(task: () => Promise<T>): Promise<T> {
  const operation = operationTail.then(task, task);
  operationTail = operation.catch(() => undefined);
  return operation;
}

// Kept for source compatibility. Realtime never trusts timestamp proximity.
export function isRealtimeSelfReflection(
  recordUpdatedAt: string | undefined,
  localLastSyncedAt: string | null | undefined,
  recentPushMs: number = 0
): boolean {
  if (!recordUpdatedAt || !localLastSyncedAt) return false;
  return recordUpdatedAt === localLastSyncedAt;
}

/**
 * Smart merge two arrays of entities with unique IDs.
 * Remote records take precedence for updated data, while local-only offline records are preserved.
 * If local item has a sharp/healed image and remote item has empty/low-res/placeholder image,
 * the sharp local image is preserved.
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
      const existing = map.get(item.id) as any;
      if (existing) {
        const merged = { ...existing, ...item };
        if (
          existing.image &&
          !isLowResBGGThumbnail(existing.image) &&
          !existing.image.startsWith('data:image/svg') &&
          (!(item as any).image || isLowResBGGThumbnail((item as any).image) || (item as any).image.startsWith('data:image/svg'))
        ) {
          merged.image = existing.image;
          merged.thumbnail = existing.thumbnail || existing.image;
        }
        map.set(item.id, merged);
      } else {
        map.set(item.id, item);
      }
    }
  }
  return Array.from(map.values());
}

/**
 * Heals game images from local cache, BGG catalog, and fixes Iron Clays.
 */
export function healIncomingGames(
  incomingGames: BoardGame[],
  localGames: BoardGame[] = []
): { games: BoardGame[]; wasHealed: boolean } {
  const localMap = new Map<string, BoardGame>();
  for (const g of localGames) {
    if (g && g.id) localMap.set(g.id, g);
  }

  let wasHealed = false;

  const healed = incomingGames.map((g) => {
    let item = { ...g };
    const local = localMap.get(g.id);

    // 1. If local has a good image and incoming has broken/empty/low-res image, keep local
    if (
      local &&
      local.image &&
      !isLowResBGGThumbnail(local.image) &&
      !local.image.startsWith('data:image/svg')
    ) {
      if (!item.image || isLowResBGGThumbnail(item.image) || item.image.startsWith('data:image/svg')) {
        item.image = local.image;
        if (local.thumbnail) item.thumbnail = local.thumbnail;
        wasHealed = true;
      }
    }

    // 2. Iron Clays guard
    if (item.name && item.name.toLowerCase().includes('iron clay')) {
      if (
        !item.image ||
        item.image !== BGG_OFFICIAL_IRON_CLAYS ||
        !item.thumbnail ||
        item.thumbnail !== BGG_OFFICIAL_IRON_CLAYS
      ) {
        item.image = BGG_OFFICIAL_IRON_CLAYS;
        item.thumbnail = BGG_OFFICIAL_IRON_CLAYS;
        wasHealed = true;
      }
    } else {
      // 3. Auto-heal from catalog if low-res or placeholder
      const sharp = getGameThumbnail(item);
      if (sharp && (!item.image || isLowResBGGThumbnail(item.image) || item.image.startsWith('data:image/svg'))) {
        item.image = sharp;
        if (!item.thumbnail || isLowResBGGThumbnail(item.thumbnail)) {
          item.thumbnail = sharp;
        }
        wasHealed = true;
      }
    }

    return item;
  });

  return { games: healed, wasHealed };
}

export const SQL_SETUP_SCRIPT = `-- ==========================================
-- HEO — BOARD GAME COLLECTION REAL-TIME CLOUD SYNC SETUP
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
            const idbRef = await saveIncomingSyncMedia(p.avatar);
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
              s.photos.map(async (photo) => {
                if (
                  photo &&
                  typeof photo === 'string' &&
                  photo.startsWith('data:image/') &&
                  !photo.startsWith('data:image/svg+xml') &&
                  photo.length > 5000
                ) {
                  changed = true;
                  return await saveIncomingSyncMedia(photo);
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

type SyncResult = { success: boolean; error?: string };
type PullResult = SyncResult & { count?: { games: number; sessions: number; players: number } };
type Scope = { url: string; vaultId: string; key: string };
type LocalData = { games: BoardGame[]; sessions: PlaySession[]; players: Player[]; locations: GameLocation[] };

function currentScope(): Scope {
  const state = useSyncStore.getState();
  return { url: state.supabaseUrl, vaultId: state.vaultId, key: state.supabaseAnonKey };
}

function scopeMatches(scope: Scope): boolean {
  const state = useSyncStore.getState();
  return state.isEnabled && state.supabaseUrl === scope.url && state.vaultId === scope.vaultId && state.supabaseAnonKey === scope.key;
}

function requireScope(scope: Scope): void {
  if (!scopeMatches(scope)) throw new Error('Sync settings changed during the operation');
}

function snapshotLocal(): LocalData {
  // Clone so async media processing cannot observe a partially changed snapshot.
  return JSON.parse(JSON.stringify({
    games: useGameStore.getState().games,
    sessions: useSessionStore.getState().sessions,
    players: usePlayerStore.getState().players,
    locations: useLocationStore.getState().locations,
  }));
}

function hasLocalData(local: LocalData): boolean {
  return Boolean(local.games.length || local.sessions.length || local.players.length || local.locations.length);
}

function currentRevision(): number {
  return useSyncStore.getState().localRevision;
}

function hasKnownBase(scope: Scope): boolean {
  const baseline = useSyncStore.getState().syncBaseline;
  return Boolean(baseline && baseline.url === scope.url && baseline.vaultId === scope.vaultId && baseline.updatedAt);
}

function baseMatches(scope: Scope, row: VaultPayload | null): boolean {
  const baseline = useSyncStore.getState().syncBaseline;
  return Boolean(hasKnownBase(scope) && row && baseline?.updatedAt === row.updated_at);
}

function conflict(reason: string, row: VaultPayload | null): SyncResult {
  useSyncStore.getState().setSyncConflict({
    reason,
    remoteUpdatedAt: row?.updated_at || null,
    ...(row ? { remoteCounts: {
      games: row.games.length, sessions: row.sessions.length,
      players: row.players.length, locations: row.locations.length,
    } } : {}),
  });
  return { success: false, error: reason };
}

function fail(err: unknown): SyncResult {
  const message = err instanceof Error ? err.message : String(err || 'Sync failed');
  const state = useSyncStore.getState();
  // Keep the conflict and its message visible if the protective action fails.
  state.setSyncStatus(state.syncConflict ? 'conflict' : 'error', message);
  return { success: false, error: message };
}

function validateRow(data: any, vaultId: string): VaultPayload {
  if (!data || data.vault_id !== vaultId || typeof data.updated_at !== 'string' || !data.updated_at ||
      !Array.isArray(data.games) || !Array.isArray(data.sessions) || !Array.isArray(data.players) || !Array.isArray(data.locations)) {
    throw new Error('Cloud returned an incomplete vault; no data was replaced');
  }
  return data as VaultPayload;
}

async function readRemote(client: SupabaseClient, scope: Scope): Promise<VaultPayload | null> {
  const { data, error } = await client.from('vaults').select('*').eq('vault_id', scope.vaultId).maybeSingle();
  requireScope(scope);
  if (error) throw new Error(error.message);
  return data === null ? null : validateRow(data, scope.vaultId);
}

function verifyStoredArray(key: string, field: string, expected: unknown): void {
  if (typeof window === 'undefined' || !window.localStorage) throw new Error('Local storage is unavailable');
  const raw = window.localStorage.getItem(key);
  if (!raw || JSON.stringify(JSON.parse(raw)?.state?.[field]) !== JSON.stringify(expected)) {
    throw new Error(`Local persistence verification failed for ${field}`);
  }
}

function verifyDurableLocal(): void {
  verifyStoredArray('bg-vault-games-v2', 'games', useGameStore.getState().games);
  verifyStoredArray('bg-vault-sessions-v2', 'sessions', useSessionStore.getState().sessions);
  verifyStoredArray('bg-vault-players-v1', 'players', usePlayerStore.getState().players);
  verifyStoredArray('boardgame_locations_v2', 'locations', useLocationStore.getState().locations);
}

function acknowledge(scope: Scope, updatedAt: string, revision: number, stillDirty = false): void {
  requireScope(scope);
  const previous = useSyncStore.getState();
  try {
    previous.acknowledgeSync({ url: scope.url, vaultId: scope.vaultId, updatedAt }, revision, stillDirty);
    if (typeof window === 'undefined' || !window.localStorage) throw new Error('Sync settings storage is unavailable');
    const persisted = JSON.parse(window.localStorage.getItem('bg-vault-sync-settings') || 'null')?.state;
    if (persisted?.syncBaseline?.url !== scope.url || persisted?.syncBaseline?.vaultId !== scope.vaultId ||
        persisted?.syncBaseline?.updatedAt !== updatedAt || persisted?.lastSyncedAt !== updatedAt) {
      throw new Error('Sync acknowledgement could not be persisted');
    }
  } catch (err) {
    // Zustand updates in-memory before persisting; restore the prior acknowledgement on failure.
    try { useSyncStore.setState({
      syncBaseline: previous.syncBaseline, lastSyncedAt: previous.lastSyncedAt,
      pendingChanges: true, syncConflict: previous.syncConflict,
      hasCompletedInitialPull: previous.hasCompletedInitialPull,
    }); } catch { /* the in-memory rollback still happened */ }
    throw err;
  }
}

// PostgreSQL compares timestamptz by instant, including microseconds. Never use
// this for conflict ordering: it only prevents us from writing the same DB value.
function timestampMicros(value: string): bigint | null {
  const match = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d{1,6}))?(Z|[+-]\d\d(?::?\d\d)?)$/i.exec(value);
  if (!match) return null;
  const millis = Date.parse(`${match[1]}${match[3]}`);
  if (!Number.isFinite(millis)) return null;
  return BigInt(millis) * 1000n + BigInt((match[2] || '').padEnd(6, '0'));
}

async function makePayload(local: LocalData, vaultId: string, previousToken: string | null): Promise<VaultPayload> {
  const portable = await resolvePortableVaultMedia(local);
  // Legacy schema accepts client-written timestamptz. Add random microseconds to
  // reduce equal-token collisions, without treating timestamps as clocks/winners.
  const previousMicros = previousToken ? timestampMicros(previousToken) : null;
  if (previousToken && previousMicros === null) throw new Error('Cloud timestamp cannot be safely compared by the database');
  let updatedAt = '';
  do {
    const micros = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    updatedAt = new Date().toISOString().replace('Z', `${micros}Z`);
  } while (timestampMicros(updatedAt) === previousMicros);
  return {
    vault_id: vaultId, games: portable.games, sessions: portable.sessions, players: portable.players,
    locations: deduplicateLocationsList(local.locations, portable.sessions), updated_at: updatedAt,
  };
}

async function writeGuarded(client: SupabaseClient, scope: Scope, prior: VaultPayload | null, payload: VaultPayload): Promise<SyncResult> {
  requireScope(scope);
  const result = prior
    ? await client.from('vaults').update(payload).eq('vault_id', scope.vaultId).eq('updated_at', prior.updated_at).select('*')
    : await client.from('vaults').insert(payload).select('*');
  requireScope(scope);
  if (result.error) {
    if (result.error.code === '23505') return conflict('Another device created this room. Review the cloud collection.', await readRemote(client, scope));
    throw new Error(result.error.message);
  }
  if (Array.isArray(result.data) && result.data.length === 0) {
    return conflict('Cloud changed while saving. Review both collections.', await readRemote(client, scope));
  }
  if (!Array.isArray(result.data) || result.data.length !== 1) throw new Error('Cloud did not acknowledge exactly one written row');
  const written = validateRow(result.data[0], scope.vaultId);
  const writtenMicros = timestampMicros(written.updated_at);
  const proposedMicros = timestampMicros(payload.updated_at);
  const previousMicros = prior ? timestampMicros(prior.updated_at) : null;
  if (writtenMicros === null || proposedMicros === null || writtenMicros !== proposedMicros ||
      (prior && (previousMicros === null || writtenMicros === previousMicros))) {
    throw new Error('Cloud did not acknowledge the expected new update token');
  }
  return { success: true, error: written.updated_at };
}

async function pushImpl(scope: Scope): Promise<SyncResult> {
  try {
    requireScope(scope);
    const client = getSupabaseClient();
    if (!client || !scope.vaultId) throw new Error('Sync is not configured or disabled');
    const state = useSyncStore.getState();
    if (state.syncConflict) return { success: false, error: state.syncConflict.reason };
    if (isSyncApplyingRemote()) throw new Error('A remote collection is being applied');
    state.setSyncStatus('syncing');
    const remote = await readRemote(client, scope);
    const now = useSyncStore.getState();
    if (remote && (!hasKnownBase(scope) || !baseMatches(scope, remote))) {
      return conflict('Cloud changed or the last common version is unknown. Review both collections.', remote);
    }
    if (!remote && hasKnownBase(scope)) return conflict('The cloud collection is missing. Review before creating it again.', null);
    const revision = now.localRevision;
    const local = snapshotLocal();
    if (!hasLocalData(local)) {
      if (!remote) throw new Error('Nothing was written: the local collection and cloud room are empty');
      if (hasLocalData(remote)) return conflict('An empty local collection cannot overwrite a populated cloud collection.', remote);
    }
    const payload = await makePayload(local, scope.vaultId, remote?.updated_at || null);
    requireScope(scope);
    const result = await writeGuarded(client, scope, remote, payload);
    if (!result.success) return result;
    acknowledge(scope, result.error!, revision);
    return { success: true };
  } catch (err) {
    return fail(err);
  }
}

export function pushVaultToCloud(): Promise<SyncResult> {
  const scope = currentScope();
  return serialize(() => pushImpl(scope));
}

async function applyRemote(scope: Scope, remote: VaultPayload, mode: 'replace' | 'merge', revision: number, before: LocalData): Promise<PullResult> {
  const { players, sessions } = await processIncomingMedia(remote.players, remote.sessions);
  requireScope(scope);
  if (currentRevision() !== revision) return conflict('Local data changed while the cloud collection was loading.', remote);
  const remoteLocations = deduplicateLocationsList(remote.locations, sessions);
  const candidates = mode === 'merge' ? mergeById(before.games, remote.games) : remote.games;
  const games = healIncomingGames(candidates, before.games).games;
  const nextSessions = mode === 'merge' ? mergeById(before.sessions, sessions) : sessions;
  const nextPlayers = mode === 'merge' ? mergeById(before.players, players) : players;
  const nextLocations = mode === 'merge'
    ? deduplicateLocationsList(mergeById(before.locations, remoteLocations), nextSessions) : remoteLocations;

  // Only the synchronous store writes are suppressed. Async reads/media above
  // remain tracked, so a user edit during loading can never be discarded.
  setSyncApplyingRemote(true);
  try {
    useGameStore.getState().bulkAddGames(games, true);
    useSessionStore.getState().bulkAddSessions(nextSessions, true); // preserves recent sessions
    usePlayerStore.getState().bulkAddPlayers(nextPlayers, true); // preserves guests
    useLocationStore.setState({ locations: nextLocations, hasSyncedHistory: true });
    verifyDurableLocal();
  } catch (err) {
    // Best-effort rollback; localStorage and IndexedDB do not form a transaction.
    try { useGameStore.setState({ games: before.games }); } catch { /* in-memory update occurred */ }
    try { useSessionStore.setState({ sessions: before.sessions }); } catch { /* in-memory update occurred */ }
    try { usePlayerStore.setState({ players: before.players }); } catch { /* in-memory update occurred */ }
    try { useLocationStore.setState({ locations: before.locations }); } catch { /* in-memory update occurred */ }
    throw err;
  } finally {
    setSyncApplyingRemote(false);
  }
  const applied = snapshotLocal();
  const remoteComparable = { games: remote.games, sessions, players, locations: remote.locations };
  const stillDirty = JSON.stringify(applied) !== JSON.stringify(remoteComparable);
  acknowledge(scope, remote.updated_at, revision, stillDirty);
  return { success: true, count: { games: remote.games.length, sessions: sessions.length, players: players.length } };
}

async function pullImpl(scope: Scope, mode: 'replace' | 'merge'): Promise<PullResult> {
  try {
    requireScope(scope);
    const client = getSupabaseClient();
    if (!client || !scope.vaultId) throw new Error('Sync is not configured');
    const state = useSyncStore.getState();
    if (state.syncConflict) return { success: false, error: state.syncConflict.reason };
    const revision = state.localRevision;
    state.setSyncStatus('syncing');
    const remote = await readRemote(client, scope);
    const current = useSyncStore.getState();
    const local = snapshotLocal();
    if (!remote) {
      if (hasKnownBase(scope)) return conflict('The cloud collection is missing. Review before creating it again.', null);
      current.setHasCompletedInitialPull(true);
      current.setSyncStatus(current.pendingChanges || hasLocalData(local) ? 'pending' : 'idle');
      return { success: false, error: 'Cloud room does not exist; no collection was applied.' };
    }
    if ((!hasKnownBase(scope) && (hasLocalData(local) || current.pendingChanges)) ||
        (!baseMatches(scope, remote) && (current.pendingChanges || current.localRevision !== revision))) {
      return conflict('Cloud changed or the last common version is unknown. Review both collections.', remote);
    }
    if (baseMatches(scope, remote) && current.pendingChanges) {
      current.setSyncStatus('pending');
      return { success: false, error: 'Local changes are pending; cloud was not applied.' };
    }
    return await applyRemote(scope, remote, mode, current.localRevision, local);
  } catch (err) {
    return fail(err);
  }
}

export function pullVaultFromCloud(mode: 'replace' | 'merge' = 'replace'): Promise<PullResult> {
  const scope = currentScope();
  return serialize(() => pullImpl(scope, mode));
}

export function getSyncConflictSummary() {
  return useSyncStore.getState().syncConflict;
}

export function resolveSyncConflict(choice: 'cloud' | 'local' | 'later'): Promise<SyncResult> {
  const scope = currentScope();
  return serialize(async () => {
    try {
      requireScope(scope);
      const state = useSyncStore.getState();
      if (!state.syncConflict) throw new Error('There is no sync conflict to resolve');
      if (choice === 'later') return { success: true };
      if (choice !== 'cloud' && choice !== 'local') throw new Error('Invalid conflict choice');
      const client = getSupabaseClient();
      if (!client) throw new Error('Sync is not configured');
      const expected = state.syncConflict.remoteUpdatedAt;
      const revision = state.localRevision;
      const before = snapshotLocal();
      const remote = await readRemote(client, scope);
      if (!remote || remote.updated_at !== expected) {
        return conflict('Cloud changed again. Review the latest collection before deciding.', remote);
      }
      if (choice === 'cloud') {
        await backupSyncSide('local', scope.url, scope.vaultId, before);
        requireScope(scope);
        if (currentRevision() !== revision) return conflict('Local data changed during backup. Review again.', remote);
        return await applyRemote(scope, remote, 'replace', revision, before);
      }
      await backupSyncSide('cloud', scope.url, scope.vaultId, remote);
      requireScope(scope);
      const sentRevision = currentRevision();
      const local = snapshotLocal();
      const payload = await makePayload(local, scope.vaultId, remote.updated_at);
      const result = await writeGuarded(client, scope, remote, payload);
      if (!result.success) return result;
      acknowledge(scope, result.error!, sentRevision);
      return { success: true };
    } catch (err) {
      const result = fail(err);
      return { success: false, error: `Conflict resolution failed: ${result.error}` };
    }
  });
}

/** Realtime is only an invalidation; all reads and applies use the same queue. */
export function startVaultRealtimeSubscription(): () => void {
  const client = getSupabaseClient();
  const scope = currentScope();
  const { isEnabled, autoSync } = useSyncStore.getState();
  if (!client || !isEnabled || !scope.vaultId || !autoSync) return () => {};
  if (activeChannel) client.removeChannel(activeChannel);
  const channel = client.channel(`vault-${scope.vaultId}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'vaults', filter: `vault_id=eq.${scope.vaultId}`,
    }, () => {
      if (scopeMatches(scope)) void serialize(() => pullImpl(scope, 'replace'));
    })
    .subscribe((status) => {
      if (!scopeMatches(scope)) return;
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        const state = useSyncStore.getState();
        state.setSyncStatus(state.syncConflict ? 'conflict' : 'offline', 'Realtime sync channel disconnected');
      }
      // Subscribing is not proof that any data was read or written.
    });
  activeChannel = channel;
  return () => {
    client.removeChannel(channel);
    if (activeChannel === channel) activeChannel = null;
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
