import { getMediaImage, isIdbMediaRef } from './mediaStorage';

// Sync backups are separate from Zustand/localStorage and never include credentials.
const BACKUP_DB = 'bg-vault-sync-backups-v1';
const BACKUP_STORE = 'backups';
const MEDIA_DB = 'bg-vault-media-v1';
const MEDIA_STORE = 'images';

function id(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function openDb(name: string, store: string): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') throw new Error('IndexedDB is unavailable');
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(store)) req.result.createObjectStore(store, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Could not open IndexedDB'));
    req.onblocked = () => reject(new Error('IndexedDB is blocked'));
  });
}

async function writeAndVerify(name: string, storeName: string, value: { id: string }): Promise<void> {
  const db = await openDb(name, storeName);
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('IndexedDB write failed'));
      tx.onabort = () => reject(tx.error || new Error('IndexedDB write aborted'));
    });
    const stored = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).get(value.id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB read failed'));
      tx.onabort = () => reject(tx.error || new Error('IndexedDB read aborted'));
    });
    if (JSON.stringify(stored) !== JSON.stringify(value)) throw new Error('IndexedDB verification failed');
  } finally {
    db.close();
  }
}

async function inlineMedia(side: 'local' | 'cloud', value: unknown): Promise<unknown> {
  if (typeof value === 'string' && isIdbMediaRef(value)) {
    if (side === 'cloud') {
      throw new Error('Cloud backup refuses an idb reference');
    }
    const image = await getMediaImage(value, { requireStored: true });
    if (!image || isIdbMediaRef(image)) throw new Error('A local media file could not be backed up');
    return image;
  }
  if (Array.isArray(value)) return Promise.all(value.map((item) => inlineMedia(side, item)));
  if (value && typeof value === 'object') {
    const entries = await Promise.all(Object.entries(value).map(async ([key, item]) => [key, await inlineMedia(side, item)]));
    return Object.fromEntries(entries);
  }
  return value;
}

export async function backupSyncSide(side: 'local' | 'cloud', url: string, vaultId: string, data: unknown): Promise<void> {
  const payload = await inlineMedia(side, data);
  await writeAndVerify(BACKUP_DB, BACKUP_STORE, {
    id: id(), side, url, vaultId, createdAt: new Date().toISOString(), data: payload,
  } as { id: string });
}

// Never reuse a local media key: a pending pull must not modify an image that
// the still-live local collection refers to while asynchronous processing runs.
export async function saveIncomingSyncMedia(data: string): Promise<string> {
  const mediaId = `sync-${id()}`;
  await writeAndVerify(MEDIA_DB, MEDIA_STORE, { id: mediaId, data } as { id: string });
  return `idb://${mediaId}`;
}
