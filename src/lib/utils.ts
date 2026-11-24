import { BoardGame, GameStatus, PlaySession, Player, SessionDraft, GameLocation } from '../types';
import { EXPANDED_BGG_CATALOG } from './bggCatalogData';
import { getScoringTemplateForGame } from './scoringPresets';

const catalogByBggId = new Map<string, string>();
const catalogByName = new Map<string, string>();
const catalogByPicId = new Map<string, string>();

function normalizeGameName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

for (const g of EXPANDED_BGG_CATALOG) {
  if (g.image) {
    if (g.bggId) catalogByBggId.set(g.bggId, g.image);
    if (g.name) catalogByName.set(normalizeGameName(g.name), g.image);
    const m = (g.image || g.thumbnail || '').match(/pic(\d+)/);
    if (m) catalogByPicId.set(m[1], g.image);
  }
}

export const BGG_OFFICIAL_IRON_CLAYS =
  'https://cf.geekdo-images.com/2Mv38mPu495buGquy-Irqg__original/img/Hn638x-ccBuLyDEQsAnVcu5R0tA=/0x0/filters:format(png)/pic9719419.png';

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Formats a number as Vietnamese Dong: 1.500.000 ₫
 */
export function formatVND(amount?: number | null): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) {
    return '0 ₫';
  }
  const rounded = Math.round(amount);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formatted} ₫`;
}

/**
 * Formats a number with standard thousands separators (en-US, e.g. 1454 -> "1,454", 92921 -> "92,921").
 * Safely handles null, undefined, strings, NaN, and infinite values returning '0'.
 */
export function formatNumber(
  value: number | string | null | undefined,
  options?: Intl.NumberFormatOptions
): string {
  if (value === undefined || value === null || value === '') {
    return '0';
  }
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) {
    return '0';
  }
  return new Intl.NumberFormat('en-US', options).format(num);
}

/**
 * Combines number formatting with singular/plural label suffix (e.g. formatCount(1, 'play') -> "1 play", formatCount(1454, 'play') -> "1,454 plays").
 */
export function formatCount(
  value: number | string | null | undefined,
  singular: string,
  plural?: string
): string {
  if (value === undefined || value === null || value === '') {
    const word = plural ?? `${singular}s`;
    return `0 ${word}`;
  }
  const num = typeof value === 'number' ? value : Number(value);
  const safeCount = Number.isFinite(num) ? num : 0;
  const word = Math.abs(safeCount) === 1 ? singular : (plural ?? `${singular}s`);
  return `${formatNumber(safeCount)} ${word}`;
}

/**
 * Formats a raw number or input string with comma separators for clean financial inputs (e.g. 1800000 -> "1,800,000")
 */
export function formatNumberInput(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === '') return '';
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Parses a comma-separated formatted number string back to a numeric value or undefined (e.g. "1,800,000" -> 1800000)
 */
export function parseNumberInput(formatted: string | undefined | null): number | undefined {
  if (formatted === undefined || formatted === null) return undefined;
  const digits = String(formatted).replace(/\D/g, '');
  if (!digits) return undefined;
  const num = Number(digits);
  return Number.isNaN(num) ? undefined : num;
}

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const FULL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Returns current or given date formatted as YYYY-MM-DD in local timezone
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Builds an authentic UTC ISO string preserving user's calendar date and actual wall-clock time
 */
export function buildLocalDateTimeISO(calendarDateYYYYMMDD: string, refTime: Date = new Date()): string {
  if (!calendarDateYYYYMMDD || !/^\d{4}-\d{2}-\d{2}$/.test(calendarDateYYYYMMDD)) {
    return refTime.toISOString();
  }
  const [yearStr, monthStr, dayStr] = calendarDateYYYYMMDD.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  const hours = refTime.getHours();
  const mins = refTime.getMinutes();
  const secs = refTime.getSeconds();
  const ms = refTime.getMilliseconds();
  const localDateObj = new Date(year, month, day, hours, mins, secs, ms);
  return localDateObj.toISOString();
}

export function formatDate(isoDate?: string): string {
  if (!isoDate) return 'Unknown date';
  // Bare calendar date (YYYY-MM-DD): format directly without timezone shifts
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const year = isoDate.slice(0, 4);
    const mIdx = parseInt(isoDate.slice(5, 7), 10) - 1;
    const day = parseInt(isoDate.slice(8, 10), 10);
    if (mIdx >= 0 && mIdx < 12 && !isNaN(day)) {
      return `${SHORT_MONTHS[mIdx]} ${day}, ${year}`;
    }
  }
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  // Year 9999 rollover protection in positive timezones (e.g. UTC+7)
  if (d.getFullYear() >= 10000) {
    return 'Dec 31, 9999';
  }
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Checks if a URL is a low-res BGG thumbnail (e.g. fit-in/200x150, fit-in/246x300, __small, __thumb)
 */
export function isLowResBGGThumbnail(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return true;
  return (
    url.includes('fit-in/200x150') ||
    url.includes('fit-in/246x300') ||
    url.includes('__small') ||
    url.includes('__thumb') ||
    url.includes('__micro')
  );
}

/**
 * Returns high quality thumbnail/cover URL for boardgames.
 * Automatically upgrades low-res BGG thumbnails to crisp original resolution
 * and guarantees official cover for Iron Clays.
 */
export function getGameThumbnail(game?: Partial<BoardGame> | null): string {
  if (!game) return '';

  const name = game.name ? game.name.trim() : '';
  const lowerName = name.toLowerCase();

  // 1. Guaranteed official high-res cover for Iron Clays
  if (lowerName.includes('iron clay')) {
    return BGG_OFFICIAL_IRON_CLAYS;
  }

  // 2. If game.image exists and is already high resolution, use it
  if (game.image && !isLowResBGGThumbnail(game.image) && !game.image.startsWith('data:image/svg')) {
    return game.image;
  }

  // 3. Try upgrading from EXPANDED_BGG_CATALOG
  if (game.bggId && catalogByBggId.has(game.bggId)) {
    return catalogByBggId.get(game.bggId)!;
  }

  if (name) {
    const norm = normalizeGameName(name);
    if (catalogByName.has(norm)) {
      return catalogByName.get(norm)!;
    }
  }

  const rawUrl = game.image || game.thumbnail || '';
  const picMatch = rawUrl.match(/pic(\d+)/);
  if (picMatch && catalogByPicId.has(picMatch[1])) {
    return catalogByPicId.get(picMatch[1])!;
  }

  // 4. Fallback to existing image or thumbnail
  return game.image || game.thumbnail || '';
}

/**
 * Returns the best cover image URL for a boardgame.
 */
export function getGameCoverImage(game?: Partial<BoardGame> | null): string {
  return getGameThumbnail(game);
}

const playCountsCache = new WeakMap<PlaySession[], Record<string, number>>();

/**
 * O(1) cached play count calculator using WeakMap reference caching
 */
export function getPlayCountsByGameId(sessions: PlaySession[]): Record<string, number> {
  if (!sessions || !Array.isArray(sessions)) return {};
  const cached = playCountsCache.get(sessions);
  if (cached) return cached;

  const counts: Record<string, number> = {};
  for (let i = 0; i < sessions.length; i++) {
    const gid = sessions[i]?.gameId;
    if (gid) {
      counts[gid] = (counts[gid] || 0) + 1;
    }
  }
  playCountsCache.set(sessions, counts);
  return counts;
}

export function formatMonthYear(isoDate: string): string {
  if (!isoDate) return 'Recent';
  // Fast path for standard ISO 8601 strings (zero Date and Intl allocations)
  if (isoDate.length >= 7 && isoDate[4] === '-') {
    const year = isoDate.slice(0, 4);
    const mIdx = parseInt(isoDate.slice(5, 7), 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      return `${FULL_MONTHS[mIdx]} ${year}`;
    }
  }
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return 'Recent';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });
}

export function formatDuration(minutes?: number): string {
  if (!minutes || minutes <= 0) return '0m';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${formatNumber(hrs)}h`;
  return `${formatNumber(hrs)}h ${mins}m`;
}

/**
 * Single source of truth for cumulative play duration across Home and Analytics.
 * Only sums sessions with positive recorded durationMinutes (never fabricates default 60m).
 */
export function getTotalPlayDurationMinutes(sessions: readonly PlaySession[]): number {
  if (!sessions || sessions.length === 0) return 0;
  let total = 0;
  for (let i = 0; i < sessions.length; i++) {
    const mins = sessions[i]?.durationMinutes;
    if (typeof mins === 'number' && mins > 0 && Number.isFinite(mins)) {
      total += mins;
    }
  }
  return total;
}

export function getTotalPlayHours(sessions: readonly PlaySession[]): number {
  return Math.round(getTotalPlayDurationMinutes(sessions) / 60);
}

/**
 * Formats singular/plural count cleanly (e.g. pluralize(1, 'play') => '1 play', pluralize(1454, 'play') => '1,454 plays')
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  return formatCount(count, singular, plural);
}

/**
 * Formats a board game player range cleanly without grammar errors (never "1–1 players" or "1 players").
 */
export function formatPlayerRange(
  min?: number | null,
  max?: number | null,
  style: 'short' | 'full' = 'full'
): string {
  const hasMin = typeof min === 'number' && min > 0;
  const hasMax = typeof max === 'number' && max > 0;
  if (!hasMin && !hasMax) return style === 'short' ? '—' : 'Any players';

  const lo = hasMin ? min! : max!;
  const hi = hasMax ? max! : min!;

  if (lo === hi) {
    return style === 'short' ? `${lo}p` : pluralize(lo, 'player');
  }
  const low = Math.min(lo, hi);
  const high = Math.max(lo, hi);
  return style === 'short' ? `${low}–${high}p` : `${low}–${high} players`;
}

/**
 * Unbiased Fisher-Yates shuffle returning a new array without mutating input.
 */
export function shuffleArray<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

export const STATUS_CONFIG: Record<
  GameStatus,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  own: {
    label: 'Owned',
    color: 'var(--good)',
    bg: 'var(--good-soft)',
    border: 'color-mix(in srgb, var(--good) 32%, transparent)',
    dot: 'var(--good)',
  },
  rented: {
    label: 'Rented',
    color: 'var(--warn)',
    bg: 'var(--warn-soft)',
    border: 'color-mix(in srgb, var(--warn) 32%, transparent)',
    dot: 'var(--warn)',
  },
  lent_out: {
    label: 'Lent Out',
    color: 'var(--accent)',
    bg: 'var(--accent-soft)',
    border: 'color-mix(in srgb, var(--accent) 34%, transparent)',
    dot: 'var(--accent)',
  },
  borrowed: {
    label: 'Borrowed',
    color: 'var(--info)',
    bg: 'var(--info-soft)',
    border: 'color-mix(in srgb, var(--info) 32%, transparent)',
    dot: 'var(--info)',
  },
  sold: {
    label: 'Sold',
    color: 'var(--bad)',
    bg: 'var(--bad-soft)',
    border: 'color-mix(in srgb, var(--bad) 32%, transparent)',
    dot: 'var(--bad)',
  },
  wishlist: {
    label: 'Wishlist',
    color: 'var(--accent-text)',
    bg: 'var(--accent-soft)',
    border: 'color-mix(in srgb, var(--accent) 28%, transparent)',
    dot: 'var(--accent)',
  },
  previously_owned: {
    label: 'Prev. Owned',
    color: 'var(--muted)',
    bg: 'var(--card-2)',
    border: 'var(--line-2)',
    dot: 'var(--muted)',
  },
};

/**
 * Pure helper to determine winner IDs for a co-op session based on explicit outcome.
 */
export function resolveCoopWinnerIds(
  outcome: 'won' | 'lost',
  playerIds: string[]
): string[] {
  return outcome === 'won' ? [...playerIds] : [];
}

export const FIRST_PLAYER_METHOD_LABELS: Record<string, string> = {
  random_wheel: 'Random Draw',
  manual: 'Manual Choice',
  previous_loser: 'Previous Loser',
  previous_winner: 'Previous Winner',
};

export interface PreviousMatchPlayerResult {
  player: Player;
  session: PlaySession;
  reason: string;
}

/**
 * Finds the previous loser from match history.
 * In the most recent match of this game (or any game) played by these players:
 * Identifies the last-place player (lowest rank / lowest score, or highest score if lowestScoreWins).
 * If multiple players tied for last place, picks randomly among them.
 */
/**
 * Detects whether a play session is cooperative.
 * Evaluates:
 * 1. Explicit session.isCoop flag === true
 * 2. Board game metadata/scoring template is marked isCoop (e.g. Pandemic, Spirit Island, Stardew Valley, The Mind)
 * 3. All players in a multi-player session (> 1 players) won together as a team
 */
export function isCoopSession(session: PlaySession): boolean {
  if (session.isCoop === true) return true;
  if (getScoringTemplateForGame(session.gameName)?.isCoop === true) return true;
  if (session.players && session.players.length > 1 && session.players.every((p) => p.isWinner)) return true;
  return false;
}

export function findPreviousLoser(
  activePlayers: Player[],
  sessions: PlaySession[],
  currentGameId?: string
): PreviousMatchPlayerResult | null {
  if (!activePlayers || activePlayers.length === 0 || !sessions || sessions.length === 0) return null;

  const activeIds = new Set(activePlayers.map((p) => p.id));

  // Skip co-op sessions where players win or lose together as a team
  const competitiveSessions = [...sessions]
    .filter((s) => !isCoopSession(s))
    .sort((a, b) => {
      const da = new Date(a.datePlayed || a.createdAt).getTime();
      const db = new Date(b.datePlayed || b.createdAt).getTime();
      return db - da;
    });

  // Prefer recent competitive session of the same game with active players
  let targetSession = competitiveSessions.find(
    (s) => s.gameId === currentGameId && s.players.some((p) => activeIds.has(p.playerId))
  );

  // Fallback to most recent competitive session of any game with active players
  if (!targetSession) {
    targetSession = competitiveSessions.find((s) => s.players.some((p) => activeIds.has(p.playerId)));
  }

  if (!targetSession) return null;

  const participatingActive = targetSession.players.filter((p) => activeIds.has(p.playerId));
  if (participatingActive.length === 0) return null;

  // Detect if this session used lowestScoreWins: prefer preset template flag, fallback to winner/loser heuristic
  const templateLowestWins = getScoringTemplateForGame(targetSession.gameName)?.lowestScoreWins;
  let isLowScoreWins = templateLowestWins === true;
  if (templateLowestWins === undefined) {
    const winners = targetSession.players.filter((p) => p.isWinner);
    const nonWinners = targetSession.players.filter((p) => !p.isWinner && typeof p.score === 'number');
    if (winners.length > 0 && typeof winners[0].score === 'number' && nonWinners.length > 0) {
      const winnerScore = winners[0].score as number;
      const avgLoserScore = nonWinners.reduce((sum, p) => sum + (p.score as number), 0) / nonWinners.length;
      if (winnerScore < avgLoserScore) {
        isLowScoreWins = true;
      }
    }
  }

  let candidates: typeof participatingActive = [];

  // 1. If ranks exist for all participating active players, maximum rank = last place
  const withRank = participatingActive.filter((p) => typeof p.rank === 'number');
  if (withRank.length === participatingActive.length && withRank.length > 0) {
    const maxRank = Math.max(...withRank.map((p) => p.rank as number));
    candidates = withRank.filter((p) => p.rank === maxRank);
  } else {
    // 2. Check numeric scores
    const withScores = participatingActive.filter((p) => typeof p.score === 'number');
    if (withScores.length > 0) {
      if (isLowScoreWins) {
        // High score is worst in lowScoreWins
        const worstScore = Math.max(...withScores.map((p) => p.score as number));
        candidates = withScores.filter((p) => p.score === worstScore);
      } else {
        // Low score is worst in normal games
        const worstScore = Math.min(...withScores.map((p) => p.score as number));
        candidates = withScores.filter((p) => p.score === worstScore);
      }
    } else {
      // 3. Cooperative or binary win/loss: players who didn't win
      const losers = participatingActive.filter((p) => !p.isWinner);
      candidates = losers.length > 0 ? losers : participatingActive;
    }
  }

  if (candidates.length === 0) return null;

  // Tie-breaker: random among tied last-place players
  const chosenScore = candidates[Math.floor(Math.random() * candidates.length)];
  const matchedPlayer = activePlayers.find((p) => p.id === chosenScore.playerId);
  if (!matchedPlayer) return null;

  let reason = `Previous session (${targetSession.gameName})`;
  if (typeof chosenScore.score === 'number') {
    reason += `: ${chosenScore.score} pts (last place)`;
  } else if (typeof chosenScore.rank === 'number') {
    reason += `: rank #${chosenScore.rank}`;
  } else {
    reason += `: did not win`;
  }

  return {
    player: matchedPlayer,
    session: targetSession,
    reason,
  };
}

/**
 * Finds the previous winner from match history.
 */
export function findPreviousWinner(
  activePlayers: Player[],
  sessions: PlaySession[],
  currentGameId?: string
): PreviousMatchPlayerResult | null {
  if (!activePlayers || activePlayers.length === 0 || !sessions || sessions.length === 0) return null;

  const activeIds = new Set(activePlayers.map((p) => p.id));

  const sortedSessions = [...sessions].sort((a, b) => {
    const da = new Date(a.datePlayed || a.createdAt).getTime();
    const db = new Date(b.datePlayed || b.createdAt).getTime();
    return db - da;
  });

  // Prefer recent session of the same game with active winners
  let targetSession = sortedSessions.find(
    (s) => s.gameId === currentGameId && s.players.some((p) => activeIds.has(p.playerId) && p.isWinner)
  );

  if (!targetSession) {
    targetSession = sortedSessions.find((s) => s.players.some((p) => activeIds.has(p.playerId) && p.isWinner));
  }

  if (!targetSession) return null;

  const winningActive = targetSession.players.filter((p) => activeIds.has(p.playerId) && p.isWinner);
  if (winningActive.length === 0) return null;

  const chosenScore = winningActive[Math.floor(Math.random() * winningActive.length)];
  const matchedPlayer = activePlayers.find((p) => p.id === chosenScore.playerId);
  if (!matchedPlayer) return null;

  let reason = `Previous session (${targetSession.gameName})`;
  if (typeof chosenScore.score === 'number') {
    reason += `: ${chosenScore.score} pts (winner)`;
  } else {
    reason += `: winner`;
  }

  return {
    player: matchedPlayer,
    session: targetSession,
    reason,
  };
}

/**
 * Generates an inline SVG data URI cover illustration for any boardgame
 * so cover images are 100% self-contained and never fail in offline/sandboxed environments.
 */
export function createGameCoverDataUri(
  title: string,
  subtitle: string,
  palette: [string, string, string],
  motif: 'bird' | 'hex' | 'train' | 'temple' | 'globe' | 'vine' | 'tile' | 'planet' | 'crown' = 'hex'
): string {
  const [c1, c2, c3] = palette;
  const escapeXml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeTitle = escapeXml(title);
  const safeSub = escapeXml(subtitle.toUpperCase());

  let illustration = '';
  switch (motif) {
    case 'bird':
      illustration = `
        <circle cx="240" cy="230" r="105" fill="${c3}" fill-opacity="0.18" />
        <path d="M135 270 C170 185, 255 165, 315 205 C285 230, 268 265, 295 295 C235 290, 185 300, 135 270 Z" fill="#f8fafc" fill-opacity="0.92"/>
        <path d="M208 190 C245 138, 318 132, 348 175 C308 190, 285 212, 250 238 Z" fill="${c3}" fill-opacity="0.88"/>
        <circle cx="295" cy="198" r="5.5" fill="#0f172a"/>
        <path d="M312 200 L342 192 L316 212 Z" fill="#f59e0b"/>
      `;
      break;
    case 'hex':
      illustration = `
        <polygon points="240,125 325,174 325,272 240,321 155,272 155,174" fill="${c3}" fill-opacity="0.25" stroke="#fde68a" stroke-width="4"/>
        <polygon points="240,155 298,188 298,256 240,289 182,256 182,188" fill="${c2}" fill-opacity="0.6" stroke="#fef3c7" stroke-width="2.5"/>
        <circle cx="240" cy="222" r="32" fill="#fef3c7" fill-opacity="0.92"/>
        <text x="240" y="232" text-anchor="middle" font-family="Outfit, sans-serif" font-weight="800" font-size="26" fill="#78350f">8</text>
      `;
      break;
    case 'train':
      illustration = `
        <path d="M105 295 L375 295" stroke="#e2e8f0" stroke-width="5" stroke-linecap="round"/>
        <path d="M125 308 L355 308" stroke="#94a3b8" stroke-width="3" stroke-dasharray="12 10"/>
        <rect x="150" y="200" width="140" height="68" rx="10" fill="#f8fafc" fill-opacity="0.92"/>
        <rect x="255" y="165" width="50" height="103" rx="6" fill="${c3}"/>
        <rect x="170" y="166" width="25" height="36" rx="4" fill="#cbd5e1"/>
        <circle cx="182" cy="276" r="18" fill="#0f172a" stroke="#f8fafc" stroke-width="5"/>
        <circle cx="234" cy="276" r="18" fill="#0f172a" stroke="#f8fafc" stroke-width="5"/>
        <circle cx="286" cy="276" r="18" fill="#0f172a" stroke="#f8fafc" stroke-width="5"/>
      `;
      break;
    case 'temple':
      illustration = `
        <polygon points="240,130 350,188 130,188" fill="#fde68a" fill-opacity="0.92"/>
        <rect x="146" y="188" width="188" height="13" rx="3" fill="#fef3c7"/>
        <rect x="162" y="205" width="18" height="86" rx="3" fill="#f8fafc" fill-opacity="0.9"/>
        <rect x="206" y="205" width="18" height="86" rx="3" fill="#f8fafc" fill-opacity="0.9"/>
        <rect x="254" y="205" width="18" height="86" rx="3" fill="#f8fafc" fill-opacity="0.9"/>
        <rect x="298" y="205" width="18" height="86" rx="3" fill="#f8fafc" fill-opacity="0.9"/>
        <rect x="136" y="291" width="208" height="16" rx="4" fill="#fde68a"/>
      `;
      break;
    case 'globe':
      illustration = `
        <circle cx="240" cy="222" r="88" fill="none" stroke="${c3}" stroke-width="4" stroke-opacity="0.85"/>
        <ellipse cx="240" cy="222" rx="48" ry="88" fill="none" stroke="${c3}" stroke-width="2.5" stroke-opacity="0.55"/>
        <line x1="152" y1="222" x2="328" y2="222" stroke="${c3}" stroke-width="2.5" stroke-opacity="0.55"/>
        <line x1="165" y1="178" x2="315" y2="178" stroke="${c3}" stroke-width="2" stroke-opacity="0.4"/>
        <line x1="165" y1="266" x2="315" y2="266" stroke="${c3}" stroke-width="2" stroke-opacity="0.4"/>
        <circle cx="202" cy="192" r="9" fill="#f43f5e"/>
        <circle cx="282" cy="208" r="9" fill="#f59e0b"/>
        <circle cx="235" cy="256" r="9" fill="#22d3ee"/>
        <polyline points="202,192 282,208 235,256 202,192" fill="none" stroke="#f8fafc" stroke-width="2.5" stroke-dasharray="5 4"/>
      `;
      break;
    case 'vine':
      illustration = `
        <circle cx="240" cy="225" r="88" fill="${c3}" fill-opacity="0.16"/>
        <circle cx="220" cy="200" r="19" fill="#c084fc"/>
        <circle cx="256" cy="200" r="19" fill="#a855f7"/>
        <circle cx="204" cy="230" r="19" fill="#9333ea"/>
        <circle cx="239" cy="230" r="19" fill="#c084fc"/>
        <circle cx="274" cy="230" r="19" fill="#7e22ce"/>
        <circle cx="221" cy="260" r="19" fill="#a855f7"/>
        <circle cx="255" cy="260" r="19" fill="#9333ea"/>
        <circle cx="239" cy="288" r="18" fill="#c084fc"/>
        <path d="M240 178 C240 150, 268 140, 284 154" stroke="#4ade80" stroke-width="5" fill="none" stroke-linecap="round"/>
      `;
      break;
    default:
      illustration = `
        <rect x="162" y="145" width="70" height="70" rx="14" fill="#f8fafc" fill-opacity="0.9"/>
        <rect x="248" y="145" width="70" height="70" rx="14" fill="${c3}" fill-opacity="0.85"/>
        <rect x="162" y="231" width="70" height="70" rx="14" fill="${c3}" fill-opacity="0.65"/>
        <rect x="248" y="231" width="70" height="70" rx="14" fill="#f8fafc" fill-opacity="0.9"/>
      `;
      break;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 640" fill="none">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="480" y2="640" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="${c1}" />
        <stop offset="58%" stop-color="${c2}" />
        <stop offset="100%" stop-color="#0f0f1a" />
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="36%" r="55%">
        <stop offset="0%" stop-color="${c3}" stop-opacity="0.42" />
        <stop offset="100%" stop-color="${c3}" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="480" height="640" rx="32" fill="url(#g)" />
    <rect width="480" height="640" rx="32" fill="url(#glow)" />
    <rect x="22" y="22" width="436" height="596" rx="24" stroke="rgba(255,255,255,0.16)" stroke-width="2" />
    ${illustration}
    <text x="240" y="395" text-anchor="middle" font-family="Outfit, system-ui, sans-serif" font-weight="800" font-size="28" fill="#ffffff" fill-opacity="0.92" letter-spacing="0.5">${safeTitle}</text>
    <text x="240" y="424" text-anchor="middle" font-family="Plus Jakarta Sans, system-ui, sans-serif" font-weight="600" font-size="13" fill="#cbd5e1" fill-opacity="0.8" letter-spacing="2.5">${safeSub}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface GameScoreRecord {
  score: number;
  playerName: string;
  date?: string;
  sessionId?: string;
}

export interface PlayerWinRate {
  playerId: string;
  playerName: string;
  plays: number;
  wins: number;
  winRate: number;
  lastWonDate?: string;
  lastWonSessionId?: string;
}

export interface PlayerLossRecord {
  playerId: string;
  playerName: string;
  plays: number;
  losses: number;
  lossRate: number;
  wins: number;
  lowestScore?: number;
  lastPlayedDate?: string;
  lastPlayedSessionId?: string;
}

export interface GameStatsSummary {
  totalPlays: number;
  averageDuration: number;
  highestScore: GameScoreRecord | null;
  lowestScore: GameScoreRecord | null;
  playerWinRates: PlayerWinRate[];
  mostWinsPlayer?: PlayerWinRate | null;
  mostLossesPlayer?: PlayerLossRecord | null;
}

/**
 * Formats a record date with relative time distance (e.g. "15/09/2026 (2 mos ago)")
 */
export function formatRecordTimeAgo(isoDate?: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const dateStr = `${day}/${month}/${year}`;

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return `${dateStr} (Today)`;
  if (diffDays === 1) return `${dateStr} (Yesterday)`;
  if (diffDays < 30) return `${dateStr} (${diffDays}d ago)`;

  const diffMonths = Math.floor(diffDays / 30.4375);
  if (diffMonths === 1) return `${dateStr} (1 mo ago)`;
  if (diffMonths < 12) {
    return `${dateStr} (${diffMonths} mos ago)`;
  }

  const diffYears = Math.floor(diffDays / 365.25);
  const remMonths = Math.floor((diffDays % 365.25) / 30.4375);
  if (diffYears === 1 && remMonths > 0) {
    return `${dateStr} (1y ${remMonths}mo ago)`;
  }
  if (remMonths > 0) {
    return `${dateStr} (${diffYears}y ${remMonths}mo ago)`;
  }
  return `${dateStr} (${diffYears}y ago)`;
}

export function calculateGameStats(
  sessions: PlaySession[],
  minPlaysThreshold = 5
): GameStatsSummary {
  const totalPlays = sessions.length;
  if (totalPlays === 0) {
    return {
      totalPlays: 0,
      averageDuration: 0,
      highestScore: null,
      lowestScore: null,
      playerWinRates: [],
      mostWinsPlayer: null,
      mostLossesPlayer: null,
    };
  }

  const durations = sessions
    .map((s) => s.durationMinutes || 0)
    .filter((d) => d > 0);
  const averageDuration =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

  let highestScore: GameScoreRecord | null = null;
  let lowestScore: GameScoreRecord | null = null;

  const playerMap = new Map<
    string,
    {
      playerId: string;
      playerName: string;
      plays: number;
      wins: number;
      losses: number;
      lowestScore?: number;
      lastWonDate?: string;
      lastWonSessionId?: string;
      lastPlayedDate?: string;
      lastPlayedSessionId?: string;
    }
  >();

  // Chronological sort to accurately track lastWonDate / lastPlayedDate
  const chrono = [...sessions].sort(
    (a, b) => new Date(a.datePlayed).getTime() - new Date(b.datePlayed).getTime()
  );

  for (const session of chrono) {
    const sDate = session.datePlayed;
    for (const p of (session.players || [])) {
      if (typeof p.score === 'number' && !Number.isNaN(p.score)) {
        if (!highestScore || p.score > highestScore.score) {
          highestScore = {
            score: p.score,
            playerName: p.playerName,
            date: sDate,
            sessionId: session.id,
          };
        }
        if (!lowestScore || p.score < lowestScore.score) {
          lowestScore = {
            score: p.score,
            playerName: p.playerName,
            date: sDate,
            sessionId: session.id,
          };
        }
      }

      const existing = playerMap.get(p.playerId) || {
        playerId: p.playerId,
        playerName: p.playerName,
        plays: 0,
        wins: 0,
        losses: 0,
        lowestScore: undefined,
        lastWonDate: undefined,
        lastWonSessionId: undefined,
        lastPlayedDate: undefined,
        lastPlayedSessionId: undefined,
      };

      existing.plays += 1;
      existing.lastPlayedDate = sDate || existing.lastPlayedDate;
      existing.lastPlayedSessionId = session.id;

      const isWin = p.isWinner || session.winnerId === p.playerId;
      if (isWin) {
        existing.wins += 1;
        existing.lastWonDate = sDate || existing.lastWonDate;
        existing.lastWonSessionId = session.id;
      } else {
        existing.losses += 1;
      }

      if (typeof p.score === 'number' && !Number.isNaN(p.score)) {
        existing.lowestScore =
          existing.lowestScore === undefined
            ? p.score
            : Math.min(existing.lowestScore, p.score);
      }

      playerMap.set(p.playerId, existing);
    }
  }

  const playerWinRates: PlayerWinRate[] = Array.from(playerMap.values())
    .map((item) => ({
      playerId: item.playerId,
      playerName: item.playerName,
      plays: item.plays,
      wins: item.wins,
      winRate: item.plays > 0 ? Math.round((item.wins / item.plays) * 100) : 0,
      lastWonDate: item.lastWonDate,
      lastWonSessionId: item.lastWonSessionId,
    }))
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);

  // Most Wins Player (must have at least 1 win)
  const mostWinsPlayer: PlayerWinRate | null =
    Array.from(playerMap.values())
      .filter((item) => item.wins > 0)
      .map((item) => ({
        playerId: item.playerId,
        playerName: item.playerName,
        plays: item.plays,
        wins: item.wins,
        winRate: item.plays > 0 ? Math.round((item.wins / item.plays) * 100) : 0,
        lastWonDate: item.lastWonDate,
        lastWonSessionId: item.lastWonSessionId,
      }))
      .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate || b.plays - a.plays)[0] || null;

  // Most Losses Player:
  // Qualification criteria:
  // 1. Must have at least 1 loss (losses > 0).
  // 2. Must meet the qualification threshold of plays (plays >= minPlaysThreshold, default: 5)
  //    to filter out playtest / sample noise (e.g. 1 loss in 1 play = 100%).
  //
  // Tie-break rules:
  // 1. Highest loss rate (exact loss ratio: b.losses / b.plays vs a.losses / a.plays)
  // 2. More total losses (b.losses - a.losses)
  // 3. More total plays (b.plays - a.plays)
  // 4. Lower lowestScore ((a.lowestScore ?? 0) - (b.lowestScore ?? 0))
  const mostLossesPlayer: PlayerLossRecord | null =
    Array.from(playerMap.values())
      .filter((item) => item.losses > 0 && item.plays >= minPlaysThreshold)
      .map((item) => ({
        playerId: item.playerId,
        playerName: item.playerName,
        plays: item.plays,
        losses: item.losses,
        lossRate: item.plays > 0 ? Math.round((item.losses / item.plays) * 100) : 0,
        wins: item.wins,
        lowestScore: item.lowestScore,
        lastPlayedDate: item.lastPlayedDate,
        lastPlayedSessionId: item.lastPlayedSessionId,
      }))
      .sort((a, b) => {
        const rateB = b.plays > 0 ? b.losses / b.plays : 0;
        const rateA = a.plays > 0 ? a.losses / a.plays : 0;
        if (Math.abs(rateB - rateA) > 1e-6) return rateB - rateA;
        if (b.losses !== a.losses) return b.losses - a.losses;
        if (b.plays !== a.plays) return b.plays - a.plays;
        const scoreA = a.lowestScore !== undefined ? a.lowestScore : Infinity;
        const scoreB = b.lowestScore !== undefined ? b.lowestScore : Infinity;
        return scoreA - scoreB;
      })[0] || null;

  return {
    totalPlays,
    averageDuration,
    highestScore,
    lowestScore,
    playerWinRates,
    mostWinsPlayer,
    mostLossesPlayer,
  };
}

export interface StreakData {
  count: number;
  startDate?: string;
  endDate?: string;
  sessions: PlaySession[];
}

export interface PlayerStreakDetails {
  longestWinStreak: StreakData;
  longestLossStreak: StreakData;
  currentStreak: {
    type: 'win' | 'loss' | 'none';
    count: number;
    startDate?: string;
    endDate?: string;
    sessions: PlaySession[];
  };
}

/**
 * Calculates complete player streak metrics (longest win streak, longest loss streak, and current active streak)
 * with the exact timeline of sessions in each streak.
 */
export function calculatePlayerStreaks(
  playerId: string,
  sessions: PlaySession[]
): PlayerStreakDetails {
  const sorted = [...sessions]
    .filter((s) => s.players?.some((p) => p.playerId === playerId))
    .sort((a, b) => (a.datePlayed || '').localeCompare(b.datePlayed || ''));

  let curWins: PlaySession[] = [];
  let maxWins: PlaySession[] = [];

  let curLosses: PlaySession[] = [];
  let maxLosses: PlaySession[] = [];

  for (const s of sorted) {
    const p = s.players?.find((pl) => pl.playerId === playerId);
    const won = Boolean(p?.isWinner || s.winnerId === playerId);

    if (won) {
      curWins.push(s);
      if (curWins.length >= maxWins.length) {
        maxWins = [...curWins];
      }
      curLosses = [];
    } else {
      curLosses.push(s);
      if (curLosses.length >= maxLosses.length) {
        maxLosses = [...curLosses];
      }
      curWins = [];
    }
  }

  let currentStreakType: 'win' | 'loss' | 'none' = 'none';
  let currentSessions: PlaySession[] = [];
  if (curWins.length > 0) {
    currentStreakType = 'win';
    currentSessions = curWins;
  } else if (curLosses.length > 0) {
    currentStreakType = 'loss';
    currentSessions = curLosses;
  }

  return {
    longestWinStreak: {
      count: maxWins.length,
      startDate: maxWins[0]?.datePlayed,
      endDate: maxWins[maxWins.length - 1]?.datePlayed,
      sessions: maxWins, // Chronological (from first match of streak to last)
    },
    longestLossStreak: {
      count: maxLosses.length,
      startDate: maxLosses[0]?.datePlayed,
      endDate: maxLosses[maxLosses.length - 1]?.datePlayed,
      sessions: maxLosses,
    },
    currentStreak: {
      type: currentStreakType,
      count: currentSessions.length,
      startDate: currentSessions[0]?.datePlayed,
      endDate: currentSessions[currentSessions.length - 1]?.datePlayed,
      sessions: currentSessions,
    },
  };
}

export function calculateLongestWinStreak(
  playerId: string,
  sessions: PlaySession[]
): number {
  return calculatePlayerStreaks(playerId, sessions).longestWinStreak.count;
}

export function calculateLongestLossStreak(
  playerId: string,
  sessions: PlaySession[]
): number {
  return calculatePlayerStreaks(playerId, sessions).longestLossStreak.count;
}

export interface HeadToHeadSummary {
  sharedSessionsCount: number;
  playerStats: Array<{
    player: Player;
    winsInShared: number;
    winRateInShared: number;
    highestScore: number | null;
    lowestScore: number | null;
    averageScore: number | null;
  }>;
  perGameBreakdown: Array<{
    gameId: string;
    gameName: string;
    plays: number;
    winsByPlayerId: Record<string, number>;
  }>;
}

export function calculateHeadToHead(
  selectedPlayers: Player[],
  allSessions: PlaySession[]
): HeadToHeadSummary {
  const selectedIds = selectedPlayers.map((p) => p.id);
  const sharedSessions = allSessions.filter((s) =>
    selectedIds.every((id) => (s.players || []).some((p) => p.playerId === id))
  );

  const playerStats = selectedPlayers.map((player) => {
    let winsInShared = 0;
    let highestScore: number | null = null;
    let lowestScore: number | null = null;
    const scores: number[] = [];

    for (const session of sharedSessions) {
      const entry = (session.players || []).find((p) => p.playerId === player.id);
      if (!entry) continue;
      if (entry.isWinner || session.winnerId === player.id) {
        winsInShared += 1;
      }
      if (typeof entry.score === 'number') {
        scores.push(entry.score);
        if (highestScore === null || entry.score > highestScore) {
          highestScore = entry.score;
        }
        if (lowestScore === null || entry.score < lowestScore) {
          lowestScore = entry.score;
        }
      }
    }

    const averageScore =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;

    return {
      player,
      winsInShared,
      winRateInShared:
        sharedSessions.length > 0
          ? Math.round((winsInShared / sharedSessions.length) * 100)
          : 0,
      highestScore,
      lowestScore,
      averageScore,
    };
  });

  const gameMap = new Map<
    string,
    { gameId: string; gameName: string; plays: number; winsByPlayerId: Record<string, number> }
  >();

  for (const session of sharedSessions) {
    const existing = gameMap.get(session.gameId) || {
      gameId: session.gameId,
      gameName: session.gameName,
      plays: 0,
      winsByPlayerId: {},
    };
    existing.plays += 1;
    for (const id of selectedIds) {
      const pEntry = session.players.find((p) => p.playerId === id);
      if (pEntry?.isWinner || session.winnerId === id) {
        existing.winsByPlayerId[id] = (existing.winsByPlayerId[id] || 0) + 1;
      }
    }
    gameMap.set(session.gameId, existing);
  }

  return {
    sharedSessionsCount: sharedSessions.length,
    playerStats,
    perGameBreakdown: Array.from(gameMap.values()).sort((a, b) => b.plays - a.plays),
  };
}

export function getCollectionTotalValue(games: BoardGame[]): number {
  return games
    .filter((g) => g.status === 'own' || g.status === 'lent_out')
    .reduce((sum, g) => sum + (g.purchasePrice || 0), 0);
}

/**
 * Resolves an avatar string to a valid image src URL or null if it's an emoji/short text.
 * Robustly handles:
 * - http(s) URLs
 * - data: URLs (e.g. data:image/png;base64,...)
 * - Raw base64 data strings without data: prefix (from iOS / Android catalog exports)
 */
export function resolveAvatarImage(avatar?: string | null): string | null {
  if (!avatar || typeof avatar !== 'string') return null;
  const trimmed = avatar.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/') || trimmed.startsWith('idb://')) {
    return trimmed;
  }
  // Check if it's raw base64 data without data:image prefix (must have sufficient length and valid base64 signature)
  if (trimmed.length > 60 && !trimmed.endsWith('.jpg') && !trimmed.endsWith('.png') && !trimmed.endsWith('.jpeg')) {
    if (trimmed.startsWith('/9j/')) {
      return `data:image/jpeg;base64,${trimmed}`;
    }
    if (trimmed.startsWith('iVBORw0KGgo')) {
      return `data:image/png;base64,${trimmed}`;
    }
  }
  return null;
}

/**
 * Returns a clean emoji or short initials for display, never allowing a raw base64 string to leak as text.
 */
export function getSafeDisplayAvatar(avatar?: string | null, fallback = '👤'): string {
  if (!avatar || typeof avatar !== 'string') return fallback;
  const trimmed = avatar.trim();
  if (trimmed.length > 10 || resolveAvatarImage(trimmed)) {
    return fallback;
  }
  return trimmed;
}

/**
 * Compresses an uploaded image file on canvas to a crisp data URL (max 480px, 0.85 quality)
 */
export function compressImageToDataUrl(file: File, maxDim = 480, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Detects whether an active draft in localStorage has already been saved as a completed session in history.
 * Helps prevent ghost drafts from lingering after a session is successfully completed.
 */
export function isDraftMatchingCompletedSession(
  draft: SessionDraft | null | undefined,
  sessions: PlaySession[]
): boolean {
  if (!draft || !draft.gameId || !sessions || sessions.length === 0) {
    return false;
  }

  return sessions.some((s) => {
    // 1. Must match the same game
    if (s.gameId !== draft.gameId) return false;

    // 2. If draft has selected players, verify they match the session players
    if (draft.selectedPlayerIds && draft.selectedPlayerIds.length > 0) {
      const sPlayerIds = (s.players || []).map((p) => p.playerId);
      const isPlayerMatch =
        draft.selectedPlayerIds.length === sPlayerIds.length &&
        draft.selectedPlayerIds.every((id) => sPlayerIds.includes(id));
      if (!isPlayerMatch) return false;
    }

    // 3. Date check: match on played date (YYYY-MM-DD)
    if (draft.datePlayed && s.datePlayed) {
      const draftDate = draft.datePlayed.split('T')[0];
      const sessionDate = s.datePlayed.split('T')[0];
      if (draftDate !== sessionDate) return false;
    }

    // 4. Creation time correlation
    if (s.createdAt) {
      const sCreatedAtMs = new Date(s.createdAt).getTime();
      // If the session was created before the draft timer was even started, it cannot be this draft
      if (draft.sessionStartTime && sCreatedAtMs < draft.sessionStartTime - 60000) {
        return false;
      }
      // If draft has lastUpdated, check if session was created around that time (within 3 hours)
      if (draft.lastUpdated) {
        const draftUpdatedMs = new Date(draft.lastUpdated).getTime();
        const diffMs = Math.abs(sCreatedAtMs - draftUpdatedMs);
        if (diffMs <= 3 * 60 * 60 * 1000) {
          return true;
        }
      }
    }

    // If game, players, and date all match, it's considered already completed
    return true;
  });
}

/**
 * Calculates minimum required plays for leaderboard qualification (default: 5% of all recorded sessions).
 * Ensures casual guests or inactive players who left the group long ago do not crowd the rankings.
 */
export function calculateMinRequiredPlays(totalSessions: number, percentage = 0.05): number {
  if (!totalSessions || totalSessions <= 0) return 0;
  return Math.max(1, Math.ceil(totalSessions * percentage));
}

/**
 * In-browser canvas photo compression.
 * Downscales images to max maxWidth x maxHeight dimensions and converts to JPEG (0.85 quality).
 */
export function compressImage(
  file: File | Blob,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined' || typeof FileReader === 'undefined') {
      // Non-browser / Node test environment fallback
      if (typeof FileReader !== 'undefined') {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      } else {
        resolve('');
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        resolve(e.target?.result as string);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Normalizes a location/venue name into a canonical deduplication key.
 * - Decomposes/precomposes into Unicode NFC (handles iPhone/Mac NFD vs Windows/Web NFC).
 * - Trims leading/trailing whitespace and compresses consecutive spaces.
 * - Converts to lower-case using Vietnamese locale ('vi').
 */
export function normalizeLocationKey(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('vi');
}

/**
 * Sorts venues by play count descending.
 * Ties in play count are broken alphabetically by venue name using Vietnamese collation ('vi').
 *
 * @param venues List of venues to sort
 * @param playCounts Optional external lookup map or record for play counts if not stored on the venue object
 */
export function sortVenuesByPlayCount<T extends { name: string; playCount?: number }>(
  venues: T[],
  playCounts?: Map<string, number> | Record<string, number>
): T[] {
  return [...venues].sort((a, b) => {
    let countA = typeof a.playCount === 'number' ? a.playCount : 0;
    let countB = typeof b.playCount === 'number' ? b.playCount : 0;

    if (playCounts) {
      if (playCounts instanceof Map) {
        countA = playCounts.get(normalizeLocationKey(a.name)) ?? playCounts.get(a.name) ?? countA;
        countB = playCounts.get(normalizeLocationKey(b.name)) ?? playCounts.get(b.name) ?? countB;
      } else {
        countA = playCounts[normalizeLocationKey(a.name)] ?? playCounts[a.name] ?? countA;
        countB = playCounts[normalizeLocationKey(b.name)] ?? playCounts[b.name] ?? countB;
      }
    }

    if (countB !== countA) {
      return countB - countA;
    }

    return (a.name || '').localeCompare(b.name || '', 'vi', { sensitivity: 'base' });
  });
}

/**
 * Deduplicates an array of GameLocations based on normalizeLocationKey.
 * Prioritizes records with address, notes, default status, or more sessions.
 */
export function deduplicateLocationsList(
  locations: GameLocation[],
  sessions?: PlaySession[]
): GameLocation[] {
  const sessionCounts = new Map<string, number>();
  if (sessions) {
    for (const s of sessions) {
      if (s.location && s.location.trim()) {
        const k = normalizeLocationKey(s.location);
        sessionCounts.set(k, (sessionCounts.get(k) || 0) + 1);
      }
    }
  }

  const groups = new Map<string, GameLocation[]>();
  for (const loc of locations) {
    if (!loc || !loc.name) continue;
    const key = normalizeLocationKey(loc.name);
    if (!key) continue;
    let list = groups.get(key);
    if (!list) {
      list = [];
      groups.set(key, list);
    }
    list.push(loc);
  }

  const result: GameLocation[] = [];

  for (const [, candidates] of groups.entries()) {
    if (candidates.length === 1) {
      result.push({
        ...candidates[0],
        name: candidates[0].name.trim().normalize('NFC').replace(/\s+/g, ' '),
      });
      continue;
    }

    // Score candidates to pick the best canonical record
    const scoreCandidate = (loc: GameLocation) => {
      let sc = 0;
      if (loc.address && loc.address.trim()) sc += 100;
      if (loc.notes && loc.notes.trim()) sc += 50;
      const count = sessionCounts.get(normalizeLocationKey(loc.name)) || 0;
      sc += Math.min(count, 50);
      if (loc.isDefault) sc += 25;
      if (loc.name !== loc.name.toLowerCase()) sc += 10;
      return sc;
    };

    const sorted = [...candidates].sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
    const canonical = sorted[0];

    // Merge missing fields from other candidates
    let mergedAddress = canonical.address;
    let mergedNotes = canonical.notes;
    let isAnyDefault = Boolean(canonical.isDefault);

    for (const other of sorted.slice(1)) {
      if (!mergedAddress && other.address) mergedAddress = other.address;
      if (!mergedNotes && other.notes) mergedNotes = other.notes;
      if (other.isDefault) isAnyDefault = true;
    }

    result.push({
      ...canonical,
      name: canonical.name.trim().normalize('NFC').replace(/\s+/g, ' '),
      address: mergedAddress?.trim() || undefined,
      notes: mergedNotes?.trim() || undefined,
      isDefault: isAnyDefault,
    });
  }

  return result;
}
