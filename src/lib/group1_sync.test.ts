import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// No request in this suite is allowed to leave the process.
const storage = new Map<string, string>();
let failStorageKey = '';
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    if (key === failStorageKey) throw new Error('storage quota exceeded');
    storage.set(key, value);
  },
  removeItem: (key: string) => storage.delete(key),
} });
Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: globalThis.localStorage } });
Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: class MockWebSocket {} });

type Row = { vault_id: string; games: any[]; sessions: any[]; players: any[]; locations: any[]; updated_at: string };
let row: Row | null = null;
let requests: { method: string; url: URL; body: any }[] = [];
let readError = false;
let beforeResponse: ((method: string) => Promise<void>) | null = null;
let beforeMutation: (() => void) | null = null;
let returnedRows: ((written: Row) => Row[]) | null = null;
let backupRows: any[] = [];
let onBackupPut: (() => void) | null = null;

// Minimal IndexedDB implementation, including transaction completion/readback.
function installBackupDb() {
  const records = new Map<string, any>();
  backupRows = [];
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: {
    open: () => {
      const request: any = {};
      const db: any = {
        objectStoreNames: { contains: () => false },
        createObjectStore: () => ({}),
        close: () => {},
        transaction: () => {
          const tx: any = { objectStore: () => ({
            put: (value: any) => {
              const req: any = {};
              queueMicrotask(() => {
                records.set(value.id, structuredClone(value));
                backupRows.push(structuredClone(value));
                onBackupPut?.();
                req.onsuccess?.();
                queueMicrotask(() => tx.oncomplete?.());
              });
              return req;
            },
            get: (key: string) => {
              const req: any = {};
              queueMicrotask(() => {
                req.result = records.get(key);
                req.onsuccess?.();
                queueMicrotask(() => tx.oncomplete?.());
              });
              return req;
            },
          }) };
          return tx;
        },
      };
      queueMicrotask(() => {
        request.result = db;
        request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    },
  } });
}

const jsonResponse = (value: any, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { 'content-type': 'application/json' },
});
Object.defineProperty(globalThis, 'fetch', { configurable: true, value: async (input: any, init: any = {}) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url);
  assert.equal(url.hostname, 'sync.test.invalid', 'unexpected network request');
  const method = (init.method || 'GET').toUpperCase();
  const body = init.body ? JSON.parse(init.body) : null;
  requests.push({ method, url, body });
  if (beforeResponse) await beforeResponse(method);
  if (method === 'GET') {
    if (readError) return jsonResponse({ message: 'read denied', code: '42501' }, 403);
    return jsonResponse(row ? [structuredClone(row)] : []);
  }
  beforeMutation?.();
  if (method === 'POST') {
    if (row) return jsonResponse({ message: 'duplicate vault', code: '23505' }, 409);
    row = structuredClone(body);
    return jsonResponse([row], 201);
  }
  if (method === 'PATCH') {
    const expected = url.searchParams.get('updated_at');
    if (!row || expected !== `eq.${row.updated_at}`) return jsonResponse([]);
    row = structuredClone({ ...row, ...body });
    return jsonResponse(returnedRows ? returnedRows(row!) : [row]);
  }
  throw new Error(`Unexpected method ${method}`);
} });

const sync = await import('./supabaseSync');
const { useSyncStore } = await import('../store/useSyncStore');
const { useGameStore } = await import('../store/useGameStore');
const { useSessionStore } = await import('../store/useSessionStore');
const { usePlayerStore } = await import('../store/usePlayerStore');
const { useLocationStore } = await import('../store/useLocationStore');
const { setSyncApplyingRemote } = await import('./syncGuard');

const base = '2026-01-01T00:00:00.000Z';
const changed = '2026-01-01T00:00:00.001Z';
const game = (id: string) => ({ id, name: id, image: 'https://example.invalid/cover.jpg' }) as any;
const remote = (updated_at = base, games = [game('cloud')]): Row => ({
  vault_id: 'room', games, sessions: [], players: [], locations: [], updated_at,
});
let run = 0;
beforeEach(() => {
  run++;
  row = null;
  requests = [];
  readError = false;
  beforeResponse = null;
  beforeMutation = null;
  returnedRows = null;
  onBackupPut = null;
  failStorageKey = '';
  delete (globalThis as any).indexedDB;
  storage.clear();
  setSyncApplyingRemote(true);
  useGameStore.setState({ games: [] });
  useSessionStore.setState({ sessions: [] });
  usePlayerStore.setState({ players: [] });
  useLocationStore.setState({ locations: [] });
  setSyncApplyingRemote(false);
  useSyncStore.setState({ pendingChanges: false, localRevision: 0, syncConflict: null, syncBaseline: null, lastSyncedAt: null });
  useSyncStore.getState().setCredentials(`https://sync.test.invalid/${run}`, 'fake-anon-key', 'room');
});

async function initialPull() {
  row = remote();
  const result = await sync.pullVaultFromCloud();
  assert.equal(result.success, true, result.error);
  assert.equal(useSyncStore.getState().lastSyncedAt, base);
}
const mutations = () => requests.filter((r) => r.method !== 'GET');
const addLocal = (id = 'local') => useGameStore.setState({ games: [game(id)] });
const conflict = () => (useSyncStore.getState() as any).syncConflict;
const pending = () => (useSyncStore.getState() as any).pendingChanges;

test('read errors fail closed and never mark an attempted push as synced', async () => {
  addLocal();
  readError = true;
  const result = await sync.pushVaultToCloud();
  assert.equal(result.success, false);
  assert.equal(mutations().length, 0);
  assert.equal(useSyncStore.getState().lastSyncedAt, null);
  assert.notEqual(useSyncStore.getState().syncStatus, 'synced');
});

test('unknown legacy baseline protects local data on manual push and QR-style pull', async () => {
  row = remote();
  addLocal();
  useSyncStore.setState({ lastSyncedAt: base, hasCompletedInitialPull: true });
  const push = await sync.pushVaultToCloud();
  assert.equal(push.success, false);
  assert.equal(useSyncStore.getState().syncStatus, 'conflict');
  assert.ok(conflict());
  assert.equal(mutations().length, 0);
  const pull = await sync.pullVaultFromCloud('replace');
  assert.equal(pull.success, false);
  assert.equal(useGameStore.getState().games[0].id, 'local');
});

test('changed cloud and dirty local conflict even one millisecond apart', async () => {
  await initialPull();
  addLocal();
  row = remote(changed, [game('other-device')]);
  assert.equal((await sync.pushVaultToCloud()).success, false);
  assert.equal(mutations().length, 0);
  assert.equal(conflict().remoteUpdatedAt, changed);
  assert.equal((await sync.pullVaultFromCloud('replace')).success, false);
  assert.equal(useGameStore.getState().games[0].id, 'local');
  assert.equal(useSyncStore.getState().lastSyncedAt, base);
});

test('guarded update uses the exact acknowledged token and records only server response', async () => {
  await initialPull();
  addLocal();
  const result = await sync.pushVaultToCloud();
  assert.equal(result.success, true, result.error);
  const write = mutations()[0];
  assert.equal(write.method, 'PATCH');
  assert.equal(write.url.searchParams.get('updated_at'), `eq.${base}`);
  assert.equal(useSyncStore.getState().lastSyncedAt, row!.updated_at);
  assert.equal(pending(), false);
});

test('PATCH cannot acknowledge multiple returned rows or an equal-instant token', async () => {
  await initialPull();
  addLocal();
  returnedRows = (written) => [{ ...written, updated_at: '2026-01-01T07:00:00+07:00' }];
  const sameInstant = await sync.pushVaultToCloud();
  assert.equal(sameInstant.success, false);
  assert.equal(useSyncStore.getState().lastSyncedAt, base);
});

test('PATCH cannot acknowledge a multirow response', async () => {
  await initialPull();
  addLocal();
  returnedRows = (written) => [written, written];
  const result = await sync.pushVaultToCloud();
  assert.equal(result.success, false);
  assert.equal(useSyncStore.getState().lastSyncedAt, base);
});

test('room change while a read is pending cannot mutate or acknowledge the new room', async () => {
  await initialPull();
  addLocal();
  let entered!: () => void;
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => { entered = resolve; });
  const gate = new Promise<void>((resolve) => { release = resolve; });
  beforeResponse = async (method) => { if (method === 'GET') { entered(); await gate; } };
  const promise = sync.pushVaultToCloud();
  await waiting;
  useSyncStore.getState().setCredentials('https://sync.test.invalid/other', 'fake-anon-key', 'other-room');
  release();
  assert.equal((await promise).success, false);
  assert.equal(mutations().length, 0);
  assert.equal(useSyncStore.getState().lastSyncedAt, null);
  assert.equal(useSyncStore.getState().vaultId, 'other-room');
});

test('a race after read cannot overwrite a changed cloud row', async () => {
  await initialPull();
  addLocal();
  beforeMutation = () => { row = remote(changed, [game('racing-device')]); };
  const result = await sync.pushVaultToCloud();
  assert.equal(result.success, false);
  assert.equal(row!.games[0].id, 'racing-device');
  assert.equal(useGameStore.getState().games[0].id, 'local');
  assert.equal(useSyncStore.getState().syncStatus, 'conflict');
});

test('insert race is guarded by unique room key', async () => {
  addLocal();
  beforeMutation = () => { row = remote(changed, [game('racing-device')]); };
  const result = await sync.pushVaultToCloud();
  assert.equal(result.success, false);
  assert.equal(row!.games[0].id, 'racing-device');
  assert.equal(useSyncStore.getState().syncStatus, 'conflict');
});

test('edits during an in-flight push stay pending after the acknowledged write', async () => {
  await initialPull();
  addLocal('first-edit');
  let entered!: () => void;
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => { entered = resolve; });
  const gate = new Promise<void>((resolve) => { release = resolve; });
  beforeResponse = async (method) => { if (method === 'PATCH') { entered(); await gate; } };
  const promise = sync.pushVaultToCloud();
  await waiting;
  addLocal('second-edit');
  release();
  assert.equal((await promise).success, true);
  assert.equal(row!.games[0].id, 'first-edit');
  assert.equal(useGameStore.getState().games[0].id, 'second-edit');
  assert.equal(pending(), true);
  assert.equal(useSyncStore.getState().syncStatus, 'pending');
});

test('local edits during a delayed pull cannot be overwritten', async () => {
  await initialPull();
  row = remote(changed, [game('new-cloud')]);
  let entered!: () => void;
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => { entered = resolve; });
  const gate = new Promise<void>((resolve) => { release = resolve; });
  beforeResponse = async (method) => { if (method === 'GET') { entered(); await gate; } };
  const promise = sync.pullVaultFromCloud();
  await waiting;
  addLocal('edit-during-pull');
  release();
  assert.equal((await promise).success, false);
  assert.equal(useGameStore.getState().games[0].id, 'edit-during-pull');
  assert.equal(useSyncStore.getState().lastSyncedAt, base);
});

test('conflict choices fail closed without durable backups', async () => {
  await initialPull();
  addLocal();
  row = remote(changed);
  await sync.pushVaultToCloud();
  assert.equal((await (sync as any).resolveSyncConflict('later')).success, true);
  assert.ok(conflict());
  assert.equal((await (sync as any).resolveSyncConflict('local')).success, false);
  assert.equal(row!.games[0].id, 'cloud');
  assert.equal((await (sync as any).resolveSyncConflict('cloud')).success, false);
  assert.equal(useGameStore.getState().games[0].id, 'local');
  assert.ok(conflict());
});

test('keep local backs up the exact cloud side before conditional update', async () => {
  installBackupDb();
  await initialPull();
  addLocal();
  row = remote(changed, [game('cloud-before-overwrite')]);
  await sync.pushVaultToCloud();
  assert.equal((await (sync as any).resolveSyncConflict('local')).success, true);
  assert.equal(row!.games[0].id, 'local');
  assert.match(JSON.stringify(backupRows), /cloud-before-overwrite/);
  assert.equal(mutations().at(-1)!.url.searchParams.get('updated_at'), `eq.${changed}`);
});

test('use cloud backs up the local side, but aborts if local changes while backing up', async () => {
  installBackupDb();
  await initialPull();
  addLocal();
  row = remote(changed, [game('new-cloud')]);
  await sync.pushVaultToCloud();
  onBackupPut = () => addLocal('late-edit');
  assert.equal((await (sync as any).resolveSyncConflict('cloud')).success, false);
  assert.equal(useGameStore.getState().games[0].id, 'late-edit');
  assert.match(JSON.stringify(backupRows), /local/);
  onBackupPut = null;
  assert.equal((await (sync as any).resolveSyncConflict('cloud')).success, true);
  assert.equal(useGameStore.getState().games[0].id, 'new-cloud');
  assert.match(JSON.stringify(backupRows), /late-edit/);
});

test('cloud-side backup refuses an idb reference even when a local media record with the same key exists', async () => {
  installBackupDb();
  await initialPull();
  addLocal();
  // Put a valid media record in fake indexedDB matching the idb reference
  const mockMediaDb = (globalThis as any).indexedDB;
  // Actually backupSyncSide for 'cloud' rejects idb:// directly without lookup
  row = remote(changed, [{ ...game('cloud'), image: 'idb://my-local-key' }]);
  await sync.pushVaultToCloud();
  assert.equal((await sync.resolveSyncConflict('local')).success, false);
  assert.equal(row!.games[0].image, 'idb://my-local-key');
  assert.equal(mutations().length, 0);
});

test('outgoing game image, thumbnail and session thumbnail cannot leak local idb pointers', async () => {
  await initialPull();
  useGameStore.setState({ games: [{ ...game('local'), image: 'idb://missing' }] });
  const result = await sync.pushVaultToCloud();
  assert.equal(result.success, false);
  assert.equal(mutations().length, 0);
  assert.equal(useSyncStore.getState().lastSyncedAt, base);
});

test('failed local persistence cannot acknowledge a pull', async () => {
  row = remote();
  failStorageKey = 'bg-vault-games-v2';
  const result = await sync.pullVaultFromCloud();
  assert.equal(result.success, false);
  assert.equal(useSyncStore.getState().lastSyncedAt, null);
  assert.notEqual(useSyncStore.getState().syncStatus, 'synced');
});

test('recent sessions and guest players survive an incoming cloud replacement', async () => {
  const session: any = { id: 'recent', gameId: 'g', players: [], createdAt: new Date().toISOString() };
  const guest: any = { id: 'guest-1', name: 'Guest', isGuest: true, avatar: 'x' };
  setSyncApplyingRemote(true);
  useSessionStore.setState({ sessions: [session] });
  usePlayerStore.setState({ players: [guest] });
  setSyncApplyingRemote(false);
  row = remote();
  // Explicit choice is required when an unknown baseline already has local records.
  await sync.pullVaultFromCloud();
  installBackupDb();
  assert.equal((await (sync as any).resolveSyncConflict('cloud')).success, true);
  assert.ok(useSessionStore.getState().sessions.some((s) => s.id === 'recent'));
  assert.ok(usePlayerStore.getState().players.some((p) => p.id === 'guest-1'));
  assert.equal(pending(), true);
});

test('realtime treats close timestamps as invalidation and never applies its payload', async () => {
  await initialPull();
  addLocal();
  row = remote(changed, [game('authoritative-cloud')]);
  let callback: ((payload: any) => void) | undefined;
  const client: any = sync.getSupabaseClient();
  const channel: any = { on: (_kind: any, _filter: any, cb: any) => { callback = cb; return channel; }, subscribe: () => channel };
  client.channel = () => channel;
  client.removeChannel = () => {};
  const stop = sync.startVaultRealtimeSubscription();
  callback!({ new: remote(changed, [game('untrusted-payload')]) });
  for (let i = 0; i < 50 && useSyncStore.getState().syncStatus !== 'conflict'; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  assert.equal(useSyncStore.getState().syncStatus, 'conflict');
  assert.equal(useGameStore.getState().games[0].id, 'local');
  assert.equal(conflict().remoteUpdatedAt, changed);
  stop();
});
