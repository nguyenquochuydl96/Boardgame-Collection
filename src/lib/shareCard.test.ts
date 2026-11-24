import test from 'node:test';
import assert from 'node:assert/strict';
import { BoardGame, PlaySession, Player, GameLocation } from '../types';
import {
  resolveGameScoringMode,
  isCoopSession,
  isWinOnlySession,
  resolveLowestScoreWins,
} from './utils';
import { buildSessionShareCardData } from './shareCard';

// ---------------------------------------------------------------------------
// PART 0 TESTS: PRESET INTEGRITY & RESOLUTION PRIORITIES
// ---------------------------------------------------------------------------

test('Part 0: Faraway is high-score-wins, Durian and Rebel Princess are lowestScoreWins', () => {
  const farawayGame = {
    id: 'g-faraway',
    name: 'Faraway',
    bggId: '385761',
    status: 'own',
    minPlayers: 2,
    maxPlayers: 6,
  } as unknown as BoardGame;

  const durianGame = {
    id: 'g-durian',
    name: 'Durian',
    bggId: '307963',
    status: 'own',
    minPlayers: 2,
    maxPlayers: 7,
  } as unknown as BoardGame;

  const rebelPrincessGame = {
    id: 'g-rebel',
    name: 'Rebel Princess',
    bggId: '381249',
    status: 'own',
    minPlayers: 3,
    maxPlayers: 6,
  } as unknown as BoardGame;

  // Faraway must NOT be lowestScoreWins
  assert.equal(resolveLowestScoreWins(farawayGame), false);

  // Durian and Rebel Princess MUST be lowestScoreWins
  assert.equal(resolveLowestScoreWins(durianGame), true);
  assert.equal(resolveLowestScoreWins(rebelPrincessGame), true);
});

test('Part 0: Manual override game.scoringMode = points on a win_only game beats Preset table', () => {
  // Heat is win_only in canonical preset table
  const heatDefault = {
    id: 'g-heat',
    name: 'Heat: Pedal to the Metal',
    bggId: '366013',
    status: 'own',
  } as unknown as BoardGame;
  assert.equal(resolveGameScoringMode(heatDefault), 'win_only');

  // User manually changes scoringMode to 'points' in Edit Game
  const heatOverridden = {
    id: 'g-heat',
    name: 'Heat: Pedal to the Metal',
    bggId: '366013',
    status: 'own',
    scoringMode: 'points',
  } as unknown as BoardGame;

  // Tier 1 manual override must win!
  assert.equal(resolveGameScoringMode(heatOverridden), 'points');

  const session: PlaySession = {
    id: 's-heat-1',
    gameId: 'g-heat',
    gameName: 'Heat: Pedal to the Metal',
    gameThumbnail: '',
    datePlayed: '2026-05-20',
    createdAt: '2026-05-20T10:00:00Z',
    firstPlayerMethod: 'manual',
    players: [
      { playerId: 'p1', playerName: 'Heo', score: 100, isWinner: true },
      { playerId: 'p2', playerName: 'Huy', score: 85, isWinner: false },
    ],
  };

  assert.equal(isCoopSession(session, heatOverridden), false);
  assert.equal(isWinOnlySession(session, heatOverridden), false);
});

// ---------------------------------------------------------------------------
// PART 1 & 2 TESTS: SESSION SHARE CARD DATA BUILDER
// ---------------------------------------------------------------------------

test('buildSessionShareCardData: points mode formats ranks, ties, comma scores, Play #N and record detection', () => {
  const game = {
    id: 'g-ark',
    name: 'Ark Nova',
    bggId: '342942',
    status: 'own',
  } as unknown as BoardGame;

  const oldSession: PlaySession = {
    id: 's-ark-1',
    gameId: 'g-ark',
    gameName: 'Ark Nova',
    gameThumbnail: '',
    datePlayed: '2026-05-01',
    createdAt: '2026-05-01T10:00:00Z',
    firstPlayerMethod: 'manual',
    players: [
      { playerId: 'p1', playerName: 'Heo', score: 110, isWinner: true },
      { playerId: 'p2', playerName: 'Hằng', score: 95, isWinner: false },
    ],
  };

  // First session alone: isNewRecord MUST be false (requires >= 2 points sessions)
  const data1 = buildSessionShareCardData(oldSession, {
    game,
    allSessions: [oldSession],
  });
  assert.equal(data1.mode, 'points');
  assert.equal(data1.playIndexFormatted, 'Play #1');
  assert.equal(data1.isNewRecord, false);

  // Second session where Heo scores 1,250 (beats previous best 110)
  const newSession: PlaySession = {
    id: 's-ark-2',
    gameId: 'g-ark',
    gameName: 'Ark Nova',
    gameThumbnail: '',
    location: 'Lafam  ',
    durationMinutes: 125,
    datePlayed: '2026-05-15',
    createdAt: '2026-05-15T15:00:00Z',
    firstPlayerMethod: 'manual',
    players: [
      { playerId: 'p1', playerName: 'Heo', score: 1250, isWinner: true },
      { playerId: 'p2', playerName: 'Hằng', score: 950, isWinner: false },
      { playerId: 'p3', playerName: 'A Kha', score: 950, isWinner: false }, // Tie
    ],
  };

  const locations: GameLocation[] = [
    { id: 'loc-1', name: 'Lafam', createdAt: '2026-01-01T00:00:00Z' },
  ];
  const players: Player[] = [
    { id: 'p1', name: 'Heo (Pro)', color: '#E5734F', createdAt: '2026-01-01T00:00:00Z' },
    { id: 'p2', name: 'Hằng', color: '#588157', createdAt: '2026-01-01T00:00:00Z' },
  ];

  const data2 = buildSessionShareCardData(newSession, {
    game,
    allSessions: [oldSession, newSession],
    locations,
    players,
  });

  assert.equal(data2.mode, 'points');
  assert.equal(data2.playIndexFormatted, 'Play #2');
  assert.equal(data2.locationName, 'Lafam');
  assert.equal(data2.durationFormatted, '2h 5m');
  assert.equal(data2.playerCountFormatted, '3 players');
  assert.equal(data2.isNewRecord, true); // 1,250 > 110 with >= 2 points sessions

  // Check leaderboard ranks & formatting
  const lb = data2.leaderboard!;
  assert.equal(lb.length, 3);
  assert.equal(lb[0].playerName, 'Heo (Pro)'); // Uses updated name from store
  assert.equal(lb[0].rank, 1);
  assert.equal(lb[0].scoreFormatted, '1,250');
  assert.equal(lb[0].isWinner, true);

  // Tied 2nd place
  assert.equal(lb[1].rank, 2);
  assert.equal(lb[1].scoreFormatted, '950');
  assert.equal(lb[2].rank, 2);
  assert.equal(lb[2].scoreFormatted, '950');
});

test('buildSessionShareCardData: lowestScoreWins (Durian) ranks lowest score #1 and detects low record', () => {
  const durianGame = {
    id: 'g-durian',
    name: 'Durian',
    bggId: '307963',
    status: 'own',
  } as unknown as BoardGame;

  const session1: PlaySession = {
    id: 's-dur-1',
    gameId: 'g-durian',
    gameName: 'Durian',
    gameThumbnail: '',
    datePlayed: '2026-04-10',
    createdAt: '2026-04-10T10:00:00Z',
    firstPlayerMethod: 'manual',
    players: [
      { playerId: 'p1', playerName: 'Heo', score: 3, isWinner: true },
      { playerId: 'p2', playerName: 'Huy', score: 7, isWinner: false },
    ],
  };

  const session2: PlaySession = {
    id: 's-dur-2',
    gameId: 'g-durian',
    gameName: 'Durian',
    gameThumbnail: '',
    datePlayed: '2026-04-15',
    createdAt: '2026-04-15T10:00:00Z',
    firstPlayerMethod: 'manual',
    players: [
      { playerId: 'p1', playerName: 'Heo', score: 1, isWinner: true }, // New lowest score!
      { playerId: 'p2', playerName: 'Huy', score: 5, isWinner: false },
    ],
  };

  const data = buildSessionShareCardData(session2, {
    game: durianGame,
    allSessions: [session1, session2],
  });

  assert.equal(data.mode, 'points');
  assert.equal(data.lowestScoreWins, true);
  assert.equal(data.isNewRecord, true); // 1 < 3

  const lb = data.leaderboard!;
  assert.equal(lb[0].playerName, 'Heo');
  assert.equal(lb[0].score, 1);
  assert.equal(lb[0].rank, 1);
  assert.equal(lb[1].score, 5);
  assert.equal(lb[1].rank, 2);
});

test('buildSessionShareCardData: win_only (Mind MGMT with 3 Rogue Agents) separates winners and hides 0 pts', () => {
  const mindGame = {
    id: 'g-mind',
    name: 'Mind MGMT: The Psychic Espionage “Game.”',
    bggId: '284653',
    status: 'own',
  } as unknown as BoardGame;

  const session: PlaySession = {
    id: 's-mind-1',
    gameId: 'g-mind',
    gameName: 'Mind MGMT: The Psychic Espionage “Game.”',
    gameThumbnail: '',
    datePlayed: '2026-05-17',
    createdAt: '2026-05-17T14:00:00Z',
    firstPlayerMethod: 'manual',
    players: [
      { playerId: 'p1', playerName: 'Anh Huy', isWinner: true, score: 0 },
      { playerId: 'p2', playerName: 'Chị Quyên', isWinner: true, score: 0 },
      { playerId: 'p3', playerName: 'Heo', isWinner: true, score: 0 },
      { playerId: 'p4', playerName: 'Hằng', isWinner: false, score: 0 },
    ],
  };

  const data = buildSessionShareCardData(session, {
    game: mindGame,
    allSessions: [session],
  });

  assert.equal(data.mode, 'win_only');
  assert.equal(data.isNewRecord, false); // Always false in win_only
  assert.equal(data.winners?.length, 3);
  assert.deepEqual(
    data.winners?.map((w) => w.playerName),
    ['Anh Huy', 'Chị Quyên', 'Heo']
  );
  assert.equal(data.otherPlayers?.length, 1);
  assert.equal(data.otherPlayers?.[0].playerName, 'Hằng');

  // Verify no score is exposed in data
  assert.equal(data.leaderboard, undefined);
  assert.equal(data.teamScoreFormatted, undefined);
});

test('buildSessionShareCardData: coop (Spirit Island) sets TEAM VICTORY/DEFEAT and formats score if present', () => {
  const spiritGame = {
    id: 'g-spirit',
    name: 'Spirit Island',
    bggId: '162886',
    status: 'own',
  } as unknown as BoardGame;

  // 1. Victory without score
  const sessionWon: PlaySession = {
    id: 's-spirit-won',
    gameId: 'g-spirit',
    gameName: 'Spirit Island',
    gameThumbnail: '',
    datePlayed: '2026-05-20',
    createdAt: '2026-05-20T10:00:00Z',
    firstPlayerMethod: 'manual',
    scoringMode: 'coop',
    coopOutcome: 'won',
    players: [
      { playerId: 'p1', playerName: 'Huy', isWinner: true },
      { playerId: 'p2', playerName: 'Heo', isWinner: true },
    ],
  };

  const dataWon = buildSessionShareCardData(sessionWon, {
    game: spiritGame,
    allSessions: [sessionWon],
  });
  assert.equal(dataWon.mode, 'coop');
  assert.equal(dataWon.coopOutcome, 'won');
  assert.equal(dataWon.teamScoreFormatted, undefined); // No valid numeric score
  assert.equal(dataWon.isNewRecord, false);
  assert.equal(dataWon.teamPlayers?.length, 2);

  // 2. Victory with valid team score
  const sessionWithScore: any = {
    ...sessionWon,
    id: 's-spirit-score',
    coopScore: 145,
  };
  const dataWithScore = buildSessionShareCardData(sessionWithScore, {
    game: spiritGame,
    allSessions: [sessionWithScore],
  });
  assert.equal(dataWithScore.teamScoreFormatted, '145');

  // 3. Defeat
  const sessionLost: PlaySession = {
    id: 's-spirit-lost',
    gameId: 'g-spirit',
    gameName: 'Spirit Island',
    gameThumbnail: '',
    datePlayed: '2026-05-20',
    createdAt: '2026-05-20T12:00:00Z',
    firstPlayerMethod: 'manual',
    scoringMode: 'coop',
    coopOutcome: 'lost',
    players: [
      { playerId: 'p1', playerName: 'Huy', isWinner: false },
      { playerId: 'p2', playerName: 'Heo', isWinner: false },
    ],
  };
  const dataLost = buildSessionShareCardData(sessionLost, {
    game: spiritGame,
    allSessions: [sessionLost],
  });
  assert.equal(dataLost.mode, 'coop');
  assert.equal(dataLost.coopOutcome, 'lost');
});

test('buildSessionShareCardData: truncates smoothly for tables with > 8 players', () => {
  const game = {
    id: 'g-party',
    name: 'Just One',
    status: 'own',
  } as unknown as BoardGame;

  const players: Array<{ playerId: string; playerName: string; score: number }> = [];
  for (let i = 1; i <= 10; i++) {
    players.push({
      playerId: `p${i}`,
      playerName: `Player ${i}`,
      score: 100 - i * 5,
    });
  }

  const session: PlaySession = {
    id: 's-party-1',
    gameId: 'g-party',
    gameName: 'Just One',
    gameThumbnail: '',
    datePlayed: '2026-05-20',
    createdAt: '2026-05-20T10:00:00Z',
    firstPlayerMethod: 'manual',
    players: players as any,
  };

  const data = buildSessionShareCardData(session, {
    game,
    allSessions: [session],
  });

  assert.equal(data.mode, 'points');
  assert.equal(data.leaderboard?.length, 7); // Top 7
  assert.equal(data.overflowPlayerCount, 3); // 10 - 7 = 3 more players
});
