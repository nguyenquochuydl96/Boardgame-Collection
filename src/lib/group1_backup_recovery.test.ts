import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { listRecoverableSyncBackups, downloadRecoverableSyncBackup } from './conflictBackupRecovery';
import { ConflictBackupRecovery } from '../components/sync/ConflictBackupRecovery';

// Mock IndexedDB for testing conflict backup recovery
type Callback = (() => void) | null;
type Request = { result?: any; error: Error | null; onsuccess: Callback; onerror: Callback };
type Transaction = { error: Error | null; oncomplete: Callback; onabort: Callback; onerror: Callback; objectStore: () => { getAll: () => Request; get: (id: string) => Request } };

function setupMockIndexedDB(recordsMap: Map<string, any>) {
  const db = {
    objectStoreNames: { contains: () => true },
    close() {},
    transaction(): Transaction {
      const tx: Transaction = {
        error: null,
        oncomplete: null,
        onabort: null,
        onerror: null,
        objectStore: () => ({
          getAll: () => {
            const req: Request = { error: null, onsuccess: null, onerror: null };
            queueMicrotask(() => {
              req.result = Array.from(recordsMap.values());
              req.onsuccess?.();
            });
            return req;
          },
          get: (id: string) => {
            const req: Request = { error: null, onsuccess: null, onerror: null };
            queueMicrotask(() => {
              req.result = recordsMap.get(id);
              req.onsuccess?.();
            });
            return req;
          },
        }),
      };
      return tx;
    },
  };

  const indexedDB = {
    open() {
      const req: any = { result: db, error: null, onsuccess: null, onerror: null };
      queueMicrotask(() => req.onsuccess?.());
      return req;
    },
  };

  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: indexedDB });
}

test('listRecoverableSyncBackups lists and counts local and cloud backups correctly', async () => {
  const records = new Map<string, any>();
  records.set('b1', {
    id: 'b1',
    side: 'local',
    url: 'https://test.supabase.co',
    vaultId: 'room-1',
    createdAt: '2026-01-01T10:00:00Z',
    data: {
      games: [{ id: 'g1', name: 'Game 1', minPlayers: 1, maxPlayers: 4, playingTime: 30, yearPublished: 2020, status: 'own', addedDate: '2020-01-01' }],
      players: [{ id: 'p1', name: 'Alice', color: '#fff', createdAt: '2020-01-01' }],
      sessions: [],
      locations: [],
    },
  });
  records.set('b2', {
    id: 'b2',
    side: 'cloud',
    url: 'https://test.supabase.co',
    vaultId: 'room-1',
    createdAt: '2026-01-01T11:00:00Z',
    data: {
      vault_id: 'room-1',
      updated_at: '2026-01-01T11:00:00Z',
      games: [],
      players: [],
      sessions: [{ id: 's1', gameId: 'g1', gameName: 'Game 1', gameThumbnail: '', datePlayed: '2026-01-01', players: [], firstPlayerMethod: 'manual', createdAt: '2026-01-01' }],
      locations: [{ id: 'l1', name: 'Home', createdAt: '2020-01-01' }],
    },
  });

  setupMockIndexedDB(records);

  const backups = await listRecoverableSyncBackups();
  assert.equal(backups.length, 2);
  // Sorted descending by createdAt
  assert.equal(backups[0].id, 'b2');
  assert.equal(backups[0].side, 'cloud');
  assert.equal(backups[0].counts.sessions, 1);
  assert.equal(backups[0].counts.locations, 1);
  assert.equal(backups[1].id, 'b1');
  assert.equal(backups[1].side, 'local');
  assert.equal(backups[1].counts.games, 1);
  assert.equal(backups[1].counts.players, 1);
});

test('downloadRecoverableSyncBackup converts backup to VaultBackupData JSON without credentials and handles file download trigger', async () => {
  const records = new Map<string, any>();
  records.set('b1', {
    id: 'b1',
    side: 'local',
    url: 'https://secret-api-key:secret@test.supabase.co',
    vaultId: 'room-1',
    createdAt: '2026-01-01T10:00:00Z',
    data: {
      games: [{ id: 'g1', name: 'Game 1', minPlayers: 1, maxPlayers: 4, playingTime: 30, yearPublished: 2020, status: 'own', addedDate: '2020-01-01' }],
      players: [],
      sessions: [],
      locations: [],
    },
  });

  setupMockIndexedDB(records);

  let blobChecked: Blob | undefined;
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  URL.createObjectURL = (blob) => { blobChecked = blob as Blob; return 'blob:test'; };
  URL.revokeObjectURL = () => {};

  const globals = globalThis as unknown as Record<string, unknown>;
  const originalDocument = globals.document;
  globals.document = {
    createElement: () => ({ click() {} }),
    body: { appendChild() {}, removeChild() {} },
  };

  try {
    const payload = await downloadRecoverableSyncBackup('b1');
    assert.equal(payload.app, 'BoardGameVault');
    assert.equal(payload.vaultBackup, true);
    assert.equal(payload.version, '2.0');
    assert.equal(payload.games.length, 1);
    assert.equal(payload.counts.games, 1);

    assert.ok(blobChecked);
    const jsonText = await blobChecked.text();
    assert.equal(jsonText.includes('secret-api-key'), false);
    assert.equal(jsonText.includes('https://'), false);
  } finally {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    if (originalDocument === undefined) delete globals.document;
    else globals.document = originalDocument;
  }
});

test('downloadRecoverableSyncBackup refuses backups with a missing required category', async () => {
  const records = new Map<string, any>();
  records.set('incomplete', {
    id: 'incomplete',
    side: 'local',
    url: 'https://test.supabase.co',
    vaultId: 'room-1',
    createdAt: '2026-01-01T10:00:00Z',
    data: { games: [], players: [], sessions: [] },
  });
  setupMockIndexedDB(records);

  await assert.rejects(
    downloadRecoverableSyncBackup('incomplete'),
    /required.*arrays|missing.*required/i
  );
});

test('ConflictBackupRecovery UI renders correctly with static markup', () => {
  const records = new Map<string, any>();
  records.set('b1', {
    id: 'b1',
    side: 'local',
    url: 'https://test.supabase.co',
    vaultId: 'room-1',
    createdAt: '2026-01-01T10:00:00Z',
    data: {
      games: [],
      players: [],
      sessions: [],
      locations: [],
    },
  });
  setupMockIndexedDB(records);

  const html = renderToStaticMarkup(React.createElement(ConflictBackupRecovery));
  assert.ok(html.includes('Recoverable Sync Conflict Backups'));
  assert.ok(html.includes('Refresh'));
});
