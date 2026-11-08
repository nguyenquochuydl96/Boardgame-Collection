import test from 'node:test';
import assert from 'node:assert/strict';

// Ensure in-memory localStorage is available in Node.js test environment
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
import {
  calculateGameStats,
  calculatePlayerStreaks,
  calculateLongestWinStreak,
  calculateHeadToHead,
  calculateMinRequiredPlays,
} from '../lib/utils';
import { PlaySession, Player, PlayerScore } from '../types';

/**
 * Resets the session store to a known state for test isolation.
 */
function resetStore(sessions: PlaySession[] = [...INITIAL_SESSIONS]) {
  useSessionStore.setState({ sessions: [...sessions] });
}

// ============================================================================
// TIER 1: Feature Coverage (R1 - Reactivity & State Synchronization)
// ============================================================================

test('Tier 1: addSession synchronously updates sessions array with generated id, timestamp and input data', () => {
  resetStore();
  const initialCount = useSessionStore.getState().sessions.length;

  const sessionInput = {
    gameId: 'game-catan',
    gameName: 'Catan',
    gameThumbnail: 'https://example.com/catan.jpg',
    datePlayed: '2026-11-07T14:30:00.000Z',
    durationMinutes: 75,
    location: 'Lafam Boardgame Club',
    firstPlayerMethod: 'random_wheel' as const,
    firstPlayerId: 'player-huy',
    winnerId: 'player-huy',
    players: [
      { playerId: 'player-huy', playerName: 'Huy Nguyễn', score: 10, rank: 1, isWinner: true },
      { playerId: 'player-linh', playerName: 'Linh Trần', score: 8, rank: 2, isWinner: false },
    ],
    notes: 'Testing synchronous store mutation',
  };

  const created = useSessionStore.getState().addSession(sessionInput);

  // 1. Verify returned object has generated ID and createdAt
  assert.ok(created.id, 'Created session must have a valid generated id');
  assert.ok(created.createdAt, 'Created session must have a createdAt timestamp');
  assert.equal(created.gameId, 'game-catan');
  assert.equal(created.winnerId, 'player-huy');

  // 2. Verify state was updated immediately and synchronously
  const updatedSessions = useSessionStore.getState().sessions;
  assert.equal(updatedSessions.length, initialCount + 1, 'Store session count must increment by 1');
  assert.equal(updatedSessions[0].id, created.id, 'New session must be prepended at index 0');
  assert.equal(updatedSessions[0].notes, 'Testing synchronous store mutation');
});

test('Tier 1: addSession immediately updates player match counts, wins, losses and win rates', () => {
  resetStore();
  const playerId = 'player-huy';
  const opponentId = 'player-linh';

  const beforeSessions = useSessionStore.getState().sessions;
  const beforeStats = calculateGameStats(
    beforeSessions.filter((s) => s.gameId === 'game-catan')
  );
  const huyBefore = beforeStats.playerWinRates.find((p) => p.playerId === playerId);
  const linhBefore = beforeStats.playerWinRates.find((p) => p.playerId === opponentId);

  const huyBeforeWins = huyBefore?.wins ?? 0;
  const huyBeforePlays = huyBefore?.plays ?? 0;
  const linhBeforeWins = linhBefore?.wins ?? 0;
  const linhBeforePlays = linhBefore?.plays ?? 0;

  // Add a new session where Huy wins against Linh
  useSessionStore.getState().addSession({
    gameId: 'game-catan',
    gameName: 'Catan',
    gameThumbnail: '',
    datePlayed: '2026-11-07T16:00:00.000Z',
    durationMinutes: 60,
    firstPlayerMethod: 'manual',
    winnerId: playerId,
    players: [
      { playerId, playerName: 'Huy Nguyễn', score: 10, isWinner: true },
      { playerId: opponentId, playerName: 'Linh Trần', score: 7, isWinner: false },
    ],
  });

  // Calculate stats from the live store
  const afterSessions = useSessionStore.getState().sessions;
  const afterStats = calculateGameStats(
    afterSessions.filter((s) => s.gameId === 'game-catan')
  );
  const huyAfter = afterStats.playerWinRates.find((p) => p.playerId === playerId);
  const linhAfter = afterStats.playerWinRates.find((p) => p.playerId === opponentId);

  assert.ok(huyAfter, 'Huy stats must exist');
  assert.ok(linhAfter, 'Linh stats must exist');
  assert.equal(huyAfter.plays, huyBeforePlays + 1, 'Huy plays must increase by 1');
  assert.equal(huyAfter.wins, huyBeforeWins + 1, 'Huy wins must increase by 1');
  assert.equal(linhAfter.plays, linhBeforePlays + 1, 'Linh plays must increase by 1');
  assert.equal(linhAfter.wins, linhBeforeWins, 'Linh wins must not change on loss');
  assert.equal(
    huyAfter.winRate,
    Math.round((huyAfter.wins / huyAfter.plays) * 100),
    'Huy win rate must match exact formula'
  );
});

test('Tier 1: calculatePlayerStreaks and calculateLongestWinStreak reflect newly added session immediately without page reload', () => {
  resetStore([]); // Blank slate
  const playerId = 'test-player-streak';

  // Match 1: Win
  useSessionStore.getState().addSession({
    gameId: 'game-1',
    gameName: 'Game 1',
    gameThumbnail: '',
    datePlayed: '2026-11-01T10:00:00.000Z',
    firstPlayerMethod: 'manual',
    winnerId: playerId,
    players: [{ playerId, playerName: 'Streak Tester', isWinner: true }],
  });

  let streaks = calculatePlayerStreaks(playerId, useSessionStore.getState().sessions);
  assert.equal(streaks.longestWinStreak.count, 1);
  assert.equal(streaks.currentStreak.type, 'win');
  assert.equal(streaks.currentStreak.count, 1);
  assert.equal(calculateLongestWinStreak(playerId, useSessionStore.getState().sessions), 1);

  // Match 2: Win (Streak becomes 2)
  useSessionStore.getState().addSession({
    gameId: 'game-1',
    gameName: 'Game 1',
    gameThumbnail: '',
    datePlayed: '2026-11-02T10:00:00.000Z',
    firstPlayerMethod: 'manual',
    winnerId: playerId,
    players: [{ playerId, playerName: 'Streak Tester', isWinner: true }],
  });

  streaks = calculatePlayerStreaks(playerId, useSessionStore.getState().sessions);
  assert.equal(streaks.longestWinStreak.count, 2);
  assert.equal(streaks.currentStreak.type, 'win');
  assert.equal(streaks.currentStreak.count, 2);
  assert.equal(calculateLongestWinStreak(playerId, useSessionStore.getState().sessions), 2);

  // Match 3: Loss (Streak breaks; current streak is 1 loss; longest win streak stays 2)
  useSessionStore.getState().addSession({
    gameId: 'game-1',
    gameName: 'Game 1',
    gameThumbnail: '',
    datePlayed: '2026-11-03T10:00:00.000Z',
    firstPlayerMethod: 'manual',
    winnerId: 'other-player',
    players: [{ playerId, playerName: 'Streak Tester', isWinner: false }],
  });

  streaks = calculatePlayerStreaks(playerId, useSessionStore.getState().sessions);
  assert.equal(streaks.longestWinStreak.count, 2, 'Longest win streak must remain 2');
  assert.equal(streaks.currentStreak.type, 'loss', 'Current streak must be loss');
  assert.equal(streaks.currentStreak.count, 1, 'Current loss streak count must be 1');
});

test('Tier 1: getSessionsByPlayer and getSessionsByGame immediately include new session in chronological order', () => {
  resetStore();
  const testGameId = 'game-reactive-test';
  const testPlayerId = 'player-reactive-test';

  const newSession = useSessionStore.getState().addSession({
    gameId: testGameId,
    gameName: 'Reactive Test Game',
    gameThumbnail: '',
    datePlayed: '2026-11-07T21:00:00.000Z',
    durationMinutes: 45,
    firstPlayerMethod: 'manual',
    winnerId: testPlayerId,
    players: [
      { playerId: testPlayerId, playerName: 'Reactive Player', score: 100, isWinner: true },
      { playerId: 'player-other', playerName: 'Other Player', score: 80, isWinner: false },
    ],
  });

  // Query by game
  const gameSessions = useSessionStore.getState().getSessionsByGame(testGameId);
  assert.equal(gameSessions.length, 1);
  assert.equal(gameSessions[0].id, newSession.id);

  // Query by player
  const playerSessions = useSessionStore.getState().getSessionsByPlayer(testPlayerId);
  assert.equal(playerSessions.length, 1);
  assert.equal(playerSessions[0].id, newSession.id);

  // Non-participant should not find it
  const nonParticipantSessions = useSessionStore.getState().getSessionsByPlayer('player-non-existent');
  assert.equal(nonParticipantSessions.length, 0);
});

// ============================================================================
// TIER 2: Boundary & Corner Cases
// ============================================================================

test('Tier 2: Consecutive sessions played on the same calendar date preserve deterministic chronological order and streak math', () => {
  resetStore([]); // Empty baseline
  const playerId = 'player-sameday';

  // 3 matches on the same date with distinct time components
  const s1 = useSessionStore.getState().addSession({
    gameId: 'game-catan',
    gameName: 'Catan',
    gameThumbnail: '',
    datePlayed: '2026-11-07T10:00:00.000Z', // 10:00 AM - Win
    firstPlayerMethod: 'manual',
    winnerId: playerId,
    players: [{ playerId, playerName: 'Same Day Player', score: 10, isWinner: true }],
  });

  const s2 = useSessionStore.getState().addSession({
    gameId: 'game-catan',
    gameName: 'Catan',
    gameThumbnail: '',
    datePlayed: '2026-11-07T14:30:00.000Z', // 2:30 PM - Win
    firstPlayerMethod: 'manual',
    winnerId: playerId,
    players: [{ playerId, playerName: 'Same Day Player', score: 10, isWinner: true }],
  });

  const s3 = useSessionStore.getState().addSession({
    gameId: 'game-catan',
    gameName: 'Catan',
    gameThumbnail: '',
    datePlayed: '2026-11-07T20:00:00.000Z', // 8:00 PM - Loss
    firstPlayerMethod: 'manual',
    winnerId: 'other-player',
    players: [{ playerId, playerName: 'Same Day Player', score: 7, isWinner: false }],
  });

  // Verify getSessionsByPlayer sorts reverse-chronological (latest match first)
  const playerSessions = useSessionStore.getState().getSessionsByPlayer(playerId);
  assert.equal(playerSessions.length, 3);
  assert.equal(playerSessions[0].id, s3.id, 'Latest 20:00 session must be first');
  assert.equal(playerSessions[1].id, s2.id, 'Middle 14:30 session must be second');
  assert.equal(playerSessions[2].id, s1.id, 'Earliest 10:00 session must be third');

  // Verify streak calculation correctly sorts chronologically (10:00 -> 14:30 -> 20:00)
  const streaks = calculatePlayerStreaks(playerId, useSessionStore.getState().sessions);
  assert.equal(streaks.longestWinStreak.count, 2, 'Must count the two daytime wins as streak of 2');
  assert.equal(streaks.longestWinStreak.startDate, '2026-11-07T10:00:00.000Z');
  assert.equal(streaks.longestWinStreak.endDate, '2026-11-07T14:30:00.000Z');
  assert.equal(streaks.currentStreak.type, 'loss', 'Current streak must be loss from evening match');
  assert.equal(streaks.currentStreak.count, 1);
});

test('Tier 2: Guest / one-off player session completion does not throw errors when calculating stats or leaderboards', () => {
  resetStore();
  const guestId = 'guest-unique-777';

  // Add a session with a one-off guest player
  useSessionStore.getState().addSession({
    gameId: 'game-wingspan',
    gameName: 'Wingspan',
    gameThumbnail: '',
    datePlayed: '2026-11-07T18:00:00.000Z',
    firstPlayerMethod: 'manual',
    winnerId: guestId,
    players: [
      { playerId: guestId, playerName: 'Guest Player Tuấn', score: 105, rank: 1, isWinner: true },
      { playerId: 'player-huy', playerName: 'Huy Nguyễn', score: 85, rank: 2, isWinner: false },
    ],
  });

  const allSessions = useSessionStore.getState().sessions;

  // 1. Query by guest player ID
  const guestSessions = useSessionStore.getState().getSessionsByPlayer(guestId);
  assert.equal(guestSessions.length, 1);
  assert.equal(guestSessions[0].players[0].playerName, 'Guest Player Tuấn');

  // 2. Calculate streaks for guest player
  const guestStreaks = calculatePlayerStreaks(guestId, allSessions);
  assert.equal(guestStreaks.longestWinStreak.count, 1);
  assert.equal(guestStreaks.currentStreak.type, 'win');

  // 3. Calculate game stats including guest
  const gameStats = calculateGameStats(allSessions.filter((s) => s.gameId === 'game-wingspan'));
  const guestStat = gameStats.playerWinRates.find((p) => p.playerId === guestId);
  assert.ok(guestStat, 'Guest player must appear in playerWinRates');
  assert.equal(guestStat.wins, 1);
  assert.equal(guestStat.winRate, 100);

  // 4. Head-to-Head calculation between guest and regular player
  const mockGuest: Player = {
    id: guestId,
    name: 'Guest Player Tuấn',
    avatar: '🎲',
    color: '#f97316',
    createdAt: '2026-11-07T18:00:00.000Z',
  };
  const mockRegular: Player = {
    id: 'player-huy',
    name: 'Huy Nguyễn',
    avatar: '🦊',
    color: '#7c3aed',
    createdAt: '2026-01-01T10:00:00.000Z',
  };

  const h2h = calculateHeadToHead([mockGuest, mockRegular], allSessions);
  assert.ok(h2h.sharedSessionsCount >= 1);
  const guestH2h = h2h.playerStats.find((s) => s.player.id === guestId);
  assert.ok(guestH2h);
  assert.equal(guestH2h.winsInShared, 1);
});

test('Tier 2: Large payload and photo simulation handles multiple compressed images without breaking store', () => {
  resetStore();

  // Create mock base64 data URIs
  const mockPhoto1 = 'data:image/jpeg;base64,' + 'A'.repeat(5000);
  const mockPhoto2 = 'data:image/jpeg;base64,' + 'B'.repeat(5000);

  const sessionWithPhotos = useSessionStore.getState().addSession({
    gameId: 'game-photo-test',
    gameName: 'Photo Game',
    gameThumbnail: '',
    datePlayed: '2026-11-07T12:00:00.000Z',
    firstPlayerMethod: 'manual',
    winnerId: 'player-huy',
    players: [{ playerId: 'player-huy', playerName: 'Huy Nguyễn', score: 50, isWinner: true }],
    photos: [mockPhoto1, mockPhoto2],
    notes: 'Session with 2 attached photos',
  });

  // Verify photos are retrieved intact
  const retrieved = useSessionStore.getState().getSessionById(sessionWithPhotos.id);
  assert.ok(retrieved);
  assert.equal(retrieved.photos?.length, 2);
  assert.equal(retrieved.photos?.[0], mockPhoto1);
  assert.equal(retrieved.photos?.[1], mockPhoto2);

  // Update session with a 3rd photo
  const mockPhoto3 = 'data:image/jpeg;base64,' + 'C'.repeat(5000);
  useSessionStore.getState().updateSession(sessionWithPhotos.id, {
    photos: [mockPhoto1, mockPhoto2, mockPhoto3],
  });

  const updated = useSessionStore.getState().getSessionById(sessionWithPhotos.id);
  assert.equal(updated?.photos?.length, 3);
});

test('Tier 2: Dynamic leaderboard qualification threshold (5%) updates player qualification status as sessions grow', () => {
  // Test threshold mathematical bounds
  assert.equal(calculateMinRequiredPlays(0), 0);
  assert.equal(calculateMinRequiredPlays(1), 1);
  assert.equal(calculateMinRequiredPlays(19), 1);
  assert.equal(calculateMinRequiredPlays(20), 1); // 20 * 0.05 = 1.0 -> 1
  assert.equal(calculateMinRequiredPlays(21), 2); // 21 * 0.05 = 1.05 -> ceil = 2
  assert.equal(calculateMinRequiredPlays(40), 2); // 40 * 0.05 = 2.0 -> 2
  assert.equal(calculateMinRequiredPlays(41), 3); // 41 * 0.05 = 2.05 -> ceil = 3

  // Qualification simulation:
  // With 20 total sessions, a player with 1 play meets the threshold (1 >= 1)
  let totalSessions = 20;
  let minPlays = calculateMinRequiredPlays(totalSessions, 0.05);
  let playerPlays = 1;
  assert.equal(playerPlays >= minPlays, true, 'Player with 1 play qualifies at 20 sessions');

  // When a 21st session is recorded in the group, minRequiredPlays jumps to 2
  totalSessions = 21;
  minPlays = calculateMinRequiredPlays(totalSessions, 0.05);
  assert.equal(minPlays, 2);
  assert.equal(playerPlays >= minPlays, false, 'Player with 1 play does NOT qualify at 21 sessions');

  // Player completes a second match -> immediately qualifies again
  playerPlays += 1;
  assert.equal(playerPlays >= minPlays, true, 'Player with 2 plays qualifies at 21 sessions');
});

// ============================================================================
// TIER 3: Cross-Feature Combinations
// ============================================================================

test('Tier 3: Session addition followed by bulkAddSessions smart merge preserves recently added local session', () => {
  resetStore();
  const initialSessions = useSessionStore.getState().sessions;

  // 1. User adds a new local session
  const localSession = useSessionStore.getState().addSession({
    gameId: 'game-local-unique',
    gameName: 'Local Game',
    gameThumbnail: '',
    datePlayed: '2026-11-07T17:00:00.000Z',
    firstPlayerMethod: 'manual',
    winnerId: 'player-local',
    players: [{ playerId: 'player-local', playerName: 'Local Player', isWinner: true }],
  });

  assert.ok(
    useSessionStore.getState().sessions.some((s) => s.id === localSession.id),
    'Local session must exist before bulk merge'
  );

  // 2. Incoming remote cloud payload containing new external sessions
  const remoteSession1: PlaySession = {
    id: 'remote-session-1',
    gameId: 'game-remote-1',
    gameName: 'Remote Game 1',
    gameThumbnail: '',
    datePlayed: '2026-11-06T10:00:00.000Z',
    firstPlayerMethod: 'manual',
    winnerId: 'player-remote',
    players: [{ playerId: 'player-remote', playerName: 'Remote Player', isWinner: true }],
    createdAt: '2026-11-06T11:00:00.000Z',
  };

  const remoteSession2: PlaySession = {
    id: 'remote-session-2',
    gameId: 'game-remote-2',
    gameName: 'Remote Game 2',
    gameThumbnail: '',
    datePlayed: '2026-11-06T14:00:00.000Z',
    firstPlayerMethod: 'manual',
    winnerId: 'player-remote',
    players: [{ playerId: 'player-remote', playerName: 'Remote Player', isWinner: true }],
    createdAt: '2026-11-06T15:00:00.000Z',
  };

  // Perform bulk add in non-destructive merge mode (standard pull merge)
  useSessionStore.getState().bulkAddSessions([remoteSession1, remoteSession2], false);

  const mergedSessions = useSessionStore.getState().sessions;

  // Verify local session is preserved
  const foundLocal = mergedSessions.find((s) => s.id === localSession.id);
  assert.ok(foundLocal, 'Locally created session must be preserved during bulk merge');

  // Verify remote sessions were merged
  assert.ok(mergedSessions.some((s) => s.id === 'remote-session-1'), 'Remote session 1 must be merged');
  assert.ok(mergedSessions.some((s) => s.id === 'remote-session-2'), 'Remote session 2 must be merged');

  // Verify total count equals initial + 1 local + 2 remote
  assert.equal(mergedSessions.length, initialSessions.length + 3);

  // Verify no duplicate IDs if re-merged with same payload
  useSessionStore.getState().bulkAddSessions([remoteSession1, remoteSession2], false);
  assert.equal(useSessionStore.getState().sessions.length, initialSessions.length + 3);
});

test('Tier 3: Session addition with category score sheet breakdown vs simple scoring coexists and computes uniform stats', () => {
  resetStore([]); // Clean slate
  const gameId = 'game-gwt';
  const gameName = 'Great Western Trail: Second Edition';

  // Session A: Detailed score breakdown
  const detailedBreakdownP1 = {
    cash: 3,
    buildings: 31,
    cities: 36,
    train_stations: 28,
    hazards: 11,
    cattle_cards: 16,
    objective_cards: 13,
    station_masters: 3,
    advanced_workers: 12,
    cleared_board: 3,
    job_market: 2,
  };
  const detailedBreakdownP2 = {
    cash: 2,
    buildings: 3,
    cities: 8,
    train_stations: 7,
    hazards: 11,
    cattle_cards: 13,
    objective_cards: 8,
    station_masters: 9,
    advanced_workers: 0,
    cleared_board: 0,
    job_market: 0,
  };

  useSessionStore.getState().addSession({
    gameId,
    gameName,
    gameThumbnail: '',
    datePlayed: '2026-11-01T14:00:00.000Z',
    durationMinutes: 120,
    firstPlayerMethod: 'manual',
    winnerId: 'player-p1',
    players: [
      {
        playerId: 'player-p1',
        playerName: 'Yellow Player',
        score: 158,
        rank: 1,
        isWinner: true,
        scoreBreakdown: detailedBreakdownP1,
      },
      {
        playerId: 'player-p2',
        playerName: 'Grey Player',
        score: 61,
        rank: 2,
        isWinner: false,
        scoreBreakdown: detailedBreakdownP2,
      },
    ],
  });

  // Session B: Simple scoring without breakdown
  useSessionStore.getState().addSession({
    gameId,
    gameName,
    gameThumbnail: '',
    datePlayed: '2026-11-02T14:00:00.000Z',
    durationMinutes: 90,
    firstPlayerMethod: 'manual',
    winnerId: 'player-p2',
    players: [
      { playerId: 'player-p1', playerName: 'Yellow Player', score: 95, rank: 2, isWinner: false },
      { playerId: 'player-p2', playerName: 'Grey Player', score: 110, rank: 1, isWinner: true },
    ],
  });

  const sessions = useSessionStore.getState().sessions;
  assert.equal(sessions.length, 2);

  // Verify breakdown preserved on Session A
  const sessionA = sessions.find((s) => s.players[0].score === 158 || s.players[1].score === 158);
  assert.ok(sessionA);
  const p1ScoreEntry = sessionA.players.find((p) => p.playerId === 'player-p1');
  assert.deepEqual(p1ScoreEntry?.scoreBreakdown, detailedBreakdownP1);

  // Verify calculateGameStats accurately processes both
  const stats = calculateGameStats(sessions);
  assert.equal(stats.totalPlays, 2);
  assert.equal(stats.averageDuration, 105); // (120 + 90) / 2 = 105
  assert.equal(stats.highestScore?.score, 158);
  assert.equal(stats.highestScore?.playerName, 'Yellow Player');
  assert.equal(stats.lowestScore?.score, 61);
  assert.equal(stats.lowestScore?.playerName, 'Grey Player');

  // Both players won 1 match each
  const p1Stats = stats.playerWinRates.find((p) => p.playerId === 'player-p1');
  const p2Stats = stats.playerWinRates.find((p) => p.playerId === 'player-p2');
  assert.equal(p1Stats?.wins, 1);
  assert.equal(p1Stats?.plays, 2);
  assert.equal(p1Stats?.winRate, 50);
  assert.equal(p2Stats?.wins, 1);
  assert.equal(p2Stats?.plays, 2);
  assert.equal(p2Stats?.winRate, 50);
});

// ============================================================================
// TIER 4: Real-World Application Scenarios
// ============================================================================

test('Tier 4: Multi-match game night simulation: 4 players, 3 sequential games, verifies exact cumulative leaderboards and math', () => {
  resetStore([]); // Fresh game night slate
  const P_ALICE = 'p-alice';
  const P_BOB = 'p-bob';
  const P_CHARLIE = 'p-charlie';
  const P_DANA = 'p-dana';

  const players: Player[] = [
    { id: P_ALICE, name: 'Alice', avatar: '🦊', color: '#7c3aed', createdAt: '2026-01-01' },
    { id: P_BOB, name: 'Bob', avatar: '🦉', color: '#ec4899', createdAt: '2026-01-01' },
    { id: P_CHARLIE, name: 'Charlie', avatar: '🐉', color: '#22d3ee', createdAt: '2026-01-01' },
    { id: P_DANA, name: 'Dana', avatar: '🐼', color: '#10b981', createdAt: '2026-01-01' },
  ];

  // Match 1: Catan (60 min)
  // Alice wins (10), Bob 2nd (9), Charlie 3rd (7), Dana 4th (6)
  useSessionStore.getState().addSession({
    gameId: 'game-catan',
    gameName: 'Catan',
    gameThumbnail: '',
    datePlayed: '2026-11-07T18:00:00.000Z',
    durationMinutes: 60,
    firstPlayerMethod: 'random_wheel',
    winnerId: P_ALICE,
    players: [
      { playerId: P_ALICE, playerName: 'Alice', score: 10, rank: 1, isWinner: true },
      { playerId: P_BOB, playerName: 'Bob', score: 9, rank: 2, isWinner: false },
      { playerId: P_CHARLIE, playerName: 'Charlie', score: 7, rank: 3, isWinner: false },
      { playerId: P_DANA, playerName: 'Dana', score: 6, rank: 4, isWinner: false },
    ],
  });

  // Match 2: Wingspan (75 min)
  // Bob wins (92), Charlie 2nd (88), Alice 3rd (81), Dana 4th (74)
  useSessionStore.getState().addSession({
    gameId: 'game-wingspan',
    gameName: 'Wingspan',
    gameThumbnail: '',
    datePlayed: '2026-11-07T19:30:00.000Z',
    durationMinutes: 75,
    firstPlayerMethod: 'previous_loser',
    winnerId: P_BOB,
    players: [
      { playerId: P_BOB, playerName: 'Bob', score: 92, rank: 1, isWinner: true },
      { playerId: P_CHARLIE, playerName: 'Charlie', score: 88, rank: 2, isWinner: false },
      { playerId: P_ALICE, playerName: 'Alice', score: 81, rank: 3, isWinner: false },
      { playerId: P_DANA, playerName: 'Dana', score: 74, rank: 4, isWinner: false },
    ],
  });

  // Match 3: 7 Wonders (35 min)
  // Charlie wins (65), Alice 2nd (63 - narrow 2-point defeat!), Bob 3rd (58), Dana 4th (50)
  useSessionStore.getState().addSession({
    gameId: 'game-7wonders',
    gameName: '7 Wonders',
    gameThumbnail: '',
    datePlayed: '2026-11-07T21:00:00.000Z',
    durationMinutes: 35,
    firstPlayerMethod: 'manual',
    winnerId: P_CHARLIE,
    players: [
      { playerId: P_CHARLIE, playerName: 'Charlie', score: 65, rank: 1, isWinner: true },
      { playerId: P_ALICE, playerName: 'Alice', score: 63, rank: 2, isWinner: false },
      { playerId: P_BOB, playerName: 'Bob', score: 58, rank: 3, isWinner: false },
      { playerId: P_DANA, playerName: 'Dana', score: 50, rank: 4, isWinner: false },
    ],
  });

  const allSessions = useSessionStore.getState().sessions;
  assert.equal(allSessions.length, 3, 'Exactly 3 sessions recorded');

  // Compute comprehensive leaderboard stats from session history
  // replicating PlayerLeaderboardSection logic
  const statsMap = new Map<
    string,
    {
      playerId: string;
      plays: number;
      wins: number;
      secondPlaces: number;
      lastPlaces: number;
      closeLosses: number;
      uniqueGames: Set<string>;
    }
  >();

  players.forEach((p) => {
    statsMap.set(p.id, {
      playerId: p.id,
      plays: 0,
      wins: 0,
      secondPlaces: 0,
      lastPlaces: 0,
      closeLosses: 0,
      uniqueGames: new Set<string>(),
    });
  });

  allSessions.forEach((s) => {
    const totalP = s.players.length;
    let maxScore = -Infinity;
    s.players.forEach((p) => {
      if (typeof p.score === 'number' && p.score > maxScore) {
        maxScore = p.score;
      }
    });

    s.players.forEach((ps) => {
      const st = statsMap.get(ps.playerId);
      if (!st) return;
      st.plays += 1;
      st.uniqueGames.add(s.gameName);

      if (ps.isWinner || s.winnerId === ps.playerId) {
        st.wins += 1;
      } else {
        if (ps.rank === 2) {
          st.secondPlaces += 1;
          if (
            typeof ps.score === 'number' &&
            maxScore > -Infinity &&
            maxScore - ps.score <= 2 &&
            maxScore - ps.score > 0
          ) {
            st.closeLosses += 1;
          }
        }
        if (totalP > 1 && ps.rank === totalP) {
          st.lastPlaces += 1;
        }
      }
    });
  });

  // Verify Alice stats
  const alice = statsMap.get(P_ALICE)!;
  assert.equal(alice.plays, 3);
  assert.equal(alice.wins, 1);
  assert.equal(alice.secondPlaces, 1); // 2nd in Match 3
  assert.equal(alice.closeLosses, 1); // Lost by 2 pts (65 vs 63) in Match 3
  assert.equal(alice.lastPlaces, 0);
  assert.equal(alice.uniqueGames.size, 3);

  // Verify Bob stats
  const bob = statsMap.get(P_BOB)!;
  assert.equal(bob.plays, 3);
  assert.equal(bob.wins, 1);
  assert.equal(bob.secondPlaces, 1); // 2nd in Match 1
  assert.equal(bob.closeLosses, 1); // Lost by 1 pt (10 vs 9) in Match 1
  assert.equal(bob.lastPlaces, 0);
  assert.equal(bob.uniqueGames.size, 3);

  // Verify Charlie stats
  const charlie = statsMap.get(P_CHARLIE)!;
  assert.equal(charlie.plays, 3);
  assert.equal(charlie.wins, 1);
  assert.equal(charlie.secondPlaces, 1); // 2nd in Match 2
  assert.equal(charlie.lastPlaces, 0);
  assert.equal(charlie.uniqueGames.size, 3);

  // Verify Dana stats (Wooden Spoon champion)
  const dana = statsMap.get(P_DANA)!;
  assert.equal(dana.plays, 3);
  assert.equal(dana.wins, 0);
  assert.equal(dana.secondPlaces, 0);
  assert.equal(dana.lastPlaces, 3); // Last in all 3 matches
  assert.equal(dana.uniqueGames.size, 3);

  // Verify Head-to-Head between Alice and Dana
  const h2hAliceDana = calculateHeadToHead(
    [players.find((p) => p.id === P_ALICE)!, players.find((p) => p.id === P_DANA)!],
    allSessions
  );
  assert.equal(h2hAliceDana.sharedSessionsCount, 3);
  const aliceH2h = h2hAliceDana.playerStats.find((s) => s.player.id === P_ALICE);
  const danaH2h = h2hAliceDana.playerStats.find((s) => s.player.id === P_DANA);
  assert.equal(aliceH2h?.winsInShared, 1);
  assert.equal(danaH2h?.winsInShared, 0);
});

// ============================================================================
// TIER 5: Adversarial, Integrity & Mutation Edge Cases
// ============================================================================

test('Tier 5 (Adversarial): Negative scores, co-op multi-winner ties and special strings handle safely', () => {
  resetStore([]);

  // 1. Negative scores in games with penalties
  useSessionStore.getState().addSession({
    gameId: 'game-penalty',
    gameName: 'Penalty Boardgame',
    gameThumbnail: '',
    datePlayed: '2026-11-07T12:00:00.000Z',
    firstPlayerMethod: 'manual',
    winnerId: 'player-p1',
    players: [
      { playerId: 'player-p1', playerName: 'Player Positive', score: 12, rank: 1, isWinner: true },
      { playerId: 'player-p2', playerName: 'Player Negative', score: -18, rank: 2, isWinner: false },
    ],
  });

  const penaltyStats = calculateGameStats(useSessionStore.getState().sessions);
  assert.equal(penaltyStats.highestScore?.score, 12);
  assert.equal(penaltyStats.lowestScore?.score, -18, 'Lowest score must correctly be -18');

  // 2. Cooperative game tie: all players win
  useSessionStore.getState().addSession({
    gameId: 'game-pandemic',
    gameName: 'Pandemic',
    gameThumbnail: '',
    datePlayed: '2026-11-07T14:00:00.000Z',
    firstPlayerMethod: 'manual',
    winnerId: 'coop-victory',
    players: [
      { playerId: 'p1', playerName: 'Medic', score: 100, rank: 1, isWinner: true },
      { playerId: 'p2', playerName: 'Researcher', score: 100, rank: 1, isWinner: true },
      { playerId: 'p3', playerName: 'Scientist', score: 100, rank: 1, isWinner: true },
    ],
  });

  const p1Streaks = calculatePlayerStreaks('p1', useSessionStore.getState().sessions);
  const p2Streaks = calculatePlayerStreaks('p2', useSessionStore.getState().sessions);
  const p3Streaks = calculatePlayerStreaks('p3', useSessionStore.getState().sessions);

  assert.equal(p1Streaks.longestWinStreak.count, 1);
  assert.equal(p2Streaks.longestWinStreak.count, 1);
  assert.equal(p3Streaks.longestWinStreak.count, 1);

  // 3. Special characters & XSS payload injection resistance
  const xssNotes = '<script>alert("xss")</script> & <test> "quotes"';
  const unicodeGameName = 'Cờ Tỷ Phú 🎲 🏰 (Phiên Bản Đặc Biệt)';

  const specialSession = useSessionStore.getState().addSession({
    gameId: 'game-unicode',
    gameName: unicodeGameName,
    gameThumbnail: '',
    datePlayed: '2026-11-07T16:00:00.000Z',
    firstPlayerMethod: 'manual',
    winnerId: 'p1',
    players: [{ playerId: 'p1', playerName: 'Huy Nguyễn', score: 50, isWinner: true }],
    notes: xssNotes,
  });

  const retrieved = useSessionStore.getState().getSessionById(specialSession.id);
  assert.equal(retrieved?.notes, xssNotes, 'Notes must preserve exact payload without corruption');
  assert.equal(retrieved?.gameName, unicodeGameName, 'Game name must preserve exact Unicode string');
});

test('Tier 5 (Integrity): updateSession and deleteSession maintain state consistency and reactive queries', () => {
  resetStore([]);

  // Add session
  const session = useSessionStore.getState().addSession({
    gameId: 'game-mutable',
    gameName: 'Mutable Game',
    gameThumbnail: '',
    datePlayed: '2026-11-07T10:00:00.000Z',
    firstPlayerMethod: 'manual',
    winnerId: 'p1',
    players: [
      { playerId: 'p1', playerName: 'Player 1', score: 50, rank: 1, isWinner: true },
      { playerId: 'p2', playerName: 'Player 2', score: 40, rank: 2, isWinner: false },
    ],
  });

  // 1. Update session (correcting score typo)
  useSessionStore.getState().updateSession(session.id, {
    notes: 'Corrected score note',
    players: [
      { playerId: 'p1', playerName: 'Player 1', score: 55, rank: 1, isWinner: true },
      { playerId: 'p2', playerName: 'Player 2', score: 40, rank: 2, isWinner: false },
    ],
  });

  let updated = useSessionStore.getState().getSessionById(session.id);
  assert.equal(updated?.notes, 'Corrected score note');
  assert.equal(updated?.players[0].score, 55);

  // 2. Delete session
  useSessionStore.getState().deleteSession(session.id);

  assert.equal(useSessionStore.getState().sessions.length, 0);
  assert.equal(useSessionStore.getState().getSessionById(session.id), undefined);
  assert.equal(useSessionStore.getState().getSessionsByGame('game-mutable').length, 0);
  assert.equal(useSessionStore.getState().getSessionsByPlayer('p1').length, 0);
});

test('Tier 5 (Integrity): datePlayed timezone rollover protection preserves exact calendar date across all hours of the day', () => {
  resetStore([]);

  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  const formatIsoWithWallClock = (dateStr: string, mockDate: Date) => {
    const timeStr = `${pad(mockDate.getHours())}:${pad(mockDate.getMinutes())}:${pad(mockDate.getSeconds())}.${pad(mockDate.getMilliseconds(), 3)}Z`;
    const cleanDate = (dateStr || '').split('T')[0] || new Date().toISOString().slice(0, 10);
    return `${cleanDate}T${timeStr}`;
  };

  // Test across multiple boundary hours including midnight and early morning (00:00 - 06:59)
  // which previously failed in timezones ahead of UTC (e.g. UTC+7) when using new Date(...).toISOString()
  const testCases = [
    { date: '2026-11-07', hours: 0, minutes: 15, seconds: 30, ms: 123 }, // 00:15:30
    { date: '2026-11-07', hours: 3, minutes: 45, seconds: 0, ms: 50 },   // 03:45:00
    { date: '2026-11-07', hours: 6, minutes: 59, seconds: 59, ms: 999 }, // 06:59:59
    { date: '2026-11-07', hours: 12, minutes: 0, seconds: 0, ms: 0 },    // 12:00:00
    { date: '2026-11-07', hours: 23, minutes: 59, seconds: 59, ms: 999 },// 23:59:59
    { date: '2026-03-01', hours: 1, minutes: 0, seconds: 0, ms: 0 },     // month boundary
    { date: '2026-01-01', hours: 0, minutes: 1, seconds: 0, ms: 0 },     // year boundary
  ];

  for (const tc of testCases) {
    const mockNow = new Date(2026, 10, 7, tc.hours, tc.minutes, tc.seconds, tc.ms);
    const computedIso = formatIsoWithWallClock(tc.date, mockNow);

    // 1. Prefix must strictly match selected date without any timezone rollover shift
    assert.equal(
      computedIso.slice(0, 10),
      tc.date,
      `Calendar date must never roll over for date=${tc.date} at hour=${tc.hours}`
    );

    // 2. Format must match ISO 8601 specification
    assert.match(
      computedIso,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      `Computed timestamp must be valid ISO format: ${computedIso}`
    );

    // 3. Adding to session store must preserve exact datePlayed string without truncation or shift
    const session = useSessionStore.getState().addSession({
      gameId: 'game-catan',
      gameName: 'Catan',
      gameThumbnail: '',
      datePlayed: computedIso,
      firstPlayerMethod: 'manual',
      winnerId: 'player-test',
      players: [{ playerId: 'player-test', playerName: 'Test Player', score: 10, isWinner: true }],
    });

    const retrieved = useSessionStore.getState().getSessionById(session.id);
    assert.ok(retrieved);
    assert.equal(retrieved.datePlayed, computedIso);
    assert.equal(retrieved.datePlayed.slice(0, 10), tc.date);
  }
});

