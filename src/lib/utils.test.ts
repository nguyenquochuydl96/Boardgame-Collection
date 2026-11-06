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
} from './utils';
import { BoardGame, PlaySession, Player } from '../types';

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

  const stats = calculateGameStats(sampleSessions);
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
  assert.equal(stats.mostLossesPlayer?.playerName, 'Huy');
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

  const stats = calculateGameStats(sessions);
  // Both p1 and p2 have 2 losses and 2 plays. p2 has lower lowestScore (20 vs 30).
  assert.equal(stats.mostLossesPlayer?.playerName, 'Player 2');
  assert.equal(stats.mostLossesPlayer?.losses, 2);
});

test('formatRecordTimeAgo formats dates and relative time in Vietnamese accurately', async () => {
  const { formatRecordTimeAgo } = await import('./utils');
  const result = formatRecordTimeAgo('2025-05-10T10:00:00.000Z');
  assert.ok(result.includes('10/05/2025'));
  assert.ok(result.includes('trước'));
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
  assert.ok(template.categories.some((c) => c.id === 'claim_tokens'));
  assert.ok(template.categories.some((c) => c.id === 'settlements'));
  assert.ok(template.categories.some((c) => c.id === 'science_board'));
  assert.ok(template.categories.some((c) => c.id === 'authority_tracks'));
  assert.ok(template.categories.some((c) => c.id === 'specialist_cards'));
  assert.ok(template.categories.some((c) => c.id === 'exploration_cards'));
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
