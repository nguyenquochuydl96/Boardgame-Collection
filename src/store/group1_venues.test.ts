import test from 'node:test';
import assert from 'node:assert/strict';
import type { GameLocation, PlaySession } from '../types';
import { normalizeLocationKey } from '../lib/utils';

// Install isolated storage before importing the persisted store. No browser or cloud is used.
const memory = new Map<string, string>();
const storage: Storage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => { memory.set(key, String(value)); },
  removeItem: (key) => { memory.delete(key); },
  clear: () => { memory.clear(); },
  key: (index) => Array.from(memory.keys())[index] ?? null,
  get length() { return memory.size; },
};
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });

const storageKey = 'boardgame_locations_v2';
const date = '2025-03-01T10:00:00.000Z';
const formerSampleNames = [
  'Huy’s Game Room, District 3',
  'The Boardgame Loft Cafe',
  'Minh Quân’s Apartment',
  'Linh’s Studio',
  'Nhà Huy (Quận 3)',
  'The Boardgame Cafe',
  'Nhà Lộc',
  'Quán Cafe / Trà Sữa',
  'Văn Phòng Công Ty',
  'Huy’s House (District 3)',
  'Loc’s House',
  'Board Game Cafe / Tea Lounge',
  'Company Office',
];
const formerlyFilteredPrefixes = [
  'loc-huy', 'loc-boardgame', 'loc-quan', 'loc-linh', 'loc-loc', 'loc-cafe', 'loc-office',
];
const fixtures: GameLocation[] = [
  ...formerSampleNames.map((name, index) => ({
    id: `real-name-${index}`,
    name,
    address: `Address for ${name}`,
    notes: `Notes for ${name}`,
    isDefault: index === 0,
    createdAt: date,
  })),
  ...formerlyFilteredPrefixes.map((prefix, index) => ({
    id: `${prefix}-real-venue`,
    name: `Independent venue ${index}`,
    address: `Independent address ${index}`,
    notes: `Independent notes ${index}`,
    isDefault: false,
    createdAt: date,
  })),
];

function writePersisted(locations: GameLocation[], hasSyncedHistory = true) {
  storage.setItem(storageKey, JSON.stringify({ state: { locations, hasSyncedHistory }, version: 0 }));
}

// Exercise automatic hydration, not just the explicitly invoked rehydrate method.
writePersisted(fixtures);
const { useLocationStore } = await import('./useLocationStore');
const { useSessionStore } = await import('./useSessionStore');
const { useSyncStore } = await import('./useSyncStore');
await import('../lib/syncGuard');

function resetStore(locations: GameLocation[] = [], hasSyncedHistory = false) {
  storage.clear();
  useLocationStore.setState({ locations, hasSyncedHistory });
}

function resetRenameState(locations: GameLocation[], sessions: PlaySession[]) {
  resetStore(locations);
  useSessionStore.setState({ sessions });
  useSyncStore.setState({
    isEnabled: true,
    pendingChanges: false,
    localRevision: 0,
    syncConflict: null,
    syncStatus: 'idle',
  });
}

function session(location: string, id: string): PlaySession {
  return {
    id,
    gameId: 'game-1',
    gameName: 'Test Game',
    gameThumbnail: '',
    datePlayed: date,
    location,
    players: [],
    firstPlayerMethod: 'manual',
    createdAt: date,
  };
}

function assertUniqueNames(locations: GameLocation[]) {
  const keys = locations.map((location) => normalizeLocationKey(location.name));
  assert.equal(new Set(keys).size, keys.length, 'locations must be unique by normalized name');
}

test('automatic hydration preserves real venues regardless of former sample name or ID prefix', () => {
  const state = useLocationStore.getState();
  assert.deepEqual(state.locations, fixtures);
  assert.equal(state.hasSyncedHistory, true);
  assertUniqueNames(state.locations);
});

test('explicit rehydration preserves venue metadata on the next persisted write', async () => {
  resetStore();
  writePersisted(fixtures);
  await useLocationStore.persist.rehydrate();
  assert.deepEqual(useLocationStore.getState().locations, fixtures);

  useLocationStore.getState().setDefaultLocation(fixtures[0].id);
  const saved = JSON.parse(storage.getItem(storageKey)!) as {
    state: { locations: GameLocation[]; hasSyncedHistory: boolean };
  };
  assert.deepEqual(saved.state.locations, fixtures);
  assert.equal(saved.state.hasSyncedHistory, true);
  await useLocationStore.persist.rehydrate();
  assert.deepEqual(useLocationStore.getState().locations, fixtures);
});

test('hydration supplies a default without deleting a real location', async () => {
  const venue: GameLocation = {
    id: 'loc-office-real', name: 'Company Office', address: 'HQ', notes: 'Saved', createdAt: date,
  };
  resetStore();
  writePersisted([venue], false);
  await useLocationStore.persist.rehydrate();
  assert.deepEqual(useLocationStore.getState().locations, [{ ...venue, isDefault: true }]);
  assert.equal(useLocationStore.getState().hasSyncedHistory, false);
});

test('bulk append and replace retain formerly filtered names, IDs, and metadata', () => {
  const existing: GameLocation = {
    id: 'existing-1', name: 'Existing Venue', address: 'Old address', notes: 'Old notes',
    isDefault: true, createdAt: date,
  };
  resetStore([existing]);
  useLocationStore.getState().bulkAddLocations(fixtures);
  const appended = useLocationStore.getState().locations;
  assert.deepEqual(appended[0], existing);
  // The existing default remains the only default when appending.
  assert.deepEqual(appended.slice(1), fixtures.map((venue) => ({ ...venue, isDefault: false })));
  assertUniqueNames(appended);

  useLocationStore.getState().bulkAddLocations(fixtures, true);
  assert.deepEqual(useLocationStore.getState().locations, fixtures);
  assert.equal(useLocationStore.getState().hasSyncedHistory, true);
  assertUniqueNames(useLocationStore.getState().locations);
});

test('bulk-imported venues survive history reconciliation, persisted storage, and rehydration', async () => {
  resetStore();
  useLocationStore.getState().bulkAddLocations(fixtures, true);
  const sessions = [session(' COMPANY\u200B   OFFICE ', 's1'), session('Nhà Lộc', 's2')];
  useLocationStore.getState().syncHistoricalLocations(sessions, true);
  assert.deepEqual(useLocationStore.getState().locations, fixtures);
  const persisted = JSON.parse(storage.getItem(storageKey)!) as { state: { locations: GameLocation[] } };
  assert.deepEqual(persisted.state.locations, fixtures);
  await useLocationStore.persist.rehydrate();
  assert.deepEqual(useLocationStore.getState().locations, fixtures);
  assertUniqueNames(useLocationStore.getState().locations);
});

test('hydration deduplicates Unicode-equivalent names and combines complementary metadata', async () => {
  const addressRecord: GameLocation = {
    id: 'loc-cafe-real', name: 'Quán Trà – Sữa', address: '123 Real Street',
    createdAt: date,
  };
  const notesRecord: GameLocation = {
    id: 'other-id', name: '  QUÁN   TRÀ - SỮA\u200B ', notes: 'A real venue',
    isDefault: true, createdAt: '2026-01-01T00:00:00.000Z',
  };
  resetStore();
  writePersisted([addressRecord, notesRecord]);
  await useLocationStore.persist.rehydrate();
  const locations = useLocationStore.getState().locations;
  assert.equal(locations.length, 1);
  assert.equal(normalizeLocationKey(locations[0].name), normalizeLocationKey(notesRecord.name));
  assert.equal(locations[0].id, addressRecord.id);
  assert.equal(locations[0].createdAt, addressRecord.createdAt);
  assert.equal(locations[0].address, addressRecord.address);
  assert.equal(locations[0].notes, notesRecord.notes);
  assert.equal(locations[0].isDefault, true);
  assertUniqueNames(locations);
});

test('bulk deduplicates normalized-name matches, preserving complementary metadata and a single default', () => {
  const existing: GameLocation = {
    id: 'existing-company', name: 'Company Office', address: 'Headquarters',
    isDefault: true, createdAt: date,
  };
  const incoming: GameLocation = {
    id: 'loc-office-other', name: '  COMPANY\u200B   OFFICE ', notes: 'Floor 4',
    isDefault: true, createdAt: '2026-01-01T00:00:00.000Z',
  };
  resetStore([existing]);
  useLocationStore.getState().bulkAddLocations([incoming]);
  const locations = useLocationStore.getState().locations;
  assert.equal(locations.length, 1);
  assert.equal(locations[0].id, existing.id);
  assert.equal(locations[0].createdAt, existing.createdAt);
  assert.equal(locations[0].address, existing.address);
  assert.equal(locations[0].notes, incoming.notes);
  assert.equal(locations.filter((venue) => venue.isDefault).length, 1);
  assertUniqueNames(locations);
});

test('bulk replacement deduplicates Unicode variants and retains complementary metadata', () => {
  const addressRecord: GameLocation = {
    id: 'loc-office-real', name: 'Company Office', address: 'HQ', isDefault: true, createdAt: date,
  };
  const notesRecord: GameLocation = {
    id: 'notes', name: 'COMPANY\u200B  OFFICE', notes: 'Floor 4', createdAt: date,
  };
  resetStore([{
    id: 'stale', name: 'Stale Venue', isDefault: true, createdAt: date,
  }]);
  useLocationStore.getState().bulkAddLocations([addressRecord, notesRecord], true);
  const locations = useLocationStore.getState().locations;
  assert.equal(locations.length, 1);
  assert.deepEqual(locations[0], { ...addressRecord, notes: notesRecord.notes });
  assertUniqueNames(locations);
});

test('history recovers formerly filtered names and deduplicates Unicode name variants', () => {
  resetStore();
  const sessions = [
    session('Company Office', 's1'),
    session('  COMPANY\u200B   OFFICE ', 's2'),
    session('Nhà Lộc', 's3'),
    session('Nhà Lộc', 's4'),
    session('Linh’s Studio', 's5'),
    session(' ', 's6'),
  ];
  const originalSessions = structuredClone(sessions);
  useLocationStore.getState().syncHistoricalLocations(sessions);
  const state = useLocationStore.getState();
  assert.deepEqual(state.locations.map((venue) => venue.name), ['Company Office', 'Nhà Lộc', 'Linh’s Studio']);
  assert.equal(state.hasSyncedHistory, true);
  assert.ok(state.locations.every((venue) => venue.createdAt === date));
  assert.equal(state.locations.filter((venue) => venue.isDefault).length, 1);
  assertUniqueNames(state.locations);
  assert.deepEqual(sessions, originalSessions, 'historical session location strings must not be rewritten');

  const before = structuredClone(state.locations);
  useLocationStore.getState().syncHistoricalLocations(sessions, true);
  assert.deepEqual(useLocationStore.getState().locations, before, 'forced replay must not duplicate or replace venues');
});

test('history recovers every formerly filtered sample name exactly once', () => {
  resetStore();
  const sessions = formerSampleNames.map((name, index) => session(name, `sample-${index}`));
  useLocationStore.getState().syncHistoricalLocations(sessions);
  const locations = useLocationStore.getState().locations;
  assert.deepEqual(locations.map((venue) => venue.name), formerSampleNames);
  assertUniqueNames(locations);
});

test('history respects the legacy once-only flag and force adds missing names without changing existing metadata', () => {
  const existing: GameLocation = {
    id: 'loc-office-existing', name: 'Company Office', address: 'HQ', notes: 'Saved notes',
    isDefault: true, createdAt: date,
  };
  const sessions = [session(' company office ', 's1'), session('Nhà Lộc', 's2')];
  resetStore([existing], true);
  useLocationStore.getState().syncHistoricalLocations(sessions);
  assert.deepEqual(useLocationStore.getState().locations, [existing]);

  useLocationStore.getState().syncHistoricalLocations(sessions, true);
  const locations = useLocationStore.getState().locations;
  assert.equal(locations.length, 2);
  assert.deepEqual(locations[0], existing);
  assert.equal(locations[1].name, 'Nhà Lộc');
  assertUniqueNames(locations);
});

test('adding a normalized-name match reuses its ID and fills missing metadata', () => {
  const existing: GameLocation = {
    id: 'loc-office-real', name: 'Company Office', address: 'HQ',
    isDefault: true, createdAt: date,
  };
  resetStore([existing]);
  const result = useLocationStore.getState().addLocation('  COMPANY\u200B   OFFICE  ', 'Other address', 'New note');
  const locations = useLocationStore.getState().locations;
  assert.equal(result.id, existing.id);
  assert.equal(locations.length, 1);
  assert.deepEqual(locations[0], { ...existing, notes: 'New note' });
  assertUniqueNames(locations);
});

test('renaming to another normalized name is rejected without losing either venue or metadata', () => {
  const first: GameLocation = {
    id: 'first', name: 'Company Office', address: 'HQ', notes: 'Office',
    isDefault: true, createdAt: date,
  };
  const second: GameLocation = {
    id: 'second', name: 'Nhà Lộc', address: 'Home', notes: 'Personal',
    isDefault: false, createdAt: date,
  };
  resetStore([first, second]);
  useLocationStore.getState().updateLocation(second.id, {
    name: '  COMPANY\u200B  OFFICE ', address: 'Replacement', notes: 'Replacement', isDefault: true,
  });
  assert.deepEqual(useLocationStore.getState().locations, [first, second]);
  assertUniqueNames(useLocationStore.getState().locations);

  useLocationStore.getState().updateLocation(second.id, {
    name: 'Nhà  Lộc — Annex', address: 'Annex', notes: 'Open', isDefault: true,
  });
  const locations = useLocationStore.getState().locations;
  assert.equal(locations[0].isDefault, false);
  assert.deepEqual(locations[1], {
    ...second, name: 'Nhà Lộc - Annex', address: 'Annex', notes: 'Open', isDefault: true,
  });
  assertUniqueNames(locations);
});

test('renaming a venue updates every normalized historical session location and marks both stores pending for sync', () => {
  const oldVenue: GameLocation = {
    id: 'venue-1', name: 'Huy’s Game Room', address: 'District 3', isDefault: true, createdAt: date,
  };
  const sessions = [
    session('  HUY\u200B’S   GAME ROOM ', 'matching-1'),
    session('Huy’s Game Room', 'matching-2'),
    session('Another Venue', 'unrelated'),
  ];
  resetRenameState([oldVenue], sessions);

  useLocationStore.getState().updateLocation(oldVenue.id, {
    name: 'Huy’s Tabletop Loft', address: oldVenue.address, notes: undefined, isDefault: true,
  });
  const updatedCount = useSessionStore.getState().renameSessionsAtLocation(
    oldVenue.name,
    'Huy’s Tabletop Loft'
  );

  assert.equal(updatedCount, 2);
  assert.equal(useLocationStore.getState().locations[0].name, 'Huy’s Tabletop Loft');
  assert.deepEqual(
    useSessionStore.getState().sessions.map((item) => item.location),
    ['Huy’s Tabletop Loft', 'Huy’s Tabletop Loft', 'Another Venue']
  );
  assert.equal(useSyncStore.getState().pendingChanges, true);
  assert.equal(useSyncStore.getState().localRevision, 2);
});
