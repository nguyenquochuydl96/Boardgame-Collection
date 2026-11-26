import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveEffectiveSyncStatus } from './useOnlineStatus.ts';
import { getSyncStatusView } from '../components/sync/syncStatus.ts';

describe('useOnlineStatus & offline sync status precedence', () => {
  it('forces status to Offline when browser is offline and sync is enabled without conflict', () => {
    const effective = resolveEffectiveSyncStatus('synced', false, false);
    assert.equal(effective, 'offline');
    const view = getSyncStatusView({
      isEnabled: true,
      status: effective,
      lastSyncedAt: '2026-11-26T10:00:00Z',
      hasConflict: false,
      hasCompletedInitialPull: true,
      hasKnownBaseline: true,
      pendingChanges: false,
    });
    assert.equal(view.label, 'Offline');
    assert.equal(view.tone, 'warn');
  });

  it('preserves Conflict precedence even when browser goes offline', () => {
    const effective = resolveEffectiveSyncStatus('conflict', false, true);
    assert.equal(effective, 'conflict');
    const view = getSyncStatusView({
      isEnabled: true,
      status: effective,
      lastSyncedAt: null,
      hasConflict: true,
      hasCompletedInitialPull: true,
      hasKnownBaseline: true,
      pendingChanges: true,
    });
    assert.equal(view.label, 'Conflict');
  });

  it('keeps disabled status as Cloud Off even when browser is offline', () => {
    const effective = resolveEffectiveSyncStatus('disabled', false, false);
    assert.equal(effective, 'disabled');
    const view = getSyncStatusView({
      isEnabled: false,
      status: effective,
      lastSyncedAt: null,
    });
    assert.equal(view.label, 'Cloud Off');
  });

  it('keeps Synced when browser is online and baseline sync is complete', () => {
    const effective = resolveEffectiveSyncStatus('synced', true, false);
    assert.equal(effective, 'synced');
    const view = getSyncStatusView({
      isEnabled: true,
      status: effective,
      lastSyncedAt: '2026-11-26T10:00:00Z',
      hasConflict: false,
      hasCompletedInitialPull: true,
      hasKnownBaseline: true,
      pendingChanges: false,
    });
    assert.equal(view.label, 'Synced');
    assert.equal(view.tone, 'good');
  });
});
