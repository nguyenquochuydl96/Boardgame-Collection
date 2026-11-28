import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePlayerStreaks, calculateLongestWinStreak } from './utils';
import { extractCalendarDate } from './shareCard';
import { BoardGame, PlaySession } from '../types';

test('extractCalendarDate strips ISO time portions and handles plain dates cleanly', () => {
  assert.equal(extractCalendarDate('2026-11-22T13:07:47.708Z'), '2026-11-22');
  assert.equal(extractCalendarDate('2026-04-05'), '2026-04-05');
  assert.equal(extractCalendarDate('  2026-01-09T00:00:00+07:00  '), '2026-01-09');
  assert.equal(extractCalendarDate(''), '');
  assert.equal(extractCalendarDate(undefined), '');
});

test('calculatePlayerStreaks and calculateLongestWinStreak respect gamesById coop rules for legacy sessions', () => {
  const skyjo = {
    id: 'g-skyjo',
    name: 'Skyjo',
    status: 'own',
    lowestScoreWins: true,
  } as unknown as BoardGame;
  const legacyCoopGame = {
    id: 'g-legacy-coop',
    name: 'Custom Team Game',
    status: 'own',
    scoringMode: 'coop',
  } as unknown as BoardGame;
  const gamesById = new Map<string, BoardGame>([
    [skyjo.id, skyjo],
    [legacyCoopGame.id, legacyCoopGame],
  ]);

  const sessions: PlaySession[] = [
    {
      id: 's-1',
      gameId: 'g-skyjo',
      gameName: 'Skyjo',
      gameThumbnail: '',
      datePlayed: '2026-10-01',
      createdAt: '2026-10-01T10:00:00Z',
      firstPlayerMethod: 'manual',
      lowestScoreWins: true,
      winnerIds: ['p-hang'],
      players: [
        { playerId: 'p-hang', playerName: 'Hằng', score: 8, isWinner: true, rank: 1 },
        { playerId: 'p-heo', playerName: 'Heo', score: 25, isWinner: false, rank: 2 },
      ],
    },
    {
      id: 's-legacy-coop-loss',
      gameId: 'g-legacy-coop',
      gameName: 'Custom Team Game',
      gameThumbnail: '',
      datePlayed: '2026-10-01T20:00:00Z',
      createdAt: '2026-10-01T20:00:00Z',
      firstPlayerMethod: 'manual',
      // Legacy co-op loss without session.scoringMode: relies on gamesById to classify as co-op.
      players: [
        { playerId: 'p-hang', playerName: 'Hằng', isWinner: false },
        { playerId: 'p-heo', playerName: 'Heo', isWinner: false },
      ],
    },
    {
      id: 's-2',
      gameId: 'g-skyjo',
      gameName: 'Skyjo',
      gameThumbnail: '',
      datePlayed: '2026-10-02',
      createdAt: '2026-10-02T10:00:00Z',
      firstPlayerMethod: 'manual',
      lowestScoreWins: true,
      winnerIds: ['p-hang'],
      players: [
        { playerId: 'p-hang', playerName: 'Hằng', score: 5, isWinner: true, rank: 1 },
        { playerId: 'p-heo', playerName: 'Heo', score: 19, isWinner: false, rank: 2 },
      ],
    },
  ];

  // With gamesById, the legacy co-op loss is excluded so Hằng's competitive 2-win streak stays intact.
  const hangCompetitive = calculatePlayerStreaks('p-hang', sessions, 'competitive', gamesById);
  const heoCompetitive = calculatePlayerStreaks('p-heo', sessions, 'competitive', gamesById);
  assert.equal(hangCompetitive.longestWinStreak.count, 2);
  assert.equal(hangCompetitive.currentStreak.type, 'win');
  assert.equal(heoCompetitive.longestLossStreak.count, 2);
  assert.equal(calculateLongestWinStreak('p-hang', sessions, 'competitive', gamesById), 2);
});
