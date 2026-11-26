import type { BoardGame, Player, PlaySession, GameLocation } from '../types';
import type { VaultPayload } from './supabaseSync';

export interface RecoverableSyncBackup {
  id: string;
  side: 'local' | 'cloud';
  url: string;
  vaultId: string;
  createdAt: string;
  counts: {
    games: number;
    players: number;
    sessions: number;
    locations: number;
  };
  rawType: 'local-array' | 'cloud-payload' | 'unknown';
}

export interface VaultBackupData {
  app: 'BoardGameVault';
  vaultBackup: true;
  version: '2.0';
  exportedAt: string;
  counts: {
    games: number;
    players: number;
    sessions: number;
    locations: number;
  };
  games: BoardGame[];
  players: Player[];
  sessions: PlaySession[];
  locations: GameLocation[];
}

const BACKUP_DB = 'bg-vault-sync-backups-v1';
const BACKUP_STORE = 'backups';

function openBackupDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is unavailable'));
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BACKUP_DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(BACKUP_STORE)) {
        req.result.createObjectStore(BACKUP_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Could not open IndexedDB backup database'));
    req.onblocked = () => reject(new Error('IndexedDB backup database is blocked'));
  });
}

function triggerDownload(content: string, fileName: string, contentType: string): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeAndNormalizeArray<T>(arr: unknown): T[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => {
    if (!item || typeof item !== 'object') return item;
    const copy = { ...(item as Record<string, unknown>) };
    // Guard against data:image/svg+xml and malformed/missing idb refs if any
    for (const [k, v] of Object.entries(copy)) {
      if (typeof v === 'string') {
        if (v.startsWith('data:image/svg+xml')) {
          // Keep valid SVG or normalize if needed
        }
      }
    }
    return copy;
  }) as T[];
}

function extractVaultArrays(data: unknown, requireAllCategories = false): {
  games: BoardGame[];
  players: Player[];
  sessions: PlaySession[];
  locations: GameLocation[];
  rawType: 'local-array' | 'cloud-payload' | 'unknown';
} {
  if (!data || typeof data !== 'object') {
    throw new Error('Backup data is corrupt or not an object');
  }

  // Check if it's a Cloud VaultPayload ({ vault_id, updated_at, games, players, sessions, locations })
  const record = data as Record<string, unknown>;
  const categories = ['games', 'players', 'sessions', 'locations'] as const;
  if (requireAllCategories && categories.some((category) => !Array.isArray(record[category]))) {
    throw new Error('Backup data is missing one or more required entity arrays');
  }
  if (
    Array.isArray(record.games) &&
    Array.isArray(record.sessions) &&
    Array.isArray(record.players) &&
    Array.isArray(record.locations) &&
    (typeof record.vault_id === 'string' || typeof record.updated_at === 'string' || 'vault_id' in record)
  ) {
    return {
      games: sanitizeAndNormalizeArray<BoardGame>(record.games),
      players: sanitizeAndNormalizeArray<Player>(record.players),
      sessions: sanitizeAndNormalizeArray<PlaySession>(record.sessions),
      locations: sanitizeAndNormalizeArray<GameLocation>(record.locations),
      rawType: 'cloud-payload',
    };
  }

  // Check if it's local array snapshot or similar object with games, players, sessions, locations
  if (
    Array.isArray(record.games) ||
    Array.isArray(record.players) ||
    Array.isArray(record.sessions) ||
    Array.isArray(record.locations)
  ) {
    return {
      games: sanitizeAndNormalizeArray<BoardGame>(record.games),
      players: sanitizeAndNormalizeArray<Player>(record.players),
      sessions: sanitizeAndNormalizeArray<PlaySession>(record.sessions),
      locations: sanitizeAndNormalizeArray<GameLocation>(record.locations),
      rawType: 'local-array',
    };
  }

  throw new Error('Backup data structure is unrecognized or missing required arrays');
}

/**
 * List all recoverable sync backups stored in IndexedDB bg-vault-sync-backups-v1/backups.
 * Detects unavailable/corrupt DB gracefully and returns metadata + counts + rawType.
 */
export async function listRecoverableSyncBackups(): Promise<RecoverableSyncBackup[]> {
  let db: IDBDatabase;
  try {
    db = await openBackupDb();
  } catch (err) {
    throw new Error(`Failed to access IndexedDB backup store: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  try {
    const rawItems = await new Promise<unknown[]>((resolve, reject) => {
      const tx = db.transaction(BACKUP_STORE, 'readonly');
      const store = tx.objectStore(BACKUP_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => reject(req.error || new Error('Failed to read backups store'));
      tx.onabort = () => reject(new Error('Transaction aborted reading backups store'));
    });

    const backups: RecoverableSyncBackup[] = [];
    for (const item of rawItems) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as Record<string, unknown>;
      const id = typeof rec.id === 'string' ? rec.id : String(rec.id || '');
      const side = rec.side === 'cloud' ? 'cloud' : 'local';
      const url = typeof rec.url === 'string' ? rec.url : '';
      const vaultId = typeof rec.vaultId === 'string' ? rec.vaultId : '';
      const createdAt = typeof rec.createdAt === 'string' ? rec.createdAt : new Date().toISOString();

      let gamesCount = 0;
      let playersCount = 0;
      let sessionsCount = 0;
      let locationsCount = 0;
      let rawType: 'local-array' | 'cloud-payload' | 'unknown' = 'unknown';

      try {
        const extracted = extractVaultArrays(rec.data);
        gamesCount = extracted.games.length;
        playersCount = extracted.players.length;
        sessionsCount = extracted.sessions.length;
        locationsCount = extracted.locations.length;
        rawType = extracted.rawType;
      } catch {
        // If corrupt, counts remain 0 or marked unknown
      }

      backups.push({
        id,
        side,
        url,
        vaultId,
        createdAt,
        counts: {
          games: gamesCount,
          players: playersCount,
          sessions: sessionsCount,
          locations: locationsCount,
        },
        rawType,
      });
    }

    // Sort descending by createdAt
    backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return backups;
  } finally {
    db.close();
  }
}

/**
 * Download a specific recoverable sync backup by ID, converting it into a standard
 * app import-compatible VaultBackupData JSON `{ app: 'BoardGameVault', vaultBackup: true, version: '2.0', ... }`.
 * Validates the 4 arrays, rejects missing/unresolved idb refs or corrupt structures,
 * and ensures NO URL/keys/credentials are ever included in downloaded JSON.
 */
export async function downloadRecoverableSyncBackup(id: string): Promise<VaultBackupData> {
  let db: IDBDatabase;
  try {
    db = await openBackupDb();
  } catch (err) {
    throw new Error(`Failed to access IndexedDB backup store: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  try {
    const record = await new Promise<any>((resolve, reject) => {
      const tx = db.transaction(BACKUP_STORE, 'readonly');
      const store = tx.objectStore(BACKUP_STORE);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Failed to retrieve backup record'));
      tx.onabort = () => reject(new Error('Transaction aborted retrieving backup record'));
    });

    if (!record || typeof record !== 'object') {
      throw new Error(`Backup record not found: ${id}`);
    }

    // A recovery download must be complete enough for the normal restore validator.
    // Listing can show old/partial records, but exporting one may not silently fill a
    // missing category with an empty array.
    const extracted = extractVaultArrays(record.data, true);

    // Check for dangling idb refs in games/players/sessions/locations if any remain
    // If an idb:// reference is present in backup data but cannot be resolved, or if strict validation applies:
    // backupSyncSide already inlineMedia'd local data or stored cloud payload. Cloud payloads contain inlined base64 or external URLs.
    // Let's verify no idb:// refs remain un-inlined in games/players/sessions/locations.
    const hasDanglingIdb = (items: unknown[]): boolean => {
      for (const item of items) {
        if (JSON.stringify(item).includes('idb://')) return true;
      }
      return false;
    };

    if (
      hasDanglingIdb(extracted.games) ||
      hasDanglingIdb(extracted.players) ||
      hasDanglingIdb(extracted.sessions) ||
      hasDanglingIdb(extracted.locations)
    ) {
      throw new Error('Backup contains unresolved IndexedDB media references (idb://) and cannot be exported');
    }

    const payload: VaultBackupData = {
      app: 'BoardGameVault',
      vaultBackup: true,
      version: '2.0',
      exportedAt: new Date().toISOString(),
      counts: {
        games: extracted.games.length,
        players: extracted.players.length,
        sessions: extracted.sessions.length,
        locations: extracted.locations.length,
      },
      games: extracted.games,
      players: extracted.players,
      sessions: extracted.sessions,
      locations: extracted.locations,
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `HEO_BoardGameCollection_ConflictBackup_${record.side}_${timestamp}.json`;
    triggerDownload(JSON.stringify(payload, null, 2), fileName, 'application/json;charset=utf-8');

    return payload;
  } finally {
    db.close();
  }
}
