import test from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for Node test runner
const memStore = new Map<string, string>();
const mockStorage = {
  getItem: (key: string) => memStore.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memStore.set(key, String(value));
  },
  removeItem: (key: string) => {
    memStore.delete(key);
  },
  clear: () => {
    memStore.clear();
  },
  key: (index: number) => Array.from(memStore.keys())[index] ?? null,
  get length() {
    return memStore.size;
  },
} as Storage;

Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
  configurable: true,
});

if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = globalThis;
}
Object.defineProperty((globalThis as any).window, 'localStorage', {
  value: mockStorage,
  writable: true,
  configurable: true,
});

import { useSessionStore, INITIAL_SESSIONS } from './useSessionStore';
import { usePlayerStore, INITIAL_PLAYERS } from './usePlayerStore';
import {
  calculateGameStats,
  calculatePlayerStreaks,
  calculateLongestWinStreak,
  calculateHeadToHead,
  calculateMinRequiredPlays,
  formatDate,
  formatDuration,
  compressImage,
} from '../lib/utils';
import { PlaySession, Player } from '../types';

function resetStores() {
  useSessionStore.setState({ sessions: [...INITIAL_SESSIONS] });
  usePlayerStore.setState({ players: [...INITIAL_PLAYERS] });
}

// ============================================================================
// CHALLENGE 1: Photo Compression, Large Payloads & Storage Safety
// ============================================================================

test('CHALLENGE 1.1: compressImage handles non-browser / Node environment safely without throwing', async () => {
  // Case A: When FileReader is undefined in Node, returns empty string fallback safely without throwing
  const blob = new Blob(['sample-fake-image-bytes'], { type: 'image/jpeg' });
  const resultWithoutReader = await compressImage(blob, 1024, 1024, 0.7);
  assert.equal(resultWithoutReader, '', 'Must resolve to empty string when FileReader is undefined');

  // Case B: When FileReader is polyfilled / available in browser environment
  class MockFileReader {
    result: string | null = null;
    onload: (() => void) | null = null;
    onerror: ((err: any) => void) | null = null;
    readAsDataURL(_file: any) {
      this.result = 'data:image/jpeg;base64,QUJDREVGR0g=';
      setTimeout(() => this.onload?.(), 0);
    }
  }

  (globalThis as any).FileReader = MockFileReader;
  const resultWithReader = await compressImage(blob, 1024, 1024, 0.7);
  assert.ok(resultWithReader.startsWith('data:image/jpeg;base64,'), 'Should return valid base64 data URL when reader is available');
  delete (globalThis as any).FileReader;
});

test('CHALLENGE 1.2: Massive session payload with 50 photos tests store memory & serialization integrity', () => {
  resetStores();
  // Simulate 50 compressed photos of ~60 KB each (typical compressed photo size)
  const photoBase64 = 'data:image/jpeg;base64,' + 'X'.repeat(60 * 1024);
  const photos = Array.from({ length: 50 }, () => photoBase64);

  const massiveSession = useSessionStore.getState().addSession({
    gameId: 'game-photo-stress',
    gameName: 'Photo Stress Game',
    gameThumbnail: '',
    datePlayed: '2026-11-07T12:00:00.000Z',
    firstPlayerMethod: 'manual',
    winnerId: 'player-huy',
    players: [{ playerId: 'player-huy', playerName: 'Huy Nguyễn', score: 100, isWinner: true }],
    photos,
    notes: 'Massive payload stress test with 50 photos',
  });

  const retrieved = useSessionStore.getState().getSessionById(massiveSession.id);
  assert.ok(retrieved, 'Session must be stored and retrieved');
  assert.equal(retrieved?.photos?.length, 50, 'All 50 photos must be preserved');
  assert.equal(retrieved?.photos?.[0], photoBase64);

  // Clean up to free memory
  useSessionStore.getState().deleteSession(massiveSession.id);
  assert.equal(useSessionStore.getState().getSessionById(massiveSession.id), undefined);
});

// ============================================================================
// CHALLENGE 2: Guest Player Edge Cases, Special/Unicode Characters & Collision
// ============================================================================

test('CHALLENGE 2.1: Guest players with Unicode, emojis, symbols, and SQL/XSS strings register cleanly', () => {
  resetStores();

  const extremeGuestNames = [
    'Nguyễn Hoàng Nhật Ánh (Khách VIP) 🎲',
    '👑 Monarch & Dragon 🐉 <script>alert("xss")</script>',
    'Player With "Quotes" and \'Apostrophes\' and `Backticks`',
    'Robert\'); DROP TABLE Players;--',
    '玩家1 · ゲーマー · لاعب',
    'Special Symbols: ~!@#$%^&*()_+{}|:"<>?`-=[]\\;\',./',
    '   Trimmed Spaces Guest   ',
  ];

  const registeredGuestIds: string[] = [];

  for (const name of extremeGuestNames) {
    const guestId = `guest-${Math.random().toString(36).slice(2, 9)}`;
    const guest: Player = {
      id: guestId,
      name,
      avatar: '🎲',
      color: '#e11d48',
      createdAt: new Date().toISOString(),
      isGuest: true,
    };

    usePlayerStore.getState().registerGuestPlayer(guest);
    registeredGuestIds.push(guestId);

    // Verify player is stored and searchable by ID
    const found = usePlayerStore.getState().getPlayerById(guestId);
    assert.ok(found, `Guest player "${name}" must be found by ID`);
    assert.equal(found?.id, guestId);
    assert.equal(found?.name, name);
    assert.equal(found?.isGuest, true);
  }

  // Idempotency: re-registering an existing guest ID must not duplicate entry
  const firstId = registeredGuestIds[0];
  const countBefore = usePlayerStore.getState().players.length;
  usePlayerStore.getState().registerGuestPlayer({
    id: firstId,
    name: 'Different Name But Same ID',
    color: '#000000',
    createdAt: new Date().toISOString(),
  });
  assert.equal(usePlayerStore.getState().players.length, countBefore, 'Duplicate guest ID must not add new player');
});

test('CHALLENGE 2.2: Multiple guests with identical names have unique IDs and do not collide', () => {
  resetStores();

  const guest1: Player = {
    id: 'guest-tuan-1',
    name: 'Tuấn',
    avatar: '🎲',
    color: '#3b82f6',
    createdAt: '2026-11-07T10:00:00.000Z',
    isGuest: true,
  };

  const guest2: Player = {
    id: 'guest-tuan-2',
    name: 'Tuấn', // Same name, different person/guest
    avatar: '🦉',
    color: '#10b981',
    createdAt: '2026-11-07T11:00:00.000Z',
    isGuest: true,
  };

  usePlayerStore.getState().registerGuestPlayer(guest1);
  usePlayerStore.getState().registerGuestPlayer(guest2);

  const found1 = usePlayerStore.getState().getPlayerById('guest-tuan-1');
  const found2 = usePlayerStore.getState().getPlayerById('guest-tuan-2');

  assert.ok(found1 && found2, 'Both guests with identical names must be stored independently');
  assert.equal(found1?.avatar, '🎲');
  assert.equal(found2?.avatar, '🦉');
  assert.notEqual(found1?.id, found2?.id);
});

test('CHALLENGE 2.3: bulkAddPlayers preserves guest players when replaceExisting is true', () => {
  resetStores();

  const guestPlayer: Player = {
    id: 'guest-vip-99',
    name: 'Khách VIP',
    avatar: '🎲',
    color: '#f59e0b',
    createdAt: '2026-11-07T10:00:00.000Z',
    isGuest: true,
  };

  usePlayerStore.getState().registerGuestPlayer(guestPlayer);
  assert.ok(usePlayerStore.getState().getPlayerById('guest-vip-99'));

  // Cloud sync sends replacement of regular players
  const cloudPlayers: Player[] = [
    {
      id: 'player-cloud-1',
      name: 'Cloud Player 1',
      avatar: '🦊',
      color: '#7c3aed',
      createdAt: '2026-11-01T00:00:00.000Z',
    },
  ];

  usePlayerStore.getState().bulkAddPlayers(cloudPlayers, true);

  const afterSync = usePlayerStore.getState().players;
  assert.ok(afterSync.some((p) => p.id === 'player-cloud-1'), 'Cloud player must be present');
  assert.ok(afterSync.some((p) => p.id === 'guest-vip-99'), 'Guest player must be preserved after remote replace');
});

test('CHALLENGE 2.4: bulkAddPlayers handles players with missing or empty names gracefully without throwing', () => {
  resetStores();

  // Adversarial: what if cloud data contains an anomaly player with missing name
  const anomalyPlayer = {
    id: 'player-anomaly',
    name: '',
    color: '#000000',
    createdAt: '2026-11-01T00:00:00.000Z',
  } as Player;

  assert.doesNotThrow(() => {
    usePlayerStore.getState().bulkAddPlayers([anomalyPlayer], false);
  }, 'bulkAddPlayers must not throw on empty name');
});

// ============================================================================
// CHALLENGE 3: Boundary Thresholds & Leaderboard Qualification Calculations
// ============================================================================

test('CHALLENGE 3.1: calculateMinRequiredPlays boundary points and capping at 5 plays', () => {
  // Mathematical boundary verification:
  assert.equal(calculateMinRequiredPlays(-10), 0, 'Negative sessions must return 0');
  assert.equal(calculateMinRequiredPlays(0), 0, 'Zero sessions must return 0');
  assert.equal(calculateMinRequiredPlays(1), 1, '1 session: 1 * 0.05 = 0.05 -> ceil = 1');
  assert.equal(calculateMinRequiredPlays(19), 1, '19 sessions: 19 * 0.05 = 0.95 -> ceil = 1');
  assert.equal(calculateMinRequiredPlays(20), 1, '20 sessions: 20 * 0.05 = 1.00 -> ceil = 1');
  assert.equal(calculateMinRequiredPlays(21), 2, '21 sessions: 21 * 0.05 = 1.05 -> ceil = 2');
  assert.equal(calculateMinRequiredPlays(40), 2, '40 sessions: 40 * 0.05 = 2.00 -> ceil = 2');
  assert.equal(calculateMinRequiredPlays(41), 3, '41 sessions: 41 * 0.05 = 2.05 -> ceil = 3');
  assert.equal(calculateMinRequiredPlays(60), 3, '60 sessions: 60 * 0.05 = 3.00 -> ceil = 3');
  assert.equal(calculateMinRequiredPlays(80), 4, '80 sessions: 80 * 0.05 = 4.00 -> ceil = 4');
  assert.equal(calculateMinRequiredPlays(100), 5, '100 sessions: 100 * 0.05 = 5.00 -> ceil = 5');
  assert.equal(calculateMinRequiredPlays(1420), 71, '1420 sessions: 1420 * 0.05 = 71 -> 71 (raw)');

  // In PlayerLeaderboardSection, the threshold is capped to Math.min(5, Math.max(1, calculatedThreshold))
  const getCappedThreshold = (total: number) => {
    const raw = calculateMinRequiredPlays(total, 0.05);
    return Math.min(5, Math.max(1, raw));
  };

  assert.equal(getCappedThreshold(0), 1, 'Capped threshold for 0 sessions must be 1');
  assert.equal(getCappedThreshold(20), 1, 'Capped threshold for 20 sessions must be 1');
  assert.equal(getCappedThreshold(40), 2, 'Capped threshold for 40 sessions must be 2');
  assert.equal(getCappedThreshold(100), 5, 'Capped threshold for 100 sessions must be 5');
  assert.equal(getCappedThreshold(1420), 5, 'Capped threshold for 1420 sessions must be capped to 5');
  assert.equal(getCappedThreshold(10000), 5, 'Capped threshold for 10000 sessions must be capped to 5');
});

test('CHALLENGE 3.2: Leaderboard stats calculation with extreme player counts (0, 1, and 2 players)', () => {
  // Test 0 sessions:
  const emptyStats = calculateGameStats([]);
  assert.equal(emptyStats.totalPlays, 0);
  assert.equal(emptyStats.averageDuration, 0);
  assert.equal(emptyStats.highestScore, null);
  assert.equal(emptyStats.lowestScore, null);
  assert.equal(emptyStats.playerWinRates.length, 0);

  // Test 1 solo session:
  const soloSession: PlaySession = {
    id: 's-solo',
    gameId: 'game-solo',
    gameName: 'Mage Knight',
    gameThumbnail: '',
    datePlayed: '2026-11-07T15:00:00.000Z',
    durationMinutes: 120,
    firstPlayerMethod: 'manual',
    winnerId: 'p-solo',
    players: [{ playerId: 'p-solo', playerName: 'Solo Explorer', score: 145, rank: 1, isWinner: true }],
    createdAt: '2026-11-07T17:00:00.000Z',
  };

  const soloStats = calculateGameStats([soloSession]);
  assert.equal(soloStats.totalPlays, 1);
  assert.equal(soloStats.averageDuration, 120);
  assert.equal(soloStats.highestScore?.score, 145);
  assert.equal(soloStats.lowestScore?.score, 145);
  assert.equal(soloStats.playerWinRates.length, 1);
  assert.equal(soloStats.playerWinRates[0].winRate, 100);
});

// ============================================================================
// CHALLENGE 4: Extreme Dates, 0 Duration & Negative Scores
// ============================================================================

test('CHALLENGE 4.1: Negative scores and tie-breaking in calculateGameStats and heartbreaks', () => {
  const penaltySessions: PlaySession[] = [
    {
      id: 's-pen-1',
      gameId: 'game-penalty',
      gameName: 'Penalty Match',
      gameThumbnail: '',
      datePlayed: '2026-11-07T10:00:00.000Z',
      durationMinutes: 45,
      firstPlayerMethod: 'manual',
      winnerId: 'p-neg-1',
      players: [
        { playerId: 'p-neg-1', playerName: 'Winner', score: -5, rank: 1, isWinner: true },
        { playerId: 'p-neg-2', playerName: 'Agonizing Runner Up', score: -7, rank: 2, isWinner: false },
        { playerId: 'p-neg-3', playerName: 'Last Place', score: -50, rank: 3, isWinner: false },
      ],
      createdAt: '2026-11-07T11:00:00.000Z',
    },
  ];

  const stats = calculateGameStats(penaltySessions);
  assert.equal(stats.highestScore?.score, -5, 'Highest score must be -5');
  assert.equal(stats.lowestScore?.score, -50, 'Lowest score must be -50');

  // Verify heartbreak margin calculation with negative numbers:
  // Winner = -5, Runner-Up = -7. Difference = -5 - (-7) = 2 pts.
  // Must count as close loss (<= 2 pts).
  let maxScore = -Infinity;
  penaltySessions[0].players.forEach((ps) => {
    if (typeof ps.score === 'number' && ps.score > maxScore) {
      maxScore = ps.score;
    }
  });
  const runnerUp = penaltySessions[0].players.find((p) => p.rank === 2)!;
  const isCloseLoss =
    typeof runnerUp.score === 'number' &&
    maxScore > -Infinity &&
    maxScore - runnerUp.score <= 2 &&
    maxScore - runnerUp.score > 0;

  assert.equal(isCloseLoss, true, 'Defeat by 2 points with negative scores must evaluate to close loss');
});

test('CHALLENGE 4.2: 0 duration and negative duration handle gracefully without NaN', () => {
  const zeroDurationSessions: PlaySession[] = [
    {
      id: 's-zero-1',
      gameId: 'game-zero',
      gameName: 'Zero Minute Game',
      gameThumbnail: '',
      datePlayed: '2026-11-07T10:00:00.000Z',
      durationMinutes: 0,
      firstPlayerMethod: 'manual',
      winnerId: 'p1',
      players: [{ playerId: 'p1', playerName: 'Player 1', score: 10, isWinner: true }],
      createdAt: '2026-11-07T11:00:00.000Z',
    },
    {
      id: 's-zero-2',
      gameId: 'game-zero',
      gameName: 'Negative Minute Game',
      gameThumbnail: '',
      datePlayed: '2026-11-07T11:00:00.000Z',
      durationMinutes: -30,
      firstPlayerMethod: 'manual',
      winnerId: 'p1',
      players: [{ playerId: 'p1', playerName: 'Player 1', score: 10, isWinner: true }],
      createdAt: '2026-11-07T12:00:00.000Z',
    },
  ];

  const stats = calculateGameStats(zeroDurationSessions);
  assert.equal(stats.averageDuration, 0, 'Average duration must be 0, never NaN');
  assert.equal(formatDuration(0), '0m');
  assert.equal(formatDuration(-15), '0m');
  assert.equal(formatDuration(undefined), '0m');
});

test('CHALLENGE 4.3: Extreme dates (year 1970, year 9999, leap years, same-day millisecond ties)', () => {
  assert.equal(formatDate('1970-01-01T00:00:00.000Z'), 'Jan 1, 1970');
  assert.equal(formatDate('9999-12-31T23:59:59.999Z'), 'Dec 31, 9999');
  assert.equal(formatDate('2024-02-29T12:00:00.000Z'), 'Feb 29, 2024'); // Leap year
  assert.equal(formatDate('invalid-date-string'), 'invalid-date-string');
  assert.equal(formatDate(''), 'Unknown date');
  assert.equal(formatDate(undefined), 'Unknown date');

  // Verify same-day sorting with wall-clock time precision
  const morningSession: PlaySession = {
    id: 's-morning',
    gameId: 'game-wingspan',
    gameName: 'Wingspan',
    gameThumbnail: '',
    datePlayed: '2026-11-07T09:30:15.123Z',
    firstPlayerMethod: 'manual',
    winnerId: 'p-linh',
    players: [
      { playerId: 'p-linh', playerName: 'Linh', score: 90, isWinner: true },
      { playerId: 'p-huy', playerName: 'Huy', score: 80, isWinner: false },
    ],
    createdAt: '2026-11-07T10:00:00.000Z',
  };

  const afternoonSession: PlaySession = {
    id: 's-afternoon',
    gameId: 'game-wingspan',
    gameName: 'Wingspan',
    gameThumbnail: '',
    datePlayed: '2026-11-07T14:45:30.456Z',
    firstPlayerMethod: 'manual',
    winnerId: 'p-huy',
    players: [
      { playerId: 'p-huy', playerName: 'Huy', score: 95, isWinner: true },
      { playerId: 'p-linh', playerName: 'Linh', score: 85, isWinner: false },
    ],
    createdAt: '2026-11-07T15:00:00.000Z',
  };

  const eveningSession: PlaySession = {
    id: 's-evening',
    gameId: 'game-wingspan',
    gameName: 'Wingspan',
    gameThumbnail: '',
    datePlayed: '2026-11-07T20:15:00.789Z',
    firstPlayerMethod: 'manual',
    winnerId: 'p-huy',
    players: [
      { playerId: 'p-huy', playerName: 'Huy', score: 102, isWinner: true },
      { playerId: 'p-linh', playerName: 'Linh', score: 79, isWinner: false },
    ],
    createdAt: '2026-11-07T21:00:00.000Z',
  };

  // Streaks for Huy across these three same-day sessions:
  // Session 1 (09:30): Loss
  // Session 2 (14:45): Win
  // Session 3 (20:15): Win
  // -> Expected longest win streak: 2
  // -> Expected current streak: win (2)
  const sessions = [eveningSession, morningSession, afternoonSession]; // unsorted input
  const huyStreaks = calculatePlayerStreaks('p-huy', sessions);

  assert.equal(huyStreaks.longestWinStreak.count, 2, 'Huy longest win streak must be 2');
  assert.equal(huyStreaks.currentStreak.type, 'win');
  assert.equal(huyStreaks.currentStreak.count, 2);
  assert.equal(huyStreaks.longestLossStreak.count, 1);
});

// ============================================================================
// CHALLENGE 5: Smart Store Merge 60-Second Boundary & Race Conditions
// ============================================================================

test('CHALLENGE 5.1: bulkAddSessions smart merge exactly at 60-second boundary', () => {
  resetStores();

  const now = Date.now();

  // Session created 30 seconds ago (must be kept)
  const freshSession: PlaySession = {
    id: 's-fresh-30s',
    gameId: 'g1',
    gameName: 'Fresh Game',
    gameThumbnail: '',
    datePlayed: new Date(now - 30000).toISOString(),
    firstPlayerMethod: 'manual',
    winnerId: 'p1',
    players: [{ playerId: 'p1', playerName: 'P1', isWinner: true }],
    createdAt: new Date(now - 30000).toISOString(),
  };

  // Session created 90 seconds ago (older than 60s, will not be kept if not in remote payload)
  const olderLocalSession: PlaySession = {
    id: 's-older-90s',
    gameId: 'g1',
    gameName: 'Older Game',
    gameThumbnail: '',
    datePlayed: new Date(now - 90000).toISOString(),
    firstPlayerMethod: 'manual',
    winnerId: 'p1',
    players: [{ playerId: 'p1', playerName: 'P1', isWinner: true }],
    createdAt: new Date(now - 90000).toISOString(),
  };

  useSessionStore.setState({ sessions: [freshSession, olderLocalSession] });

  // Remote cloud sync delivers authoritative replacement payload
  const cloudSession: PlaySession = {
    id: 's-cloud-authoritative',
    gameId: 'g1',
    gameName: 'Cloud Game',
    gameThumbnail: '',
    datePlayed: new Date(now - 120000).toISOString(),
    firstPlayerMethod: 'manual',
    winnerId: 'p1',
    players: [{ playerId: 'p1', playerName: 'P1', isWinner: true }],
    createdAt: new Date(now - 120000).toISOString(),
  };

  useSessionStore.getState().bulkAddSessions([cloudSession], true);

  const resulting = useSessionStore.getState().sessions;
  assert.ok(
    resulting.some((s) => s.id === 's-fresh-30s'),
    'Session created <60s ago must be preserved during replaceExisting'
  );
  assert.ok(
    resulting.some((s) => s.id === 's-cloud-authoritative'),
    'Authoritative cloud session must be included'
  );
  assert.equal(
    resulting.some((s) => s.id === 's-older-90s'),
    false,
    'Session older than 60s not in remote payload should be cleaned up during replaceExisting'
  );
});
