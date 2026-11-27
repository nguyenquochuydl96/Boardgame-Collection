import test from 'node:test';
import assert from 'node:assert/strict';
import { BoardGame, PlaySession, Player, GameLocation } from '../types';
import {
  resolveGameScoringMode,
  isCoopSession,
  isWinOnlySession,
  resolveLowestScoreWins,
} from './utils';
import { buildSessionShareCardData, buildProxiedImageUrl } from './shareCard';

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
// PROXIED IMAGE URL BUILDER TESTS
// ---------------------------------------------------------------------------

test('buildProxiedImageUrl proxies external images through wsrv.nl and keeps idb/data untouched', () => {
  const bggUrl = 'https://cf.geekdo-images.com/ABC123/original/img.jpg';
  const proxied = buildProxiedImageUrl(bggUrl, 800);
  assert.equal(
    proxied,
    `https://wsrv.nl/?url=${encodeURIComponent(bggUrl)}&w=800&output=png`
  );

  // Local & data URLs remain untouched
  assert.equal(buildProxiedImageUrl('idb://media-123'), 'idb://media-123');
  assert.equal(buildProxiedImageUrl('data:image/png;base64,abc'), 'data:image/png;base64,abc');
  assert.equal(buildProxiedImageUrl('/assets/icon.png'), '/assets/icon.png');
  assert.equal(buildProxiedImageUrl(''), '');
});

// ---------------------------------------------------------------------------
// PART 1 & 2 TESTS: SESSION SHARE CARD DATA BUILDER
// ---------------------------------------------------------------------------

test('buildSessionShareCardData: points mode formats ranks, ties, comma scores, Play #N, micro-tag and avatars', () => {
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
    {
      id: 'p1',
      name: 'Heo (Pro)',
      color: '#E5734F',
      avatar: 'idb://avatar-heo',
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'p2',
      name: 'Hằng',
      color: '#588157',
      avatar: '👑',
      createdAt: '2026-01-01T00:00:00Z',
    },
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
  assert.equal(data2.venueDateFormatted, 'Played at Lafam · May 15, 2026');
  assert.equal(data2.durationFormatted, '2h 5m');
  assert.equal(data2.playerCountFormatted, '3 players');
  assert.equal(data2.isNewRecord, true); // 1,250 > 110 with >= 2 points sessions

  // Check leaderboard ranks, avatars & formatting
  const lb = data2.leaderboard!;
  assert.equal(lb.length, 3);
  assert.equal(lb[0].playerName, 'Heo (Pro)'); // Uses updated name from store
  assert.equal(lb[0].rank, 1);
  assert.equal(lb[0].scoreFormatted, '1,250');
  assert.equal(lb[0].isWinner, true);
  assert.equal(lb[0].scorePercentage, 100);
  assert.equal(lb[0].microTag, '+300 pts margin');
  assert.equal(lb[0].avatarUrl, 'idb://avatar-heo');

  // Tied 2nd place (alphabetically A Kha then Hằng)
  assert.equal(lb[1].rank, 2);
  assert.equal(lb[1].playerName, 'A Kha');
  assert.equal(lb[1].scoreFormatted, '950');
  assert.equal(lb[1].monogram, 'AK');
  assert.equal(lb[1].scorePercentage, 76); // Math.round((950 / 1250) * 100) = 76

  assert.equal(lb[2].rank, 2);
  assert.equal(lb[2].playerName, 'Hằng');
  assert.equal(lb[2].scoreFormatted, '950');
  assert.equal(lb[2].avatarEmoji, '👑');
});

test('buildSessionShareCardData: detects Photo Finish and Shared Victory correctly', () => {
  const game = { id: 'g-catan', name: 'Catan', status: 'own' } as unknown as BoardGame;

  // 1. Photo Finish · +1 pt
  const closeSession1: PlaySession = {
    id: 's-close-1',
    gameId: 'g-catan',
    gameName: 'Catan',
    gameThumbnail: '',
    datePlayed: '2026-05-18',
    createdAt: '2026-05-18T10:00:00Z',
    firstPlayerMethod: 'manual',
    players: [
      { playerId: 'p1', playerName: 'Heo', score: 10, isWinner: true },
      { playerId: 'p2', playerName: 'Huy', score: 9, isWinner: false },
    ],
  };
  const dataClose1 = buildSessionShareCardData(closeSession1, { game });
  assert.equal(dataClose1.leaderboard?.[0].microTag, 'Photo Finish · +1 pt');

  // 2. Photo Finish · +2 pts
  const closeSession2: PlaySession = {
    id: 's-close-2',
    gameId: 'g-catan',
    gameName: 'Catan',
    gameThumbnail: '',
    datePlayed: '2026-05-18',
    createdAt: '2026-05-18T10:00:00Z',
    firstPlayerMethod: 'manual',
    players: [
      { playerId: 'p1', playerName: 'Heo', score: 10, isWinner: true },
      { playerId: 'p2', playerName: 'Huy', score: 8, isWinner: false },
    ],
  };
  const dataClose2 = buildSessionShareCardData(closeSession2, { game });
  assert.equal(dataClose2.leaderboard?.[0].microTag, 'Photo Finish · +2 pts');

  // 3. Shared Victory
  const tiedSession: PlaySession = {
    id: 's-tie',
    gameId: 'g-catan',
    gameName: 'Catan',
    gameThumbnail: '',
    datePlayed: '2026-05-18',
    createdAt: '2026-05-18T10:00:00Z',
    firstPlayerMethod: 'manual',
    players: [
      { playerId: 'p1', playerName: 'Heo', score: 10, isWinner: true },
      { playerId: 'p2', playerName: 'Huy', score: 10, isWinner: true },
    ],
  };
  const dataTied = buildSessionShareCardData(tiedSession, { game });
  assert.equal(dataTied.leaderboard?.[0].microTag, 'Shared Victory');
  assert.equal(dataTied.leaderboard?.[1].microTag, 'Shared Victory');
});

test('buildSessionShareCardData: lowestScoreWins (Durian) ranks lowest score #1 and inverts score percentage', () => {
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
  assert.equal(lb[0].scorePercentage, 100);

  assert.equal(lb[1].score, 5);
  assert.equal(lb[1].rank, 2);
  assert.equal(lb[1].scorePercentage, 20); // Math.round((1 / 5) * 100) = 20
});

test('buildSessionShareCardData: win_only (Mind MGMT with 3 Rogue Agents) separates winners, attaches avatars and hides 0 pts', () => {
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
  assert.equal(data.winners?.[0].monogram, 'AH');
  assert.equal(data.otherPlayers?.length, 1);
  assert.equal(data.otherPlayers?.[0].playerName, 'Hằng');
  assert.equal(data.otherPlayers?.[0].monogram, 'H');

  // Verify no score is exposed in data
  assert.equal(data.leaderboard, undefined);
  assert.equal(data.teamScoreFormatted, undefined);
});

test('buildSessionShareCardData: coop (Spirit Island) sets TEAM VICTORY/DEFEAT, attaches squad avatars and formats score', () => {
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
  assert.equal(dataWon.teamPlayers?.[0].monogram, 'H');

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

// ---------------------------------------------------------------------------
// DUAL DESIGNS & EXPANDED DATA TESTS (POSTER & TICKET)
// ---------------------------------------------------------------------------

test('buildSessionShareCardData: computes calloutBadge for BLOWOUT, PHOTO FINISH, NEW RECORD, SHARED VICTORY and WINNERS', () => {
  const game = {
    id: 'g-castle',
    name: 'Castle Combo',
    bggId: '420361',
    status: 'own',
  } as unknown as BoardGame;

  // 1. BLOWOUT · +32 (108 vs 76 -> margin 32 >= 15)
  const blowoutSession: PlaySession = {
    id: 's-castle-1',
    gameId: 'g-castle',
    gameName: 'Castle Combo',
    gameThumbnail: '',
    datePlayed: '2026-11-22',
    createdAt: '2026-11-22T14:00:00Z',
    firstPlayerMethod: 'manual',
    players: [
      { playerId: 'p1', playerName: 'Heo', score: 108, isWinner: true },
      { playerId: 'p2', playerName: 'Hằng', score: 76, isWinner: false },
    ],
  };

  const dataBlowout = buildSessionShareCardData(blowoutSession, {
    game,
    allSessions: [blowoutSession],
  });
  assert.equal(dataBlowout.calloutBadge, 'BLOWOUT · +32');
  assert.equal(dataBlowout.leaderboard?.[1].gapFromLeaderText, '-32');

  // 2. PHOTO FINISH · +1 (10 vs 9 -> margin 1 <= 2)
  const photoSession: PlaySession = {
    id: 's-castle-2',
    gameId: 'g-castle',
    gameName: 'Castle Combo',
    gameThumbnail: '',
    datePlayed: '2026-11-23',
    createdAt: '2026-11-23T14:00:00Z',
    firstPlayerMethod: 'manual',
    players: [
      { playerId: 'p1', playerName: 'Heo', score: 10, isWinner: true },
      { playerId: 'p2', playerName: 'Huy', score: 9, isWinner: false },
    ],
  };
  const dataPhoto = buildSessionShareCardData(photoSession, {
    game,
    allSessions: [blowoutSession, photoSession],
  });
  assert.equal(dataPhoto.calloutBadge, 'PHOTO FINISH · +1');
  assert.equal(dataPhoto.leaderboard?.[1].gapFromLeaderText, '-1');

  // 3. ★ NEW RECORD (150 beats 108 with >= 2 points sessions)
  const recordSession: PlaySession = {
    id: 's-castle-3',
    gameId: 'g-castle',
    gameName: 'Castle Combo',
    gameThumbnail: '',
    datePlayed: '2026-11-24',
    createdAt: '2026-11-24T14:00:00Z',
    firstPlayerMethod: 'manual',
    players: [
      { playerId: 'p1', playerName: 'Heo', score: 150, isWinner: true },
      { playerId: 'p2', playerName: 'Hằng', score: 80, isWinner: false },
    ],
  };
  const dataRecord = buildSessionShareCardData(recordSession, {
    game,
    allSessions: [blowoutSession, photoSession, recordSession],
  });
  assert.equal(dataRecord.calloutBadge, '★ NEW RECORD');

  // 4. SHARED VICTORY (tie for rank 1)
  const tieSession: PlaySession = {
    id: 's-castle-4',
    gameId: 'g-castle',
    gameName: 'Castle Combo',
    gameThumbnail: '',
    datePlayed: '2026-11-25',
    createdAt: '2026-11-25T14:00:00Z',
    firstPlayerMethod: 'manual',
    players: [
      { playerId: 'p1', playerName: 'Heo', score: 90, isWinner: true },
      { playerId: 'p2', playerName: 'Hằng', score: 90, isWinner: true },
    ],
  };
  const dataTie = buildSessionShareCardData(tieSession, {
    game,
    allSessions: [blowoutSession, photoSession, recordSession, tieSession],
  });
  assert.equal(dataTie.calloutBadge, 'SHARED VICTORY');
});

test('buildSessionShareCardData: computes winnerGameStreak accurately for consecutive game wins', () => {
  const game = {
    id: 'g-catan',
    name: 'Catan',
    status: 'own',
  } as unknown as BoardGame;

  // Session 1: Heo wins
  const s1: PlaySession = {
    id: 's1',
    gameId: 'g-catan',
    gameName: 'Catan',
    gameThumbnail: '',
    datePlayed: '2026-05-01',
    createdAt: '2026-05-01T10:00:00Z',
    firstPlayerMethod: 'manual',
    players: [
      { playerId: 'p-heo', playerName: 'Heo', score: 10, isWinner: true },
      { playerId: 'p-huy', playerName: 'Huy', score: 8, isWinner: false },
    ],
  };

  // Session 2: Heo wins again (streak = 2)
  const s2: PlaySession = {
    id: 's2',
    gameId: 'g-catan',
    gameName: 'Catan',
    gameThumbnail: '',
    datePlayed: '2026-05-02',
    createdAt: '2026-05-02T10:00:00Z',
    firstPlayerMethod: 'manual',
    players: [
      { playerId: 'p-heo', playerName: 'Heo', score: 10, isWinner: true },
      { playerId: 'p-huy', playerName: 'Huy', score: 7, isWinner: false },
    ],
  };

  // Session 3: Heo wins 3rd time (streak = 3)
  const s3: PlaySession = {
    id: 's3',
    gameId: 'g-catan',
    gameName: 'Catan',
    gameThumbnail: '',
    datePlayed: '2026-05-03',
    createdAt: '2026-05-03T10:00:00Z',
    firstPlayerMethod: 'manual',
    players: [
      { playerId: 'p-heo', playerName: 'Heo', score: 10, isWinner: true },
      { playerId: 'p-huy', playerName: 'Huy', score: 6, isWinner: false },
    ],
  };

  // Session 4: Huy wins (streak breaks, returns undefined since 1 win < 2)
  const s4: PlaySession = {
    id: 's4',
    gameId: 'g-catan',
    gameName: 'Catan',
    gameThumbnail: '',
    datePlayed: '2026-05-04',
    createdAt: '2026-05-04T10:00:00Z',
    firstPlayerMethod: 'manual',
    players: [
      { playerId: 'p-huy', playerName: 'Huy', score: 10, isWinner: true },
      { playerId: 'p-heo', playerName: 'Heo', score: 9, isWinner: false },
    ],
  };

  const all = [s1, s2, s3, s4];

  // s1 alone: streak is 1, so winnerGameStreak is undefined (< 2)
  const data1 = buildSessionShareCardData(s1, { game, allSessions: [s1] });
  assert.equal(data1.winnerGameStreak, undefined);

  // s2: streak is 2
  const data2 = buildSessionShareCardData(s2, { game, allSessions: [s1, s2] });
  assert.equal(data2.winnerGameStreak, 2);

  // s3: streak is 3
  const data3 = buildSessionShareCardData(s3, { game, allSessions: all });
  assert.equal(data3.winnerGameStreak, 3);

  // s4: Huy won only 1 game, streak is undefined (< 2)
  const data4 = buildSessionShareCardData(s4, { game, allSessions: all });
  assert.equal(data4.winnerGameStreak, undefined);
});

test('buildSessionShareCardData: ticketSerial and ticketBarcode format correctly', () => {
  const game = {
    id: 'g-castle',
    name: 'Castle Combo',
    status: 'own',
  } as unknown as BoardGame;

  // Simulate play #41
  const fakeOldSessions: PlaySession[] = Array.from({ length: 40 }, (_, i) => ({
    id: `s-old-${i}`,
    gameId: 'g-castle',
    gameName: 'Castle Combo',
    gameThumbnail: '',
    datePlayed: '2026-01-01',
    createdAt: `2026-01-01T${String(i % 24).padStart(2, '0')}:00:00Z`,
    firstPlayerMethod: 'manual',
    players: [{ playerId: 'p1', playerName: 'Heo', score: 10, isWinner: true }],
  }));

  const session41: PlaySession = {
    id: 's-castle-41',
    gameId: 'g-castle',
    gameName: 'Castle Combo',
    gameThumbnail: '',
    datePlayed: '2026-11-22',
    createdAt: '2026-11-22T15:30:00Z',
    firstPlayerMethod: 'manual',
    players: [
      { playerId: 'p1', playerName: 'Heo', score: 108, isWinner: true },
      { playerId: 'p2', playerName: 'Hằng', score: 76, isWinner: false },
    ],
  };

  const data = buildSessionShareCardData(session41, {
    game,
    allSessions: [...fakeOldSessions, session41],
  });

  assert.equal(data.playNumber, 41);
  assert.equal(data.playIndexFormatted, 'Play #41');
  assert.equal(data.ticketSerial, 'NO. 0041');
  assert.equal(data.ticketBarcode, 'HEO-41-20261122');
});

test('buildSessionShareCardData: lowestScoreWins formats gapFromLeaderText with positive sign', () => {
  const durianGame = {
    id: 'g-durian',
    name: 'Durian',
    bggId: '307963',
    status: 'own',
  } as unknown as BoardGame;

  const session: PlaySession = {
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

  const data = buildSessionShareCardData(session, {
    game: durianGame,
    allSessions: [session],
  });

  // Runner up has score 7, leader has 3. In lowestScoreWins, gap is +4!
  assert.equal(data.leaderboard?.[1].gapFromLeaderText, '+4');
});

test('buildSessionShareCardData: roast and celebrate use deterministic presentation without reversing lowest-score winner or last place', () => {
  const game = { id: 'g-low', name: 'Durian', status: 'own', lowestScoreWins: true } as unknown as BoardGame;
  const session: PlaySession = {
    id: 's-low-vibe', gameId: 'g-low', gameName: 'Durian', gameThumbnail: '',
    datePlayed: '2026-11-27', createdAt: '2026-11-27T19:00:00Z', firstPlayerMethod: 'manual',
    lowestScoreWins: true,
    players: [
      { playerId: 'winner', playerName: 'Winner', score: 2, isWinner: true },
      { playerId: 'close', playerName: 'Close', score: 3, isWinner: false },
      { playerId: 'last', playerName: 'Last', score: 14, isWinner: false },
    ],
  };

  const roast = buildSessionShareCardData(session, { game, tone: 'roast', shuffleSeed: 11 });
  const repeat = buildSessionShareCardData(session, { game, tone: 'roast', shuffleSeed: 11 });
  const celebrate = buildSessionShareCardData(session, { game, tone: 'celebrate', shuffleSeed: 11 });
  const leaderboard = roast.leaderboard!;

  assert.equal(roast.resultStatus, 'resolved');
  assert.equal(leaderboard[0].playerName, 'Winner');
  assert.notEqual(leaderboard[0].vibeTag, 'Chair Warmer');
  assert.equal(leaderboard[2].playerName, 'Last');
  assert.equal(leaderboard[2].vibeTag, 'Chair Warmer');
  assert.equal(roast.headline, repeat.headline);
  assert.equal(roast.stamp, repeat.stamp);
  assert.notEqual(roast.headline, celebrate.headline);
  assert.equal(celebrate.tone, 'celebrate');
});

test('buildSessionShareCardData: RESULT PENDING suppresses winner and roast targets while retaining custom caption', () => {
  const session: PlaySession = {
    id: 's-pending-vibe', gameId: 'g-pending', gameName: 'Unfinished Game', gameThumbnail: '',
    datePlayed: '2026-11-27', createdAt: '2026-11-27T20:00:00Z', firstPlayerMethod: 'manual',
    players: [
      { playerId: 'a', playerName: 'Alice', score: 19, isWinner: true },
      { playerId: 'b', playerName: 'Bob', isWinner: false },
      { playerId: 'c', playerName: 'Cara', score: 3, isWinner: false },
    ],
  };
  const data = buildSessionShareCardData(session, {
    tone: 'roast', shuffleSeed: 5, customCaption: '  Hôm nay bét bảng bao trà sữa!  ',
  });

  assert.equal(data.resultStatus, 'pending');
  assert.equal(data.calloutBadge, 'RESULT PENDING');
  assert.equal(data.isNewRecord, false);
  assert.equal(data.headline, 'Scores Still Pending… Suspense!');
  assert.equal(data.stamp, 'RESULT PENDING');
  assert.equal(data.customCaption, 'Hôm nay bét bảng bao trà sữa!');
  assert.ok(data.leaderboard?.every((player) => !player.isWinner && !player.vibeTag));
});

test('buildSessionShareCardData: co-op roast and celebrate presentation tracks explicit team results', () => {
  const won: PlaySession = {
    id: 's-coop-vibe', gameId: 'g-coop', gameName: 'Spirit Island', gameThumbnail: '',
    datePlayed: '2026-11-27', createdAt: '2026-11-27T20:30:00Z', firstPlayerMethod: 'manual',
    scoringMode: 'coop', coopOutcome: 'won',
    players: [{ playerId: 'a', playerName: 'Alice', isWinner: true }, { playerId: 'b', playerName: 'Bob', isWinner: true }],
  };
  const roast = buildSessionShareCardData(won, { tone: 'roast', shuffleSeed: 9 });
  const celebrate = buildSessionShareCardData(won, { tone: 'celebrate', shuffleSeed: 9 });
  assert.equal(roast.resultStatus, 'resolved');
  assert.equal(roast.coopOutcome, 'won');
  assert.equal(roast.teamPlayers?.[0].vibeTag, 'Dream Team');
  assert.equal(celebrate.teamPlayers?.[0].vibeTag, 'Co-op Hero');
  assert.notEqual(roast.stamp, celebrate.stamp);
});
