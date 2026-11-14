import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatVND,
  formatNumberInput,
  parseNumberInput,
  formatDuration,
  calculateGameStats,
  calculateLongestWinStreak,
  calculateHeadToHead,
  getCollectionTotalValue,
  isDraftMatchingCompletedSession,
  calculateMinRequiredPlays,
} from './utils';
import { BoardGame, PlaySession, Player, SessionDraft } from '../types';

test('formatNumberInput and parseNumberInput handle commas in price fields', () => {
  assert.equal(formatNumberInput(1800000), '1,800,000');
  assert.equal(formatNumberInput('1800000'), '1,800,000');
  assert.equal(formatNumberInput('1,800,000'), '1,800,000');
  assert.equal(formatNumberInput('1.800.000'), '1,800,000');
  assert.equal(formatNumberInput('44000'), '44,000');
  assert.equal(formatNumberInput(''), '');
  assert.equal(formatNumberInput(undefined), '');

  assert.equal(parseNumberInput('1,800,000'), 1800000);
  assert.equal(parseNumberInput('44,000'), 44000);
  assert.equal(parseNumberInput(''), undefined);
  assert.equal(parseNumberInput(undefined), undefined);
});

test('formatVND formats Vietnamese Dong with dot separators and symbol', () => {
  assert.equal(formatVND(1500000), '1.500.000 ₫');
  assert.equal(formatVND(950000), '950.000 ₫');
  assert.equal(formatVND(0), '0 ₫');
  assert.equal(formatVND(undefined), '0 ₫');
});

test('formatDuration converts minutes to readable hours and minutes', () => {
  assert.equal(formatDuration(45), '45m');
  assert.equal(formatDuration(60), '1h');
  assert.equal(formatDuration(95), '1h 35m');
});

test('calculateGameStats computes plays, average duration, score records, and win rates', () => {
  const sampleSessions: PlaySession[] = [
    {
      id: 's1',
      gameId: 'g1',
      gameName: 'Wingspan',
      gameThumbnail: '',
      datePlayed: '2026-10-01T10:00:00.000Z',
      durationMinutes: 60,
      firstPlayerMethod: 'random_wheel',
      winnerId: 'p1',
      players: [
        { playerId: 'p1', playerName: 'Huy', score: 95, isWinner: true },
        { playerId: 'p2', playerName: 'Linh', score: 82, isWinner: false },
      ],
      createdAt: '2026-10-01T12:00:00.000Z',
    },
    {
      id: 's2',
      gameId: 'g1',
      gameName: 'Wingspan',
      gameThumbnail: '',
      datePlayed: '2026-10-05T10:00:00.000Z',
      durationMinutes: 80,
      firstPlayerMethod: 'random_wheel',
      winnerId: 'p2',
      players: [
        { playerId: 'p1', playerName: 'Huy', score: 78, isWinner: false },
        { playerId: 'p2', playerName: 'Linh', score: 102, isWinner: true },
      ],
      createdAt: '2026-10-05T12:00:00.000Z',
    },
  ];

  const stats = calculateGameStats(sampleSessions, 1);
  assert.equal(stats.totalPlays, 2);
  assert.equal(stats.averageDuration, 70);
  assert.deepEqual(stats.highestScore, {
    score: 102,
    playerName: 'Linh',
    date: '2026-10-05T10:00:00.000Z',
    sessionId: 's2',
  });
  assert.deepEqual(stats.lowestScore, {
    score: 78,
    playerName: 'Huy',
    date: '2026-10-05T10:00:00.000Z',
    sessionId: 's2',
  });
  assert.equal(stats.playerWinRates.length, 2);
  assert.equal(stats.playerWinRates[0].winRate, 50);
  assert.equal(stats.mostWinsPlayer?.playerName, 'Huy');
  assert.equal(stats.mostWinsPlayer?.lastWonSessionId, 's1');
  assert.equal(stats.mostLossesPlayer?.playerName, 'Huy');
  assert.equal(stats.mostLossesPlayer?.lastPlayedSessionId, 's2');
});

test('calculateGameStats accurately breaks ties for mostLossesPlayer', async () => {
  const { calculateGameStats } = await import('./utils');
  const sessions: PlaySession[] = [
    {
      id: 's1',
      gameId: 'g1',
      gameName: 'Test Game',
      gameThumbnail: '',
      datePlayed: '2026-01-01T10:00:00.000Z',
      firstPlayerMethod: 'manual',
      winnerId: 'winner',
      players: [
        { playerId: 'winner', playerName: 'Winner', isWinner: true, score: 50 },
        { playerId: 'p1', playerName: 'Player 1', isWinner: false, score: 30 },
        { playerId: 'p2', playerName: 'Player 2', isWinner: false, score: 20 },
      ],
      createdAt: '2026-01-01T11:00:00.000Z',
    },
    {
      id: 's2',
      gameId: 'g1',
      gameName: 'Test Game',
      gameThumbnail: '',
      datePlayed: '2026-01-02T10:00:00.000Z',
      firstPlayerMethod: 'manual',
      winnerId: 'winner',
      players: [
        { playerId: 'winner', playerName: 'Winner', isWinner: true, score: 60 },
        { playerId: 'p1', playerName: 'Player 1', isWinner: false, score: 40 },
        { playerId: 'p2', playerName: 'Player 2', isWinner: false, score: 25 },
      ],
      createdAt: '2026-01-02T11:00:00.000Z',
    },
  ];

  const stats = calculateGameStats(sessions, 1);
  // Both p1 and p2 have 2 losses and 2 plays. p2 has lower lowestScore (20 vs 30).
  assert.equal(stats.mostLossesPlayer?.playerName, 'Player 2');
  assert.equal(stats.mostLossesPlayer?.losses, 2);
});

test('calculateGameStats qualifies players with >= 5 plays and ranks by highest loss rate (Brass Birmingham scenario)', async () => {
  const { calculateGameStats } = await import('./utils');
  // 12 sessions of Brass Birmingham:
  // Winner: plays 12, wins 12 (0 losses)
  // Heo: plays 12, wins 1, loses 11 (11/12 = 91.67% loss rate)
  // Lộc: plays 8, wins 0, loses 8 (8/8 = 100% loss rate)
  // Guest: plays 2, wins 0, loses 2 (2/2 = 100% loss rate, but < 5 plays -> disqualified)
  const brassSessions: PlaySession[] = [];

  for (let i = 1; i <= 12; i++) {
    const isHeoWin = i === 1; // Heo wins 1 game
    const playersList: PlaySession['players'] = [
      { playerId: 'winner-1', playerName: 'Chị Quyên', isWinner: !isHeoWin, score: isHeoWin ? 120 : 150 },
      { playerId: 'heo-1', playerName: 'Heo', isWinner: isHeoWin, score: isHeoWin ? 155 : 110 },
    ];

    // Lộc joins the last 8 games and loses all 8
    if (i > 4) {
      playersList.push({ playerId: 'loc-1', playerName: 'Lộc', isWinner: false, score: 105 });
    }

    // Guest joins only sessions 1 and 2
    if (i <= 2) {
      playersList.push({ playerId: 'guest-1', playerName: 'Guest', isWinner: false, score: 80 });
    }

    brassSessions.push({
      id: `session-${i}`,
      gameId: 'brass-birmingham',
      gameName: 'Brass: Birmingham',
      datePlayed: `2026-02-${String(i).padStart(2, '0')}T10:00:00.000Z`,
      winnerId: isHeoWin ? 'heo-1' : 'winner-1',
      players: playersList,
      createdAt: `2026-02-${String(i).padStart(2, '0')}T12:00:00.000Z`,
    });
  }

  // Calculate with default threshold (5 plays minimum)
  const stats = calculateGameStats(brassSessions);

  // Lộc must beat Heo because 100% loss rate (8/8) > 92% loss rate (11/12).
  // Guest is disqualified despite 100% loss rate because Guest only played 2 sessions (< 5).
  assert.ok(stats.mostLossesPlayer);
  assert.equal(stats.mostLossesPlayer?.playerName, 'Lộc');
  assert.equal(stats.mostLossesPlayer?.losses, 8);
  assert.equal(stats.mostLossesPlayer?.plays, 8);
  assert.equal(stats.mostLossesPlayer?.lossRate, 100);
  assert.equal(stats.mostLossesPlayer?.lastPlayedSessionId, 'session-12');
});

test('calculateGameStats returns null for mostLossesPlayer when no player reaches the 5 plays threshold', async () => {
  const { calculateGameStats } = await import('./utils');
  const shortSessions: PlaySession[] = [
    {
      id: 's1',
      gameId: 'g-short',
      gameName: 'New Game',
      datePlayed: '2026-01-01T10:00:00.000Z',
      winnerId: 'p1',
      players: [
        { playerId: 'p1', playerName: 'Player 1', isWinner: true, score: 50 },
        { playerId: 'p2', playerName: 'Player 2', isWinner: false, score: 30 },
      ],
      createdAt: '2026-01-01T11:00:00.000Z',
    },
    {
      id: 's2',
      gameId: 'g-short',
      gameName: 'New Game',
      datePlayed: '2026-01-02T10:00:00.000Z',
      winnerId: 'p1',
      players: [
        { playerId: 'p1', playerName: 'Player 1', isWinner: true, score: 60 },
        { playerId: 'p2', playerName: 'Player 2', isWinner: false, score: 25 },
      ],
      createdAt: '2026-01-02T11:00:00.000Z',
    },
  ];

  const stats = calculateGameStats(shortSessions);
  // Default threshold is 5 plays -> Player 2 only has 2 plays -> does not qualify -> null
  assert.equal(stats.mostLossesPlayer, null);
});

test('calculateGameStats handles missing/undefined scores without poisoning records, preserving genuine 0 and negative scores', async () => {
  const { calculateGameStats } = await import('./utils');
  const sessions: PlaySession[] = [
    // Session 1: Faraway-like partial scores (Hằng has undefined)
    {
      id: 's1',
      gameId: 'g-faraway',
      gameName: 'Faraway',
      datePlayed: '2026-01-01T10:00:00.000Z',
      winnerId: 'p-heo',
      players: [
        { playerId: 'p-heo', playerName: 'Heo', isWinner: true, score: 71 },
        { playerId: 'p-loc', playerName: 'Lộc', isWinner: false, score: 51 },
        { playerId: 'p-hang', playerName: 'Hằng', isWinner: false, score: undefined },
      ],
      createdAt: '2026-01-01T11:00:00.000Z',
    },
    // Session 2: Co-op / win-loss session with no scores
    {
      id: 's2',
      gameId: 'g-faraway',
      gameName: 'Faraway',
      datePlayed: '2026-01-02T10:00:00.000Z',
      winnerId: 'p-heo',
      players: [
        { playerId: 'p-heo', playerName: 'Heo', isWinner: true },
        { playerId: 'p-loc', playerName: 'Lộc', isWinner: false },
        { playerId: 'p-hang', playerName: 'Hằng', isWinner: false },
      ],
      createdAt: '2026-01-02T11:00:00.000Z',
    },
  ];

  const stats = calculateGameStats(sessions);
  assert.equal(stats.highestScore?.score, 71);
  assert.equal(stats.highestScore?.playerName, 'Heo');
  // Lowest score must be 51 from Lộc, NOT 0 from undefined Hằng!
  assert.equal(stats.lowestScore?.score, 51);
  assert.equal(stats.lowestScore?.playerName, 'Lộc');

  // Now test genuine 0 score (e.g. Zoo Vadis)
  const zooVadisSessions: PlaySession[] = [
    {
      id: 'zv-1',
      gameId: 'g-zv',
      gameName: 'Zoo Vadis',
      datePlayed: '2026-01-01T10:00:00.000Z',
      winnerId: 'p-heo',
      players: [
        { playerId: 'p-heo', playerName: 'Heo', isWinner: true, score: 20 },
        { playerId: 'p-huy', playerName: 'Anh Huy', isWinner: false, score: 12 },
        { playerId: 'p-hang', playerName: 'Hằng', isWinner: false, score: 0 },
        { playerId: 'p-loc', playerName: 'Lộc', isWinner: false, score: 0 },
      ],
      createdAt: '2026-01-01T11:00:00.000Z',
    },
  ];
  const zvStats = calculateGameStats(zooVadisSessions);
  assert.equal(zvStats.highestScore?.score, 20);
  assert.equal(zvStats.lowestScore?.score, 0); // Legitimate 0 points
});

test('formatRecordTimeAgo formats dates and relative time in English accurately', async () => {
  const { formatRecordTimeAgo } = await import('./utils');
  const result = formatRecordTimeAgo('2025-05-10T10:00:00.000Z');
  assert.ok(result.includes('10/05/2025'));
  assert.ok(result.includes('ago'));
});

test('calculateLongestWinStreak tracks consecutive chronological wins accurately', () => {
  const sessions: PlaySession[] = [
    {
      id: '1',
      gameId: 'g1',
      gameName: 'Catan',
      gameThumbnail: '',
      datePlayed: '2026-08-01T10:00:00.000Z',
      firstPlayerMethod: 'manual',
      winnerId: 'p1',
      players: [{ playerId: 'p1', playerName: 'Huy', isWinner: true }],
      createdAt: '2026-08-01T11:00:00.000Z',
    },
    {
      id: '2',
      gameId: 'g1',
      gameName: 'Catan',
      gameThumbnail: '',
      datePlayed: '2026-08-02T10:00:00.000Z',
      firstPlayerMethod: 'manual',
      winnerId: 'p1',
      players: [{ playerId: 'p1', playerName: 'Huy', isWinner: true }],
      createdAt: '2026-08-02T11:00:00.000Z',
    },
    {
      id: '3',
      gameId: 'g1',
      gameName: 'Catan',
      gameThumbnail: '',
      datePlayed: '2026-08-03T10:00:00.000Z',
      firstPlayerMethod: 'manual',
      winnerId: 'p2',
      players: [{ playerId: 'p1', playerName: 'Huy', isWinner: false }],
      createdAt: '2026-08-03T11:00:00.000Z',
    },
    {
      id: '4',
      gameId: 'g1',
      gameName: 'Catan',
      gameThumbnail: '',
      datePlayed: '2026-08-04T10:00:00.000Z',
      firstPlayerMethod: 'manual',
      winnerId: 'p1',
      players: [{ playerId: 'p1', playerName: 'Huy', isWinner: true }],
      createdAt: '2026-08-04T11:00:00.000Z',
    },
  ];

  assert.equal(calculateLongestWinStreak('p1', sessions), 2);
});

test('calculateHeadToHead compares shared sessions between selected players', () => {
  const players: Player[] = [
    { id: 'p1', name: 'Huy', color: '#7c3aed', createdAt: '2026-01-01' },
    { id: 'p2', name: 'Linh', color: '#ec4899', createdAt: '2026-01-01' },
  ];
  const sessions: PlaySession[] = [
    {
      id: 's1',
      gameId: 'g1',
      gameName: 'Wingspan',
      gameThumbnail: '',
      datePlayed: '2026-09-01',
      firstPlayerMethod: 'random_wheel',
      winnerId: 'p1',
      players: [
        { playerId: 'p1', playerName: 'Huy', score: 90, isWinner: true },
        { playerId: 'p2', playerName: 'Linh', score: 85, isWinner: false },
      ],
      createdAt: '2026-09-01',
    },
  ];

  const h2h = calculateHeadToHead(players, sessions);
  assert.equal(h2h.sharedSessionsCount, 1);
  assert.equal(h2h.playerStats[0].winsInShared, 1);
  assert.equal(h2h.playerStats[0].winRateInShared, 100);
  assert.equal(h2h.playerStats[1].winsInShared, 0);
});

test('getCollectionTotalValue sums purchase prices of owned games only', () => {
  const games: BoardGame[] = [
    {
      id: '1',
      name: 'G1',
      thumbnail: '',
      image: '',
      description: '',
      minPlayers: 1,
      maxPlayers: 4,
      playingTime: 60,
      yearPublished: 2020,
      status: 'own',
      purchasePrice: 1000000,
      addedDate: '2026-01-01',
    },
    {
      id: '2',
      name: 'G2',
      thumbnail: '',
      image: '',
      description: '',
      minPlayers: 1,
      maxPlayers: 4,
      playingTime: 60,
      yearPublished: 2020,
      status: 'lent_out',
      purchasePrice: 500000,
      addedDate: '2026-01-01',
    },
    {
      id: '3',
      name: 'G3',
      thumbnail: '',
      image: '',
      description: '',
      minPlayers: 1,
      maxPlayers: 4,
      playingTime: 60,
      yearPublished: 2020,
      status: 'sold',
      purchasePrice: 800000,
      addedDate: '2026-01-01',
    },
    {
      id: '4',
      name: 'G4',
      thumbnail: '',
      image: '',
      description: '',
      minPlayers: 1,
      maxPlayers: 4,
      playingTime: 60,
      yearPublished: 2020,
      status: 'rented',
      purchasePrice: 350000,
      addedDate: '2026-01-01',
    },
    {
      id: '5',
      name: 'G5',
      thumbnail: '',
      image: '',
      description: '',
      minPlayers: 1,
      maxPlayers: 4,
      playingTime: 60,
      yearPublished: 2020,
      status: 'previously_owned',
      purchasePrice: 750000,
      addedDate: '2026-01-01',
    },
  ];

  assert.equal(getCollectionTotalValue(games), 1000000);
});

test('getScoringTemplateForGame resolves official Natera template correctly', async () => {
  const { getScoringTemplateForGame } = await import('./scoringPresets');
  const template = getScoringTemplateForGame('Natera: New Beginning');
  assert.equal(template.gameNameKeyword, 'natera');
  assert.equal(template.displayName, 'Natera: New Beginning (Venture Points)');
  assert.equal(template.categories.length, 6);
  assert.ok(template.categories.some((c) => c.id === 'claim_tokens'));
  assert.ok(template.categories.some((c) => c.id === 'settlements'));
  assert.ok(template.categories.some((c) => c.id === 'science_board'));
  assert.ok(template.categories.some((c) => c.id === 'authority_tracks'));
  assert.ok(template.categories.some((c) => c.id === 'specialist_cards'));
  assert.ok(template.categories.some((c) => c.id === 'exploration_cards'));
  // Leftover resources is solely a tiebreaker and NOT a scoring category
  assert.ok(!template.categories.some((c) => c.id === 'resources_bonus'));
});

test('getScoringTemplateForGame resolves official Brass Birmingham/Lancashire without cash bonus', async () => {
  const { getScoringTemplateForGame } = await import('./scoringPresets');
  const templateBirm = getScoringTemplateForGame('Brass: Birmingham');
  const templateLanc = getScoringTemplateForGame('Brass: Lancashire');
  assert.equal(templateBirm.gameNameKeyword, 'brass');
  assert.equal(templateLanc.gameNameKeyword, 'brass');
  assert.equal(templateBirm.categories.length, 4);

  // Official 4 scoring categories across Canal and Rail eras
  const catIds = templateBirm.categories.map((c) => c.id);
  assert.deepEqual(catIds, ['canal_links', 'canal_industries', 'rail_links', 'rail_industries']);

  // Endgame cash is strictly a tiebreaker and MUST NOT be scored as VP
  assert.ok(!templateBirm.categories.some((c) => c.id === 'cash_bonus'));
});

test('getScoringTemplateForGame resolves official Great Western Trail: Second Edition template with 11 categories', async () => {
  const { getScoringTemplateForGame } = await import('./scoringPresets');
  
  // Both full title and alias GWT match
  const templateFull = getScoringTemplateForGame('Great Western Trail: Second Edition');
  const templateAlias = getScoringTemplateForGame('GWT');

  assert.equal(templateFull.displayName, 'Great Western Trail: Second Edition');
  assert.equal(templateAlias.displayName, 'Great Western Trail: Second Edition');
  assert.equal(templateFull.categories.length, 11);

  // Verify the exact 11 rows from official score pad
  const categoryIds = templateFull.categories.map((c) => c.id);
  assert.deepEqual(categoryIds, [
    'cash',
    'buildings',
    'cities',
    'train_stations',
    'hazards',
    'cattle_cards',
    'objective_cards',
    'station_masters',
    'advanced_workers',
    'cleared_board',
    'job_market',
  ]);

  // Verify calculating the exact match from user photo (Yellow: 158, Grey: 61)
  const yellowScores: Record<string, number> = {
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

  const greyScores: Record<string, number> = {
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

  const yellowTotal = templateFull.categories.reduce(
    (acc, cat) => acc + (yellowScores[cat.id] ?? 0) * (cat.multiplier ?? 1),
    0
  );
  const greyTotal = templateFull.categories.reduce(
    (acc, cat) => acc + (greyScores[cat.id] ?? 0) * (cat.multiplier ?? 1),
    0
  );

  assert.equal(yellowTotal, 158);
  assert.equal(greyTotal, 61);
});

test("getScoringTemplateForGame resolves official Darwin's Journey template with in-game track first and official endgame categories", async () => {
  const { getScoringTemplateForGame } = await import('./scoringPresets');
  
  const templateFull = getScoringTemplateForGame("Darwin's Journey");
  const templateKeyword = getScoringTemplateForGame('darwin');

  assert.equal(templateFull.displayName, "Darwin's Journey");
  assert.equal(templateKeyword.displayName, "Darwin's Journey");
  assert.equal(templateFull.categories.length, 7);

  // Category 0 MUST be in-game points scored on the VP track
  assert.equal(templateFull.categories[0].id, 'in_game_vp');
  assert.equal(templateFull.categories[0].name, 'In-Game Points (VP Track)');

  // Subsequent categories are official endgame scoring categories
  const categoryIds = templateFull.categories.map((c) => c.id);
  assert.deepEqual(categoryIds, [
    'in_game_vp',
    'objectives',
    'wax_seals',
    'tents',
    'evolution_museum',
    'coins',
    'temp_knowledge',
  ]);

  // All multipliers must be positive (1), no false penalties
  assert.ok(templateFull.categories.every((c) => (c.multiplier ?? 1) > 0));

  // Simulation test: Mid-game 68, Objectives 18, Seals 13, Tents 5, Evolution 32, Coins 2 (10 coins), Knowledge 3
  const sampleScores: Record<string, number> = {
    in_game_vp: 68,
    objectives: 18,
    wax_seals: 13,
    tents: 5,
    evolution_museum: 32,
    coins: 2,
    temp_knowledge: 3,
  };
  const total = templateFull.categories.reduce(
    (acc, cat) => acc + (sampleScores[cat.id] ?? 0) * (cat.multiplier ?? 1),
    0
  );
  assert.equal(total, 141);
});

test('isDraftMatchingCompletedSession detects when a draft matches a session already saved in history', () => {
  const completedSessions: PlaySession[] = [
    {
      id: 'session-101',
      gameId: 'game-catan',
      gameName: 'Catan',
      gameThumbnail: '',
      datePlayed: '2026-11-07T00:00:00.000Z',
      createdAt: '2026-11-07T08:30:00.000Z',
      durationMinutes: 60,
      firstPlayerMethod: 'manual',
      players: [
        { playerId: 'p1', playerName: 'Huy', score: 10, isWinner: true },
        { playerId: 'p2', playerName: 'Linh', score: 8, isWinner: false },
      ],
    },
  ];

  // Matching draft with same game, same players, same date
  const matchingDraft = {
    gameId: 'game-catan',
    datePlayed: '2026-11-07',
    selectedPlayerIds: ['p1', 'p2'],
    durationMinutes: '60',
    sessionStartTime: new Date('2026-11-07T07:30:00.000Z').getTime(),
    lastUpdated: '2026-11-07T08:29:00.000Z',
  } as unknown as SessionDraft;

  assert.equal(isDraftMatchingCompletedSession(matchingDraft, completedSessions), true);

  // Different game draft -> should NOT match
  const differentGameDraft = {
    gameId: 'game-azul',
    datePlayed: '2026-11-07',
    selectedPlayerIds: ['p1', 'p2'],
    durationMinutes: '45',
  } as unknown as SessionDraft;
  assert.equal(isDraftMatchingCompletedSession(differentGameDraft, completedSessions), false);

  // Different players draft -> should NOT match
  const differentPlayersDraft = {
    gameId: 'game-catan',
    datePlayed: '2026-11-07',
    selectedPlayerIds: ['p3', 'p4'],
    durationMinutes: '60',
  } as unknown as SessionDraft;
  assert.equal(isDraftMatchingCompletedSession(differentPlayersDraft, completedSessions), false);

  // Different date draft -> should NOT match
  const differentDateDraft = {
    gameId: 'game-catan',
    datePlayed: '2026-11-08',
    selectedPlayerIds: ['p1', 'p2'],
    durationMinutes: '60',
  } as unknown as SessionDraft;
  assert.equal(isDraftMatchingCompletedSession(differentDateDraft, completedSessions), false);

  // Empty or null draft
  assert.equal(isDraftMatchingCompletedSession(null, completedSessions), false);
  assert.equal(isDraftMatchingCompletedSession({ gameId: null } as any, completedSessions), false);
});

test('calculateMinRequiredPlays computes dynamic 5% qualification threshold with ceiling', () => {
  assert.equal(calculateMinRequiredPlays(0), 0);
  assert.equal(calculateMinRequiredPlays(-5), 0);
  assert.equal(calculateMinRequiredPlays(1), 1);
  assert.equal(calculateMinRequiredPlays(10), 1); // 10 * 0.05 = 0.5 -> 1
  assert.equal(calculateMinRequiredPlays(20), 1); // 20 * 0.05 = 1
  assert.equal(calculateMinRequiredPlays(21), 2); // 21 * 0.05 = 1.05 -> 2
  assert.equal(calculateMinRequiredPlays(50), 3); // 50 * 0.05 = 2.5 -> 3
  assert.equal(calculateMinRequiredPlays(100), 5); // 100 * 0.05 = 5
  assert.equal(calculateMinRequiredPlays(500), 25); // 500 * 0.05 = 25
  assert.equal(calculateMinRequiredPlays(1400), 70); // 1400 * 0.05 = 70
});
