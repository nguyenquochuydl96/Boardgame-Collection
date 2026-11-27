import test from 'node:test';
import assert from 'node:assert/strict';
import { parseImportFile } from './importer';
import { exportGamesCSV, exportSessionsCSV } from './exportVault';
import { useGameStore } from '../store/useGameStore';
import { useSessionStore } from '../store/useSessionStore';
import { useSyncStore } from '../store/useSyncStore';
import type { BoardGame, PlaySession } from '../types';
import { applyValidatedRestore, assertRestorePersisted, validateRestoreData } from './restoreValidation';
import { isSyncApplyingRemote, setSyncApplyingRemote } from './syncGuard';
import { parseBGCatalogJsonObject, parseBGCatalogZip } from './importer';
import JSZip from 'jszip';

const game: BoardGame = {
  id: 'local-123', name: 'The "Great", Game', thumbnail: '', image: '',
  description: 'Description', minPlayers: 2, maxPlayers: 5, playingTime: 95,
  yearPublished: 2021, bggRating: 8.4, status: 'lent_out', purchasePrice: 1250000,
  lentToName: 'Alice, "A"', notes: 'First line\nsecond "line", done',
  tags: ['Strategy', 'Family'], addedDate: '2026-01-01T00:00:00Z',
};

async function captureDownload(run: () => void): Promise<string> {
  const oldCreate = URL.createObjectURL;
  const oldRevoke = URL.revokeObjectURL;
  const globals = globalThis as unknown as Record<string, unknown>;
  const oldDocument = globals.document;
  let blob: Blob | undefined;
  URL.createObjectURL = (value) => { blob = value as Blob; return 'blob:test'; };
  URL.revokeObjectURL = () => {};
  globals.document = {
    createElement: () => ({ click() {} }),
    body: { appendChild() {}, removeChild() {} },
  };
  try {
    run();
    assert.ok(blob, 'exporter created a download');
    return await blob.text();
  } finally {
    URL.createObjectURL = oldCreate;
    URL.revokeObjectURL = oldRevoke;
    if (oldDocument === undefined) delete globals.document;
    else globals.document = oldDocument;
  }
}

test('imports the actual games CSV export without treating the local ID as a BGG ID', async () => {
  const previous = useGameStore.getState().games;
  useGameStore.setState({ games: [game] });
  try {
    const csv = await captureDownload(exportGamesCSV);
    const [item] = parseImportFile(csv);
    assert.ok(item);
    assert.equal(item.name, game.name);
    assert.equal(item.bggId, undefined);
    assert.equal(item.playingTime, game.playingTime);
    assert.equal(item.purchasePrice, game.purchasePrice);
    assert.equal(item.notes, game.notes);
    assert.equal(item.lentToName, game.lentToName);
    assert.equal(item.status, game.status);
    assert.deepEqual(item.tags, game.tags);
  } finally {
    useGameStore.setState({ games: previous });
  }
});

test('games CSV round-trips tags containing commas and quotes', async () => {
  const previous = useGameStore.getState().games;
  const tagged = { ...game, tags: ['Strategy', '"Heavy" Euro', 'Co-op, Team'] };
  useGameStore.setState({ games: [tagged] });
  try {
    const csv = await captureDownload(exportGamesCSV);
    const [item] = parseImportFile(csv);
    assert.deepEqual(item.tags, tagged.tags);
  } finally {
    useGameStore.setState({ games: previous });
  }
});

test('recognizes an explicitly labelled BGG ID instead of an internal ID', () => {
  const [item] = parseImportFile('ID,BGG ID,Name\nlocal-123,224517,Brass');
  assert.equal(item.bggId, '224517');
});

const selected = { games: true, players: true, sessions: true, locations: true };
const player = { id: 'p1', name: 'Alice', avatar: '🎲', color: '#abc', createdAt: '2026-01-01T00:00:00Z' };
const session = { id: 's1', gameId: 'local-123', gameName: game.name, gameThumbnail: '', datePlayed: '2026-01-01T00:00:00Z', players: [{ playerId: 'p1', playerName: 'Alice', isWinner: true, score: 0 }], firstPlayerMethod: 'manual', createdAt: '2026-01-01T00:00:00Z' };
const location = { id: 'l1', name: 'Home', createdAt: '2026-01-01T00:00:00Z' };
const backup = () => ({ games: [{ ...game }], players: [{ ...player }], sessions: [{ ...session }], locations: [{ ...location }] });

test('validates an exported-shape backup and distinguishes absent from empty categories', () => {
  assert.equal(validateRestoreData(backup(), selected).ok, true);
  assert.equal(validateRestoreData({ ...backup(), locations: [] }, selected).ok, true);
  const { locations: _locations, ...withoutLocations } = backup();
  assert.equal(validateRestoreData(withoutLocations, selected).ok, false);
  assert.equal(validateRestoreData(withoutLocations, { ...selected, locations: false }).ok, true);
});

test('rejects malformed selected entities and duplicate identifiers before any mutation', () => {
  const cases: unknown[] = [
    { ...backup(), games: [{ ...game, id: 9 }] },
    { ...backup(), games: [{ ...game, minPlayers: 'two' }] },
    { ...backup(), games: [game, game] },
    { ...backup(), players: [{ ...player, avatar: { url: 'bad' } }] },
    { ...backup(), players: [{ ...player, id: '' }] },
    { ...backup(), sessions: [{ ...session, players: [{ playerId: 'p1', playerName: 'Alice', isWinner: 'yes' }] }] },
    { ...backup(), sessions: [{ ...session, photos: [123] }] },
    { ...backup(), locations: [{ ...location, name: null }] },
    { ...backup(), locations: null },
  ];
  for (const candidate of cases) {
    const writes: string[] = [];
    const writers = { games: () => writes.push('games'), players: () => writes.push('players'), sessions: () => writes.push('sessions'), locations: () => writes.push('locations') };
    const result = applyValidatedRestore(candidate, selected, true, writers);
    assert.equal(result.ok, false, JSON.stringify(candidate));
    assert.deepEqual(writes, []);
  }
});

test('ignores invalid unselected categories but rejects an empty selection', () => {
  const candidate = { ...backup(), players: [{ ...player, avatar: 42 }] };
  assert.equal(validateRestoreData(candidate, { ...selected, players: false }).ok, true);
  assert.equal(validateRestoreData(candidate, { games: false, players: false, sessions: false, locations: false }).ok, false);
});

test('applies selected empty categories and reports writer failures as possibly partial', () => {
  const writes: string[] = [];
  const failing = { games: (value: unknown[]) => { assert.deepEqual(value, []); writes.push('games'); }, players: () => { writes.push('players'); throw new Error('quota'); }, sessions: () => writes.push('sessions'), locations: () => writes.push('locations') };
  const result = applyValidatedRestore({ ...backup(), games: [] }, selected, true, failing);
  assert.equal(result.ok, false);
  assert.deepEqual(writes, ['games', 'players']);
  assert.match(result.errors.join(' '), /partial|partially/i);
  assert.equal(isSyncApplyingRemote(), false);
});

test('marks a guarded successful or partially failed restore as a local sync change', () => {
  const selection = { games: true, players: false, sessions: false, locations: false };
  const previous = useGameStore.getState().games;
  const state = useSyncStore.getState();
  const beforeRevision = state.localRevision;
  try {
    const writers = {
      games: (value: BoardGame[]) => useGameStore.setState({ games: value }),
      players: () => {}, sessions: () => {}, locations: () => {},
    };
    assert.equal(applyValidatedRestore(backup(), selection, true, writers).ok, true);
    assert.ok(useSyncStore.getState().localRevision > beforeRevision);
    assert.equal(useSyncStore.getState().pendingChanges, true);
    const afterSuccess = useSyncStore.getState().localRevision;
    const failing = { ...writers, games: (value: BoardGame[]) => { writers.games(value); throw new Error('quota'); } };
    assert.equal(applyValidatedRestore(backup(), selection, true, failing).ok, false);
    assert.ok(useSyncStore.getState().localRevision > afterSuccess);
  } finally {
    useGameStore.setState({ games: previous });
  }
});

test('rejects silent localStorage persistence failures by comparing the stored state', () => {
  const read = (key: string) => key === 'games-key' ? JSON.stringify({ state: { games: [game] } }) : null;
  assert.doesNotThrow(() => assertRestorePersisted(read, 'games-key', 'games', [game]));
  assert.throws(() => assertRestorePersisted(read, 'games-key', 'games', []), /persist/i);
  assert.throws(() => assertRestorePersisted(read, 'missing', 'games', [game]), /persist/i);
});

test('rejects dangling local media references before writes', () => {
  const candidate = { ...backup(), players: [{ ...player, avatar: 'idb://missing-on-this-device' }] };
  assert.equal(validateRestoreData(candidate, selected).ok, false);
});

test('does not start a restore while an existing sync guard is active', () => {
  const writes: string[] = [];
  const writers = { games: () => writes.push('games'), players: () => writes.push('players'), sessions: () => writes.push('sessions'), locations: () => writes.push('locations') };
  setSyncApplyingRemote(true);
  try {
    assert.equal(applyValidatedRestore(backup(), selected, true, writers).ok, false);
    assert.deepEqual(writes, []);
    assert.equal(isSyncApplyingRemote(), true);
  } finally {
    setSyncApplyingRemote(false);
  }
});

test('BG Catalog conversion validates input and keeps missing categories distinct', () => {
  const parsed = parseBGCatalogJsonObject({ games: [{ id: 1, name: 'Faraway', minPlayers: 2, maxPlayers: 6 }], players: [{ id: 10, name: 'Heo' }], plays: [{ id: 100, gameId: 1 }], playersPlays: [{ playId: 100, playerId: 10, score: 58 }] });
  assert.equal(validateRestoreData(parsed, { ...selected, locations: false }).ok, true);
  assert.equal(validateRestoreData(parsed, selected).ok, false);
  assert.throws(() => parseBGCatalogJsonObject({ games: [{ id: 1, name: 17 }] } as never), /invalid/i);
  assert.throws(() => parseBGCatalogJsonObject({ games: [{ id: 1 }, { id: 1 }] }), /invalid/i);
});

test('ZIP preview keeps images in memory and does not store media before confirmation', async () => {
  const zip = new JSZip();
  zip.file('BGGCatalogExport.json', JSON.stringify({ games: [], players: [{ id: 1, name: 'Alice', image: 'avatar.png' }], plays: [] }));
  zip.file('avatar.png', 'iVBORw0KGgo=', { base64: true });
  const parsed = await parseBGCatalogZip(await zip.generateAsync({ type: 'arraybuffer' }));
  assert.equal(parsed.players[0].avatar, 'data:image/png;base64,iVBORw0KGgo=');
});

test('does not mistake a session report CSV for a games import', async () => {
  const previous = useSessionStore.getState().sessions;
  const session: PlaySession = {
    id: 'session-1', gameId: game.id, gameName: game.name, gameThumbnail: '',
    datePlayed: '2026-01-01T00:00:00Z', players: [], firstPlayerMethod: 'manual',
    createdAt: '2026-01-01T00:00:00Z',
  };
  useSessionStore.setState({ sessions: [session] });
  try {
    assert.deepEqual(parseImportFile(await captureDownload(exportSessionsCSV)), []);
  } finally {
    useSessionStore.setState({ sessions: previous });
  }
});

test('session CSV exports co-op team outcome and team score explicitly', async () => {
  const previousGames = useGameStore.getState().games;
  const previousSessions = useSessionStore.getState().sessions;
  const coopGame: BoardGame = { ...game, id: 'g-coop-export', name: 'Spirit Island', scoringMode: 'coop' };
  const base = {
    gameId: coopGame.id,
    gameName: coopGame.name,
    gameThumbnail: '',
    firstPlayerMethod: 'manual' as const,
    players: [
      { playerId: 'p1', playerName: 'Alice', isWinner: true },
      { playerId: 'p2', playerName: 'Bob', isWinner: true },
    ],
    createdAt: '2026-02-01T00:00:00Z',
  };
  useGameStore.setState({ games: [coopGame] });
  useSessionStore.setState({
    sessions: [
      { ...base, id: 'coop-won', datePlayed: '2026-02-01T00:00:00Z', scoringMode: 'coop', coopOutcome: 'won', teamScore: 182 },
      { ...base, id: 'coop-lost', datePlayed: '2026-02-02T00:00:00Z', scoringMode: 'coop', coopOutcome: 'lost', teamScore: 0,
        players: base.players.map((player) => ({ ...player, isWinner: false })) },
    ],
  });
  try {
    const csv = await captureDownload(exportSessionsCSV);
    assert.match(csv, /Winner \/ Team Result/);
    assert.match(csv, /Players & Scores \/ Team Score/);
    assert.match(csv, /Team Won/);
    assert.match(csv, /Team Lost/);
    assert.match(csv, /Team Score: 182/);
    assert.match(csv, /Team Score: 0/);
  } finally {
    useGameStore.setState({ games: previousGames });
    useSessionStore.setState({ sessions: previousSessions });
  }
});

test('CSV and simple JSON import ignore non-numeric strings instead of producing NaN', () => {
  const [csvItem] = parseImportFile(
    'Name,Year,Min Players,Max Players,Playtime (min),BGG Rating,Purchase Price (VND)\nBrass,TBD,N/A,-,unknown,N/A,Free'
  );
  assert.ok(csvItem);
  assert.equal(csvItem.yearPublished, undefined);
  assert.equal(csvItem.minPlayers, 1);
  assert.equal(csvItem.maxPlayers, 4);
  assert.equal(csvItem.playingTime, 60);
  assert.equal(csvItem.bggRating, undefined);
  assert.equal(csvItem.purchasePrice, undefined);

  const [jsonItem] = parseImportFile(
    JSON.stringify([{ name: 'Brass', year: 'N/A', minPlayers: 'bad', bggRating: 'none', purchasePrice: 'free' }])
  );
  assert.ok(jsonItem);
  assert.equal(jsonItem.yearPublished, undefined);
  assert.equal(jsonItem.minPlayers, 1);
  assert.equal(jsonItem.bggRating, undefined);
  assert.equal(jsonItem.purchasePrice, undefined);
});
