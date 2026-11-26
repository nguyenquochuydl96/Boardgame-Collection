import { useSessionStore } from '../store/useSessionStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useGameStore } from '../store/useGameStore';

const DB_NAME = 'bg-vault-media-v1';
const STORE_NAME = 'images';
const MAX_LRU_ITEMS = 100;

const lruCache = new Map<string, string>();
let dbPromise: Promise<IDBDatabase> | null = null;

function hasIndexedDB(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function lruGet(key: string): string | undefined {
  if (!lruCache.has(key)) return undefined;
  const val = lruCache.get(key)!;
  lruCache.delete(key);
  lruCache.set(key, val);
  return val;
}

function lruSet(key: string, val: string): void {
  if (lruCache.has(key)) {
    lruCache.delete(key);
  } else if (lruCache.size >= MAX_LRU_ITEMS) {
    const oldestKey = lruCache.keys().next().value;
    if (oldestKey !== undefined) lruCache.delete(oldestKey);
  }
  lruCache.set(key, val);
}

function lruDelete(key: string): void {
  lruCache.delete(key);
}

function openMediaDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    if (!hasIndexedDB()) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        if (dbPromise === opening) dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
  dbPromise = opening;
  // A rejected open (including synchronous failure) must not poison future retries.
  void opening.catch(() => {
    if (dbPromise === opening) dbPromise = null;
  });
  return opening;
}

/**
 * Check if a given string is an IndexedDB media reference
 */
export function isIdbMediaRef(val?: string | null): boolean {
  return typeof val === 'string' && val.startsWith('idb://');
}

/**
 * Save to IndexedDB, returning a reference only after the transaction commits.
 * Reject on storage failure; a memory-only value is not a durable reference.
 */
export async function saveMediaImage(dataUrl: string, existingId?: string): Promise<string> {
  if (!dataUrl) return '';
  if (isIdbMediaRef(dataUrl)) {
    const stored = await getMediaImage(dataUrl, { requireStored: true });
    if (!stored || isIdbMediaRef(stored)) throw new Error('Could not resolve an IndexedDB media reference.');
    return dataUrl;
  }

  const id = existingId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
  if (!hasIndexedDB()) throw new Error('IndexedDB not supported');
  const db = await openMediaDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).put({ id, data: dataUrl });
    req.onerror = () => reject(req.error ?? new Error('IndexedDB media write failed'));
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB media transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB media transaction aborted'));
    tx.oncomplete = () => resolve();
  });
  lruSet(id, dataUrl);
  return `idb://${id}`;
}

/**
 * Retrieve an image from memory LRU cache or IndexedDB
 */
export async function getMediaImage(ref: string, options?: { requireStored?: boolean }): Promise<string | null> {
  if (!ref) return null;
  if (!isIdbMediaRef(ref)) {
    return ref;
  }

  const id = ref.replace('idb://', '');
  if (!options?.requireStored) {
    const cached = lruGet(id);
    if (cached) return cached;
  }

  if (hasIndexedDB()) {
    try {
      const db = await openMediaDB();
      return await new Promise<string | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => {
          if (req.result && req.result.data) {
            lruSet(id, req.result.data);
            resolve(req.result.data);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Delete an image by reference
 */
export async function deleteMediaImage(ref: string): Promise<void> {
  if (!isIdbMediaRef(ref)) return;
  const id = ref.replace('idb://', '');
  lruDelete(id);

  if (hasIndexedDB()) {
    try {
      const db = await openMediaDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // ignore
    }
  }
}

function isLargeBase64Image(val?: string | null): val is string {
  return Boolean(
    val &&
      typeof val === 'string' &&
      val.startsWith('data:image/') &&
      !val.startsWith('data:image/svg+xml') &&
      val.length > 5000
  );
}

/**
 * Migrate large inline media only if each source still matches after the write.
 * IndexedDB and Zustand are separate stores; interrupted or skipped writes may
 * leave unreferenced media for the existing orphan-pruning routine.
 */
export async function migrateBase64ImagesToIdb(): Promise<{ migratedCount: number; savedBytes: number }> {
  let migratedCount = 0;
  let savedBytes = 0;

  try {
    const games = useGameStore.getState().games.map(({ id, image, thumbnail }) => ({ id, image, thumbnail }));
    for (const g of games) {
      if (isLargeBase64Image(g.image)) {
        const ref = await saveMediaImage(g.image);
        const current = useGameStore.getState().games.find((game) => game.id === g.id);
        const updates: { image?: string; thumbnail?: string } = {};
        if (current?.image === g.image) updates.image = ref;
        if (g.thumbnail === g.image && current?.thumbnail === g.thumbnail) updates.thumbnail = ref;
        if (updates.image || updates.thumbnail) {
          useGameStore.getState().updateGame(g.id, updates);
          migratedCount++;
          savedBytes += (g.image.length - ref.length) * Object.keys(updates).length;
        }
      }
      if (g.thumbnail !== g.image && isLargeBase64Image(g.thumbnail)) {
        const ref = await saveMediaImage(g.thumbnail);
        const current = useGameStore.getState().games.find((game) => game.id === g.id);
        if (current?.thumbnail === g.thumbnail) {
          useGameStore.getState().updateGame(g.id, { thumbnail: ref });
          migratedCount++;
          savedBytes += g.thumbnail.length - ref.length;
        }
      }
    }

    const players = usePlayerStore.getState().players.map(({ id, avatar }) => ({ id, avatar }));
    for (const p of players) {
      if (isLargeBase64Image(p.avatar)) {
        const ref = await saveMediaImage(p.avatar);
        const current = usePlayerStore.getState().players.find((player) => player.id === p.id);
        if (current?.avatar === p.avatar) {
          usePlayerStore.getState().updatePlayer(p.id, { avatar: ref });
          migratedCount++;
          savedBytes += p.avatar.length - ref.length;
        }
      }
    }

    const sessions = useSessionStore.getState().sessions.map(({ id, photos }) => ({ id, photos: photos?.slice() }));
    for (const s of sessions) {
      if (!s.photos?.some(isLargeBase64Image)) continue;
      const newPhotos: string[] = [];
      let sessionCount = 0;
      let sessionBytes = 0;
      for (const photo of s.photos) {
        if (isLargeBase64Image(photo)) {
          const ref = await saveMediaImage(photo);
          newPhotos.push(ref);
          sessionCount++;
          sessionBytes += photo.length - ref.length;
        } else {
          newPhotos.push(photo);
        }
      }
      const currentPhotos = useSessionStore.getState().sessions.find((session) => session.id === s.id)?.photos;
      if (currentPhotos && currentPhotos.length === s.photos.length && currentPhotos.every((photo, i) => photo === s.photos![i])) {
        useSessionStore.getState().updateSession(s.id, { photos: newPhotos });
        migratedCount += sessionCount;
        savedBytes += sessionBytes;
      }
    }
  } catch {
    console.warn('[mediaStorage] Migration stopped because an IndexedDB media write failed.');
  }

  return { migratedCount, savedBytes };
}

function normalizeMediaKey(val: string): string {
  return val.startsWith('idb://') ? val.slice('idb://'.length) : val;
}

function extractIdbRefsFromUnknown(value: unknown, out: Set<string>): void {
  if (!value) return;
  if (typeof value === 'string') {
    if (isIdbMediaRef(value)) {
      out.add(normalizeMediaKey(value));
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      extractIdbRefsFromUnknown(item, out);
    }
    return;
  }
  if (typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) {
      extractIdbRefsFromUnknown(v, out);
    }
  }
}

/**
 * Collects every active `idb://` key referenced across games, players, sessions, AND localStorage session drafts.
 */
export function collectReferencedMediaKeys(): Set<string> {
  const keys = new Set<string>();

  const games = useGameStore.getState().games;
  for (const g of games) {
    if (isIdbMediaRef(g.image)) keys.add(normalizeMediaKey(g.image!));
    if (isIdbMediaRef(g.thumbnail)) keys.add(normalizeMediaKey(g.thumbnail!));
  }

  const players = usePlayerStore.getState().players;
  for (const p of players) {
    if (isIdbMediaRef(p.avatar)) keys.add(normalizeMediaKey(p.avatar!));
  }

  const sessions = useSessionStore.getState().sessions;
  for (const s of sessions) {
    if (isIdbMediaRef(s.gameThumbnail)) keys.add(normalizeMediaKey(s.gameThumbnail!));
    if (s.photos) {
      for (const photo of s.photos) {
        if (isIdbMediaRef(photo)) keys.add(normalizeMediaKey(photo));
      }
    }
  }

  // Scan ALL localStorage draft session entries so ongoing session photos are never pruned
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const storageKey = window.localStorage.key(i);
        if (!storageKey || !storageKey.toLowerCase().includes('draft')) continue;
        const raw = window.localStorage.getItem(storageKey);
        if (!raw || !raw.includes('idb://')) continue;
        try {
          extractIdbRefsFromUnknown(JSON.parse(raw), keys);
        } catch {
          const matches = raw.match(/idb:\/\/[a-zA-Z0-9_-]+/g);
          matches?.forEach((m) => keys.add(normalizeMediaKey(m)));
        }
      }
    } catch {
      // Ignore storage access errors
    }
  }

  return keys;
}

/**
 * Safely deletes orphaned IndexedDB media items not present in `referencedKeys`.
 * Always pass keys collected from games, players, sessions, and active drafts (or omit to auto-collect all 4).
 */
export async function pruneOrphanMedia(
  referencedKeys?: Iterable<string>
): Promise<{ prunedCount: number; keptCount: number }> {
  const keepSet = new Set<string>();
  const sourceKeys = referencedKeys ?? collectReferencedMediaKeys();
  for (const key of sourceKeys) {
    if (key) keepSet.add(normalizeMediaKey(key));
  }

  let prunedCount = 0;
  let keptCount = 0;

  if (hasIndexedDB()) {
    try {
      const db = await openMediaDB();
      const allKeys = await new Promise<string[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAllKeys();
        req.onsuccess = () => resolve((req.result || []).map(String));
        req.onerror = () => reject(req.error);
      });

      const orphanKeys: string[] = [];
      for (const key of allKeys) {
        if (keepSet.has(key)) {
          keptCount++;
        } else {
          orphanKeys.push(key);
        }
      }

      if (orphanKeys.length > 0) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          for (const key of orphanKeys) {
            store.delete(key);
            lruDelete(key);
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        prunedCount = orphanKeys.length;
      }
    } catch (err) {
      console.warn('[mediaStorage] Failed to prune IndexedDB orphan media:', err);
    }
  }

  return { prunedCount, keptCount };
}

