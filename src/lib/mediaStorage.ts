import { useSessionStore } from '../store/useSessionStore';
import { usePlayerStore } from '../store/usePlayerStore';

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

/**
 * Scan stores and migrate large base64 images (> 5000 chars, non-svg) to IndexedDB
 */
export async function migrateBase64ImagesToIdb(): Promise<{ migratedCount: number; savedBytes: number }> {
  let migratedCount = 0;
  let savedBytes = 0;

  try {
    const players = usePlayerStore.getState().players;
    for (const p of players) {
      if (
        p.avatar &&
        typeof p.avatar === 'string' &&
        p.avatar.startsWith('data:image/') &&
        !p.avatar.startsWith('data:image/svg+xml') &&
        p.avatar.length > 5000
      ) {
        const originalLen = p.avatar.length;
        const ref = await saveMediaImage(p.avatar);
        usePlayerStore.getState().updatePlayer(p.id, { avatar: ref });
        migratedCount++;
        savedBytes += (originalLen - ref.length);
      }
    }

    const sessions = useSessionStore.getState().sessions;
    for (const s of sessions) {
      if (s.photos && s.photos.length > 0) {
        let changed = false;
        const newPhotos: string[] = [];
        for (const photo of s.photos) {
          if (
            photo &&
            typeof photo === 'string' &&
            photo.startsWith('data:image/') &&
            !photo.startsWith('data:image/svg+xml') &&
            photo.length > 5000
          ) {
            const originalLen = photo.length;
            const ref = await saveMediaImage(photo);
            newPhotos.push(ref);
            migratedCount++;
            savedBytes += (originalLen - ref.length);
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
