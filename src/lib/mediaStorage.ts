import { useSessionStore } from '../store/useSessionStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useGameStore } from '../store/useGameStore';

const DB_NAME = 'bg-vault-media-v1';
const STORE_NAME = 'images';
const MAX_LRU_ITEMS = 100;

const lruCache = new Map<string, string>();
const fallbackStore = new Map<string, string>();
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

  dbPromise = new Promise((resolve, reject) => {
    if (!hasIndexedDB()) {
      return reject(new Error('IndexedDB not supported'));
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
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Check if a given string is an IndexedDB media reference
 */
export function isIdbMediaRef(val?: string | null): boolean {
  return typeof val === 'string' && val.startsWith('idb://');
}

/**
 * Save an image dataUrl to IndexedDB with LRU cache, returning an idb://<id> reference
 */
export async function saveMediaImage(dataUrl: string, existingId?: string): Promise<string> {
  if (!dataUrl) return '';
  if (isIdbMediaRef(dataUrl)) return dataUrl;

  const id = existingId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
  lruSet(id, dataUrl);

  if (hasIndexedDB()) {
    try {
      const db = await openMediaDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put({ id, data: dataUrl });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('[mediaStorage] Failed to write to IndexedDB, fallback active:', err);
      fallbackStore.set(id, dataUrl);
    }
  } else {
    fallbackStore.set(id, dataUrl);
  }

  return `idb://${id}`;
}

/**
 * Retrieve an image from memory LRU cache or IndexedDB
 */
export async function getMediaImage(ref: string): Promise<string | null> {
  if (!ref) return null;
  if (!isIdbMediaRef(ref)) {
    return ref;
  }

  const id = ref.replace('idb://', '');
  const cached = lruGet(id);
  if (cached) return cached;

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
      return fallbackStore.get(id) || null;
    }
  } else {
    return fallbackStore.get(id) || null;
  }
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
  } else {
    fallbackStore.delete(id);
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
 * Scan stores (games, players, sessions) and migrate large base64 images (> 5000 chars, non-svg) to IndexedDB
 */
export async function migrateBase64ImagesToIdb(): Promise<{ migratedCount: number; savedBytes: number }> {
  let migratedCount = 0;
  let savedBytes = 0;

  try {
    // 1. Custom game cover art (image & thumbnail)
    const games = useGameStore.getState().games;
    for (const g of games) {
      let nextImage = g.image;
      let nextThumb = g.thumbnail;
      let changed = false;

      if (isLargeBase64Image(g.image)) {
        const originalLen = g.image.length;
        const ref = await saveMediaImage(g.image);
        nextImage = ref;
        if (g.thumbnail === g.image) {
          nextThumb = ref;
        }
        migratedCount++;
        savedBytes += originalLen - ref.length;
        changed = true;
      }

      if (isLargeBase64Image(nextThumb)) {
        const originalLen = nextThumb.length;
        const ref = await saveMediaImage(nextThumb);
        nextThumb = ref;
        migratedCount++;
        savedBytes += originalLen - ref.length;
        changed = true;
      }

      if (changed) {
        useGameStore.getState().updateGame(g.id, {
          image: nextImage,
          thumbnail: nextThumb,
        });
      }
    }

    // 2. Player avatars
    const players = usePlayerStore.getState().players;
    for (const p of players) {
      if (isLargeBase64Image(p.avatar)) {
        const originalLen = p.avatar.length;
        const ref = await saveMediaImage(p.avatar);
        usePlayerStore.getState().updatePlayer(p.id, { avatar: ref });
        migratedCount++;
        savedBytes += originalLen - ref.length;
      }
    }

    // 3. Session memory photos
    const sessions = useSessionStore.getState().sessions;
    for (const s of sessions) {
      if (s.photos && s.photos.length > 0) {
        let changed = false;
        const newPhotos: string[] = [];
        for (const photo of s.photos) {
          if (isLargeBase64Image(photo)) {
            const originalLen = photo.length;
            const ref = await saveMediaImage(photo);
            newPhotos.push(ref);
            migratedCount++;
            savedBytes += originalLen - ref.length;
            changed = true;
          } else {
            newPhotos.push(photo);
          }
        }
        if (changed) {
          useSessionStore.getState().updateSession(s.id, { photos: newPhotos });
        }
      }
    }
  } catch (err) {
    console.warn('[mediaStorage] Migration error:', err);
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
            fallbackStore.delete(key);
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        prunedCount = orphanKeys.length;
      }
    } catch (err) {
      console.warn('[mediaStorage] Failed to prune IndexedDB orphan media:', err);
    }
  } else {
    for (const key of Array.from(fallbackStore.keys())) {
      if (keepSet.has(key)) {
        keptCount++;
      } else {
        fallbackStore.delete(key);
        lruDelete(key);
        prunedCount++;
      }
    }
  }

  return { prunedCount, keptCount };
}

