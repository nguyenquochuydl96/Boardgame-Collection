import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getSyncStatusView, runConflictDecision, nextConflictPresentation } from './syncStatus';
import { SyncConflictContent } from './SyncConflictModal';

test('status is truthful for disabled, idle, pending, offline, conflict, error and synced', () => {
  const view = (status: string, isEnabled = true, lastSyncedAt: string | null = null, hasConflict = false) =>
    getSyncStatusView({ isEnabled, status, lastSyncedAt, hasConflict }).label;
  assert.equal(view('disabled', false), 'Cloud Off');
  assert.equal(view('idle'), 'Awaiting Sync');
  assert.equal(view('syncing'), 'Syncing');
  assert.equal(view('pending'), 'Pending');
  assert.equal(view('offline'), 'Offline');
  assert.equal(view('conflict'), 'Conflict');
  assert.equal(view('error'), 'Sync Error');
  assert.equal(view('synced'), 'Awaiting Sync');
  assert.equal(view('synced', true, '2026-01-01T00:00:00Z'), 'Synced');
  assert.equal(view('synced', true, '2026-01-01T00:00:00Z', true), 'Conflict');
  assert.equal(view('future-status'), 'Awaiting Sync');
  const base = { isEnabled: true, status: 'synced', lastSyncedAt: '2026-01-01T00:00:00Z', hasCompletedInitialPull: true };
  assert.equal(getSyncStatusView({ ...base, hasKnownBaseline: false }).label, 'Awaiting Sync');
  assert.equal(getSyncStatusView({ ...base, hasKnownBaseline: true }).label, 'Synced');
  assert.equal(getSyncStatusView({ ...base, hasKnownBaseline: true, pendingChanges: true }).label, 'Pending');
});

test('defer hides only the current conflict until reopened; later conflicts display', () => {
  assert.equal(nextConflictPresentation(false, 'defer'), true);
  assert.equal(nextConflictPresentation(true, 'update'), true);
  assert.equal(nextConflictPresentation(true, 'reopen'), false);
  assert.equal(nextConflictPresentation(true, 'clear'), false);
  assert.equal(nextConflictPresentation(false, 'update'), false);
});

test('backup is requested before an overwrite and backend failures remain visible', async () => {
  const calls: string[] = [];
  const result = await runConflictDecision('cloud', {
    backup: async () => { calls.push('backup'); },
    resolve: async (choice) => { calls.push(choice); return { success: false, error: 'Protective backup failed' }; },
  });
  assert.deepEqual(calls, ['backup', 'cloud']);
  assert.deepEqual(result, { success: false, stage: 'resolution', error: 'Protective backup failed' });
});

test('failed JSON backup blocks overwrite until explicitly skipped', async () => {
  const calls: string[] = [];
  const deps = {
    backup: async () => { calls.push('backup'); throw new Error('Disk blocked'); },
    resolve: async (choice: 'cloud' | 'local' | 'later') => { calls.push(choice); return { success: true }; },
  };
  assert.deepEqual(await runConflictDecision('local', deps), {
    success: false, stage: 'backup', error: 'Disk blocked',
  });
  assert.deepEqual(calls, ['backup']);
  assert.deepEqual(await runConflictDecision('local', deps, { skipBackup: true }), { success: true });
  assert.deepEqual(calls, ['backup', 'local']);
});

test('decide later does not attempt backup and thrown resolution errors are surfaced', async () => {
  const calls: string[] = [];
  const result = await runConflictDecision('later', {
    backup: async () => { calls.push('backup'); },
    resolve: async (choice) => { calls.push(choice); throw new Error('Cannot defer'); },
  });
  assert.deepEqual(calls, ['later']);
  assert.deepEqual(result, { success: false, stage: 'resolution', error: 'Cannot defer' });
});

const conflict = {
  reason: 'Both devices changed',
  remoteUpdatedAt: '2026-01-01T00:00:00Z',
  remoteCounts: { games: 12, sessions: 3, players: 2, locations: 1 },
};
const localCounts = { games: 1024, sessions: 4, players: 5, locations: 6 };
const noop = () => {};

test('conflict content presents both counts and three clear choices', () => {
  const html = renderToStaticMarkup(<SyncConflictContent conflict={conflict} localCounts={localCounts}
    confirmation={null} busy={false} error={null} backupFailed={false} onChoose={noop} onConfirm={noop} onBack={noop} />);
  assert.match(html, /Both devices changed/);
  assert.match(html, /1,024/);
  assert.match(html, /Cloud collection/);
  assert.match(html, /Use Cloud/);
  assert.match(html, /Keep Local/);
  assert.match(html, /Decide Later/);
  assert.doesNotMatch(html, /Confirm Use Cloud/);
});

test('each overwrite needs explicit confirmation and failure exposes an alert', () => {
  for (const choice of ['cloud', 'local'] as const) {
    const html = renderToStaticMarkup(<SyncConflictContent conflict={conflict} localCounts={localCounts}
      confirmation={choice} busy={false} error="Backup blocked" backupFailed onChoose={noop} onConfirm={noop} onBack={noop} />);
    assert.match(html, /role="alert"/);
    assert.match(html, /Backup blocked/);
    assert.match(html, choice === 'cloud' ? /Confirm Use Cloud/ : /Confirm Keep Local/);
    assert.match(html, /without JSON backup/i);
    assert.match(html, /replac/i);
  }
});

test('remote counts are not invented when unavailable', () => {
  const html = renderToStaticMarkup(<SyncConflictContent conflict={{ reason: 'Unknown base', remoteUpdatedAt: null }}
    localCounts={localCounts} confirmation={null} busy={false} error={null} backupFailed={false}
    onChoose={noop} onConfirm={noop} onBack={noop} />);
  assert.match(html, /Cloud counts unavailable/);
});
