import test from 'node:test';
import assert from 'node:assert/strict';
import type { SessionDraft } from '../types';
import {
  DRAFT_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  parseSessionDraft,
  removeDraftIfUnchanged,
  saveSessionAndCleanDraft,
  writeDraftIfSafe,
} from './draftSafety';

class MemoryStorage {
  data = new Map<string, string>();
  failWrites = false;
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error('storage full');
    this.data.set(key, value);
  }
  removeItem(key: string) { this.data.delete(key); }
}

const now = Date.parse('2026-11-26T10:00:00Z');
const draft = (gameId: string, extra: Partial<SessionDraft> = {}): SessionDraft => ({
  gameId,
  datePlayed: '2026-11-26',
  location: 'Table 1',
  durationMinutes: '60',
  elapsedSeconds: 120,
  sessionStartTime: now - 120_000,
  isTimerRunning: true,
  pausedDurationMs: 0,
  selectedPlayerIds: ['p1'],
  oneOffPlayers: [],
  firstPlayerMethod: 'manual',
  firstPlayerAnimStyle: 'card_shuffle',
  scoresByPlayerId: { p1: 17 },
  breakdownsByPlayerId: {},
  manualWinnerIds: [],
  lowScoreWins: false,
  scoringMode: 'quick',
  photos: [],
  notes: 'keep this',
  currentStep: 5,
  lastUpdated: '2026-11-26T10:00:00.000Z',
  ...extra,
});
const putDraft = (storage: MemoryStorage, value: SessionDraft) => {
  const raw = JSON.stringify(value);
  storage.setItem(DRAFT_STORAGE_KEY, raw);
  return raw;
};
const persistSessions = (storage: MemoryStorage, ids: string[]) =>
  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ state: { sessions: ids.map(id => ({ id })) }, version: 0 }));

test('all automatic flush triggers protect a pending draft of another game until a decision', () => {
  const storage = new MemoryStorage();
  const pending = putDraft(storage, draft('game-A'));
  const candidate = draft('game-B');
  for (const trigger of ['debounce', 'timer', 'visibilitychange hidden', 'pagehide', 'beforeunload']) {
    assert.deepEqual(writeDraftIfSafe(storage, candidate, pending, true), { status: 'blocked' }, trigger);
    assert.equal(storage.getItem(DRAFT_STORAGE_KEY), pending, trigger);
  }
  // A reload sees the original, including its timer, score and notes.
  assert.deepEqual(parseSessionDraft(storage.getItem(DRAFT_STORAGE_KEY), now), draft('game-A'));
});

test('resuming permits updates to that exact draft, including timer data', () => {
  const storage = new MemoryStorage();
  const pending = putDraft(storage, draft('game-A'));
  const resumed = draft('game-A', { isTimerRunning: false, pauseStartTime: now, pausedDurationMs: 3_000 });
  const result = writeDraftIfSafe(storage, resumed, pending, false);
  assert.equal(result.status, 'saved');
  assert.deepEqual(parseSessionDraft(storage.getItem(DRAFT_STORAGE_KEY), now), resumed);
});

test('discard and rematch replacement apply only to the draft actually presented', () => {
  const storage = new MemoryStorage();
  const pending = putDraft(storage, draft('game-A'));
  const unrelated = putDraft(storage, draft('game-C'));
  assert.equal(removeDraftIfUnchanged(storage, pending), false);
  assert.deepEqual(writeDraftIfSafe(storage, draft('game-B'), pending, false), { status: 'conflict' });
  assert.equal(storage.getItem(DRAFT_STORAGE_KEY), unrelated);
  assert.equal(removeDraftIfUnchanged(storage, unrelated), true);
  assert.equal(storage.getItem(DRAFT_STORAGE_KEY), null);
  assert.equal(writeDraftIfSafe(storage, draft('game-B'), null, false).status, 'saved');
});

test('a failed explicit rematch replacement leaves the original draft intact', () => {
  const storage = new MemoryStorage();
  const pending = putDraft(storage, draft('game-A'));
  storage.failWrites = true;
  assert.throws(() => writeDraftIfSafe(storage, draft('game-B'), pending, false), /storage full/);
  assert.equal(storage.getItem(DRAFT_STORAGE_KEY), pending);
  storage.failWrites = false;
  assert.equal(writeDraftIfSafe(storage, draft('game-B'), pending, false).status, 'saved');
  assert.equal(parseSessionDraft(storage.getItem(DRAFT_STORAGE_KEY), now)?.gameId, 'game-B');
});

test('a draft appearing in another tab is never overwritten by a stale wizard', () => {
  const storage = new MemoryStorage();
  const other = putDraft(storage, draft('game-C'));
  assert.deepEqual(writeDraftIfSafe(storage, draft('game-B'), null, false), { status: 'conflict' });
  assert.equal(storage.getItem(DRAFT_STORAGE_KEY), other);
});

test('legacy drafts remain resumable without age or previous-session filtering', () => {
  const legacy = JSON.stringify({ gameId: 'old-game', notes: 'old notes', currentStep: 1, elapsedSeconds: 90 });
  const parsed = parseSessionDraft(legacy, now);
  assert.ok(parsed);
  assert.equal(parsed.gameId, 'old-game');
  assert.equal(parsed.notes, 'old notes');
  assert.equal(parsed.sessionStartTime, now - 90_000);
  assert.equal(parsed.isTimerRunning, true);
  assert.deepEqual(parsed.selectedPlayerIds, []);
  assert.deepEqual(parsed.photos, []);
  assert.equal(parseSessionDraft('{bad json', now), null);
});

test('completion retains source draft when save fails or session is not durable', () => {
  const storage = new MemoryStorage();
  const original = putDraft(storage, draft('game-A'));
  assert.throws(() => saveSessionAndCleanDraft(storage, original, () => { throw new Error('save failed'); }), /save failed/);
  assert.equal(storage.getItem(DRAFT_STORAGE_KEY), original);
  const result = saveSessionAndCleanDraft(storage, original, () => ({ id: 'new-id' }));
  assert.deepEqual(result, { session: { id: 'new-id' }, durable: false, draftRemoved: false });
  assert.equal(storage.getItem(DRAFT_STORAGE_KEY), original);
  persistSessions(storage, ['different-id']);
  assert.equal(saveSessionAndCleanDraft(storage, original, () => ({ id: 'new-id' })).durable, false);
  assert.equal(storage.getItem(DRAFT_STORAGE_KEY), original);
});

test('completion deletes only its own exact snapshot, after durable save', () => {
  const storage = new MemoryStorage();
  const original = putDraft(storage, draft('game-A'));
  storage.setItem('timer-key', 'preserved');
  storage.setItem('rematch-key', 'preserved');
  const other = JSON.stringify(draft('game-C'));
  const result = saveSessionAndCleanDraft(storage, original, () => {
    persistSessions(storage, ['new-id']);
    storage.setItem(DRAFT_STORAGE_KEY, other);
    return { id: 'new-id' };
  });
  assert.deepEqual(result, { session: { id: 'new-id' }, durable: true, draftRemoved: false });
  assert.equal(storage.getItem(DRAFT_STORAGE_KEY), other);
  assert.equal(storage.getItem('timer-key'), 'preserved');
  assert.equal(storage.getItem('rematch-key'), 'preserved');
  const ownResult = saveSessionAndCleanDraft(storage, other, () => ({ id: 'new-id' }));
  assert.equal(ownResult.durable, true);
  assert.equal(ownResult.draftRemoved, true);
  assert.equal(storage.getItem(DRAFT_STORAGE_KEY), null);
});
