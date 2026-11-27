import type { BoardGame, GameScoringMode, PlaySession, PlayerScore } from '../types';
import { resolveLowestScoreWins } from './gameScoringPresets';

export interface SessionResultInput {
  mode: GameScoringMode;
  players: PlayerScore[];
  lowestScoreWins?: boolean;
  winnerIds?: string[];
  coopOutcome?: 'won' | 'lost';
}

export interface NormalizedSessionResult {
  players: PlayerScore[];
  winnerIds: string[];
  winnerId?: string;
  lowestScoreWins?: boolean;
  coopOutcome?: 'won' | 'lost';
  errors: string[];
}

const isFiniteScore = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * Captures one unambiguous result representation for all save paths.
 * Points results are derived only from a complete finite score set; no player is
 * silently crowned while a score sheet is incomplete or intentionally blank.
 */
export function normalizeSessionResult(input: SessionResultInput): NormalizedSessionResult {
  const players = input.players.map((player) => ({
    ...player,
    score: isFiniteScore(player.score) ? player.score : undefined,
  }));
  const ids = new Set(players.map((player) => player.playerId));
  const requestedWinnerIds = [...new Set(input.winnerIds || [])].filter((id) => ids.has(id));

  if (input.mode === 'coop') {
    const coopOutcome = input.coopOutcome || 'lost';
    const won = coopOutcome === 'won';
    const winnerIds = won ? players.map((player) => player.playerId) : [];
    return {
      players: players.map((player) => ({
        ...player,
        score: undefined,
        rank: undefined,
        isWinner: won,
      })),
      winnerIds,
      winnerId: undefined,
      coopOutcome,
      errors: [],
    };
  }

  if (input.mode === 'win_only') {
    return {
      players: players.map((player) => ({
        ...player,
        score: undefined,
        rank: requestedWinnerIds.includes(player.playerId) ? 1 : undefined,
        isWinner: requestedWinnerIds.includes(player.playerId),
        scoreBreakdown: undefined,
      })),
      winnerIds: requestedWinnerIds,
      winnerId: requestedWinnerIds[0],
      errors: requestedWinnerIds.length === 0 ? ['Select at least one winner before saving.'] : [],
    };
  }

  const finiteScores = players.filter((player) => isFiniteScore(player.score));
  const hasAnyScore = finiteScores.length > 0;
  const hasCompleteScores = finiteScores.length === players.length;
  const lowestScoreWins = Boolean(input.lowestScoreWins);

  if (!hasAnyScore) {
    return {
      players: players.map((player) => ({ ...player, rank: undefined, isWinner: false })),
      winnerIds: [],
      winnerId: undefined,
      lowestScoreWins,
      errors: [],
    };
  }

  if (!hasCompleteScores) {
    return {
      players: players.map((player) => ({ ...player, rank: undefined, isWinner: false })),
      winnerIds: [],
      winnerId: undefined,
      lowestScoreWins,
      errors: ['Enter a score for every player or clear all scores before saving.'],
    };
  }

  const sorted = [...players].sort((a, b) => {
    const scoreA = a.score as number;
    const scoreB = b.score as number;
    if (scoreA !== scoreB) return lowestScoreWins ? scoreA - scoreB : scoreB - scoreA;
    return a.playerId.localeCompare(b.playerId);
  });
  const ranksByPlayerId = new Map<string, number>();
  let rank = 1;
  sorted.forEach((player, index) => {
    if (index > 0 && player.score !== sorted[index - 1].score) rank = index + 1;
    ranksByPlayerId.set(player.playerId, rank);
  });
  const bestScore = sorted[0].score as number;
  const winnerIds = sorted
    .filter((player) => player.score === bestScore)
    .map((player) => player.playerId);

  return {
    players: players.map((player) => ({
      ...player,
      rank: ranksByPlayerId.get(player.playerId),
      isWinner: winnerIds.includes(player.playerId),
    })),
    winnerIds,
    winnerId: winnerIds[0],
    lowestScoreWins,
    errors: [],
  };
}

/** Session snapshots win direction; legacy records fall back to current game rules. */
export function resolveSessionLowestScoreWins(session?: PlaySession | null, game?: BoardGame | null): boolean {
  if (typeof session?.lowestScoreWins === 'boolean') return session.lowestScoreWins;
  return resolveLowestScoreWins(game);
}

/** Resolve team score for co-op sessions, falling back cleanly for legacy copied-score records. */
export function resolveSessionTeamScore(session?: PlaySession | null): number | undefined {
  if (!session) return undefined;
  const legacyCoopScore = (session as PlaySession & { coopScore?: unknown }).coopScore;
  const explicit = typeof session.teamScore === 'number' && Number.isFinite(session.teamScore)
    ? session.teamScore
    : typeof legacyCoopScore === 'number' && Number.isFinite(legacyCoopScore)
    ? legacyCoopScore
    : undefined;
  if (explicit !== undefined) return explicit;

  const finiteScores = (session.players || [])
    .map((player) => player.score)
    .filter((score): score is number => typeof score === 'number' && Number.isFinite(score));
  if (finiteScores.length === 0) return undefined;
  const first = finiteScores[0];
  return finiteScores.every((score) => score === first) ? first : undefined;
}
