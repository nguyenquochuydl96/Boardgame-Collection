import { BoardGame, GameStatus, PlaySession, Player } from '../types';

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

export function formatDate(isoDate?: string): string {
  if (!isoDate) return 'Unknown date';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatMonthYear(isoDate: string): string {
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
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

export const STATUS_CONFIG: Record<
  GameStatus,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  own: {
    label: 'Own',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.14)',
    border: 'rgba(16, 185, 129, 0.35)',
    dot: '#10b981',
  },
  lent_out: {
    label: 'Lent Out',
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.14)',
    border: 'rgba(249, 115, 22, 0.35)',
    dot: '#f97316',
  },
  borrowed: {
    label: 'Borrowed',
    color: '#22d3ee',
    bg: 'rgba(34, 211, 238, 0.14)',
    border: 'rgba(34, 211, 238, 0.35)',
    dot: '#22d3ee',
  },
  sold: {
    label: 'Sold',
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.14)',
    border: 'rgba(236, 72, 153, 0.35)',
    dot: '#ec4899',
  },
  wishlist: {
    label: 'Wishlist',
    color: '#a78bfa',
    bg: 'rgba(167, 139, 250, 0.14)',
    border: 'rgba(167, 139, 250, 0.35)',
    dot: '#a78bfa',
  },
  previously_owned: {
    label: 'Prev. Owned',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.14)',
    border: 'rgba(148, 163, 184, 0.3)',
    dot: '#94a3b8',
  },
};

export const FIRST_PLAYER_METHOD_LABELS: Record<string, string> = {
  random_wheel: 'Spin Wheel',
  manual: 'Manual Choice',
  previous_loser: 'Previous Loser',
  previous_winner: 'Previous Winner',
};

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

export interface GameStatsSummary {
  totalPlays: number;
  averageDuration: number;
  highestScore: { score: number; playerName: string } | null;
  lowestScore: { score: number; playerName: string } | null;
  playerWinRates: Array<{
    playerId: string;
    playerName: string;
    plays: number;
    wins: number;
    winRate: number;
  }>;
}

export function calculateGameStats(sessions: PlaySession[]): GameStatsSummary {
  const totalPlays = sessions.length;
  if (totalPlays === 0) {
    return {
      totalPlays: 0,
      averageDuration: 0,
      highestScore: null,
      lowestScore: null,
      playerWinRates: [],
    };
  }

  const durations = sessions
    .map((s) => s.durationMinutes || 0)
    .filter((d) => d > 0);
  const averageDuration =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

  let highestScore: { score: number; playerName: string } | null = null;
  let lowestScore: { score: number; playerName: string } | null = null;

  const playerMap = new Map<
    string,
    { playerId: string; playerName: string; plays: number; wins: number }
  >();

  for (const session of sessions) {
    for (const p of session.players) {
      if (typeof p.score === 'number' && !Number.isNaN(p.score)) {
        if (!highestScore || p.score > highestScore.score) {
          highestScore = { score: p.score, playerName: p.playerName };
        }
        if (!lowestScore || p.score < lowestScore.score) {
          lowestScore = { score: p.score, playerName: p.playerName };
        }
      }

      const existing = playerMap.get(p.playerId) || {
        playerId: p.playerId,
        playerName: p.playerName,
        plays: 0,
        wins: 0,
      };
      existing.plays += 1;
      if (p.isWinner || session.winnerId === p.playerId) {
        existing.wins += 1;
      }
      playerMap.set(p.playerId, existing);
    }
  }

  const playerWinRates = Array.from(playerMap.values())
    .map((item) => ({
      ...item,
      winRate: item.plays > 0 ? Math.round((item.wins / item.plays) * 100) : 0,
    }))
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);

  return {
    totalPlays,
    averageDuration,
    highestScore,
    lowestScore,
    playerWinRates,
  };
}

export function calculateLongestWinStreak(
  playerId: string,
  sessions: PlaySession[]
): number {
  const sorted = [...sessions]
    .filter((s) => s.players.some((p) => p.playerId === playerId))
    .sort(
      (a, b) =>
        new Date(a.datePlayed).getTime() - new Date(b.datePlayed).getTime()
    );

  let maxStreak = 0;
  let currentStreak = 0;

  for (const s of sorted) {
    const p = s.players.find((pl) => pl.playerId === playerId);
    const won = Boolean(p?.isWinner || s.winnerId === playerId);
    if (won) {
      currentStreak += 1;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  }

  return maxStreak;
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
    selectedIds.every((id) => s.players.some((p) => p.playerId === id))
  );

  const playerStats = selectedPlayers.map((player) => {
    let winsInShared = 0;
    let highestScore: number | null = null;
    let lowestScore: number | null = null;
    const scores: number[] = [];

    for (const session of sharedSessions) {
      const entry = session.players.find((p) => p.playerId === player.id);
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
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/')) {
    return trimmed;
  }
  // Check if it's raw base64 data
  if (trimmed.length > 25) {
    if (trimmed.startsWith('/9j/')) {
      return `data:image/jpeg;base64,${trimmed}`;
    }
    if (trimmed.startsWith('iVBORw0KGgo')) {
      return `data:image/png;base64,${trimmed}`;
    }
    return `data:image/jpeg;base64,${trimmed}`;
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
