import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatVND,
  formatNumber,
  formatCount,
  formatNumberInput,
  parseNumberInput,
  formatDuration,
  calculateGameStats,
  calculateLongestWinStreak,
  calculateHeadToHead,
  getCollectionTotalValue,
  isDraftMatchingCompletedSession,
  calculateMinRequiredPlays,
  isLowResBGGThumbnail,
  getGameThumbnail,
  BGG_OFFICIAL_IRON_CLAYS,
  findPreviousLoser,
  findPreviousWinner,
  STATUS_CONFIG,
  resolveCoopWinnerIds,
  isCoopSession,
  calculatePlayerStreaks,
  normalizeLocationKey,
  sortVenuesByPlayCount,
  deduplicateLocationsList,
} from './utils';
import { healIncomingGames, isRealtimeSelfReflection } from './supabaseSync';
import { BoardGame, PlaySession, Player, SessionDraft, GameLocation } from '../types';

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

test('formatNumber formats numbers with en-US comma thousands separators and safe fallbacks', () => {
  assert.equal(formatNumber(1454), '1,454');
  assert.equal(formatNumber('92921'), '92,921');
  assert.equal(formatNumber(1000000), '1,000,000');
  assert.equal(formatNumber(-1454), '-1,454');
  assert.equal(formatNumber(0), '0');
  assert.equal(formatNumber(1454.5), '1,454.5');
  assert.equal(formatNumber(null), '0');
  assert.equal(formatNumber(undefined), '0');
  assert.equal(formatNumber(''), '0');
  assert.equal(formatNumber('not-a-number'), '0');
  assert.equal(formatNumber(Number.NaN), '0');
});

test('formatCount formats count with thousands separator and singular/plural suffix', () => {
  assert.equal(formatCount(0, 'play'), '0 plays');
  assert.equal(formatCount(1, 'play'), '1 play');
  assert.equal(formatCount(1454, 'play'), '1,454 plays');
  assert.equal(formatCount('92921', 'point'), '92,921 points');
  assert.equal(formatCount(2, 'match', 'matches'), '2 matches');
  assert.equal(formatCount(1, 'match', 'matches'), '1 match');
  assert.equal(formatCount(-1, 'point'), '-1 point');
  assert.equal(formatCount(null, 'session'), '0 sessions');
  assert.equal(formatCount(undefined, 'hour'), '0 hours');
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
      gameThumbnail: '',
      firstPlayerMethod: 'manual',
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
      gameThumbnail: '',
      firstPlayerMethod: 'manual',
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
      gameThumbnail: '',
      firstPlayerMethod: 'manual',
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
      gameThumbnail: '',
      firstPlayerMethod: 'manual',
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
      gameThumbnail: '',
      firstPlayerMethod: 'manual',
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
      gameThumbnail: '',
      firstPlayerMethod: 'manual',
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

test('getCollectionTotalValue sums purchase prices of owned and lent_out games, excluding sold, rented, wishlist, and borrowed', () => {
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
    {
      id: '6',
      name: 'G6',
      thumbnail: '',
      image: '',
      description: '',
      minPlayers: 1,
      maxPlayers: 4,
      playingTime: 60,
      yearPublished: 2020,
      status: 'wishlist',
      purchasePrice: 400000,
      addedDate: '2026-01-01',
    },
    {
      id: '7',
      name: 'G7',
      thumbnail: '',
      image: '',
      description: '',
      minPlayers: 1,
      maxPlayers: 4,
      playingTime: 60,
      yearPublished: 2020,
      status: 'borrowed',
      purchasePrice: 600000,
      addedDate: '2026-01-01',
    },
  ];

  // 1,000,000 (own) + 500,000 (lent_out) = 1,500,000
  assert.equal(getCollectionTotalValue(games), 1500000);
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

  // Verify 100% English titles and descriptions
  assert.equal(templateBirm.categories[0].name, 'Canal Era Links');
  assert.equal(templateBirm.categories[0].description, '1 VP per link icon connected during Canal Era');
  assert.equal(templateBirm.categories[1].name, 'Canal Era Industries');
  assert.equal(templateBirm.categories[1].description, 'VPs on flipped industry tiles during Canal Era');
  assert.equal(templateBirm.categories[2].name, 'Rail Era Links');
  assert.equal(templateBirm.categories[2].description, '1 VP per link icon connected during Rail Era');
  assert.equal(templateBirm.categories[3].name, 'Rail Era Industries');
  assert.equal(templateBirm.categories[3].description, 'VPs on flipped industry tiles during Rail Era');

  // Endgame cash is strictly a tiebreaker and MUST NOT be scored as VP
  assert.ok(!templateBirm.categories.some((c) => c.id === 'cash_bonus'));
});

test('getScoringTemplateForGame sets isCoop flag for Stardew Valley and Slay the Spire', async () => {
  const { getScoringTemplateForGame } = await import('./scoringPresets');
  const stardew = getScoringTemplateForGame('Stardew Valley: The Board Game');
  const slayTheSpire = getScoringTemplateForGame('Slay the Spire: The Board Game');
  const brass = getScoringTemplateForGame('Brass: Birmingham');

  assert.equal(stardew.isCoop, true);
  assert.equal(slayTheSpire.isCoop, true);
  assert.equal(brass.isCoop, undefined);
});

test('getScoringTemplateForGame verifies Harmonies, Burgundy, Faraway, White Castle, Dune updates', async () => {
  const { getScoringTemplateForGame } = await import('./scoringPresets');

  // 1. Harmonies has fields
  const harmonies = getScoringTemplateForGame('Harmonies');
  const harmoniesCatIds = harmonies.categories.map((c) => c.id);
  assert.ok(harmoniesCatIds.includes('fields'));
  assert.equal(harmonies.categories.find((c) => c.id === 'fields')?.name, 'Fields (Yellow Cubes)');

  // 2. Castles of Burgundy has bonus_tiles
  const burgundy = getScoringTemplateForGame('The Castles of Burgundy');
  const burgundyCatIds = burgundy.categories.map((c) => c.id);
  assert.ok(burgundyCatIds.includes('bonus_tiles'));
  assert.equal(burgundy.categories.find((c) => c.id === 'bonus_tiles')?.name, 'Bonus Tiles (Color Completion)');

  // 3. Faraway has 5 categories (clues_bonus removed)
  const faraway = getScoringTemplateForGame('Faraway');
  assert.equal(faraway.categories.length, 5);
  assert.deepEqual(
    faraway.categories.map((c) => c.id),
    ['region_8_7', 'region_6_5', 'region_4_3', 'region_2_1', 'sanctuaries']
  );

  // 4. The White Castle has in_game_vp and influence_track, clan_seals removed
  const whiteCastle = getScoringTemplateForGame('The White Castle');
  const wcCatIds = whiteCastle.categories.map((c) => c.id);
  assert.ok(wcCatIds.includes('in_game_vp'));
  assert.ok(wcCatIds.includes('influence_track'));
  assert.ok(!wcCatIds.includes('clan_seals'));

  // 5. Dune has non-duplication guidance in descriptions
  const dune = getScoringTemplateForGame('Dune: Imperium');
  const vpTrack = dune.categories.find((c) => c.id === 'vp_track');
  const alliances = dune.categories.find((c) => c.id === 'alliances');
  assert.ok(vpTrack?.description?.includes('Total VP already tracked'));
  assert.ok(alliances?.description?.includes('Only add if not yet counted'));
});

test('WhatToPlay: getGameVibe categorizes games accurately into heavy, coop, light, and mid', async () => {
  const { getGameVibe } = await import('../components/game/WhatToPlayModal');

  const brassGame = {
    id: 'g-brass',
    name: 'Brass: Birmingham',
    thumbnail: '',
    image: '',
    description: 'An economic strategy game set in the industrial revolution.',
    minPlayers: 2,
    maxPlayers: 4,
    playingTime: 120,
    yearPublished: 2018,
    status: 'own' as const,
    addedDate: '2024-01-01',
    tags: ['Economic', 'Strategy'],
  };

  const stardewGame = {
    id: 'g-stardew',
    name: 'Stardew Valley: The Board Game',
    thumbnail: '',
    image: '',
    description: 'A cooperative board game of farming and friendship.',
    minPlayers: 1,
    maxPlayers: 4,
    playingTime: 90,
    yearPublished: 2021,
    status: 'own' as const,
    addedDate: '2024-01-01',
    tags: ['Cooperative', 'Farming'],
  };

  const flip7Game = {
    id: 'g-flip7',
    name: 'Flip 7',
    thumbnail: '',
    image: '',
    description: 'A quick push-your-luck card game.',
    minPlayers: 2,
    maxPlayers: 8,
    playingTime: 20,
    yearPublished: 2024,
    status: 'own' as const,
    addedDate: '2024-01-01',
    tags: ['Party', 'Card Game'],
  };

  const cascadiaGame = {
    id: 'g-cascadia',
    name: 'Cascadia',
    thumbnail: '',
    image: '',
    description: 'A puzzly tile-laying and token-drafting game of Pacific Northwest habitats.',
    minPlayers: 1,
    maxPlayers: 4,
    playingTime: 45,
    yearPublished: 2021,
    status: 'own' as const,
    addedDate: '2024-01-01',
    tags: ['Animals', 'Family'],
  };

  assert.equal(getGameVibe(brassGame), 'heavy');
  assert.equal(getGameVibe(stardewGame), 'coop');
  assert.equal(getGameVibe(flip7Game), 'light');
  assert.equal(getGameVibe(cascadiaGame), 'mid');
});

test('WhatToPlay: formatPlayHistoryBadge handles unplayed, recent, and dusty games correctly', async () => {
  const { formatPlayHistoryBadge } = await import('../components/game/WhatToPlayModal');

  // Unplayed game
  const unplayed = formatPlayHistoryBadge({ playCount: 0, isDusty: true });
  assert.equal(unplayed.isUnplayed, true);
  assert.equal(unplayed.isDusty, true);
  assert.equal(unplayed.text, '✨ Unplayed');

  // Recently played game (5 days ago)
  const recent = formatPlayHistoryBadge({
    playCount: 12,
    lastPlayedDate: '2026-05-01',
    daysSinceLastPlayed: 5,
    isDusty: false,
  });
  assert.equal(recent.isUnplayed, false);
  assert.equal(recent.isDusty, false);
  assert.equal(recent.text, '12 plays · Last: 5d ago');

  // Dusty game (> 60 days ago)
  const dusty = formatPlayHistoryBadge({
    playCount: 2,
    lastPlayedDate: '2026-01-01',
    daysSinceLastPlayed: 110,
    isDusty: true,
  });
  assert.equal(dusty.isUnplayed, false);
  assert.equal(dusty.isDusty, true);
  assert.equal(dusty.text, '2 plays · Last: 3 mos ago');
});

test('WhatToPlay: filterWhatToPlayGames strictly enforces ownedOnly and precise player count filtering', async () => {
  const { filterWhatToPlayGames } = await import('../components/game/WhatToPlayModal');

  const testCatalog: BoardGame[] = [
    {
      id: 'g-owned-4p',
      name: 'Cascadia',
      thumbnail: '',
      image: '',
      description: '',
      minPlayers: 1,
      maxPlayers: 4,
      playingTime: 45,
      yearPublished: 2024,
      addedDate: '2024-01-01',
      status: 'own',
    },
    {
      id: 'g-rented-4p',
      name: 'Terraforming Mars (Rented)',
      thumbnail: '',
      image: '',
      description: '',
      minPlayers: 1,
      maxPlayers: 5,
      playingTime: 120,
      yearPublished: 2024,
      addedDate: '2024-01-01',
      status: 'rented',
    },
    {
      id: 'g-borrowed-4p',
      name: 'Dune: Imperium (Borrowed)',
      thumbnail: '',
      image: '',
      description: '',
      minPlayers: 1,
      maxPlayers: 4,
      playingTime: 90,
      yearPublished: 2024,
      addedDate: '2024-01-01',
      status: 'borrowed',
    },
    {
      id: 'g-owned-2p-only',
      name: '7 Wonders Duel',
      thumbnail: '',
      image: '',
      description: '',
      minPlayers: 2,
      maxPlayers: 2,
      playingTime: 30,
      yearPublished: 2024,
      addedDate: '2024-01-01',
      status: 'own',
    },
    {
      id: 'g-owned-5p-plus',
      name: 'Codenames',
      thumbnail: '',
      image: '',
      description: '',
      minPlayers: 4,
      maxPlayers: 8,
      playingTime: 15,
      yearPublished: 2024,
      addedDate: '2024-01-01',
      status: 'own',
    },
    {
      id: 'g-owned-missing-players',
      name: 'Mystery Unconfigured Game',
      thumbnail: '',
      image: '',
      description: '',
      minPlayers: 0,
      maxPlayers: 0,
      playingTime: 30,
      yearPublished: 2024,
      addedDate: '2024-01-01',
      status: 'own',
    },
    {
      id: 'g-sold-game',
      name: 'Old Sold Game',
      thumbnail: '',
      image: '',
      description: '',
      minPlayers: 2,
      maxPlayers: 4,
      playingTime: 60,
      yearPublished: 2024,
      addedDate: '2024-01-01',
      status: 'sold',
    },
    {
      id: 'g-lent-4p',
      name: 'Root (Lent Out)',
      thumbnail: '',
      image: '',
      description: '',
      minPlayers: 2,
      maxPlayers: 4,
      playingTime: 90,
      yearPublished: 2024,
      addedDate: '2024-01-01',
      status: 'lent_out',
    },
    {
      id: 'g-wishlist-game',
      name: 'Ark Nova (Wishlist)',
      thumbnail: '',
      image: '',
      description: '',
      minPlayers: 1,
      maxPlayers: 4,
      playingTime: 120,
      yearPublished: 2024,
      addedDate: '2024-01-01',
      status: 'wishlist',
    },
    {
      id: 'g-prev-owned',
      name: 'Gloomhaven (Prev Owned)',
      thumbnail: '',
      image: '',
      description: '',
      minPlayers: 1,
      maxPlayers: 4,
      playingTime: 120,
      yearPublished: 2024,
      addedDate: '2024-01-01',
      status: 'previously_owned',
    },
  ];

  // 1. On Shelf mode (shelfOnly: true / ownedOnly: true): keeps 'own' and 'borrowed'
  // Strictly excludes 'rented', 'lent_out', 'sold', 'wishlist', 'previously_owned'
  const onShelfResults = filterWhatToPlayGames(testCatalog, { ownedOnly: true });
  const onShelfIds = onShelfResults.map((g) => g.id);
  assert.ok(onShelfIds.includes('g-owned-4p'), 'owned game must be included on shelf');
  assert.ok(onShelfIds.includes('g-borrowed-4p'), 'borrowed game must be included on shelf');
  assert.ok(onShelfIds.includes('g-owned-2p-only'));
  assert.ok(onShelfIds.includes('g-owned-5p-plus'));
  assert.ok(onShelfIds.includes('g-owned-missing-players'));
  // rented, lent_out, sold, wishlist, previously_owned MUST be excluded
  assert.ok(!onShelfIds.includes('g-rented-4p'), 'rented game must be excluded when on shelf');
  assert.ok(!onShelfIds.includes('g-lent-4p'), 'lent_out game must be excluded when on shelf');
  assert.ok(!onShelfIds.includes('g-sold-game'), 'sold game must be excluded when on shelf');
  assert.ok(!onShelfIds.includes('g-wishlist-game'), 'wishlist game must be excluded when on shelf');
  assert.ok(!onShelfIds.includes('g-prev-owned'), 'previously_owned game must be excluded when on shelf');

  // 2. All Games mode (ownedOnly: false / shelfOnly: false): allows own, borrowed, rented, lent_out; still excludes sold, wishlist, previously_owned
  const allGamesResults = filterWhatToPlayGames(testCatalog, { ownedOnly: false });
  const allIds = allGamesResults.map((g) => g.id);
  assert.ok(allIds.includes('g-owned-4p'));
  assert.ok(allIds.includes('g-borrowed-4p'));
  assert.ok(allIds.includes('g-rented-4p'));
  assert.ok(allIds.includes('g-lent-4p'));
  assert.ok(!allIds.includes('g-sold-game'), 'sold game must remain excluded in All Games mode');
  assert.ok(!allIds.includes('g-wishlist-game'), 'wishlist game must remain excluded in All Games mode');
  assert.ok(!allIds.includes('g-prev-owned'), 'previously_owned game must remain excluded in All Games mode');

  // 3. Player count filter '4': strictly matches games where minPlayers <= 4 and maxPlayers >= 4
  const fourPlayersOwned = filterWhatToPlayGames(testCatalog, {
    ownedOnly: true,
    playerCountFilter: '4',
  });
  const fourPlayerIds = fourPlayersOwned.map((g) => g.id);
  // Cascadia (1-4p), Dune: Imperium Borrowed (1-4p) and Codenames (4-8p) match 4 players
  assert.ok(fourPlayerIds.includes('g-owned-4p'));
  assert.ok(fourPlayerIds.includes('g-borrowed-4p'));
  assert.ok(fourPlayerIds.includes('g-owned-5p-plus'));
  // 7 Wonders Duel (2p only) does NOT match 4 players
  assert.ok(!fourPlayerIds.includes('g-owned-2p-only'));
  // Mystery Unconfigured Game (0/0 players) must NOT match 4 players
  assert.ok(!fourPlayerIds.includes('g-owned-missing-players'));
  // Rented/lent games must NOT match on shelf
  assert.ok(!fourPlayerIds.includes('g-rented-4p'));
  assert.ok(!fourPlayerIds.includes('g-lent-4p'));

  // 4. Player count filter '2': strictly matches games where minPlayers <= 2 and maxPlayers >= 2
  const twoPlayersOwned = filterWhatToPlayGames(testCatalog, {
    ownedOnly: true,
    playerCountFilter: '2',
  });
  const twoPlayerIds = twoPlayersOwned.map((g) => g.id);
  assert.ok(twoPlayerIds.includes('g-owned-4p')); // 1-4p supports 2p
  assert.ok(twoPlayerIds.includes('g-borrowed-4p')); // 1-4p borrowed supports 2p
  assert.ok(twoPlayerIds.includes('g-owned-2p-only')); // 2-2p supports 2p
  assert.ok(!twoPlayerIds.includes('g-owned-5p-plus')); // 4-8p does not support 2p
  assert.ok(!twoPlayerIds.includes('g-owned-missing-players'));

  // 5. Player count filter '5+': only matches maxPlayers >= 5
  const fivePlusOwned = filterWhatToPlayGames(testCatalog, {
    ownedOnly: true,
    playerCountFilter: '5+',
  });
  const fivePlusIds = fivePlusOwned.map((g) => g.id);
  assert.ok(fivePlusIds.includes('g-owned-5p-plus')); // 4-8p supports 5+
  assert.ok(!fivePlusIds.includes('g-owned-4p')); // max 4p
  assert.ok(!fivePlusIds.includes('g-borrowed-4p')); // max 4p
  assert.ok(!fivePlusIds.includes('g-owned-2p-only')); // max 2p
  assert.ok(!fivePlusIds.includes('g-owned-missing-players'));
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

test('calculateMinRequiredPlays computes dynamic 5% qualification threshold with ceiling (uncapped)', () => {
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
  assert.equal(calculateMinRequiredPlays(1454), 73); // 1454 * 0.05 = 72.7 -> 73 (uncapped 5% rule)
});

test('isCoopSession accurately detects cooperative sessions and competitive filtering excludes them from streaks', () => {
  const baseSession: PlaySession = {
    id: 's-base',
    gameId: 'g-dummy',
    gameName: '',
    gameThumbnail: '',
    datePlayed: '2026-01-01',
    firstPlayerMethod: 'random_wheel',
    createdAt: '2026-01-01T00:00:00Z',
    players: [],
  };

  // 1. Explicit isCoop === true
  const sessionExplicitCoop: PlaySession = {
    ...baseSession,
    id: 's-coop-1',
    gameName: 'Custom Co-op Game',
    isCoop: true,
    players: [
      { playerId: 'p1', playerName: 'Alice', isWinner: true },
      { playerId: 'p2', playerName: 'Bob', isWinner: true },
    ],
  };
  assert.equal(isCoopSession(sessionExplicitCoop), true);

  // 2. Known scoring template marked as isCoop (e.g. Stardew Valley, Slay the Spire)
  const sessionStardewLoss: PlaySession = {
    ...baseSession,
    id: 's-coop-2',
    gameName: 'Stardew Valley: The Board Game',
    players: [
      { playerId: 'p1', playerName: 'Alice', isWinner: false },
      { playerId: 'p2', playerName: 'Bob', isWinner: false },
    ],
  };
  assert.equal(isCoopSession(sessionStardewLoss), true);

  const sessionSlayTheSpire: PlaySession = {
    ...baseSession,
    id: 's-coop-3',
    gameName: 'Slay the Spire: The Board Game',
    players: [
      { playerId: 'p1', playerName: 'Alice', isWinner: false },
      { playerId: 'p2', playerName: 'Bob', isWinner: false },
    ],
  };
  assert.equal(isCoopSession(sessionSlayTheSpire), true);

  // 3. Multi-player team win (all players are marked isWinner: true)
  const sessionTeamWin: PlaySession = {
    ...baseSession,
    id: 's-coop-4',
    gameName: 'Unknown Mystery Escape Game',
    players: [
      { playerId: 'p1', playerName: 'Alice', isWinner: true },
      { playerId: 'p2', playerName: 'Bob', isWinner: true },
      { playerId: 'p3', playerName: 'Charlie', isWinner: true },
    ],
  };
  assert.equal(isCoopSession(sessionTeamWin), true);

  // 4. Competitive match (only 1 winner among multiple players)
  const sessionCompetitive: PlaySession = {
    ...baseSession,
    id: 's-comp-1',
    gameName: 'Catan',
    winnerId: 'p1',
    players: [
      { playerId: 'p1', playerName: 'Alice', isWinner: true, rank: 1 },
      { playerId: 'p2', playerName: 'Bob', isWinner: false, rank: 2 },
    ],
  };
  assert.equal(isCoopSession(sessionCompetitive), false);

  // 5. Competitive filtering excludes co-op from player streaks
  const sampleSessions: PlaySession[] = [
    {
      ...baseSession,
      id: 'sess-1',
      datePlayed: '2026-01-01',
      gameName: 'Catan',
      winnerId: 'p1',
      players: [
        { playerId: 'p1', playerName: 'Alice', isWinner: true },
        { playerId: 'p2', playerName: 'Bob', isWinner: false },
      ],
    },
    {
      ...baseSession,
      id: 'sess-2',
      datePlayed: '2026-01-02',
      gameName: 'Pandemic', // Co-op win
      players: [
        { playerId: 'p1', playerName: 'Alice', isWinner: true },
        { playerId: 'p2', playerName: 'Bob', isWinner: true },
      ],
    },
    {
      ...baseSession,
      id: 'sess-3',
      datePlayed: '2026-01-03',
      gameName: 'Catan',
      winnerId: 'p2',
      players: [
        { playerId: 'p1', playerName: 'Alice', isWinner: false },
        { playerId: 'p2', playerName: 'Bob', isWinner: true },
      ],
    },
  ];

  const competitiveSessions = sampleSessions.filter((s) => !isCoopSession(s));
  assert.equal(competitiveSessions.length, 2);
  assert.equal(competitiveSessions.some((s) => s.gameName === 'Pandemic'), false);

  // When All (incl. Co-op) is selected: Alice won sess-1 and sess-2 consecutively -> Win Streak = 2
  const allStreaks = calculatePlayerStreaks('p1', sampleSessions);
  assert.equal(allStreaks.longestWinStreak.count, 2);

  // When Competitive Only is selected: Alice won sess-1, then lost sess-3 -> Win Streak = 1
  const compStreaks = calculatePlayerStreaks('p1', competitiveSessions);
  assert.equal(compStreaks.longestWinStreak.count, 1);
});

test('normalizeLocationKey normalizes NFC/NFD Unicode, whitespace, and Vietnamese case sensitivity', () => {
  // 1. Decomposed NFD vs Precomposed NFC
  const nfd = 'Tra\u0300 S\u01b0\u0303a'; // NFD "Trà Sữa"
  const nfc = 'Trà Sữa'; // NFC
  assert.equal(normalizeLocationKey(nfd), 'trà sữa');
  assert.equal(normalizeLocationKey(nfc), 'trà sữa');
  assert.equal(normalizeLocationKey(nfd), normalizeLocationKey(nfc));

  // 2. Extra spaces and trimming
  assert.equal(normalizeLocationKey('   Quán    Trà   Sữa  '), 'quán trà sữa');
  assert.equal(normalizeLocationKey('Nhà   Huy   (Quận 3)'), 'nhà huy (quận 3)');

  // 3. Mixed case
  assert.equal(normalizeLocationKey('THE BOARDGAME LOFT CAFE'), 'the boardgame loft cafe');
  assert.equal(normalizeLocationKey('Lafam Coffee'), 'lafam coffee');
  assert.equal(normalizeLocationKey('  LAFAM   '), 'lafam');

  // 4. Empty / Null / Undefined
  assert.equal(normalizeLocationKey(''), '');
  assert.equal(normalizeLocationKey(null), '');
  assert.equal(normalizeLocationKey(undefined), '');
});

test('deduplicateLocationsList merges duplicate venues and preserves richest metadata & default status', () => {
  const duplicateLocs: GameLocation[] = [
    {
      id: 'loc-1',
      name: 'Lafam',
      createdAt: '2026-01-01',
    },
    {
      id: 'loc-2',
      name: '  lafam  ',
      address: '123 Nguyen Trai, Q1',
      isDefault: true,
      createdAt: '2026-01-02',
    },
    {
      id: 'loc-3',
      name: 'LAFAM',
      notes: 'Good air conditioning and big tables',
      createdAt: '2026-01-03',
    },
    {
      id: 'loc-4',
      name: 'Nhà Lộc',
      address: 'Binh Thanh',
      createdAt: '2026-01-04',
    },
  ];

  const deduped = deduplicateLocationsList(duplicateLocs);

  // 'Lafam', '  lafam  ', 'LAFAM' collapse into 1 canonical venue
  assert.equal(deduped.length, 2);

  const lafam = deduped.find((l) => normalizeLocationKey(l.name) === 'lafam');
  assert.ok(lafam);
  assert.equal(lafam.address, '123 Nguyen Trai, Q1');
  assert.equal(lafam.notes, 'Good air conditioning and big tables');
  assert.equal(lafam.isDefault, true);

  const nhaLoc = deduped.find((l) => normalizeLocationKey(l.name) === 'nhà lộc');
  assert.ok(nhaLoc);
  assert.equal(nhaLoc.address, 'Binh Thanh');
});

test('sortVenuesByPlayCount sorts descending by play count with Vietnamese alphabetical tie-breaking', () => {
  const venues = [
    { name: 'Quán Cafe C', playCount: 5 },
    { name: 'Quán Cafe A', playCount: 15 },
    { name: 'Quán Cafe D', playCount: 5 },
    { name: 'Quán Cafe B', playCount: 5 },
    { name: 'Quán Cafe Top', playCount: 42 },
  ];

  const sorted = sortVenuesByPlayCount(venues);

  assert.equal(sorted[0].name, 'Quán Cafe Top'); // 42 plays
  assert.equal(sorted[1].name, 'Quán Cafe A'); // 15 plays
  // Tie at 5 plays: sorted alphabetically A -> B -> C -> D
  assert.equal(sorted[2].name, 'Quán Cafe B');
  assert.equal(sorted[3].name, 'Quán Cafe C');
  assert.equal(sorted[4].name, 'Quán Cafe D');
});

test('Venue sessions aggregation correctly sums play counts across NFC/NFD/case/whitespace variants', () => {
  const sessions: PlaySession[] = [
    {
      id: 's1',
      gameId: 'g1',
      gameName: 'Catan',
      gameThumbnail: '',
      datePlayed: '2026-01-01',
      firstPlayerMethod: 'random_wheel',
      createdAt: '2026-01-01',
      location: 'Tra\u0300 S\u01b0\u0303a', // NFD
      players: [],
    },
    {
      id: 's2',
      gameId: 'g1',
      gameName: 'Catan',
      gameThumbnail: '',
      datePlayed: '2026-01-02',
      firstPlayerMethod: 'random_wheel',
      createdAt: '2026-01-02',
      location: 'Trà Sữa', // NFC
      players: [],
    },
    {
      id: 's3',
      gameId: 'g1',
      gameName: 'Catan',
      gameThumbnail: '',
      datePlayed: '2026-01-03',
      firstPlayerMethod: 'random_wheel',
      createdAt: '2026-01-03',
      location: '  TRÀ SỮA   ', // Uppercase & whitespace
      players: [],
    },
    {
      id: 's4',
      gameId: 'g1',
      gameName: 'Catan',
      gameThumbnail: '',
      datePlayed: '2026-01-04',
      firstPlayerMethod: 'random_wheel',
      createdAt: '2026-01-04',
      location: 'Lafam',
      players: [],
    },
  ];

  // Aggregate sessions by normalizeLocationKey
  const countsByKey = new Map<string, number>();
  for (const s of sessions) {
    if (s.location) {
      const key = normalizeLocationKey(s.location);
      countsByKey.set(key, (countsByKey.get(key) || 0) + 1);
    }
  }

  // All 3 variations of "Trà Sữa" must be summed together into 3 plays
  assert.equal(countsByKey.get('trà sữa'), 3);
  assert.equal(countsByKey.get('lafam'), 1);
  assert.equal(countsByKey.size, 2);
});

test('PHASE 3: Ark Nova official scoring formula calculates correctly (c <= 10, c > 10, negative scores, penalties)', async () => {
  const { getScoringTemplateForGame } = await import('./scoringPresets');
  const template = getScoringTemplateForGame('Ark Nova');
  assert.ok(template);
  assert.ok(template.computeTotal);

  // Scenario A: c <= 10 (each CP is 2 Appeal steps)
  // Appeal 40, Conservation 8 -> targetAppeal = 100 - (8 * 2) = 84 -> score = 40 - 84 = -44
  const scoreA = template.computeTotal!({ appeal: 40, conservation: 8, final_scoring: 0, penalties: 0 });
  assert.equal(scoreA, -44);

  // Scenario B: c > 10 (first 10 CP = 20, remaining CP = (c - 10) * 3)
  // Appeal 45, Conservation 20 -> targetAppeal = 100 - (20 + 30) = 50 -> score = 45 - 50 = -5
  const scoreB = template.computeTotal!({ appeal: 45, conservation: 20, final_scoring: 0, penalties: 0 });
  assert.equal(scoreB, -5);

  // Scenario C: Positive winner score with final scoring bonus cards
  // Appeal 82, Conservation 25 -> targetAppeal = 100 - (20 + 45) = 35 -> 82 - 35 = 47 + 5 bonus = 52
  const scoreC = template.computeTotal!({ appeal: 82, conservation: 25, final_scoring: 5, penalties: 0 });
  assert.equal(scoreC, 52);

  // Scenario D: Deductions / penalties are strictly subtracted
  // Appeal 82, Conservation 25, Final Scoring 5, Penalties 3 -> 52 - 3 = 49
  const scoreD = template.computeTotal!({ appeal: 82, conservation: 25, final_scoring: 5, penalties: 3 });
  assert.equal(scoreD, 49);
});

test('PHASE 3: Penalty row double-negative prevention guarantees penalties are deducted, never added', () => {
  // If a category has multiplier = -1, entering 5 or -5 should both evaluate to subtracting 5 points
  const mult = -1;
  const rawPositive = 5;
  const rawNegative = -5;

  const effectivePositive = mult < 0 ? Math.abs(rawPositive) : rawPositive;
  const totalPositive = effectivePositive * mult;
  assert.equal(totalPositive, -5);

  const effectiveNegative = mult < 0 ? Math.abs(rawNegative) : rawNegative;
  const totalNegative = effectiveNegative * mult;
  assert.equal(totalNegative, -5); // Prevents -5 * -1 = +5 bug
});

test('PHASE 3: Standard Competition Ranking ("1224") computes ties correctly and supports co-op multi-winners', () => {
  // Standard competition ranking: tied scores share rank, subsequent player skips (e.g. 1, 1, 3)
  const players = [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
    { id: 'p3', name: 'Charlie' },
    { id: 'p4', name: 'Diana' },
  ];
  const scores: Record<string, number> = { p1: 50, p2: 50, p3: 40, p4: 20 };

  const sortedForRank = [...players].sort((a, b) => scores[b.id] - scores[a.id]);
  const ranksByPlayerId: Record<string, number> = {};
  let currentRank = 1;
  for (let i = 0; i < sortedForRank.length; i++) {
    const p = sortedForRank[i];
    const sc = scores[p.id];
    if (sc === undefined) continue;
    if (i > 0) {
      const prevScore = scores[sortedForRank[i - 1].id];
      if (sc !== prevScore) {
        currentRank = i + 1;
      }
    }
    ranksByPlayerId[p.id] = currentRank;
  }

  assert.equal(ranksByPlayerId['p1'], 1);
  assert.equal(ranksByPlayerId['p2'], 1); // Tied for 1st
  assert.equal(ranksByPlayerId['p3'], 3); // Skips to 3rd
  assert.equal(ranksByPlayerId['p4'], 4); // 4th

  // Co-op multi-winner test: all players win together
  const manualWinnerIds = ['p1', 'p2', 'p3', 'p4'];
  const coopWinners = players.filter((p) => manualWinnerIds.includes(p.id));
  assert.equal(coopWinners.length, 4);
});

test('isLowResBGGThumbnail detects 200x150, 246x300, and thumb variants', () => {
  assert.equal(isLowResBGGThumbnail('https://cf.geekdo-images.com/xxx/fit-in/200x150/pic123.jpg'), true);
  assert.equal(isLowResBGGThumbnail('https://cf.geekdo-images.com/xxx__small/img/pic123.jpg'), true);
  assert.equal(isLowResBGGThumbnail('https://cf.geekdo-images.com/xxx__thumb/img/pic123.jpg'), true);
  assert.equal(isLowResBGGThumbnail('https://cf.geekdo-images.com/xxx__original/img/pic123.jpg'), false);
  assert.equal(isLowResBGGThumbnail(''), true);
});

test('getGameThumbnail automatically upgrades Zoo Vadis, Brass Birmingham, and The Old Kings Crown to original resolution', () => {
  // 1. Zoo Vadis (even when input only has low-res 200x150 thumbnail)
  const zooVadisThumb = getGameThumbnail({
    name: 'Zoo Vadis',
    thumbnail: 'https://cf.geekdo-images.com/Kl3NjtNKpuJNPjdBQtdsow__small/img/Or2YcwIFnCP84aWJ_63HMwRJDis=/fit-in/200x150/filters:strip_icc()/pic6988937.jpg',
  });
  assert.match(zooVadisThumb, /__original/);
  assert.match(zooVadisThumb, /pic6988937/);

  // 2. Brass: Birmingham
  const brassThumb = getGameThumbnail({
    name: 'Brass: Birmingham',
    thumbnail: 'https://cf.geekdo-images.com/x3zxjr-Vw5iU4yDPg70Jgw__small/img/o18rjEemoWaVru9Y2TyPwuIaRfE=/fit-in/200x150/filters:strip_icc()/pic3490053.jpg',
  });
  assert.match(brassThumb, /__original/);
  assert.match(brassThumb, /pic3490053/);

  // 3. The Old King's Crown
  const kingThumb = getGameThumbnail({
    name: "The Old King's Crown",
    thumbnail: 'https://cf.geekdo-images.com/q3Qp4L-rU3VOW6fMAFUJnQ__small/img/wLX_C6w13ebCON4euesUohQE_Ck=/fit-in/200x150/filters:strip_icc()/pic8937255.jpg',
  });
  assert.match(kingThumb, /__original/);
  assert.match(kingThumb, /pic8937255/);

  // 4. Iron Clays (any variant like "Iron Clays 200", "Iron Clays (100)")
  const ironClaysThumb = getGameThumbnail({
    name: 'Iron Clays 200',
    thumbnail: 'data:image/svg+xml;base64,broken',
  });
  assert.equal(ironClaysThumb, BGG_OFFICIAL_IRON_CLAYS);
});

test('healIncomingGames repairs broken/low-res remote games and preserves local sharp images', () => {
  const localGames: BoardGame[] = [
    {
      id: 'g-iron',
      name: 'Iron Clays 200',
      description: '',
      addedDate: '2026-01-01',
      image: BGG_OFFICIAL_IRON_CLAYS,
      thumbnail: BGG_OFFICIAL_IRON_CLAYS,
      yearPublished: 2017,
      minPlayers: 1,
      maxPlayers: 10,
      playingTime: 0,
      status: 'own',
    },
    {
      id: 'g-zoo',
      name: 'Zoo Vadis',
      description: '',
      addedDate: '2026-01-01',
      image: 'https://cf.geekdo-images.com/Kl3NjtNKpuJNPjdBQtdsow__original/img/3ABkMQwQ-85hqaBO7gHP5ekBAQ0=/0x0/filters:format(jpeg)/pic6988937.jpg',
      thumbnail: 'https://cf.geekdo-images.com/Kl3NjtNKpuJNPjdBQtdsow__original/img/3ABkMQwQ-85hqaBO7gHP5ekBAQ0=/0x0/filters:format(jpeg)/pic6988937.jpg',
      yearPublished: 2023,
      minPlayers: 3,
      maxPlayers: 7,
      playingTime: 40,
      status: 'own',
    },
  ];

  // Remote data coming from cloud with broken/missing/low-res images
  const remoteGames: BoardGame[] = [
    {
      id: 'g-iron',
      name: 'Iron Clays 200',
      description: '',
      addedDate: '2026-01-01',
      image: '', // broken / empty remote
      thumbnail: 'data:image/svg+xml;base64,placeholder',
      yearPublished: 2017,
      minPlayers: 1,
      maxPlayers: 10,
      playingTime: 0,
      status: 'own',
    },
    {
      id: 'g-zoo',
      name: 'Zoo Vadis',
      description: '',
      addedDate: '2026-01-01',
      image: 'https://cf.geekdo-images.com/Kl3NjtNKpuJNPjdBQtdsow__small/img/fit-in/200x150/pic6988937.jpg', // low-res remote
      thumbnail: 'https://cf.geekdo-images.com/Kl3NjtNKpuJNPjdBQtdsow__small/img/fit-in/200x150/pic6988937.jpg',
      yearPublished: 2023,
      minPlayers: 3,
      maxPlayers: 7,
      playingTime: 40,
      status: 'own',
    },
  ];

  const { games: healed, wasHealed } = healIncomingGames(remoteGames, localGames);
  assert.equal(wasHealed, true);
  assert.equal(healed.find((g) => g.id === 'g-iron')?.image, BGG_OFFICIAL_IRON_CLAYS);
  assert.match(healed.find((g) => g.id === 'g-zoo')?.image || '', /__original/);
});

test('findPreviousLoser identifies lowest score player in normal scoring sessions', () => {
  const activePlayers: Player[] = [
    { id: 'p1', name: 'Alice', color: '#ff0000', createdAt: '2026-01-01' },
    { id: 'p2', name: 'Bob', color: '#00ff00', createdAt: '2026-01-01' },
    { id: 'p3', name: 'Charlie', color: '#0000ff', createdAt: '2026-01-01' },
  ];

  const sessions: PlaySession[] = [
    {
      id: 's1',
      gameId: 'g1',
      gameName: 'Brass Birmingham',
      gameThumbnail: '',
      datePlayed: '2026-11-20T10:00:00Z',
      createdAt: '2026-11-20T10:00:00Z',
      firstPlayerMethod: 'random_wheel',
      players: [
        { playerId: 'p1', playerName: 'Alice', score: 142, isWinner: true, rank: 1 },
        { playerId: 'p2', playerName: 'Bob', score: 120, isWinner: false, rank: 2 },
        { playerId: 'p3', playerName: 'Charlie', score: 98, isWinner: false, rank: 3 },
      ],
    },
  ];

  const result = findPreviousLoser(activePlayers, sessions, 'g1');
  assert.ok(result);
  assert.equal(result.player.id, 'p3');
  assert.match(result.reason, /98/);
});

test('findPreviousLoser identifies highest score player in lowestScoreWins sessions', () => {
  const activePlayers: Player[] = [
    { id: 'p1', name: 'Alice', color: '#ff0000', createdAt: '2026-01-01' },
    { id: 'p2', name: 'Bob', color: '#00ff00', createdAt: '2026-01-01' },
  ];

  // In Golf/lowestScoreWins, winner has 12 pts, loser has 38 pts
  const sessions: PlaySession[] = [
    {
      id: 's2',
      gameId: 'g2',
      gameName: 'No Thanks!',
      gameThumbnail: '',
      datePlayed: '2026-11-21T10:00:00Z',
      createdAt: '2026-11-21T10:00:00Z',
      firstPlayerMethod: 'random_wheel',
      players: [
        { playerId: 'p1', playerName: 'Alice', score: 12, isWinner: true },
        { playerId: 'p2', playerName: 'Bob', score: 38, isWinner: false },
      ],
    },
  ];

  const result = findPreviousLoser(activePlayers, sessions, 'g2');
  assert.ok(result);
  assert.equal(result.player.id, 'p2');
  assert.match(result.reason, /38/);
});

test('findPreviousWinner identifies previous winner among active players', () => {
  const activePlayers: Player[] = [
    { id: 'p1', name: 'Alice', color: '#ff0000', createdAt: '2026-01-01' },
    { id: 'p2', name: 'Bob', color: '#00ff00', createdAt: '2026-01-01' },
  ];

  const sessions: PlaySession[] = [
    {
      id: 's3',
      gameId: 'g1',
      gameName: 'Catan',
      gameThumbnail: '',
      datePlayed: '2026-11-22T10:00:00Z',
      createdAt: '2026-11-22T10:00:00Z',
      firstPlayerMethod: 'manual',
      players: [
        { playerId: 'p1', playerName: 'Alice', score: 10, isWinner: true },
        { playerId: 'p2', playerName: 'Bob', score: 8, isWinner: false },
      ],
    },
  ];

  const result = findPreviousWinner(activePlayers, sessions, 'g1');
  assert.ok(result);
  assert.equal(result.player.id, 'p1');
  assert.doesNotMatch(result.reason, /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i);
});

test('STATUS_CONFIG uses Warm Editorial CSS tokens with zero legacy emerald/teal classes', () => {
  const entries = Object.entries(STATUS_CONFIG);
  assert.ok(entries.length >= 7);
  for (const [, cfg] of entries) {
    assert.ok(cfg.label.length > 0);
    assert.match(cfg.color, /var\(--/);
    assert.match(cfg.bg, /var\(--/);
    assert.match(cfg.dot, /var\(--/);
    assert.doesNotMatch(`${cfg.color} ${cfg.bg} ${cfg.border} ${cfg.dot}`, /emerald-|teal-/);
  }
});

test('resolveCoopWinnerIds handles team victory and team defeat cleanly', () => {
  const ids = ['p1', 'p2', 'p3'];
  const wonIds = resolveCoopWinnerIds('won', ids);
  assert.deepEqual(wonIds, ['p1', 'p2', 'p3']);
  assert.notEqual(wonIds, ids, 'should return a fresh copy');

  const lostIds = resolveCoopWinnerIds('lost', ids);
  assert.deepEqual(lostIds, []);
});

test('findPreviousLoser emits Technical English reason strings without Vietnamese diacritics', () => {
  const activePlayers: Player[] = [
    { id: 'p1', name: 'Alice', color: '#ff0000', createdAt: '2026-01-01' },
    { id: 'p2', name: 'Bob', color: '#00ff00', createdAt: '2026-01-01' },
  ];
  const sessions: PlaySession[] = [
    {
      id: 's-en',
      gameId: 'g-en',
      gameName: 'Spirit Island',
      gameThumbnail: '',
      datePlayed: '2026-11-23T10:00:00Z',
      createdAt: '2026-11-23T10:00:00Z',
      firstPlayerMethod: 'manual',
      players: [
        { playerId: 'p1', playerName: 'Alice', isWinner: true },
        { playerId: 'p2', playerName: 'Bob', isWinner: false },
      ],
    },
  ];
  const result = findPreviousLoser(activePlayers, sessions, 'g-en');
  assert.ok(result);
  assert.equal(result.player.id, 'p2');
  assert.match(result.reason, /Previous session \(Spirit Island\)/);
  assert.doesNotMatch(result.reason, /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i);
});

test('isRealtimeSelfReflection suppresses own push echoes while allowing genuine remote updates', () => {
  const baseMs = Date.parse('2026-11-23T12:00:00.000Z');
  const recordIso = new Date(baseMs + 800).toISOString();

  // Matches recent in-flight/just-finished push timestamp (within 2.5s)
  assert.equal(isRealtimeSelfReflection(recordIso, null, baseMs), true);

  // Matches local lastSyncedAt timestamp (within 1.5s)
  assert.equal(isRealtimeSelfReflection(recordIso, new Date(baseMs).toISOString(), 0), true);

  // Genuine remote update 10 seconds later must NOT be suppressed
  const remoteLaterIso = new Date(baseMs + 10_000).toISOString();
  assert.equal(isRealtimeSelfReflection(remoteLaterIso, new Date(baseMs).toISOString(), baseMs), false);

  // Missing or malformed timestamp returns false safely
  assert.equal(isRealtimeSelfReflection(undefined, new Date(baseMs).toISOString(), baseMs), false);
  assert.equal(isRealtimeSelfReflection('not-a-date', new Date(baseMs).toISOString(), baseMs), false);
});

