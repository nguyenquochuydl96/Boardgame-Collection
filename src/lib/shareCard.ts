import { BoardGame, GameLocation, PlaySession, Player } from '../types';
import { getDeterministicAvatar } from './boardgameAvatars';
import {
  formatCount,
  formatDate,
  formatDuration,
  formatNumber,
  getSessionWinners,
  isCoopSession,
  isWinOnlySession,
  normalizeLocationKey,
  resolveAvatarImage,
} from './utils';
import { resolveSessionLowestScoreWins, resolveSessionTeamScore } from './sessionResults';

export type ShareCardMode = 'points' | 'win_only' | 'coop';
export type ShareCardResultStatus = 'resolved' | 'pending';

export interface ShareCardPresentationOptions {
  shuffleSeed?: number;
  customHeadline?: string;
  /** @deprecated Use customHeadline. Kept while existing callers migrate. */
  customCaption?: string;
}

export interface ShareCardPlayerAvatar {
  avatarUrl?: string;
  avatarEmoji?: string;
  color: string;
  monogram: string;
}

export interface ShareCardPointsPlayer extends ShareCardPlayerAvatar {
  playerId: string;
  rank: number;
  playerName: string;
  score: number;
  scoreFormatted: string;
  isWinner: boolean;
  scorePercentage: number; // 0 to 100
  microTag?: string; // e.g. "+32 pts margin", "Photo Finish · +1 pt", "Shared Victory"
  gapFromLeaderText?: string; // e.g. "-32" or "+4"
}

export interface ShareCardWinnerPlayer extends ShareCardPlayerAvatar {
  playerId: string;
  playerName: string;
}

export interface ShareCardOtherPlayer extends ShareCardPlayerAvatar {
  playerId: string;
  playerName: string;
}

export interface ShareCardTeamPlayer extends ShareCardPlayerAvatar {
  playerId: string;
  playerName: string;
}

export interface SessionShareCardData {
  mode: ShareCardMode;
  gameTitle: string;
  coverUrl?: string;
  tablePhotoUrl?: string;
  dateFormatted: string;
  filenameDate: string; // clean YYYY-MM-DD for file exports (never raw ISO timestamp)
  colophonText: string; // e.g. "PLAY #41 · NOV 22, 2026"
  locationName?: string;
  venueDateFormatted: string;
  durationFormatted?: string;
  playerCountFormatted: string;
  playIndexFormatted: string; // e.g. "Play #42"
  playNumber: number;
  isNewRecord: boolean;
  lowestScoreWins: boolean;
  calloutBadge: string; // e.g. "★ NEW RECORD", "BLOWOUT · +32", "PHOTO FINISH · +1", "3 WINNERS"
  winnerGameStreak?: number; // e.g. 3 for 3-win streak on this specific game
  ticketSerial: string; // e.g. "NO. 0041"
  ticketBarcode: string; // e.g. "HEO-41-20261122"
  resultStatus: ShareCardResultStatus;
  shuffleSeed: number;
  kicker: string;
  headline: string;
  subhead: string;
  stamp: string;
  customHeadline?: string;
  /** @deprecated Alias retained for legacy callers. */
  customCaption?: string;

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

export interface BuildShareCardContext extends ShareCardPresentationOptions {
  game?: BoardGame | null;
  allSessions?: PlaySession[];
  players?: Player[];
  locations?: GameLocation[];
  useTablePhoto?: boolean;
}

/**
 * Extracts a clean calendar date string (YYYY-MM-DD) from date-only or ISO timestamp inputs.
 * Prevents raw ISO timestamps (e.g. "2026-11-22T13:07:47.708Z") from leaking into barcodes or filenames.
 */
export function extractCalendarDate(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  const isoPrefixMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoPrefixMatch) return isoPrefixMatch[1];

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return '';
}

/**
 * Builds a CORS-proxy URL (via wsrv.nl) for external images (e.g. BGG CDN),
 * while preserving idb://, data:, blob:, and relative URLs unchanged.
 */
export function buildProxiedImageUrl(url?: string | null, width = 800): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (
    trimmed.startsWith('idb://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('./')
  ) {
    return trimmed;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return `https://wsrv.nl/?url=${encodeURIComponent(trimmed)}&w=${width}&output=png`;
  }
  return trimmed;
}

/**
 * Resolves avatar data (photo url, emoji, custom color, and initials monogram)
 * for a player using the player store or deterministic boardgame fallbacks.
 */
function resolvePlayerAvatar(
  player: Player | undefined,
  name: string
): ShareCardPlayerAvatar {
  const defaultBg = getDeterministicAvatar(name);
  const rawAvatar = player?.avatar || defaultBg.emoji;
  const color = player?.color || defaultBg.color;
  const avatarImageUrl = resolveAvatarImage(rawAvatar);
  const avatarEmoji =
    !avatarImageUrl && rawAvatar ? rawAvatar : !avatarImageUrl ? defaultBg.emoji : undefined;

  const monogram =
    name
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'P';

  return {
    avatarUrl: avatarImageUrl || undefined,
    avatarEmoji,
    color,
    monogram,
  };
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickVibe(seed: number, salt: number, variants: readonly string[]): string {
  if (variants.length === 0) return '';
  const value = (Math.abs(seed) + salt * 1103515245) >>> 0;
  return variants[value % variants.length];
}

function cleanCustomCaption(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const compact = value.normalize('NFC').trim().replace(/\s+/g, ' ');
  return Array.from(compact).slice(0, 120).join('') || undefined;
}

function formatWinnerList(names: string[]): string {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (clean.length === 0) return 'The Champion';
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} & ${clean[1]}`;
  if (clean.length === 3) return `${clean[0]}, ${clean[1]} & ${clean[2]}`;
  return `${clean[0]} + ${formatNumber(clean.length - 1)} Others`;
}

type EditorialPresentation = Pick<
  SessionShareCardData,
  'resultStatus' | 'kicker' | 'headline' | 'subhead' | 'stamp'
>;

function pendingPresentation(gameTitle: string, locationName?: string): EditorialPresentation {
  const venueSuffix = locationName ? ` at ${locationName}` : '';
  return {
    resultStatus: 'pending',
    kicker: 'BREAKING · RESULT PENDING',
    headline: 'Final Tally Delayed Amid Recount Chaos',
    subhead: `${gameTitle} standings remain under review${venueSuffix} until every score is verified.`,
    stamp: 'PENDING',
  };
}

function resolvedPresentation(
  mode: ShareCardMode,
  seed: number,
  details: {
    winnerNames?: string[];
    runnerUpName?: string;
    runnerUpScore?: number;
    topScoreFormatted?: string;
    gameTitle: string;
    margin?: number;
    isBlowout?: boolean;
    isNewRecord?: boolean;
    lowestScoreWins?: boolean;
    sharedWinner?: boolean;
    coopOutcome?: 'won' | 'lost';
    teamScoreFormatted?: string;
    playerCountFormatted: string;
    durationFormatted?: string;
    locationName?: string;
  }
): EditorialPresentation {
  const winners = details.winnerNames || [];
  const winnerDisplay = formatWinnerList(winners);
  const isPlural = winners.length > 1;
  const game = details.gameTitle || 'Game Night';
  const margin = Math.max(0, details.margin ?? 0);
  const venueClause = details.locationName ? ` at ${details.locationName}` : '';
  const durationClause = details.durationFormatted ? ` (${details.durationFormatted})` : '';
  const runnerUpClause = details.runnerUpName
    ? ` ahead of ${details.runnerUpName}`
    : '';

  if (mode === 'coop') {
    const scorePart = details.teamScoreFormatted !== undefined
      ? ` with ${details.teamScoreFormatted} team pts`
      : '';
    if (details.coopOutcome === 'won') {
      return {
        resultStatus: 'resolved',
        kicker: 'CO-OP DISPATCH',
        headline: pickVibe(seed, 1, [
          `Miracle at Table One: The Squad Survives ${game}`,
          `Friendships Survive Another Night of ${game}`,
          `Late-Night Heroics Deliver a ${game} Victory`,
        ]),
        subhead: `${details.playerCountFormatted} pulled together${scorePart}${venueClause}${durationClause}.`,
        stamp: 'TEAM WIN',
      };
    }
    return {
      resultStatus: 'resolved',
      kicker: 'CO-OP DISPATCH',
      headline: pickVibe(seed, 1, [
        `Total Collapse in ${game}: Everyone Blames Everyone`,
        `Co-op Disaster in ${game} Ends in Finger-Pointing`,
        `${game} Wins Again as Team Strategy Goes Missing`,
      ]),
      subhead: `${details.playerCountFormatted} came up short${scorePart}${venueClause} — post-match inquiry underway.`,
      stamp: 'TEAM LOSS',
    };
  }

  if (mode === 'win_only') {
    const walkVerb = isPlural ? 'Walk' : 'Walks';
    const takeVerb = isPlural ? 'Take' : 'Takes';
    const ruleVerb = isPlural ? 'Rule' : 'Rules';
    return {
      resultStatus: 'resolved',
      kicker: isPlural ? 'SHARED VICTORY' : 'GAME NIGHT FINAL',
      headline: pickVibe(seed, 1, [
        `${winnerDisplay} ${walkVerb} Off With ${game} Bragging Rights`,
        `No Points Needed: ${winnerDisplay} ${takeVerb} the ${game} Crown`,
        `${winnerDisplay} ${ruleVerb} the Table in ${game}`,
      ]),
      subhead: `Official table victory across ${details.playerCountFormatted}${durationClause}${venueClause}.`,
      stamp: isPlural ? 'SHARED WIN' : 'CROWN CLAIMED',
    };
  }

  if (details.sharedWinner) {
    const scoreStr = details.topScoreFormatted ? ` at ${details.topScoreFormatted} pts` : '';
    return {
      resultStatus: 'resolved',
      kicker: 'DEADLOCK AT THE TOP',
      headline: pickVibe(seed, 1, [
        `Deadlock in ${game}: ${winnerDisplay} Split the Crown`,
        `Nobody Blinked as ${winnerDisplay} Tie the ${game} Summit`,
        `Split Crown Shakes Up ${game} Night`,
      ]),
      subhead: `Dead-even${scoreStr} in a ${details.playerCountFormatted} clash${venueClause}.`,
      stamp: 'SPLIT CROWN',
    };
  }

  if (details.isNewRecord) {
    const scoreStr = details.topScoreFormatted ? `${details.topScoreFormatted} pts` : 'a record tally';
    return {
      resultStatus: 'resolved',
      kicker: 'NEW TABLE RECORD',
      headline: pickVibe(seed, 1, [
        `Record Shattered! ${winnerDisplay} Sets the ${game} Mark`,
        `History at the Table: ${winnerDisplay} Rewrites ${game}`,
        `All-Time Best as ${winnerDisplay} Towers Over ${game}`,
      ]),
      subhead: `${winnerDisplay} set a new benchmark with ${scoreStr}${runnerUpClause}${venueClause}.`,
      stamp: 'NEW RECORD',
    };
  }

  if (margin <= 2 && details.runnerUpName) {
    const marginLabel = formatCount(margin, 'Point');
    const scoreStr = details.topScoreFormatted ? `${details.topScoreFormatted} pts` : 'the lead';
    return {
      resultStatus: 'resolved',
      kicker: details.lowestScoreWins ? 'LOW-SCORE THRILLER' : 'PHOTO FINISH',
      headline: pickVibe(seed, 1, [
        `${winnerDisplay} Steals ${game} by ${marginLabel}`,
        `Heartbreak for ${details.runnerUpName} as ${winnerDisplay} Edges ${game}`,
        `${marginLabel} Short — Sleep Disrupted After ${game} Thriller`,
      ]),
      subhead: `Razor-thin finish at ${scoreStr} over ${details.runnerUpName}${venueClause}${durationClause}.`,
      stamp: margin === 1 ? '1-PT THRILLER' : margin === 0 ? 'TIEBREAKER' : '2-PT THRILLER',
    };
  }

  if (details.lowestScoreWins) {
    const scoreStr = details.topScoreFormatted ? `${details.topScoreFormatted} pts` : 'the lowest tally';
    return {
      resultStatus: 'resolved',
      kicker: 'LOW-SCORE CLASSIC',
      headline: pickVibe(seed, 1, [
        `Less Is More: ${winnerDisplay} Stays Clean in ${game}`,
        `${winnerDisplay} Dodges Trouble to Take ${game} at ${details.topScoreFormatted || 'Low'}`,
        `Surgical Minimalism: ${winnerDisplay} Cruises in ${game}`,
      ]),
      subhead: `${winnerDisplay} stayed lowest at ${scoreStr}, ${formatNumber(margin)} clear${runnerUpClause}${venueClause}.`,
      stamp: 'LOW-SCORE WIN',
    };
  }

  if (details.isBlowout || margin >= 25) {
    const scoreStr = details.topScoreFormatted ? `${details.topScoreFormatted} pts` : 'the top spot';
    return {
      resultStatus: 'resolved',
      kicker: 'BLOWOUT SPECIAL',
      headline: pickVibe(seed, 1, [
        `${winnerDisplay} Leaves the ${game} Table in Shambles`,
        `No Survivors as ${winnerDisplay} Runs Away With ${game}`,
        `Sources Say the ${game} Table Never Recovered`,
        `Landslide in ${game} Leaves Rivals Speechless`,
      ]),
      subhead: `Commanding +${formatNumber(margin)} point rout (${scoreStr})${runnerUpClause}${venueClause}.`,
      stamp: 'BLOWOUT',
    };
  }

  const scoreStr = details.topScoreFormatted ? `${details.topScoreFormatted} pts` : 'the win';
  return {
    resultStatus: 'resolved',
    kicker: 'GAME NIGHT FINAL',
    headline: pickVibe(seed, 1, [
      `${winnerDisplay} Claims ${game} After Late-Night Clash`,
      `${winnerDisplay} Outsmarts the Table in ${game}`,
      `Late-Night Drama Ends With ${winnerDisplay} on Top`,
    ]),
    subhead: `${winnerDisplay} closed out ${game} on ${scoreStr}${runnerUpClause}${venueClause}${durationClause}.`,
    stamp: margin > 0 ? `+${formatNumber(margin)} MARGIN` : 'OFFICIAL WIN',
  };
}

function applyCustomHeadline(
  presentation: EditorialPresentation,
  customHeadline?: string
): EditorialPresentation {
  return customHeadline ? { ...presentation, headline: customHeadline } : presentation;
}

/**
 * Pure data builder preparing display payload for the Session Share Card.
 * Fully decoupled from DOM/Canvas to enable deterministic unit testing.
 */
export function buildSessionShareCardData(
  session: PlaySession,
  context: BuildShareCardContext = {}
): SessionShareCardData {
  const {
    game,
    allSessions = [],
    players = [],
    locations = [],
    shuffleSeed,
    customHeadline,
    customCaption,
  } = context;
  const resolvedShuffleSeed = Number.isFinite(shuffleSeed)
    ? Math.trunc(shuffleSeed as number)
    : stableHash(`${session.id}|${session.createdAt}|${session.gameId}`);
  const resolvedCustomHeadline = cleanCustomCaption(customHeadline ?? customCaption);

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
  const tablePhotoUrl =
    Array.isArray(session.photos) && session.photos.length > 0 ? session.photos[0] : undefined;
  const calendarDate = extractCalendarDate(session.datePlayed);
  const dateFormatted = formatDate(calendarDate || session.datePlayed);
  const filenameDate = calendarDate || 'play';

  // Canonical venue lookup
  let locationName: string | undefined;
  if (session.location && session.location.trim()) {
    const rawLoc = session.location.trim();
    const locKey = normalizeLocationKey(rawLoc);
    const matched = locations.find((l) => normalizeLocationKey(l.name) === locKey);
    locationName = matched ? matched.name : rawLoc;
  }

  const venueDateFormatted = locationName
    ? `Played at ${locationName} · ${dateFormatted}`
    : `Played on ${dateFormatted}`;

  // Duration
  let durationFormatted: string | undefined;
  if (typeof session.durationMinutes === 'number' && session.durationMinutes > 0) {
    durationFormatted = formatDuration(session.durationMinutes);
  }

  // Player count
  const rawPlayers = Array.isArray(session.players) ? session.players : [];
  const playerCountFormatted = formatCount(rawPlayers.length, 'player');

  // Player map lookup
  const playerStoreMap = new Map<string, Player>();
  for (const p of players) {
    if (p.id) {
      playerStoreMap.set(p.id, p);
    }
  }

  const getPlayerDetails = (p: { playerId: string; playerName?: string }) => {
    const storePlayer = playerStoreMap.get(p.playerId);
    const resolvedName = (storePlayer?.name || p.playerName || 'Player').trim();
    const avatar = resolvePlayerAvatar(storePlayer, resolvedName);
    return { resolvedName, avatar };
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

  // Clean print serial, barcode, and colophon (never raw ISO timestamp)
  const ticketSerial = `NO. ${String(playNumber).padStart(4, '0')}`;
  const dateCompact = (calendarDate || '').replace(/-/g, '') || '20261124';
  const ticketBarcode = `HEO-${playNumber}-${dateCompact}`;
  const colophonText = `${playIndexFormatted.toUpperCase()} · ${dateFormatted.toUpperCase()}`;

  // Helper to compute consecutive winnerGameStreak specifically on this game
  const computeWinnerGameStreak = (singleWinnerPlayerId?: string): number | undefined => {
    if (!singleWinnerPlayerId) return undefined;
    const currIdx = orderedSessions.findIndex((s) => s.id === session.id);
    if (currIdx < 0) return undefined;

    let streak = 0;
    for (let i = currIdx; i >= 0; i--) {
      const histSession = orderedSessions[i];
      const winners = getSessionWinners(histSession, game);
      if (winners.some((w) => w.playerId === singleWinnerPlayerId)) {
        streak++;
      } else {
        break;
      }
    }
    return streak >= 2 ? streak : undefined;
  };

  // Session snapshots score direction so historical cards do not change with game edits.
  const lowestScoreWins = resolveSessionLowestScoreWins(session, game);

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

    const canonicalWinnerIds = new Set(getSessionWinners(session, game).map((player) => player.playerId));
    const hasCompleteScores = rawPlayers.length > 0 && rawPlayers.every(
      (player) => typeof player.score === 'number' && Number.isFinite(player.score)
    );

    // Compute standard ranks with tie breaking
    const rankedPlayersWithoutPct: Array<{
      rank: number;
      playerId: string;
      playerName: string;
      score: number;
      scoreFormatted: string;
      isWinner: boolean;
      avatar: ShareCardPlayerAvatar;
    }> = [];

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

      const isWinner = canonicalWinnerIds.size > 0
        ? canonicalWinnerIds.has(p.playerId)
        : hasCompleteScores && currentRank === 1;

      const { resolvedName, avatar } = getPlayerDetails(p);

      rankedPlayersWithoutPct.push({
        rank: typeof p.rank === 'number' ? p.rank : currentRank,
        playerId: p.playerId,
        playerName: resolvedName,
        score: typeof p.score === 'number' ? p.score : 0,
        scoreFormatted: typeof p.score === 'number' ? formatNumber(p.score) : '—',
        isWinner,
        avatar,
      });
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

    // Determine Callout Badge & Winner Micro-Tag
    const rank1Players = rankedPlayersWithoutPct.filter((p) => p.isWinner);
    let rank1MicroTag: string | undefined;
    let calloutBadge = rank1Players.length === 0 ? 'RESULT PENDING' : 'SOLO VICTORY';
    let isBlowout = false;

    if (hasCompleteScores && isNewRecord) {
      calloutBadge = '★ NEW RECORD';
    } else if (hasCompleteScores && rank1Players.length > 1) {
      calloutBadge = 'SHARED VICTORY';
    } else if (
      hasCompleteScores &&
      rankedPlayersWithoutPct.length > 1 &&
      typeof rankedPlayersWithoutPct[0].score === 'number' &&
      typeof rankedPlayersWithoutPct[1].score === 'number'
    ) {
      const margin = Math.abs(
        rankedPlayersWithoutPct[0].score - rankedPlayersWithoutPct[1].score
      );
      const runnerUpScore = rankedPlayersWithoutPct[1].score;

      if (margin <= 2) {
        calloutBadge = `PHOTO FINISH · +${formatNumber(margin)}`;
      } else if (
        margin >= 15 ||
        (runnerUpScore > 0 && margin / runnerUpScore >= 0.25)
      ) {
        isBlowout = true;
        calloutBadge = `BLOWOUT · +${formatNumber(margin)}`;
      } else {
        calloutBadge = `+${formatNumber(margin)} PTS MARGIN`;
      }
    }

    // Micro-tag for player leaderboard item
    if (rank1Players.length > 1) {
      rank1MicroTag = 'Shared Victory';
    } else if (
      hasCompleteScores &&
      rankedPlayersWithoutPct.length > 1 &&
      typeof rankedPlayersWithoutPct[0].score === 'number' &&
      typeof rankedPlayersWithoutPct[1].score === 'number'
    ) {
      const margin = Math.abs(
        rankedPlayersWithoutPct[0].score - rankedPlayersWithoutPct[1].score
      );
      if (margin <= 2) {
        rank1MicroTag = `Photo Finish · +${formatNumber(margin)}${margin === 1 ? ' pt' : ' pts'}`;
      } else {
        rank1MicroTag = `+${formatNumber(margin)} pts margin`;
      }
    }

    // Winner Game Streak (only when single winner)
    const singleWinnerPlayerId = rank1Players.length === 1 ? rank1Players[0].playerId : undefined;
    const winnerGameStreak = computeWinnerGameStreak(singleWinnerPlayerId);

    const resultStatus: ShareCardResultStatus = hasCompleteScores && rankedPlayersWithoutPct.length > 0
      ? 'resolved'
      : 'pending';
    const runnerUp = resultStatus === 'resolved' && rank1Players.length === 1 && rankedPlayersWithoutPct.length > 1
      ? rankedPlayersWithoutPct[1]
      : undefined;
    const resolvedMargin = runnerUp
      ? Math.abs(rankedPlayersWithoutPct[0].score - runnerUp.score)
      : undefined;
    const presentation = applyCustomHeadline(
      resultStatus === 'pending'
        ? pendingPresentation(gameTitle, locationName)
        : resolvedPresentation('points', resolvedShuffleSeed, {
            winnerNames: rank1Players.map((player) => player.playerName),
            runnerUpName: runnerUp?.playerName,
            runnerUpScore: runnerUp?.score,
            topScoreFormatted: rankedPlayersWithoutPct[0]?.scoreFormatted,
            gameTitle,
            margin: resolvedMargin,
            isBlowout,
            isNewRecord,
            lowestScoreWins,
            sharedWinner: rank1Players.length > 1,
            playerCountFormatted,
            durationFormatted,
            locationName,
          }),
      resultStatus === 'resolved' ? resolvedCustomHeadline : undefined
    );
    if (resultStatus === 'pending') {
      calloutBadge = 'RESULT PENDING';
      rank1MicroTag = undefined;
    }

    // Determine Proportional Score Bar Percentage & Gap for each player
    const topScore = rankedPlayersWithoutPct[0]?.score ?? 100;
    const rankedPlayers: ShareCardPointsPlayer[] = rankedPlayersWithoutPct.map((p) => {
      let scorePercentage = 100;
      if (lowestScoreWins) {
        if (topScore <= 0 && p.score <= 0) {
          scorePercentage = 100;
        } else {
          scorePercentage = Math.max(
            15,
            Math.min(100, Math.round((Math.max(1, topScore) / Math.max(1, p.score)) * 100))
          );
        }
      } else {
        if (topScore <= 0) {
          scorePercentage = 100;
        } else {
          scorePercentage = Math.max(
            15,
            Math.min(100, Math.round((Math.max(0, p.score) / topScore) * 100))
          );
        }
      }

      let gapFromLeaderText: string | undefined;
      if (p.rank > 1 && typeof topScore === 'number' && typeof p.score === 'number') {
        const diff = Math.abs(p.score - topScore);
        gapFromLeaderText = lowestScoreWins ? `+${formatNumber(diff)}` : `-${formatNumber(diff)}`;
      }

      return {
        playerId: p.playerId,
        rank: p.rank,
        playerName: p.playerName,
        score: p.score,
        scoreFormatted: p.scoreFormatted,
        isWinner: resultStatus === 'resolved' && p.isWinner,
        scorePercentage,
        microTag: resultStatus === 'resolved' && p.rank === 1 ? rank1MicroTag : undefined,
        gapFromLeaderText,
        avatarUrl: p.avatar.avatarUrl,
        avatarEmoji: p.avatar.avatarEmoji,
        color: p.avatar.color,
        monogram: p.avatar.monogram,
      };
    });

    // Overflow protection: max 8 rows
    let leaderboard = rankedPlayers;
    let overflowPlayerCount: number | undefined;
    if (rankedPlayers.length > 8) {
      leaderboard = rankedPlayers.slice(0, 7);
      overflowPlayerCount = rankedPlayers.length - 7;
    }

    return {
      mode: 'points',
      gameTitle,
      coverUrl,
      tablePhotoUrl,
      dateFormatted,
      filenameDate,
      colophonText,
      locationName,
      venueDateFormatted,
      durationFormatted,
      playerCountFormatted,
      playIndexFormatted,
      playNumber,
      isNewRecord: resultStatus === 'resolved' && isNewRecord,
      lowestScoreWins,
      calloutBadge,
      winnerGameStreak: resultStatus === 'resolved' ? winnerGameStreak : undefined,
      ticketSerial,
      ticketBarcode,
      ...presentation,
      shuffleSeed: resolvedShuffleSeed,
      customHeadline: resolvedCustomHeadline,
      customCaption: resolvedCustomHeadline,
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
      const { resolvedName, avatar } = getPlayerDetails(p);
      const isWinner = winnerIdSet.has(p.playerId) || Boolean(p.isWinner);
      const playerItem = {
        playerId: p.playerId,
        playerName: resolvedName,
        avatarUrl: avatar.avatarUrl,
        avatarEmoji: avatar.avatarEmoji,
        color: avatar.color,
        monogram: avatar.monogram,
      };

      if (isWinner) {
        winners.push(playerItem);
      } else {
        otherPlayers.push(playerItem);
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

    const resultStatus: ShareCardResultStatus = winners.length > 0 ? 'resolved' : 'pending';
    const presentation = applyCustomHeadline(
      resultStatus === 'pending'
        ? pendingPresentation(gameTitle, locationName)
        : resolvedPresentation('win_only', resolvedShuffleSeed, {
            winnerNames: winners.map((player) => player.playerName),
            gameTitle,
            playerCountFormatted,
            durationFormatted,
            locationName,
          }),
      resultStatus === 'resolved' ? resolvedCustomHeadline : undefined
    );
    let calloutBadge = 'SOLO VICTORY';
    if (winners.length > 1) {
      calloutBadge = `${formatNumber(winners.length)} WINNERS`;
    } else if (winners.length === 0) {
      calloutBadge = 'RESULT PENDING';
    }

    const singleWinnerPlayerId = resultStatus === 'resolved' && winners.length === 1 ? winnerRecords[0]?.playerId : undefined;
    const winnerGameStreak = computeWinnerGameStreak(singleWinnerPlayerId);

    return {
      mode: 'win_only',
      gameTitle,
      coverUrl,
      tablePhotoUrl,
      dateFormatted,
      filenameDate,
      colophonText,
      locationName,
      venueDateFormatted,
      durationFormatted,
      playerCountFormatted,
      playIndexFormatted,
      playNumber,
      isNewRecord: false,
      lowestScoreWins: false,
      calloutBadge,
      winnerGameStreak: resultStatus === 'resolved' ? winnerGameStreak : undefined,
      ticketSerial,
      ticketBarcode,
      ...presentation,
      shuffleSeed: resolvedShuffleSeed,
      customHeadline: resolvedCustomHeadline,
      customCaption: resolvedCustomHeadline,
      winners,
      otherPlayers: otherPlayers.slice(0, finalOther.length),
      overflowOtherCount,
    };
  }

  // Co-op mode: a legacy session without an explicit outcome or winning members
  // remains pending rather than inventing a team defeat.
  const hasExplicitCoopResult =
    session.coopOutcome === 'won' ||
    session.coopOutcome === 'lost' ||
    rawPlayers.some((player) => player.isWinner);
  const isWon = session.coopOutcome === 'won' || rawPlayers.some((player) => player.isWinner);
  const coopOutcome: 'won' | 'lost' = isWon ? 'won' : 'lost';
  const resultStatus: ShareCardResultStatus = hasExplicitCoopResult ? 'resolved' : 'pending';

  let teamScoreFormatted: string | undefined;
  const rawTeamScore = resolveSessionTeamScore(session);
  if (typeof rawTeamScore === 'number' && Number.isFinite(rawTeamScore)) {
    teamScoreFormatted = formatNumber(rawTeamScore);
  }

  const presentation = applyCustomHeadline(
    resultStatus === 'pending'
      ? pendingPresentation(gameTitle, locationName)
      : resolvedPresentation('coop', resolvedShuffleSeed, {
          gameTitle,
          coopOutcome,
          teamScoreFormatted,
          playerCountFormatted,
          durationFormatted,
          locationName,
        }),
    resultStatus === 'resolved' ? resolvedCustomHeadline : undefined
  );
  const calloutBadge = resultStatus === 'pending'
    ? 'RESULT PENDING'
    : isWon ? 'TEAM VICTORY' : 'TEAM DEFEAT';

  const teamPlayers = rawPlayers.map((p) => {
    const { resolvedName, avatar } = getPlayerDetails(p);
    return {
      playerId: p.playerId,
      playerName: resolvedName,
      avatarUrl: avatar.avatarUrl,
      avatarEmoji: avatar.avatarEmoji,
      color: avatar.color,
      monogram: avatar.monogram,
    };
  });

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
    tablePhotoUrl,
    dateFormatted,
    filenameDate,
    colophonText,
    locationName,
    venueDateFormatted,
    durationFormatted,
    playerCountFormatted,
    playIndexFormatted,
    playNumber,
    isNewRecord: false,
    lowestScoreWins: false,
    calloutBadge,
    winnerGameStreak: undefined,
    ticketSerial,
    ticketBarcode,
    ...presentation,
    shuffleSeed: resolvedShuffleSeed,
    customHeadline: resolvedCustomHeadline,
    customCaption: resolvedCustomHeadline,
    coopOutcome,
    teamScoreFormatted,
    teamPlayers: finalTeam,
    overflowTeamCount,
  };
}
