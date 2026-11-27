import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getScoringTemplateForGame,
  computeSheetPlayerTotal,
  ScoringCategory,
} from './scoringPresets';
import {
  getTotalPlayDurationMinutes,
  getTotalPlayHours,
  pluralize,
  formatPlayerRange,
  shuffleArray,
  findPreviousLoser,
} from './utils';
import { decodeHtml, importBGGCollection, saveBGGSettings } from './bgg';
import { safeParseIsoDate, parseImportFile, parseBGCatalogJsonObject } from './importer';
import { normalizeSessionResult, resolveSessionLowestScoreWins, resolveSessionTeamScore } from './sessionResults';
import { buildSessionShareCardData } from './shareCard';
import { validateRestoreData } from './restoreValidation';
import {
  saveMediaImage,
  getMediaImage,
  collectReferencedMediaKeys,
  pruneOrphanMedia,
} from './mediaStorage';
import {
  filterWhatToPlayGames,
  countDustyGames,
  GamePlayMetrics,
} from '../components/game/WhatToPlayModal';
import { useGameStore } from '../store/useGameStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useSessionStore } from '../store/useSessionStore';
import { BoardGame, PlaySession, Player } from '../types';

function makeGame(overrides: Partial<BoardGame> = {}): BoardGame {
  return {
    id: overrides.id ?? 'g1',
    name: overrides.name ?? 'Test Game',
    thumbnail: overrides.thumbnail ?? '',
    image: overrides.image ?? '',
    description: overrides.description ?? '',
    yearPublished: overrides.yearPublished ?? 2024,
    minPlayers: overrides.minPlayers ?? 2,
    maxPlayers: overrides.maxPlayers ?? 4,
    playingTime: overrides.playingTime ?? 60,
    status: overrides.status ?? 'own',
    addedDate: overrides.addedDate ?? '2026-01-01T00:00:00.000Z',
    tags: overrides.tags ?? [],
    ...overrides,
  };
}

function makeSession(overrides: Partial<PlaySession> = {}): PlaySession {
  return {
    id: overrides.id ?? 's1',
    gameId: overrides.gameId ?? 'g1',
    gameName: overrides.gameName ?? 'Brass: Birmingham',
    gameThumbnail: overrides.gameThumbnail ?? '',
    datePlayed: overrides.datePlayed ?? '2026-05-01T12:00:00.000Z',
    durationMinutes: overrides.durationMinutes,
    firstPlayerMethod: overrides.firstPlayerMethod ?? 'manual',
    players: overrides.players ?? [],
    createdAt: overrides.createdAt ?? '2026-05-01T12:00:00.000Z',
    ...overrides,
  };
}

// ============================================================================
// 1. Scoring Presets & Custom Category Aggregation (Ark Nova + Custom Rows)
// ============================================================================

test('Ark Nova computeTotal & computeSheetPlayerTotal include user-added custom categories', () => {
  const arkNova = getScoringTemplateForGame('Ark Nova');
  assert.ok(arkNova.computeTotal, 'Ark Nova template should provide computeTotal');

  // Conservation <= 10: Appeal + 2*Conservation - 100
  // Appeal 60, Conservation 8 (2*8=16) -> 60 + 16 - 100 = -24
  assert.equal(arkNova.computeTotal({ appeal: 60, conservation: 8 }), -24);

  // Conservation > 10: Appeal + (20 + 3*(c - 10)) - 100
  // Appeal 80, Conservation 14 -> 80 + (20 + 12) - 100 = 12
  assert.equal(arkNova.computeTotal({ appeal: 80, conservation: 14 }), 12);

  // Add custom positive & negative categories via computeSheetPlayerTotal
  const baseIds = arkNova.categories.map((c) => c.id);
  const extendedCategories: ScoringCategory[] = [
    ...arkNova.categories,
    { id: 'custom_bonus', name: 'Marine Worlds Bonus', multiplier: 1 },
    { id: 'custom_penalty', name: 'House Rule Penalty', multiplier: -1 },
  ];

  const total = computeSheetPlayerTotal(
    {
      appeal: 80,
      conservation: 14, // base = 12
      custom_bonus: 7, // +7
      custom_penalty: 3, // -3
    },
    extendedCategories,
    arkNova.computeTotal,
    baseIds
  );
  assert.equal(total, 16);

  // Also ensure direct computeTotal fallback sums unexpected keys
  assert.equal(
    arkNova.computeTotal({ appeal: 80, conservation: 14, extra_bonus: 5 }),
    17
  );
});

test('computeSheetPlayerTotal handles standard templates with positive and penalty multipliers', () => {
  const cats: ScoringCategory[] = [
    { id: 'a', name: 'Base', multiplier: 1 },
    { id: 'b', name: 'Bonus', multiplier: 2 },
    { id: 'c', name: 'Penalty', multiplier: -1 },
  ];
  assert.equal(computeSheetPlayerTotal({ a: 10, b: 4, c: 5 }, cats), 13);
  // Negative number typed into penalty row should still subtract abs value
  assert.equal(computeSheetPlayerTotal({ a: 10, b: 4, c: -5 }, cats), 13);
});

test('Co-op scoring templates expose isCoop flag cleanly', () => {
  const stardew = getScoringTemplateForGame('Stardew Valley: The Board Game');
  assert.equal(stardew.isCoop, true);
  const slayTheSpire = getScoringTemplateForGame('Slay the Spire: The Board Game');
  assert.equal(slayTheSpire.isCoop, true);
  const brass = getScoringTemplateForGame('Brass: Birmingham');
  assert.notEqual(brass.isCoop, true);
});

// ============================================================================
// 2. Unified Play Duration Helpers, Grammar Helpers, Shuffle & findPreviousLoser
// ============================================================================

test('getTotalPlayDurationMinutes & getTotalPlayHours never fabricate 60m for missing durations', () => {
  const sessions: PlaySession[] = [
    makeSession({ id: 's1', durationMinutes: 90 }),
    makeSession({ id: 's2', durationMinutes: undefined }),
    makeSession({ id: 's3', durationMinutes: 0 }),
    makeSession({ id: 's4', durationMinutes: -15 }),
    makeSession({ id: 's5', durationMinutes: 45 }),
  ];

  assert.equal(getTotalPlayDurationMinutes(sessions), 135);
  assert.equal(getTotalPlayHours(sessions), 2); // Math.round(135 / 60) = 2
  assert.equal(getTotalPlayDurationMinutes([]), 0);
  assert.equal(getTotalPlayHours([]), 0);
});

test('pluralize and formatPlayerRange produce grammatically accurate English labels', () => {
  assert.equal(pluralize(0, 'session'), '0 sessions');
  assert.equal(pluralize(1, 'session'), '1 session');
  assert.equal(pluralize(2, 'session'), '2 sessions');
  assert.equal(pluralize(1, 'match', 'matches'), '1 match');
  assert.equal(pluralize(4, 'match', 'matches'), '4 matches');

  assert.equal(formatPlayerRange(1, 1, 'full'), '1 player');
  assert.equal(formatPlayerRange(1, 1, 'short'), '1p');
  assert.equal(formatPlayerRange(2, 4, 'full'), '2–4 players');
  assert.equal(formatPlayerRange(2, 4, 'short'), '2–4p');
  assert.equal(formatPlayerRange(4, 2, 'full'), '2–4 players');
  assert.equal(formatPlayerRange(undefined, undefined, 'short'), '—');
});

test('shuffleArray returns permutation with identical elements without mutating input', () => {
  const original = [1, 2, 3, 4, 5, 6, 7, 8];
  const snapshot = [...original];
  const shuffled = shuffleArray(original);

  assert.deepEqual(original, snapshot, 'input array must not be mutated');
  assert.equal(shuffled.length, original.length);
  assert.deepEqual([...shuffled].sort((a, b) => a - b), original);
});

test('findPreviousLoser skips co-op sessions and respects lowestScoreWins', () => {
  const players: Player[] = [
    { id: 'p1', name: 'Alice', color: '#f00', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'p2', name: 'Bob', color: '#0f0', createdAt: '2026-01-01T00:00:00.000Z' },
  ];

  // Most recent session is co-op (must be skipped!); earlier session is competitive
  const sessions: PlaySession[] = [
    makeSession({
      id: 'coop-latest',
      gameId: 'g-coop',
      gameName: 'Spirit Island',
      datePlayed: '2026-06-10T12:00:00.000Z',
      isCoop: true,
      players: [
        { playerId: 'p1', playerName: 'Alice', isWinner: true, score: 0 },
        { playerId: 'p2', playerName: 'Bob', isWinner: true, score: 0 },
      ],
    }),
    makeSession({
      id: 'comp-prev',
      gameId: 'g-brass',
      gameName: 'Brass: Birmingham',
      datePlayed: '2026-06-05T12:00:00.000Z',
      isCoop: false,
      players: [
        { playerId: 'p1', playerName: 'Alice', isWinner: true, score: 145, rank: 1 },
        { playerId: 'p2', playerName: 'Bob', isWinner: false, score: 112, rank: 2 },
      ],
    }),
  ];

  const loser = findPreviousLoser(players, sessions, 'g-coop');
  assert.ok(loser);
  assert.equal(loser.session.id, 'comp-prev');
  assert.equal(loser.player.id, 'p2');

  // If ONLY co-op sessions exist, findPreviousLoser returns null
  const onlyCoop = findPreviousLoser(players, [sessions[0]], 'g-coop');
  assert.equal(onlyCoop, null);

  // Lowest-score-wins detection (highest score loses)
  const lowWinsSession = makeSession({
    id: 'low-wins',
    gameId: 'g-golf',
    gameName: 'Skyjo',
    lowestScoreWins: true,
    datePlayed: '2026-06-12T12:00:00.000Z',
    isCoop: false,
    players: [
      { playerId: 'p1', playerName: 'Alice', isWinner: true, score: 18 },
      { playerId: 'p2', playerName: 'Bob', isWinner: false, score: 74 },
    ],
  });
  // The persisted session snapshot overrides a conflicting current game rule.
  const gamesById = new Map([['g-golf', makeGame({ id: 'g-golf', lowestScoreWins: false })]]);
  const lowWinsLoser = findPreviousLoser(players, [lowWinsSession], 'g-golf', gamesById);
  assert.ok(lowWinsLoser);
  assert.equal(lowWinsLoser.player.id, 'p2');
});

// ============================================================================
// 3. WhatToPlayModal: Non-Overlapping Duration Buckets & Scoped Dusty Gems Count
// ============================================================================

test('filterWhatToPlayGames uses strictly non-overlapping duration buckets', () => {
  const games: BoardGame[] = [
    makeGame({ id: 'g0', name: 'Unknown Time', playingTime: 0 }),
    makeGame({ id: 'g29', name: '29m Filler', playingTime: 29 }),
    makeGame({ id: 'g30', name: '30m Boundary', playingTime: 30 }),
    makeGame({ id: 'g60', name: '60m Boundary', playingTime: 60 }),
    makeGame({ id: 'g61', name: '61m Mid', playingTime: 61 }),
    makeGame({ id: 'g120', name: '120m Boundary', playingTime: 120 }),
    makeGame({ id: 'g121', name: '121m Heavy', playingTime: 121 }),
  ];

  const ids = (filter: '<30m' | '30-60m' | '60-120m' | '120m+') =>
    filterWhatToPlayGames(games, { shelfOnly: true, durationFilter: filter }).map((g) => g.id);

  assert.deepEqual(ids('<30m'), ['g29']);
  assert.deepEqual(ids('30-60m'), ['g30', 'g60']);
  assert.deepEqual(ids('60-120m'), ['g61', 'g120']);
  assert.deepEqual(ids('120m+'), ['g121']);

  // Verify every positive-duration game appears in EXACTLY ONE bucket
  const allBucketed = [...ids('<30m'), ...ids('30-60m'), ...ids('60-120m'), ...ids('120m+')];
  assert.equal(allBucketed.length, 6);
  assert.equal(new Set(allBucketed).size, 6);
});

test('countDustyGames strictly respects On Shelf vs All Games and excludes sold/wishlist/prev_owned', () => {
  const games: BoardGame[] = [
    makeGame({ id: 'own-dusty', status: 'own' }),
    makeGame({ id: 'own-fresh', status: 'own' }),
    makeGame({ id: 'borrowed-dusty', status: 'borrowed' }),
    makeGame({ id: 'rented-dusty', status: 'rented' }),
    makeGame({ id: 'lent-dusty', status: 'lent_out' }),
    makeGame({ id: 'sold-dusty', status: 'sold' }),
    makeGame({ id: 'wish-dusty', status: 'wishlist' }),
    makeGame({ id: 'prev-dusty', status: 'previously_owned' }),
  ];

  const metrics: Record<string, GamePlayMetrics> = {
    'own-dusty': { playCount: 0, isDusty: true },
    'own-fresh': { playCount: 5, daysSinceLastPlayed: 2, isDusty: false },
    'borrowed-dusty': { playCount: 0, isDusty: true },
    'rented-dusty': { playCount: 0, isDusty: true },
    'lent-dusty': { playCount: 0, isDusty: true },
    'sold-dusty': { playCount: 0, isDusty: true },
    'wish-dusty': { playCount: 0, isDusty: true },
    'prev-dusty': { playCount: 0, isDusty: true },
  };

  // On Shelf (shelfOnly = true): keeps own and borrowed dusty games (2 total), excludes rented, lent_out, sold, wishlist, prev_owned
  assert.equal(countDustyGames(games, true, metrics), 2, 'On Shelf counts own and borrowed dusty games');
  assert.equal(
    countDustyGames(games, false, metrics),
    4,
    'All Games includes own/borrowed/rented/lent dusty games but excludes sold/wishlist/previously_owned'
  );
});

// ============================================================================
// 4. BGG HTML Entity Decoding & 202 Retry + Explicit Error (No Silent Mock Fallback)
// ============================================================================

test('decodeHtml decodes named, apostrophe, typographic, and numeric HTML entities', () => {
  assert.equal(
    decodeHtml('Darwin&apos;s Journey &mdash; Collector&#39;s Edition&nbsp;&amp;&nbsp;More'),
    "Darwin's Journey — Collector's Edition & More"
  );
  assert.equal(decodeHtml('Player&rsquo;s Choice &#8217;26 &#x2014; Top &ldquo;Pick&rdquo;'), "Player’s Choice ’26 — Top “Pick”");
  assert.equal(decodeHtml('&lt;tag&gt; &quot;quoted&quot;'), '<tag> "quoted"');
});

test('importBGGCollection retries HTTP 202 and throws explicit error on persistent failure instead of mocking', async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = (globalThis as unknown as Record<string, unknown>).window;
  const originalLocalStorage = (globalThis as unknown as Record<string, unknown>).localStorage;

  const store = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };

  (globalThis as unknown as Record<string, unknown>).localStorage = mockLocalStorage;
  (globalThis as unknown as Record<string, unknown>).window = { localStorage: mockLocalStorage };

  try {
    saveBGGSettings('https://bgg-proxy.example.com/api', '');

    // Case 1: 202 Accepted on first attempt, then 200 JSON on second attempt
    let attempts = 0;
    globalThis.fetch = (async () => {
      attempts++;
      if (attempts === 1) {
        return new Response('Queued', { status: 202 });
      }
      return new Response(
        JSON.stringify([
          {
            bggId: '224517',
            name: 'Brass: Birmingham',
            yearPublished: 2018,
            minPlayers: 2,
            maxPlayers: 4,
            playingTime: 120,
            bggRating: 8.6,
            description: 'Economic Euro',
            thumbnail: '',
            image: '',
            tags: ['Strategy'],
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch;

    const imported = await importBGGCollection('heo_user', { maxRetries: 2, retryDelayMs: 5 });
    assert.equal(attempts, 2);
    assert.equal(imported.length, 1);
    assert.equal(imported[0].name, 'Brass: Birmingham');

    // Case 2: Persistent HTTP 202 throws explicit error (never returns mock catalog)
    let retryCount = 0;
    globalThis.fetch = (async () => {
      retryCount++;
      return new Response('Still building', { status: 202 });
    }) as typeof fetch;

    await assert.rejects(
      () => importBGGCollection('heo_user', { maxRetries: 2, retryDelayMs: 5 }),
      /HTTP 202 Accepted/
    );
    assert.equal(retryCount, 3); // initial attempt + 2 retries

    // Case 3: HTTP 500 throws explicit error
    globalThis.fetch = (async () => new Response('Server Error', { status: 500 })) as typeof fetch;
    await assert.rejects(
      () => importBGGCollection('heo_user', { maxRetries: 1, retryDelayMs: 5 }),
      /HTTP 500/
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) {
      delete (globalThis as unknown as Record<string, unknown>).window;
    } else {
      (globalThis as unknown as Record<string, unknown>).window = originalWindow;
    }
    if (originalLocalStorage === undefined) {
      delete (globalThis as unknown as Record<string, unknown>).localStorage;
    } else {
      (globalThis as unknown as Record<string, unknown>).localStorage = originalLocalStorage;
    }
  }
});

// ============================================================================
// 5. Importer: safeParseIsoDate & CSV/BG Catalog Parsing
// ============================================================================

test('safeParseIsoDate handles Z, offsets, SQLite space timestamps, bare dates, and invalid values', () => {
  const fallback = '2026-01-01T00:00:00.000Z';

  assert.equal(safeParseIsoDate('2025-11-05T14:30:00.000Z', fallback), '2025-11-05T14:30:00.000Z');
  assert.equal(safeParseIsoDate('2025-11-05T21:30:00+07:00', fallback), '2025-11-05T14:30:00.000Z');
  assert.equal(safeParseIsoDate('2025-11-05 14:30:00', fallback), '2025-11-05T14:30:00.000Z');
  assert.equal(safeParseIsoDate('2025-11-05 14:30:00Z', fallback), '2025-11-05T14:30:00.000Z');
  assert.equal(safeParseIsoDate('2025-11-05', fallback), '2025-11-05T00:00:00.000Z');
  assert.equal(safeParseIsoDate('not-a-valid-date', fallback), fallback);
  assert.equal(safeParseIsoDate('', fallback), fallback);
  assert.equal(safeParseIsoDate(undefined, fallback), fallback);
});

test('parseImportFile parses quoted CSV fields and parseBGCatalogJsonObject safely parses mixed dates', () => {
  const csv = [
    'Name,MinPlayers,MaxPlayers,PlayingTime,Status,Notes',
    '"Brass: Birmingham, Deluxe",2,4,120,own,"Top ""favorite"" euro"',
  ].join('\n');

  const items = parseImportFile(csv);
  assert.equal(items.length, 1);
  assert.equal(items[0].name, 'Brass: Birmingham, Deluxe');
  assert.equal(items[0].playingTime, 120);
  assert.equal(items[0].notes, 'Top "favorite" euro');

  const parsed = parseBGCatalogJsonObject({
    games: [
      { id: 1, name: 'Faraway', addedDate: '2025-08-10T10:00:00Z', own: 1, minPlayers: 2, maxPlayers: 6 },
    ],
    players: [{ id: 10, name: 'Heo' }],
    plays: [
      { id: 100, gameId: 1, playDate: '2025-09-01 19:00:00+07:00', length: 25 },
      { id: 101, gameId: 1, playDate: 'invalid-date-string', length: 20 },
    ],
    playersPlays: [
      { playId: 100, playerId: 10, score: 58, winner: 1 },
      { playId: 101, playerId: 10, score: 42, winner: 0 },
    ],
  });

  assert.equal(parsed.games.length, 1);
  assert.equal(parsed.sessions.length, 2);
  assert.equal(parsed.sessions[0].datePlayed, '2025-09-01T12:00:00.000Z');
  assert.ok(!Number.isNaN(new Date(parsed.sessions[1].datePlayed).getTime()));
});

// ============================================================================
// 6. Canonical Session Results, Snapshots & Compatibility
// ============================================================================

test('normalizeSessionResult only ranks complete point totals and preserves zero scores', () => {
  const partial = normalizeSessionResult({
    mode: 'points',
    players: [
      { playerId: 'a', playerName: 'Alice', score: 10, isWinner: false },
      { playerId: 'b', playerName: 'Bob', isWinner: false },
    ],
  });
  assert.deepEqual(partial.winnerIds, []);
  assert.equal(partial.players[0].rank, undefined);
  assert.match(partial.errors[0], /every player/i);

  const tiedZero = normalizeSessionResult({
    mode: 'points',
    players: [
      { playerId: 'a', playerName: 'Alice', score: 0, isWinner: false },
      { playerId: 'b', playerName: 'Bob', score: 0, isWinner: false },
      { playerId: 'c', playerName: 'Cara', score: -2, isWinner: false },
    ],
  });
  assert.deepEqual(tiedZero.winnerIds, ['a', 'b']);
  assert.deepEqual(tiedZero.players.map((player) => player.rank), [1, 1, 3]);
  assert.equal(tiedZero.players[0].isWinner, true);

  const lowWins = normalizeSessionResult({
    mode: 'points',
    lowestScoreWins: true,
    players: [
      { playerId: 'a', playerName: 'Alice', score: 12, isWinner: false },
      { playerId: 'b', playerName: 'Bob', score: 4, isWinner: false },
    ],
  });
  assert.deepEqual(lowWins.winnerIds, ['b']);
  assert.deepEqual(lowWins.players.map((player) => player.rank), [2, 1]);
});

test('normalizeSessionResult keeps co-op team outcome separate from individual points', () => {
  const won = normalizeSessionResult({
    mode: 'coop',
    coopOutcome: 'won',
    players: [
      { playerId: 'a', playerName: 'Alice', score: 182, isWinner: false },
      { playerId: 'b', playerName: 'Bob', score: 182, isWinner: false },
    ],
  });
  assert.deepEqual(won.winnerIds, ['a', 'b']);
  assert.equal(won.winnerId, undefined);
  assert.deepEqual(won.players.map((player) => player.score), [undefined, undefined]);
  assert.deepEqual(won.players.map((player) => player.isWinner), [true, true]);
});

test('session snapshots override changed game rules in Share Card and restore validation accepts new fields', () => {
  const game = makeGame({ id: 'g-snapshot', lowestScoreWins: false });
  const session = makeSession({
    id: 's-snapshot',
    gameId: game.id,
    gameName: game.name,
    scoringMode: 'points',
    lowestScoreWins: true,
    winnerIds: ['b'],
    players: [
      { playerId: 'a', playerName: 'Alice', score: 12, rank: 2, isWinner: false },
      { playerId: 'b', playerName: 'Bob', score: 4, rank: 1, isWinner: true },
    ],
    scoringSheetSnapshot: {
      templateName: 'Archived Sheet',
      formulaVersion: 1,
      categories: [{ id: 'bonus', name: 'Bonus', multiplier: 1 }],
    },
  });
  assert.equal(resolveSessionLowestScoreWins(session, game), true);
  const card = buildSessionShareCardData(session, { game, allSessions: [session] });
  assert.equal(card.lowestScoreWins, true);
  assert.equal(card.leaderboard?.[0].playerName, 'Bob');
  assert.equal(card.leaderboard?.[0].isWinner, true);

  const restored = validateRestoreData(
    { games: [], players: [], locations: [], sessions: [session] },
    { games: false, players: false, locations: false, sessions: true }
  );
  assert.deepEqual(restored, { ok: true });
});

test('BG Catalog import does not fabricate ranks for incomplete scores', () => {
  const parsed = parseBGCatalogJsonObject({
    games: [{ id: 1, name: 'Custom Game', own: 1, minPlayers: 2, maxPlayers: 4 }],
    players: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
    plays: [{ id: 1, gameId: 1, playDate: '2026-01-01', length: 0 }],
    playersPlays: [
      { playId: 1, playerId: 1, score: 10, winner: 1 },
      { playId: 1, playerId: 2, score: '', winner: 0 },
    ],
  });
  assert.equal(parsed.sessions[0].players[0].rank, undefined);
  assert.equal(parsed.sessions[0].players[1].rank, undefined);
  assert.deepEqual(parsed.sessions[0].winnerIds, ['player-1']);
});

test('resolveSessionTeamScore and Share Card support zero and legacy copied co-op team scores', () => {
  const zeroTeamSession = makeSession({
    id: 's-coop-zero',
    scoringMode: 'coop',
    isCoop: true,
    coopOutcome: 'lost',
    teamScore: 0,
    players: [
      { playerId: 'a', playerName: 'Alice', isWinner: false },
      { playerId: 'b', playerName: 'Bob', isWinner: false },
    ],
  });
  assert.equal(resolveSessionTeamScore(zeroTeamSession), 0);
  const zeroCard = buildSessionShareCardData(zeroTeamSession, { allSessions: [zeroTeamSession] });
  assert.equal(zeroCard.mode, 'coop');
  assert.equal(zeroCard.teamScoreFormatted, '0');

  const legacyCoopSession = makeSession({
    id: 's-coop-legacy',
    scoringMode: 'coop',
    isCoop: true,
    coopOutcome: 'won',
    players: [
      { playerId: 'a', playerName: 'Alice', score: 182, isWinner: true },
      { playerId: 'b', playerName: 'Bob', score: 182, isWinner: true },
    ],
  });
  assert.equal(resolveSessionTeamScore(legacyCoopSession), 182);
  const legacyCard = buildSessionShareCardData(legacyCoopSession, { allSessions: [legacyCoopSession] });
  assert.equal(legacyCard.teamScoreFormatted, '182');
});

// ============================================================================
// 7. MediaStorage: Orphan Pruning Preserves Game/Player/Session/Draft Refs
// ============================================================================

test('pruneOrphanMedia removes unreferenced media while keeping game, player, session, and draft refs', async () => {
  const prevGames = useGameStore.getState().games;
  const prevPlayers = usePlayerStore.getState().players;
  const prevSessions = useSessionStore.getState().sessions;
  const originalWindow = (globalThis as unknown as Record<string, unknown>).window;

  const lsMap = new Map<string, string>();
  const mockLs = {
    getItem: (k: string) => lsMap.get(k) ?? null,
    setItem: (k: string, v: string) => {
      lsMap.set(k, v);
    },
    removeItem: (k: string) => {
      lsMap.delete(k);
    },
    clear: () => lsMap.clear(),
    key: (i: number) => Array.from(lsMap.keys())[i] ?? null,
    get length() {
      return lsMap.size;
    },
  };
  // Model committed IndexedDB records rather than relying on the old volatile fallback.
  const records = new Map<string, string>();
  const mockDb = {
    transaction() {
      const changes: Array<() => void> = [];
      let scheduled = false;
      const tx = {
        error: null,
        oncomplete: null as (() => void) | null,
        onerror: null as (() => void) | null,
        onabort: null as (() => void) | null,
        objectStore() {
          function makeRequest<T>(result: T, change?: () => void) {
            const req = { result, error: null, onsuccess: null as (() => void) | null, onerror: null as (() => void) | null };
            if (change) changes.push(change);
            queueMicrotask(() => req.onsuccess?.());
            if (!scheduled) {
              scheduled = true;
              setTimeout(() => { changes.forEach((apply) => apply()); tx.oncomplete?.(); }, 0);
            }
            return req;
          }
          return {
            put: (row: { id: string; data: string }) => makeRequest(row.id, () => records.set(row.id, row.data)),
            get: (id: string) => makeRequest(records.has(id) ? { id, data: records.get(id) } : undefined),
            getAllKeys: () => makeRequest(Array.from(records.keys())),
            delete: (id: string) => makeRequest(undefined, () => { records.delete(id); }),
          };
        },
      };
      return tx;
    },
    close() {},
    onversionchange: null,
  };
  const mockIndexedDB = {
    open() {
      const req = { result: mockDb, error: null, onsuccess: null as (() => void) | null, onerror: null as (() => void) | null };
      queueMicrotask(() => req.onsuccess?.());
      return req;
    },
  };
  (globalThis as unknown as Record<string, unknown>).window = { localStorage: mockLs, indexedDB: mockIndexedDB };

  try {
    const gameImgRef = await saveMediaImage('data:image/jpeg;base64,GAME_IMG');
    const playerAvatarRef = await saveMediaImage('data:image/jpeg;base64,PLAYER_AVATAR');
    const sessionPhotoRef = await saveMediaImage('data:image/jpeg;base64,SESSION_PHOTO');
    const draftPhotoRef = await saveMediaImage('data:image/jpeg;base64,DRAFT_PHOTO');
    const orphanRef = await saveMediaImage('data:image/jpeg;base64,ORPHAN_JUNK');
    assert.equal(records.size, 5, 'all media are committed to IndexedDB');

    useGameStore.setState({
      games: [makeGame({ id: 'g-media', image: gameImgRef, thumbnail: gameImgRef })],
    });
    usePlayerStore.setState({
      players: [
        {
          id: 'p-media',
          name: 'Heo',
          color: '#E5734F',
          avatar: playerAvatarRef,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    useSessionStore.setState({
      sessions: [makeSession({ id: 's-media', photos: [sessionPhotoRef] })],
    });
    mockLs.setItem(
      'boardgame_session_draft',
      JSON.stringify({ gameId: 'g-media', photos: [draftPhotoRef] })
    );

    const referenced = collectReferencedMediaKeys();
    assert.equal(referenced.size, 4);

    const { prunedCount, keptCount } = await pruneOrphanMedia();
    assert.equal(keptCount, 4);
    assert.ok(prunedCount >= 1);
    assert.equal(records.size, 4);
    assert.equal(records.has(orphanRef.slice('idb://'.length)), false);

    assert.equal(await getMediaImage(gameImgRef), 'data:image/jpeg;base64,GAME_IMG');
    assert.equal(await getMediaImage(playerAvatarRef), 'data:image/jpeg;base64,PLAYER_AVATAR');
    assert.equal(await getMediaImage(sessionPhotoRef), 'data:image/jpeg;base64,SESSION_PHOTO');
    assert.equal(await getMediaImage(draftPhotoRef), 'data:image/jpeg;base64,DRAFT_PHOTO');
    assert.equal(await getMediaImage(orphanRef), null);
  } finally {
    useGameStore.setState({ games: prevGames });
    usePlayerStore.setState({ players: prevPlayers });
    useSessionStore.setState({ sessions: prevSessions });
    if (originalWindow === undefined) {
      delete (globalThis as unknown as Record<string, unknown>).window;
    } else {
      (globalThis as unknown as Record<string, unknown>).window = originalWindow;
    }
  }
});
