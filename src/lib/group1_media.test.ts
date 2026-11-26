import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { saveMediaImage, getMediaImage, migrateBase64ImagesToIdb } from './mediaStorage';
import { exportVaultJSON } from './exportVault';
import { useGameStore } from '../store/useGameStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useSessionStore } from '../store/useSessionStore';
import { useLocationStore } from '../store/useLocationStore';
import type { BoardGame, GameLocation, Player, PlaySession } from '../types';

// This mock models request success and transaction commit as separate events.
// Its record map changes only on commit, so aborted writes cannot look durable.
type Callback = (() => void) | null;
type Request = { result?: { id: string; data: string }; error: Error | null; onsuccess: Callback; onerror: Callback };
type Write = { request: Request; id: string; data: string; tx: Transaction };
type Transaction = { error: Error | null; oncomplete: Callback; onabort: Callback; onerror: Callback; objectStore: () => { put: (row: { id: string; data: string }) => Request; get: (id: string) => Request } };

function makeMockIndexedDB() {
  const records = new Map<string, string>();
  const writes: Write[] = [];
  let manual = false;
  let failOpen = false;
  const db = {
    onversionchange: null as Callback,
    close() {},
    transaction(): Transaction {
      const tx: Transaction = {
        error: null,
        oncomplete: null,
        onabort: null,
        onerror: null,
        objectStore: () => ({
          put(row) {
            const request: Request = { error: null, onsuccess: null, onerror: null };
            const write = { request, id: row.id, data: row.data, tx };
            if (manual) writes.push(write);
            else queueMicrotask(() => { request.onsuccess?.(); queueMicrotask(() => commit(write)); });
            return request;
          },
          get(id) {
            const request: Request = { error: null, onsuccess: null, onerror: null };
            queueMicrotask(() => {
              const data = records.get(id);
              if (data !== undefined) request.result = { id, data };
              request.onsuccess?.();
            });
            return request;
          },
        }),
      };
      return tx;
    },
  };
  function commit(write: Write) {
    records.set(write.id, write.data);
    write.tx.oncomplete?.();
  }
  function abort(write: Write) {
    write.tx.error = new Error('synthetic transaction abort');
    write.tx.onabort?.();
  }
  const indexedDB = {
    open() {
      const request = { result: db, error: null as Error | null, onsuccess: null as Callback, onerror: null as Callback, onupgradeneeded: null as Callback };
      queueMicrotask(() => {
        if (failOpen) { request.error = new Error('synthetic open failure'); request.onerror?.(); }
        else request.onsuccess?.();
      });
      return request;
    },
  };
  return {
    indexedDB, db, records, writes, commit, abort,
    setManual(value: boolean) { manual = value; },
    setFailOpen(value: boolean) { failOpen = value; },
  };
}

const originalWindow = (globalThis as unknown as { window?: unknown }).window;
const fake = makeMockIndexedDB();
const localStorageWrites: string[] = [];
const mockWindow: { indexedDB?: unknown; localStorage: { setItem: (key: string, value: string) => void } } = {
  indexedDB: fake.indexedDB,
  localStorage: { setItem: (key) => { localStorageWrites.push(key); } },
};
(globalThis as unknown as { window: unknown }).window = mockWindow;
after(() => {
  if (originalWindow === undefined) delete (globalThis as unknown as { window?: unknown }).window;
  else (globalThis as unknown as { window: unknown }).window = originalWindow;
});

async function nextWrite(): Promise<Write> {
  for (let i = 0; i < 30; i++) {
    const write = fake.writes.shift();
    if (write) return write;
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  throw new Error('Expected a pending IndexedDB write');
}

function game(image = '', thumbnail = image): BoardGame {
  return { id: 'game', name: 'Synthetic game', image, thumbnail, description: '', minPlayers: 1, maxPlayers: 4, playingTime: 30, yearPublished: 2020, status: 'own', addedDate: '2020-01-01' };
}
function player(avatar?: string): Player {
  return { id: 'player', name: 'Synthetic player', color: '#fff', createdAt: '2020-01-01', avatar };
}
function session(gameThumbnail = '', photos: string[] = []): PlaySession {
  return { id: 'session', gameId: 'game', gameName: 'Synthetic game', gameThumbnail, photos, datePlayed: '2020-01-01', players: [], firstPlayerMethod: 'manual', createdAt: '2020-01-01' };
}
function location(): GameLocation { return { id: 'location', name: 'Synthetic location', createdAt: '2020-01-01' }; }
function setStores(games: BoardGame[] = [], players: Player[] = [], sessions: PlaySession[] = [], locations: GameLocation[] = []) {
  useGameStore.setState({ games });
  usePlayerStore.setState({ players });
  useSessionStore.setState({ sessions });
  useLocationStore.setState({ locations });
}
const largeImage = 'data:image/png;base64,' + 'A'.repeat(5100);

test('write waits for transaction commit, and abort preserves the old durable image and cache', async () => {
  const key = 'overwrite-test';
  const oldImage = 'data:image/png;base64,OLD';
  await saveMediaImage(oldImage, key);
  fake.setManual(true);
  let settled = false;
  const result = saveMediaImage('data:image/png;base64,NEW', key).then(
    value => { settled = true; return { ok: true as const, value }; },
    error => { settled = true; return { ok: false as const, error }; },
  );
  const write = await nextWrite();
  write.request.onsuccess?.();
  await new Promise<void>((resolve) => setImmediate(resolve));
  const settledBeforeAbort = settled;
  const cachedBeforeAbort = await getMediaImage(`idb://${key}`);
  fake.abort(write);
  const outcome = await result;
  fake.setManual(false);
  assert.equal(settledBeforeAbort, false, 'request success is not transaction commit');
  assert.equal(outcome.ok, false, 'transaction abort must reject');
  assert.equal(cachedBeforeAbort, oldImage);
  assert.equal(fake.records.get(key), oldImage);
  assert.equal(await getMediaImage(`idb://${key}`), oldImage);
});

test('request errors reject without replacing the previous image', async () => {
  const key = 'request-error-test';
  const oldImage = 'data:image/png;base64,OLD_REQUEST';
  await saveMediaImage(oldImage, key);
  fake.setManual(true);
  const pending = saveMediaImage('data:image/png;base64,NEW_REQUEST', key);
  const write = await nextWrite();
  write.request.error = new Error('synthetic request failure');
  write.request.onerror?.();
  fake.abort(write);
  await assert.rejects(pending);
  fake.setManual(false);
  assert.equal(fake.records.get(key), oldImage);
  assert.equal(await getMediaImage(`idb://${key}`), oldImage);
});

test('successful write exposes reference and cache only after commit', async () => {
  fake.setManual(true);
  const key = 'commit-test';
  let settled = false;
  const pending = saveMediaImage('data:image/png;base64,COMMITTED', key).then(ref => { settled = true; return ref; });
  const write = await nextWrite();
  write.request.onsuccess?.();
  await new Promise<void>((resolve) => setImmediate(resolve));
  const early = settled;
  const before = await getMediaImage(`idb://${key}`);
  fake.commit(write);
  const ref = await pending;
  fake.setManual(false);
  assert.equal(early, false);
  assert.equal(before, null);
  assert.equal(ref, `idb://${key}`);
  assert.equal(await getMediaImage(ref), 'data:image/png;base64,COMMITTED');
});

test('unavailable IndexedDB rejects rather than manufacturing a memory-only durable reference', async () => {
  mockWindow.indexedDB = undefined;
  try {
    await assert.rejects(saveMediaImage('data:image/png;base64,UNAVAILABLE', 'unavailable-test'));
    assert.equal(await getMediaImage('idb://unavailable-test'), null);
  } finally { mockWindow.indexedDB = fake.indexedDB; }
});

test('existing references pass through only when the referenced media exists', async () => {
  fake.records.set('existing-reference', 'data:image/png;base64,EXISTING');
  assert.equal(await saveMediaImage('idb://existing-reference'), 'idb://existing-reference');
  await assert.rejects(saveMediaImage('idb://missing-existing-reference'), /IndexedDB/i);
});

test('failed database open can be retried successfully', async () => {
  fake.db.onversionchange?.();
  fake.setFailOpen(true);
  await assert.rejects(saveMediaImage('data:image/png;base64,OPENFAIL', 'open-failure-test'));
  fake.setFailOpen(false);
  const ref = await saveMediaImage('data:image/png;base64,RETRY', 'open-retry-test');
  assert.equal(ref, 'idb://open-retry-test');
  assert.equal(fake.records.get('open-retry-test'), 'data:image/png;base64,RETRY');
});

test('failed migration retains its original inline source and does not count a migration', async () => {
  setStores([game(largeImage)]);
  fake.setManual(true);
  const pending = migrateBase64ImagesToIdb();
  const write = await nextWrite();
  write.request.onsuccess?.();
  fake.abort(write);
  const result = await pending;
  fake.setManual(false);
  assert.equal(useGameStore.getState().games[0].image, largeImage);
  assert.equal(useGameStore.getState().games[0].thumbnail, largeImage);
  assert.equal(result.migratedCount, 0);
});

test('migration does not overwrite concurrent game, player, or session media edits', async () => {
  const cases = [
    {
      setup: () => setStores([game(largeImage)]),
      edit: () => useGameStore.getState().updateGame('game', { image: 'new-cover', thumbnail: 'new-thumb' }),
      check: () => { const current = useGameStore.getState().games[0]; assert.equal(current.image, 'new-cover'); assert.equal(current.thumbnail, 'new-thumb'); },
    },
    {
      setup: () => setStores([], [player(largeImage)]),
      edit: () => usePlayerStore.getState().updatePlayer('player', { avatar: 'new-avatar' }),
      check: () => assert.equal(usePlayerStore.getState().players[0].avatar, 'new-avatar'),
    },
    {
      setup: () => setStores([], [], [session('', [largeImage])]),
      edit: () => useSessionStore.getState().updateSession('session', { photos: ['new-photo'] }),
      check: () => assert.deepEqual(useSessionStore.getState().sessions[0].photos, ['new-photo']),
    },
  ];
  for (const item of cases) {
    item.setup();
    fake.setManual(true);
    const pending = migrateBase64ImagesToIdb();
    const write = await nextWrite();
    item.edit();
    write.request.onsuccess?.();
    fake.commit(write);
    const result = await pending;
    fake.setManual(false);
    item.check();
    assert.equal(result.migratedCount, 0);
  }
});

test('migration protects source values even when a caller mutates existing objects in place', async () => {
  const cases = [
    { setup: () => setStores([game(largeImage)]), edit: () => { const g = useGameStore.getState().games[0]; g.image = 'in-place-cover'; g.thumbnail = 'in-place-thumb'; }, check: () => { assert.equal(useGameStore.getState().games[0].image, 'in-place-cover'); assert.equal(useGameStore.getState().games[0].thumbnail, 'in-place-thumb'); } },
    { setup: () => setStores([], [player(largeImage)]), edit: () => { usePlayerStore.getState().players[0].avatar = 'in-place-avatar'; }, check: () => assert.equal(usePlayerStore.getState().players[0].avatar, 'in-place-avatar') },
    { setup: () => setStores([], [], [session('', [largeImage])]), edit: () => { useSessionStore.getState().sessions[0].photos![0] = 'in-place-photo'; }, check: () => assert.deepEqual(useSessionStore.getState().sessions[0].photos, ['in-place-photo']) },
  ];
  for (const item of cases) {
    item.setup();
    fake.setManual(true);
    const pending = migrateBase64ImagesToIdb();
    const write = await nextWrite();
    item.edit();
    write.request.onsuccess?.();
    fake.commit(write);
    const result = await pending;
    fake.setManual(false);
    item.check();
    assert.equal(result.migratedCount, 0);
  }
});

test('successful migration replaces shared covers, avatar, and session photos and reports applied saves', async () => {
  setStores([game(largeImage)], [player(largeImage)], [session('', [largeImage])]);
  const result = await migrateBase64ImagesToIdb();
  const migratedGame = useGameStore.getState().games[0];
  const migratedPlayer = usePlayerStore.getState().players[0];
  const migratedSession = useSessionStore.getState().sessions[0];
  assert.equal(result.migratedCount, 3);
  assert.ok(result.savedBytes > 0);
  assert.ok(migratedGame.image.startsWith('idb://'));
  assert.equal(migratedGame.thumbnail, migratedGame.image);
  assert.equal(await getMediaImage(migratedGame.image, { requireStored: true }), largeImage);
  assert.equal(await getMediaImage(migratedPlayer.avatar!, { requireStored: true }), largeImage);
  assert.equal(await getMediaImage(migratedSession.photos![0], { requireStored: true }), largeImage);
});

test('portable snapshot resolves every owned media field without mutating its input', async () => {
  const { resolvePortableVaultMedia } = await import('./portableVaultMedia');
  const refs = ['portable-game', 'portable-thumb', 'portable-avatar', 'portable-session-thumb', 'portable-photo'];
  refs.forEach((id, i) => fake.records.set(id, `data:image/png;base64,MEDIA${i}`));
  const snapshot = { games: [game('idb://portable-game', 'idb://portable-thumb')], players: [player('idb://portable-avatar')], sessions: [session('idb://portable-session-thumb', ['idb://portable-photo', 'https://example.invalid/photo.png'])], locations: [location()] };
  const before = structuredClone(snapshot);
  const result = await resolvePortableVaultMedia(snapshot);
  assert.deepEqual(snapshot, before);
  assert.equal(result.games[0].image, 'data:image/png;base64,MEDIA0');
  assert.equal(result.games[0].thumbnail, 'data:image/png;base64,MEDIA1');
  assert.equal(result.players[0].avatar, 'data:image/png;base64,MEDIA2');
  assert.equal(result.sessions[0].gameThumbnail, 'data:image/png;base64,MEDIA3');
  assert.deepEqual(result.sessions[0].photos, ['data:image/png;base64,MEDIA4', 'https://example.invalid/photo.png']);
  assert.deepEqual(result.locations, snapshot.locations);
});

test('portable output is detached from nested mutable collection data', async () => {
  const { resolvePortableVaultMedia } = await import('./portableVaultMedia');
  const gameWithTags = { ...game(), tags: ['original-tag'] };
  const sessionWithPlayers = { ...session(), players: [{ playerId: 'p', playerName: 'Synthetic', isWinner: false, scoreBreakdown: { score: 1 } }] };
  const snapshot = { games: [gameWithTags], players: [player()], sessions: [sessionWithPlayers], locations: [location()] };
  const result = await resolvePortableVaultMedia(snapshot);
  result.games[0].tags!.push('new-tag');
  result.sessions[0].players[0].scoreBreakdown!.score = 2;
  assert.deepEqual(snapshot.games[0].tags, ['original-tag']);
  assert.equal(snapshot.sessions[0].players[0].scoreBreakdown!.score, 1);
});

test('portable output preserves legacy null media and explicitly undefined optional fields', async () => {
  const { resolvePortableVaultMedia } = await import('./portableVaultMedia');
  const legacy = { ...session(), photos: null } as unknown as PlaySession;
  const p = { ...player(), bio: undefined };
  const result = await resolvePortableVaultMedia({ games: [], players: [p], sessions: [legacy], locations: [] });
  assert.equal(result.sessions[0].photos, null);
  assert.equal(Object.hasOwn(result.players[0], 'bio'), true);
  assert.equal(result.players[0].bio, undefined);
});

test('portable backup rejects stale cached data when its IndexedDB record is gone', async () => {
  const { resolvePortableVaultMedia } = await import('./portableVaultMedia');
  const ref = await saveMediaImage('data:image/png;base64,CACHED', 'stale-cache-test');
  fake.records.delete('stale-cache-test');
  assert.equal(await getMediaImage(ref), 'data:image/png;base64,CACHED');
  await assert.rejects(resolvePortableVaultMedia({ games: [game(ref)], players: [], sessions: [], locations: [] }), /IndexedDB/i);
});

test('portable snapshot rejects missing IndexedDB data in every media field', async () => {
  const { resolvePortableVaultMedia } = await import('./portableVaultMedia');
  const snapshots = [
    { games: [game('idb://missing-image', '')], players: [], sessions: [], locations: [] },
    { games: [game('', 'idb://missing-thumb')], players: [], sessions: [], locations: [] },
    { games: [], players: [player('idb://missing-avatar')], sessions: [], locations: [] },
    { games: [], players: [], sessions: [session('idb://missing-session-thumb')], locations: [] },
    { games: [], players: [], sessions: [session('', ['idb://missing-photo'])], locations: [] },
  ];
  for (const snapshot of snapshots) await assert.rejects(resolvePortableVaultMedia(snapshot), /IndexedDB/i);
});

test('JSON export downloads a fully resolved backup, rejects missing media, and does not store a heavy backup in localStorage', async () => {
  const originalDocument = (globalThis as unknown as { document?: unknown }).document;
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  let clicks = 0;
  let blob: Blob | undefined;
  URL.createObjectURL = (value) => { blob = value as Blob; return 'blob:synthetic'; };
  URL.revokeObjectURL = () => {};
  (globalThis as unknown as { document: unknown }).document = {
    createElement: () => ({ click: () => { clicks++; } }),
    body: { appendChild() {}, removeChild() {} },
  };
  try {
    setStores([game('idb://portable-game', 'idb://portable-thumb')], [player('idb://portable-avatar')], [session('idb://portable-session-thumb', ['idb://portable-photo'])], [location()]);
    const previousWrites = localStorageWrites.length;
    const payload = await exportVaultJSON();
    assert.equal(clicks, 1);
    assert.ok(blob);
    const downloaded = JSON.parse(await blob.text());
    assert.deepEqual(downloaded, payload);
    assert.equal(JSON.stringify(downloaded).includes('idb://'), false);
    assert.equal(downloaded.sessions[0].gameThumbnail, 'data:image/png;base64,MEDIA3');
    assert.equal(localStorageWrites.length, previousWrites);
    setStores([], [], [session('idb://missing-export')]);
    await assert.rejects(exportVaultJSON(), /IndexedDB/i);
    assert.equal(clicks, 1, 'an incomplete backup must not download');
  } finally {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    if (originalDocument === undefined) delete (globalThis as unknown as { document?: unknown }).document;
    else (globalThis as unknown as { document: unknown }).document = originalDocument;
  }
});
