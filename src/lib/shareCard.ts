import { BoardGame, GameLocation, PlaySession, Player } from '../types';
import {
  formatCount,
  formatDate,
  formatDuration,
  formatNumber,
  getSessionWinners,
  isCoopSession,
  isWinOnlySession,
  normalizeLocationKey,
  resolveLowestScoreWins,
} from './utils';

export type ShareCardMode = 'points' | 'win_only' | 'coop';

export interface ShareCardPointsPlayer {
  rank: number;
  playerName: string;
  score: number;
  scoreFormatted: string;
  isWinner: boolean;
}

export interface ShareCardWinnerPlayer {
  playerName: string;
}

export interface ShareCardOtherPlayer {
  playerName: string;
}

export interface ShareCardTeamPlayer {
  playerName: string;
}

export interface SessionShareCardData {
  mode: ShareCardMode;
  gameTitle: string;
  coverUrl?: string;
  dateFormatted: string;
  locationName?: string;
  durationFormatted?: string;
  playerCountFormatted: string;
  playIndexFormatted: string; // e.g. "Play #42"
  isNewRecord: boolean;
  lowestScoreWins: boolean;

  // Points mode
  leaderboard?: ShareCardPointsPlayer[];
  overflowPlayerCount?: number;

  // Win-only mode
  winners?: ShareCardWinnerPlayer[];
  otherPlayers?: ShareCardOtherPlayer[];
  overflowOtherCount?: number;

  // Co-op mode
  coopOutcome?: 'won' | 'lost';
  teamScoreFormatted?: string;
  teamPlayers?: ShareCardTeamPlayer[];
  overflowTeamCount?: number;
}

export interface BuildShareCardContext {
  game?: BoardGame | null;
  allSessions?: PlaySession[];
  players?: Player[];
  locations?: GameLocation[];
}

/**
 * Pure data builder preparing display payload for the Session Share Card.
 * Fully decoupled from DOM/Canvas to enable deterministic unit testing.
 */
export function buildSessionShareCardData(
  session: PlaySession,
  context: BuildShareCardContext = {}
): SessionShareCardData {
  const { game, allSessions = [], players = [], locations = [] } = context;

  // 1. Resolve scoring mode via Single Source of Truth
  let mode: ShareCardMode = 'points';
  if (isCoopSession(session, game)) {
    mode = 'coop';
  } else if (isWinOnlySession(session, game)) {
    mode = 'win_only';
  }

  // 2. Resolve common metadata
  const gameTitle = (game?.name || session.gameName || 'Unknown Game').trim();
  const coverUrl = game?.image || game?.thumbnail || session.gameThumbnail || '';
  const dateFormatted = formatDate(session.datePlayed);

  // Canonical venue lookup
  let locationName: string | undefined;
  if (session.location && session.location.trim()) {
    const rawLoc = session.location.trim();
    const locKey = normalizeLocationKey(rawLoc);
    const matched = locations.find((l) => normalizeLocationKey(l.name) === locKey);
    locationName = matched ? matched.name : rawLoc;
  }

  // Duration
  let durationFormatted: string | undefined;
  if (typeof session.durationMinutes === 'number' && session.durationMinutes > 0) {
    durationFormatted = formatDuration(session.durationMinutes);
  }

  // Player count
  const rawPlayers = Array.isArray(session.players) ? session.players : [];
  const playerCountFormatted = formatCount(rawPlayers.length, 'player');

  // Player name resolution map (prioritize latest name from player store)
  const playerNameMap = new Map<string, string>();
  for (const p of players) {
    if (p.id && p.name) {
      playerNameMap.set(p.id, p.name);
    }
  }
  const resolvePlayerName = (p: { playerId: string; playerName?: string }) => {
    return (playerNameMap.get(p.playerId) || p.playerName || 'Player').trim();
  };

  // Play #N calculation
  const targetGameId = session.gameId;
  const gameSessions = allSessions.filter((s) => {
    if (targetGameId && s.gameId) {
      return s.gameId === targetGameId;
    }
    return s.gameName?.toLowerCase() === session.gameName?.toLowerCase();
  });

  const hasCurrentSession = gameSessions.some((s) => s.id === session.id);
  const orderedSessions = hasCurrentSession ? [...gameSessions] : [...gameSessions, session];

  orderedSessions.sort((a, b) => {
    const dComp = (a.datePlayed || '').localeCompare(b.datePlayed || '');
    if (dComp !== 0) return dComp;
    const cComp = (a.createdAt || '').localeCompare(b.createdAt || '');
    if (cComp !== 0) return cComp;
    return (a.id || '').localeCompare(b.id || '');
  });

  const sessionIndex = orderedSessions.findIndex((s) => s.id === session.id);
  const playNumber = sessionIndex >= 0 ? sessionIndex + 1 : orderedSessions.length;
  const playIndexFormatted = `Play #${formatNumber(playNumber)}`;

  // Lowest score wins resolution
  const lowestScoreWins = resolveLowestScoreWins(game);

  // 3. Mode-specific data preparation
  if (mode === 'points') {
    // Sort players respecting lowestScoreWins
    const sorted = [...rawPlayers].sort((a, b) => {
      const scoreA =
        typeof a.score === 'number' ? a.score : lowestScoreWins ? Infinity : -Infinity;
      const scoreB =
        typeof b.score === 'number' ? b.score : lowestScoreWins ? Infinity : -Infinity;
      if (scoreA !== scoreB) {
        return lowestScoreWins ? scoreA - scoreB : scoreB - scoreA;
      }
      if (typeof a.rank === 'number' && typeof b.rank === 'number' && a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      return (a.playerName || '').localeCompare(b.playerName || '');
    });

    // Compute standard ranks with tie breaking
    const rankedPlayers: ShareCardPointsPlayer[] = [];
    let currentRank = 1;
    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      const prev = sorted[i - 1];
      if (i > 0 && prev && typeof p.score === 'number' && typeof prev.score === 'number') {
        if (p.score !== prev.score) {
          currentRank = i + 1;
        }
      } else if (i > 0) {
        currentRank = i + 1;
      }

      const isWinner = Boolean(
        p.isWinner || (session.winnerId && p.playerId === session.winnerId) || currentRank === 1
      );

      rankedPlayers.push({
        rank: typeof p.rank === 'number' ? p.rank : currentRank,
        playerName: resolvePlayerName(p),
        score: typeof p.score === 'number' ? p.score : 0,
        scoreFormatted: typeof p.score === 'number' ? formatNumber(p.score) : '—',
        isWinner,
      });
    }

    // Overflow protection: max 8 rows
    let leaderboard = rankedPlayers;
    let overflowPlayerCount: number | undefined;
    if (rankedPlayers.length > 8) {
      leaderboard = rankedPlayers.slice(0, 7);
      overflowPlayerCount = rankedPlayers.length - 7;
    }

    // NEW RECORD calculation
    let isNewRecord = false;
    const pointsSessions = gameSessions.filter(
      (s) => !isCoopSession(s, game) && !isWinOnlySession(s, game)
    );
    const validPointsSessions = pointsSessions.filter(
      (s) =>
        Array.isArray(s.players) &&
        s.players.some((p) => typeof p.score === 'number' && Number.isFinite(p.score))
    );

    if (validPointsSessions.length >= 2) {
      const otherSessions = validPointsSessions.filter((s) => s.id !== session.id);
      if (otherSessions.length >= 1) {
        const thisScores = rawPlayers
          .map((p) => p.score)
          .filter((sc): sc is number => typeof sc === 'number' && Number.isFinite(sc));

        if (thisScores.length > 0) {
          const thisBest = lowestScoreWins ? Math.min(...thisScores) : Math.max(...thisScores);

          const otherScores: number[] = [];
          for (const os of otherSessions) {
            for (const p of os.players || []) {
              if (typeof p.score === 'number' && Number.isFinite(p.score)) {
                otherScores.push(p.score);
              }
            }
          }

          if (otherScores.length > 0) {
            const otherBest = lowestScoreWins ? Math.min(...otherScores) : Math.max(...otherScores);
            if (lowestScoreWins ? thisBest < otherBest : thisBest > otherBest) {
              isNewRecord = true;
            }
          }
        }
      }
    }

    return {
      mode: 'points',
      gameTitle,
      coverUrl,
      dateFormatted,
      locationName,
      durationFormatted,
      playerCountFormatted,
      playIndexFormatted,
      isNewRecord,
      lowestScoreWins,
      leaderboard,
      overflowPlayerCount,
    };
  }

  if (mode === 'win_only') {
    const winnerRecords = getSessionWinners(session, game);
    const winnerIdSet = new Set(winnerRecords.map((w) => w.playerId));

    const winners: ShareCardWinnerPlayer[] = [];
    const otherPlayers: ShareCardOtherPlayer[] = [];

    for (const p of rawPlayers) {
      const name = resolvePlayerName(p);
      if (winnerIdSet.has(p.playerId) || p.isWinner) {
        winners.push({ playerName: name });
      } else {
        otherPlayers.push({ playerName: name });
      }
    }

    let finalOther = otherPlayers;
    let overflowOtherCount: number | undefined;
    const totalCount = winners.length + otherPlayers.length;
    if (totalCount > 8) {
      const availableSlots = Math.max(1, 8 - winners.length);
      if (otherPlayers.length > availableSlots) {
        finalOther = otherPlayers.slice(0, availableSlots - 1);
        overflowOtherCount = otherPlayers.length - (availableSlots - 1);
      }
    }

    return {
      mode: 'win_only',
      gameTitle,
      coverUrl,
      dateFormatted,
      locationName,
      durationFormatted,
      playerCountFormatted,
      playIndexFormatted,
      isNewRecord: false,
      lowestScoreWins: false,
      winners,
      otherPlayers: finalOther,
      overflowOtherCount,
    };
  }

  // Co-op mode
  const isWon =
    session.coopOutcome === 'won' || rawPlayers.some((p) => p.isWinner);
  const coopOutcome: 'won' | 'lost' = isWon ? 'won' : 'lost';

  let teamScoreFormatted: string | undefined;
  const rawTeamScore =
    (session as any).coopScore ?? (session as any).teamScore;
  if (
    typeof rawTeamScore === 'number' &&
    Number.isFinite(rawTeamScore) &&
    rawTeamScore > 0
  ) {
    teamScoreFormatted = formatNumber(rawTeamScore);
  }

  const teamPlayers = rawPlayers.map((p) => ({
    playerName: resolvePlayerName(p),
  }));

  let finalTeam = teamPlayers;
  let overflowTeamCount: number | undefined;
  if (teamPlayers.length > 8) {
    finalTeam = teamPlayers.slice(0, 7);
    overflowTeamCount = teamPlayers.length - 7;
  }

  return {
    mode: 'coop',
    gameTitle,
    coverUrl,
    dateFormatted,
    locationName,
    durationFormatted,
    playerCountFormatted,
    playIndexFormatted,
    isNewRecord: false,
    lowestScoreWins: false,
    coopOutcome,
    teamScoreFormatted,
    teamPlayers: finalTeam,
    overflowTeamCount,
  };
}
