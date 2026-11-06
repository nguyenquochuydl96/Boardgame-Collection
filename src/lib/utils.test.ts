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
  assert.deepEqual(stats.highestScore, { score: 102, playerName: 'Linh' });
  assert.deepEqual(stats.lowestScore, { score: 78, playerName: 'Huy' });
  assert.equal(stats.playerWinRates.length, 2);
  assert.equal(stats.playerWinRates[0].winRate, 50);
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
