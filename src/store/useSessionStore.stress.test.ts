import test from 'node:test';
import assert from 'node:assert/strict';

// Setup in-memory localStorage for Node test runner
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

import { useSessionStore } from './useSessionStore';
import { usePlayerStore } from './usePlayerStore';
import {
  calculateGameStats,
  calculatePlayerStreaks,
  calculateLongestWinStreak,
  calculateLongestLossStreak,
  calculateHeadToHead,
  calculateMinRequiredPlays,
} from '../lib/utils';
import { PlaySession, Player } from '../types';

function resetStore(sessions: PlaySession[] = []) {
  useSessionStore.setState({ sessions: [...sessions] });
}

function resetPlayerStore(players: Player[] = []) {
  usePlayerStore.setState({ players: [...players] });
}

// ============================================================================
// STRESS TEST 1: Rapid Sequential Additions on Same Calendar Date (15 Sessions)
// ============================================================================

test('Stress Test 1: Rapid sequential additions of 15 sessions on the same calendar date verify deterministic order and streak tracking', () => {
  resetStore([]);
  const playerId = 'player-stress-streak';
  const opponentId = 'player-stress-opponent';

  // Pattern: 4 Wins, 1 Loss, 6 Wins, 1 Loss, 3 Wins
  // Expected max win streak: 6
  // Expected max loss streak: 1
  // Expected current streak: 3 wins
  const outcomes = [
    true, true, true, true,       // 0-3: 4 wins (max 4)
    false,                        // 4: 1 loss (breaks streak)
    true, true, true, true, true, true, // 5-10: 6 wins (max 6)
    false,                        // 11: 1 loss (breaks streak)
    true, true, true,             // 12-14: 3 wins (current streak: 3 wins)
  ];

  const sameCalendarDate = '2026-11-07';
  const createdSessions: PlaySession[] = [];

  // Add all 15 sessions sequentially with high-precision timestamps (simulating NewSessionPage)
  for (let i = 0; i < outcomes.length; i++) {
    const isWin = outcomes[i];
    // Monotonically increasing time components on the same calendar day: 09:00:00 + i*5 minutes
    const hours = 9 + Math.floor((i * 5) / 60);
    const minutes = (i * 5) % 60;
    const seconds = (i * 7) % 60;
    const ms = i * 25;
    const d = new Date(Date.UTC(2026, 10, 7, hours, minutes, seconds, ms));
    const isoTimestamp = d.toISOString();

    const session = useSessionStore.getState().addSession({
      gameId: 'game-rapid-stress',
      gameName: 'Rapid Stress Game',
      gameThumbnail: '',
      datePlayed: isoTimestamp,
      durationMinutes: 30,
      firstPlayerMethod: 'manual',
      winnerId: isWin ? playerId : opponentId,
      players: [
        { playerId, playerName: 'Streak Master', score: isWin ? 100 : 80, rank: isWin ? 1 : 2, isWinner: isWin },
        { playerId: opponentId, playerName: 'Rival Player', score: isWin ? 80 : 100, rank: isWin ? 2 : 1, isWinner: !isWin },
      ],
      notes: `Rapid session #${i + 1} (${isWin ? 'WIN' : 'LOSS'}) at ${isoTimestamp}`,
    });

    createdSessions.push(session);
  }

  const allSessions = useSessionStore.getState().sessions;
  assert.equal(allSessions.length, 15, 'Exactly 15 sessions must be present in store');

  // Verify reverse chronological order query (latest played first)
  const playerSessions = useSessionStore.getState().getSessionsByPlayer(playerId);
  assert.equal(playerSessions.length, 15);
  for (let i = 0; i < 14; i++) {
    const current = playerSessions[i].datePlayed;
    const next = playerSessions[i + 1].datePlayed;
    assert.ok(
      current.localeCompare(next) > 0,
      `Session at index ${i} (${current}) must be strictly newer than index ${i + 1} (${next})`
    );
  }

  // Verify streak calculations
  const streaks = calculatePlayerStreaks(playerId, allSessions);
  assert.equal(streaks.longestWinStreak.count, 6, 'Longest win streak must be exactly 6');
  assert.equal(streaks.longestLossStreak.count, 1, 'Longest loss streak must be exactly 1');
  assert.equal(streaks.currentStreak.type, 'win', 'Current streak must be win');
  assert.equal(streaks.currentStreak.count, 3, 'Current streak count must be exactly 3');

  // Verify timeline of the longest win streak (sessions 5 through 10)
  assert.equal(streaks.longestWinStreak.startDate, createdSessions[5].datePlayed);
  assert.equal(streaks.longestWinStreak.endDate, createdSessions[10].datePlayed);
  assert.equal(streaks.longestWinStreak.sessions.length, 6);

  // Verify calculateLongestWinStreak and calculateLongestLossStreak helpers
  assert.equal(calculateLongestWinStreak(playerId, allSessions), 6);
  assert.equal(calculateLongestLossStreak(playerId, allSessions), 1);
});

// ============================================================================
// STRESS TEST 2: Insertion Order Invariance (Shuffled Date Played)
// ============================================================================

test('Stress Test 2: Adding sessions in out-of-order/shuffled sequence produces identical deterministic streak calculations', () => {
  resetStore([]);
  const playerId = 'player-shuffle-test';

  // 10 matches on the same date with predetermined outcomes:
  // Match 0 (10:00): W
  // Match 1 (10:10): W
  // Match 2 (10:20): W -> streak 3
  // Match 3 (10:30): L
  // Match 4 (10:40): W
  // Match 5 (10:50): W
  // Match 6 (11:00): W
  // Match 7 (11:10): W -> streak 4
  // Match 8 (11:20): L
  // Match 9 (11:30): L -> loss streak 2
  const matchPlan = [
    { time: '2026-11-07T10:00:00.000Z', win: true },
    { time: '2026-11-07T10:10:00.000Z', win: true },
    { time: '2026-11-07T10:20:00.000Z', win: true },
    { time: '2026-11-07T10:30:00.000Z', win: false },
    { time: '2026-11-07T10:40:00.000Z', win: true },
    { time: '2026-11-07T10:50:00.000Z', win: true },
    { time: '2026-11-07T11:00:00.000Z', win: true },
    { time: '2026-11-07T11:10:00.000Z', win: true },
    { time: '2026-11-07T11:20:00.000Z', win: false },
    { time: '2026-11-07T11:30:00.000Z', win: false },
  ];

  // Insert in scrambled order: [7, 2, 9, 0, 4, 1, 8, 3, 6, 5]
  const scrambledIndices = [7, 2, 9, 0, 4, 1, 8, 3, 6, 5];
  for (const idx of scrambledIndices) {
    const item = matchPlan[idx];
    useSessionStore.getState().addSession({
      gameId: 'game-scrambled',
      gameName: 'Scrambled Game',
      gameThumbnail: '',
      datePlayed: item.time,
      firstPlayerMethod: 'manual',
      winnerId: item.win ? playerId : 'opponent',
      players: [{ playerId, playerName: 'Scramble Tester', isWinner: item.win }],
    });
  }

  const streaks = calculatePlayerStreaks(playerId, useSessionStore.getState().sessions);
  assert.equal(streaks.longestWinStreak.count, 4, 'Longest win streak must be 4 regardless of insertion order');
  assert.equal(streaks.longestLossStreak.count, 2, 'Longest loss streak must be 2 regardless of insertion order');
  assert.equal(streaks.currentStreak.type, 'loss');
  assert.equal(streaks.currentStreak.count, 2);
  assert.equal(streaks.longestWinStreak.startDate, '2026-11-07T10:40:00.000Z');
  assert.equal(streaks.longestWinStreak.endDate, '2026-11-07T11:10:00.000Z');
});

// ============================================================================
// STRESS TEST 3: BulkAddSessions Concurrent Replace Race Condition (Zero Session Loss)
// ============================================================================

test('Stress Test 3: High-concurrency bulkAddSessions with replaceExisting === true preserves all local sessions created < 60s ago', () => {
  resetStore([]);
  const now = Date.now();

  // Create 20 baseline local sessions added within the last 50 seconds
  const localSessionIds: string[] = [];
  for (let i = 0; i < 20; i++) {
    // Stagger createdAt between now - 50s and now - 1s
    const createdAtTime = new Date(now - (50 - i * 2) * 1000).toISOString();
    const session = useSessionStore.getState().addSession({
      gameId: `game-local-${i}`,
      gameName: `Local Game ${i}`,
      gameThumbnail: '',
      datePlayed: createdAtTime,
      firstPlayerMethod: 'manual',
      winnerId: 'player-local',
      players: [{ playerId: 'player-local', playerName: 'Local', isWinner: true }],
    });
    // Explicitly enforce createdAt to test the 60s threshold boundary
    useSessionStore.getState().updateSession(session.id, { createdAt: createdAtTime });
    localSessionIds.push(session.id);
  }

  assert.equal(useSessionStore.getState().sessions.length, 20);

  // Simulate 10 incoming remote cloud sync snapshots arriving with replaceExisting: true
  // Each remote payload contains 5 old remote sessions from 2 days ago and NO local sessions
  for (let r = 0; r < 10; r++) {
    const remotePayload: PlaySession[] = [
      {
        id: `remote-old-${r}-1`,
        gameId: 'game-catan',
        gameName: 'Catan',
        gameThumbnail: '',
        datePlayed: '2026-11-01T10:00:00.000Z',
        createdAt: '2026-11-01T11:00:00.000Z',
        firstPlayerMethod: 'manual',
        winnerId: 'p1',
        players: [{ playerId: 'p1', playerName: 'Remote Player', isWinner: true }],
      },
      {
        id: `remote-old-${r}-2`,
        gameId: 'game-wingspan',
        gameName: 'Wingspan',
        gameThumbnail: '',
        datePlayed: '2026-11-01T14:00:00.000Z',
        createdAt: '2026-11-01T15:00:00.000Z',
        firstPlayerMethod: 'manual',
        winnerId: 'p2',
        players: [{ playerId: 'p2', playerName: 'Remote Player 2', isWinner: true }],
      },
    ];

    // Trigger full replace
    useSessionStore.getState().bulkAddSessions(remotePayload, true);

    // CRITICAL ASSERTION: Zero session loss! Every single local session must still exist!
    const currentSessions = useSessionStore.getState().sessions;
    for (const localId of localSessionIds) {
      assert.ok(
        currentSessions.some((s) => s.id === localId),
        `Local session ${localId} must NOT be lost after cloud replace cycle #${r + 1}`
      );
    }
  }

  // Verify total sessions: 20 local + 2 remote from the last replace snapshot
  assert.equal(useSessionStore.getState().sessions.length, 22);
});

// ============================================================================
// STRESS TEST 4: BulkAddSessions Deduplication Under Concurrent Replace
// ============================================================================

test('Stress Test 4: When incoming remote payload contains subset of local sessions, no duplicate IDs are created', () => {
  resetStore([]);
  const now = Date.now();

  // Create 3 local sessions
  const s1 = useSessionStore.getState().addSession({
    gameId: 'g1', gameName: 'G1', gameThumbnail: '', datePlayed: new Date(now - 10000).toISOString(),
    firstPlayerMethod: 'manual', winnerId: 'p1', players: [{ playerId: 'p1', playerName: 'P1', isWinner: true }],
  });
  const s2 = useSessionStore.getState().addSession({
    gameId: 'g2', gameName: 'G2', gameThumbnail: '', datePlayed: new Date(now - 8000).toISOString(),
    firstPlayerMethod: 'manual', winnerId: 'p1', players: [{ playerId: 'p1', playerName: 'P1', isWinner: true }],
  });
  const s3 = useSessionStore.getState().addSession({
    gameId: 'g3', gameName: 'G3', gameThumbnail: '', datePlayed: new Date(now - 6000).toISOString(),
    firstPlayerMethod: 'manual', winnerId: 'p1', players: [{ playerId: 'p1', playerName: 'P1', isWinner: true }],
  });

  // Remote payload includes s1 and s2 (already synced to cloud), plus remote-s4
  const remotePayload: PlaySession[] = [
    { ...s1, notes: 'Synced from cloud' },
    { ...s2, notes: 'Synced from cloud' },
    {
      id: 'remote-s4',
      gameId: 'g4',
      gameName: 'G4',
      gameThumbnail: '',
      datePlayed: '2026-11-05T10:00:00.000Z',
      createdAt: '2026-11-05T11:00:00.000Z',
      firstPlayerMethod: 'manual',
      winnerId: 'p1',
      players: [{ playerId: 'p1', playerName: 'P1', isWinner: true }],
    },
  ];

  useSessionStore.getState().bulkAddSessions(remotePayload, true);

  const current = useSessionStore.getState().sessions;
  // Should have s3 (preserved unpushed local) + s1 + s2 + remote-s4 = 4 items
  assert.equal(current.length, 4, 'Must have exactly 4 unique sessions without duplicate IDs');

  const idSet = new Set(current.map((s) => s.id));
  assert.equal(idSet.size, 4, 'All session IDs must be unique');
  assert.ok(idSet.has(s1.id));
  assert.ok(idSet.has(s2.id));
  assert.ok(idSet.has(s3.id));
  assert.ok(idSet.has('remote-s4'));
});

// ============================================================================
// STRESS TEST 5: Guest Player Resilience Under Bulk Player Replace
// ============================================================================

test('Stress Test 5: Registering 10 guest players and triggering cloud player replace preserves all guest players and statistics', () => {
  resetPlayerStore();

  const guestIds: string[] = [];
  for (let i = 0; i < 10; i++) {
    const guest: Player = {
      id: `guest-${i}-${Date.now()}`,
      name: `Guest Friend ${i}`,
      avatar: '🎲',
      color: '#f97316',
      createdAt: new Date().toISOString(),
      isGuest: true,
    };
    usePlayerStore.getState().registerGuestPlayer(guest);
    guestIds.push(guest.id);
  }

  assert.equal(usePlayerStore.getState().players.length, 10);

  // Incoming cloud payload containing only standard vault players
  const remoteStandardPlayers: Player[] = [
    { id: 'player-huy', name: 'Huy Nguyễn', avatar: '🦊', color: '#7c3aed', createdAt: '2026-01-01' },
    { id: 'player-linh', name: 'Linh Trần', avatar: '🦉', color: '#ec4899', createdAt: '2026-01-01' },
  ];

  // Perform bulk replace
  usePlayerStore.getState().bulkAddPlayers(remoteStandardPlayers, true);

  const currentPlayers = usePlayerStore.getState().players;
  // Standard players (2) + Guest players (10) = 12 players
  assert.equal(currentPlayers.length, 12, 'Must retain all 10 guest players alongside 2 remote players');

  for (const gid of guestIds) {
    const p = usePlayerStore.getState().getPlayerById(gid);
    assert.ok(p, `Guest player ${gid} must resolve via getPlayerById`);
    assert.equal(p.isGuest, true);
  }
});

// ============================================================================
// STRESS TEST 6: Large Vault Dynamic Leaderboard Scaling (0 to 1,500 Sessions)
// ============================================================================

test('Stress Test 6: Dynamic qualification threshold gracefully scales from 1 to 5 and caps at 5 in large vaults', () => {
  // Test calculateMinRequiredPlays directly
  assert.equal(calculateMinRequiredPlays(10, 0.05), 1);
  assert.equal(calculateMinRequiredPlays(50, 0.05), 3);
  assert.equal(calculateMinRequiredPlays(100, 0.05), 5);
  assert.equal(calculateMinRequiredPlays(500, 0.05), 25);
  assert.equal(calculateMinRequiredPlays(1420, 0.05), 71);

  // Test the capped logic implemented in PlayerLeaderboardSection:
  // Math.min(5, Math.max(1, calculatedThreshold))
  const getEffectiveThreshold = (totalSessions: number) => {
    const calculated = calculateMinRequiredPlays(totalSessions, 0.05);
    return Math.min(5, Math.max(1, calculated));
  };

  assert.equal(getEffectiveThreshold(0), 1);
  assert.equal(getEffectiveThreshold(10), 1);
  assert.equal(getEffectiveThreshold(30), 2);
  assert.equal(getEffectiveThreshold(50), 3);
  assert.equal(getEffectiveThreshold(70), 4);
  assert.equal(getEffectiveThreshold(100), 5);
  assert.equal(getEffectiveThreshold(500), 5, 'Must cap at 5 for 500 sessions');
  assert.equal(getEffectiveThreshold(1420), 5, 'Must cap at 5 for 1,420 sessions so group members are not locked out');
});

// ============================================================================
// STRESS TEST 7: Negative/Extreme Scores, Empty Players & Missing Timestamp Fallbacks
// ============================================================================

test('Stress Test 7: CalculatePlayerStreaks and calculateGameStats handle missing datePlayed and zero players without crashing', () => {
  const edgeSessions: PlaySession[] = [
    {
      id: 's-empty-players',
      gameId: 'g1',
      gameName: 'Empty Game',
      gameThumbnail: '',
      datePlayed: '2026-11-01T10:00:00.000Z',
      createdAt: '2026-11-01T10:00:00.000Z',
      firstPlayerMethod: 'manual',
      winnerId: undefined,
      players: [],
    },
    {
      id: 's-missing-date',
      gameId: 'g1',
      gameName: 'Empty Game',
      gameThumbnail: '',
      datePlayed: '',
      createdAt: '2026-11-01T10:00:00.000Z',
      firstPlayerMethod: 'manual',
      winnerId: 'p1',
      players: [{ playerId: 'p1', playerName: 'Solo', score: 10, isWinner: true }],
    },
  ];

  // Streaks for p1
  const p1Streaks = calculatePlayerStreaks('p1', edgeSessions);
  assert.equal(p1Streaks.longestWinStreak.count, 1);
  assert.equal(p1Streaks.currentStreak.type, 'win');

  // Stats for game
  const stats = calculateGameStats(edgeSessions);
  assert.equal(stats.totalPlays, 2);
  assert.equal(stats.playerWinRates.length, 1);
  assert.equal(stats.playerWinRates[0].wins, 1);
});
