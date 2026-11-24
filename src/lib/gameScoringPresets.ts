import { BoardGame, GameScoringMode, PlaySession } from '../types';
import { getScoringTemplateForGame } from './scoringPresets';

export interface GameScoringPreset {
  bggId?: string;
  name: string;
  aliases?: string[];
  scoringMode: GameScoringMode;
  lowestScoreWins?: boolean;
}

/**
 * Normalizes a game title for robust accent, dash, quote, and case-insensitive matching.
 * Converts Unicode NFC, curly double quotes [“”] -> ", curly single quotes [‘’] -> ',
 * dashes [–—−] -> -, normalizes whitespace, and lowercases.
 */
export function normalizeGameKey(name?: string | null): string {
  if (!name) return '';
  return name
    .normalize('NFC')
    .trim()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('vi');
}

/**
 * Secondary stripped key (no quotes, no punctuation) for resilient fuzzy matching.
 */
export function cleanGameKey(name?: string | null): string {
  if (!name) return '';
  return normalizeGameKey(name)
    .replace(/['"]/g, '')
    .replace(/[:-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Known cooperative franchise names and lines for Tier 4 auto-detection of new games.
 */
export const KNOWN_COOP_FRANCHISE_KEYWORDS: readonly string[] = [
  'gloomhaven',
  'frosthaven',
  'arkham horror',
  'eldritch horror',
  'sky team',
  'the crew',
  'hanabi',
  'horrified',
  'forbidden island',
  'forbidden desert',
  'forbidden sky',
  'paleo',
  "aeon's end",
  'marvel champions',
  'dorfromantik',
  'sleeping gods',
  'mansions of madness',
  'zombicide',
  'sub terra',
  'the mind',
  'mysterium',
];

/**
 * Canonical preset definitions for the collection.
 * 12 Co-op games + 20 Win-Only games + 2 Lowest-Score-Wins games.
 */
export const GAME_SCORING_PRESETS: GameScoringPreset[] = [
  // --- 12 CO-OP GAMES ---
  { bggId: '333255', name: 'Keep the Heroes Out!', scoringMode: 'coop' },
  { bggId: '351550', name: "Keep the Heroes Out!: Guild Master's Revenge Expansion", scoringMode: 'coop' },
  { bggId: '351549', name: 'Keep the Heroes Out!: The Great Dreamer Expansion', scoringMode: 'coop' },
  { bggId: '406174', name: "Kinfire Delve: Callous' Lab", scoringMode: 'coop' },
  { bggId: '298047', name: 'Marvel United', scoringMode: 'coop' },
  { bggId: '336382', name: 'Marvel United: X-Men', scoringMode: 'coop' },
  { bggId: '30549', name: 'Pandemic', scoringMode: 'coop' },
  { bggId: '307002', name: 'Regicide', scoringMode: 'coop' },
  { bggId: '377470', name: 'Sail', scoringMode: 'coop' },
  { bggId: '338960', name: 'Slay the Spire: The Board Game', scoringMode: 'coop' },
  { bggId: '162886', name: 'Spirit Island', scoringMode: 'coop' },
  { bggId: '332290', name: 'Stardew Valley: The Board Game', scoringMode: 'coop' },

  // --- 20 WIN-ONLY COMPETITIVE GAMES ---
  { bggId: '10547', name: 'Betrayal at House on the Hill', scoringMode: 'win_only' },
  { bggId: '198773', name: 'Codenames: Pictures', scoringMode: 'win_only' },
  { bggId: '406652', name: 'Compile: Main 1', scoringMode: 'win_only' },
  { bggId: '246784', name: 'Cryptid', scoringMode: 'win_only' },
  { bggId: '245476', name: 'CuBirds', scoringMode: 'win_only' },
  {
    bggId: '284653',
    name: 'Mind MGMT: The Psychic Espionage “Game.”',
    aliases: [
      'Mind MGMT',
      'Mind MGMT: The Psychic Espionage Game',
      'Mind MGMT (Thám tử tâm linh)',
    ],
    scoringMode: 'win_only',
  },
  { bggId: '194655', name: 'Santorini', scoringMode: 'win_only' },
  { bggId: '188834', name: 'Secret Hitler', scoringMode: 'win_only' },
  { bggId: '230765', name: 'Side Effects', scoringMode: 'win_only' },
  { bggId: '92415', name: 'Skull', scoringMode: 'win_only' },
  { bggId: '16992', name: 'Tsuro', scoringMode: 'win_only' },
  { bggId: '364073', name: 'Splendor Duel', scoringMode: 'win_only' },
  { bggId: '366013', name: 'Heat: Pedal to the Metal', scoringMode: 'win_only' },
  { bggId: '277085', name: 'Love Letter', scoringMode: 'win_only' },
  { bggId: '1258', name: 'Phase 10', scoringMode: 'win_only' },
  { bggId: '811', name: 'Rummikub', scoringMode: 'win_only' },
  { bggId: '9220', name: 'Saboteur', scoringMode: 'win_only' },
  { bggId: '359970', name: 'Challengers!', scoringMode: 'win_only' },
  { bggId: '330401', name: 'Dokojong', scoringMode: 'win_only' },
  { bggId: '178361', name: 'Waka Tanka', scoringMode: 'win_only' },

  // --- 2 POINTS GAMES WITH LOWEST SCORE WINS ---
  { bggId: '307963', name: 'Durian', scoringMode: 'points', lowestScoreWins: true },
  { bggId: '381249', name: 'Rebel Princess', scoringMode: 'points', lowestScoreWins: true },
];

// Pre-indexed lookup maps for instant O(1) matching
const PRESET_BY_BGG_ID = new Map<string, GameScoringPreset>();
const PRESET_BY_NAME_KEY = new Map<string, GameScoringPreset>();
const PRESET_BY_CLEAN_KEY = new Map<string, GameScoringPreset>();

for (const p of GAME_SCORING_PRESETS) {
  if (p.bggId) {
    PRESET_BY_BGG_ID.set(String(p.bggId).trim(), p);
  }
  const mainKey = normalizeGameKey(p.name);
  if (mainKey) {
    PRESET_BY_NAME_KEY.set(mainKey, p);
  }
  const cleanKey = cleanGameKey(p.name);
  if (cleanKey) {
    PRESET_BY_CLEAN_KEY.set(cleanKey, p);
  }

  if (Array.isArray(p.aliases)) {
    for (const alias of p.aliases) {
      const aliasKey = normalizeGameKey(alias);
      if (aliasKey) {
        PRESET_BY_NAME_KEY.set(aliasKey, p);
      }
      const aliasClean = cleanGameKey(alias);
      if (aliasClean) {
        PRESET_BY_CLEAN_KEY.set(aliasClean, p);
      }
    }
  }
}

/**
 * Finds a matching preset by bggId, then by normalized / clean name (with alias support).
 */
export function getGameScoringPreset(
  game?: { bggId?: string | number; id?: string; name?: string } | null
): GameScoringPreset | undefined {
  if (!game) return undefined;

  // 1. Match by bggId (safe string & number trimming)
  if (game.bggId !== undefined && game.bggId !== null) {
    const rawBgg = String(game.bggId).trim();
    if (rawBgg && PRESET_BY_BGG_ID.has(rawBgg)) {
      return PRESET_BY_BGG_ID.get(rawBgg);
    }
  }
  if (game.id && typeof game.id === 'string' && game.id.startsWith('bgg-')) {
    const rawId = game.id.replace('bgg-', '').trim();
    if (rawId && PRESET_BY_BGG_ID.has(rawId)) {
      return PRESET_BY_BGG_ID.get(rawId);
    }
  }

  // 2. Match by normalized name and clean name
  if (game.name) {
    const key = normalizeGameKey(game.name);
    if (PRESET_BY_NAME_KEY.has(key)) {
      return PRESET_BY_NAME_KEY.get(key);
    }
    const clean = cleanGameKey(game.name);
    if (PRESET_BY_CLEAN_KEY.has(clean)) {
      return PRESET_BY_CLEAN_KEY.get(clean);
    }

    // Prefix match for game titles with subtitle variants (e.g. "Mind MGMT")
    for (const [presetKey, preset] of PRESET_BY_NAME_KEY.entries()) {
      if (key.startsWith(presetKey) || presetKey.startsWith(key)) {
        return preset;
      }
    }
    for (const [presetClean, preset] of PRESET_BY_CLEAN_KEY.entries()) {
      if (clean.startsWith(presetClean) || presetClean.startsWith(clean)) {
        return preset;
      }
    }
  }

  return undefined;
}

/**
 * 5-tier resolution hierarchy for determining a game's scoring mode:
 * 1. Manual override on Game (game.scoringMode)
 * 2. Self-learning from most recent session with EXPLICIT session.scoringMode
 * 3. Canonical Preset Table (bggId -> normalized name)
 * 4. Auto-detect Co-op from scoring template, tags/mechanics, and popular franchise keywords
 * 5. Default to 'points'
 */
export function resolveGameScoringMode(
  game?: BoardGame | null,
  sessions?: PlaySession[] | null
): GameScoringMode {
  // Tier 1: Manual override on Game
  if (
    game?.scoringMode === 'points' ||
    game?.scoringMode === 'win_only' ||
    game?.scoringMode === 'coop'
  ) {
    return game.scoringMode;
  }

  // Tier 2: Auto-remember from most recent session that explicitly specified scoringMode
  if (game?.id && Array.isArray(sessions) && sessions.length > 0) {
    const gameSessionsWithMode = sessions
      .filter((s) => s.gameId === game.id && Boolean(s.scoringMode))
      .sort((a, b) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (tB !== tA) return tB - tA;
        return (b.datePlayed || '').localeCompare(a.datePlayed || '');
      });

    if (gameSessionsWithMode.length > 0 && gameSessionsWithMode[0].scoringMode) {
      return gameSessionsWithMode[0].scoringMode;
    }
  }

  // Tier 3: Canonical Preset Table
  const preset = getGameScoringPreset(game);
  if (preset) {
    return preset.scoringMode;
  }

  // Tier 4: Auto-detect Co-op for new games from Template & BGG Metadata
  const template = getScoringTemplateForGame(game?.name);
  if (template?.isCoop) {
    return 'coop';
  }

  // Check tags / mechanics / categories (must match co-op AND strictly exclude semi-cooperative)
  if (Array.isArray(game?.tags) && game.tags.length > 0) {
    const isSemiCoop = game.tags.some((t) =>
      /semi[-\s]?co-?op|semi[-\s]?cooperative/i.test(t)
    );
    const isPureCoop = game.tags.some((t) =>
      /co-?op|cooperative/i.test(t)
    );
    if (isPureCoop && !isSemiCoop) {
      return 'coop';
    }
  }

  // Check popular pure cooperative lines
  if (game?.name) {
    const lowerName = game.name.toLowerCase();
    const matchesCoopFranchise = KNOWN_COOP_FRANCHISE_KEYWORDS.some((kw) =>
      lowerName.includes(kw)
    );
    if (matchesCoopFranchise) {
      return 'coop';
    }
  }

  // Tier 5: Default
  return 'points';
}

/**
 * Returns true if the game is resolved as cooperative.
 */
export function isCoopGame(
  game?: BoardGame | null,
  sessions?: PlaySession[] | null
): boolean {
  return resolveGameScoringMode(game, sessions) === 'coop';
}

/**
 * Determines whether a session is cooperative.
 * Follows strict priority to prevent competitive games from being misclassified as Co-op:
 * 1. Explicit session.scoringMode takes absolute precedence.
 * 2. Canonical preset lookup for known collection games (e.g. Mind MGMT is always win_only, Spirit Island is always coop).
 * 3. Scoring template lookup (e.g. Stardew Valley, Slay the Spire).
 * 4. Game entity resolution (for new games with tags).
 * 5. Fallback for untracked custom games (coopOutcome, legacy isCoop flag, all-player win).
 */
export function isCoopSession(
  session?: PlaySession | null,
  game?: BoardGame | null
): boolean {
  if (!session) return false;

  // 1. Explicit session.scoringMode takes absolute precedence
  if (session.scoringMode) {
    return session.scoringMode === 'coop';
  }

  // 2. Manual override on Game (game.scoringMode)
  if (game?.scoringMode === 'coop') {
    return true;
  }
  if (game?.scoringMode === 'points' || game?.scoringMode === 'win_only') {
    return false;
  }

  // 3. Canonical preset lookup: if game is definitively win_only or points, it is NOT co-op
  const targetGame = game || (session.gameName ? { name: session.gameName } : null);
  const preset = getGameScoringPreset(targetGame);
  if (preset) {
    return preset.scoringMode === 'coop';
  }

  // 3. Fallback for untracked / custom games without canonical preset:
  // Check explicit legacy session flag
  if (typeof session.isCoop === 'boolean') {
    return session.isCoop;
  }
  if (session.coopOutcome === 'won' || session.coopOutcome === 'lost') {
    return true;
  }

  // 4. Known co-op template lookup (e.g. Stardew Valley, Slay the Spire)
  if (session.gameName) {
    const template = getScoringTemplateForGame(session.gameName);
    if (template?.isCoop) {
      return true;
    }
  }

  // 5. Game entity resolution
  if (game) {
    const resolved = resolveGameScoringMode(game);
    if (resolved === 'win_only' || resolved === 'points') {
      return false;
    }
    if (resolved === 'coop') {
      return true;
    }
  }

  // 6. Multi-player team win in untracked game (where all players marked isWinner: true)
  if (
    Array.isArray(session.players) &&
    session.players.length > 1 &&
    session.players.every((p) => p.isWinner)
  ) {
    return true;
  }

  return false;
}

/**
 * Determines whether a session is win-only (competitive without points).
 */
export function isWinOnlySession(
  session?: PlaySession | null,
  game?: BoardGame | null
): boolean {
  if (!session) return false;

  if (session.scoringMode) {
    return session.scoringMode === 'win_only';
  }

  // If session is cooperative, it is not competitive win-only
  if (isCoopSession(session, game)) {
    return false;
  }

  // Manual override on Game (game.scoringMode)
  if (game?.scoringMode === 'win_only') {
    return true;
  }
  if (game?.scoringMode === 'points' || game?.scoringMode === 'coop') {
    return false;
  }

  // Canonical preset check
  const targetGame = game || (session.gameName ? { name: session.gameName } : null);
  const preset = getGameScoringPreset(targetGame);
  if (preset?.scoringMode === 'win_only') {
    return true;
  }
  if (game && resolveGameScoringMode(game) === 'win_only') {
    return true;
  }

  return false;
}

/**
 * Resolves all winner(s) for a session as a full array.
 * Guaranteed to return ALL winners (for multi-winner competitive matches, ties, and team wins),
 * NEVER truncating to just the first winner.
 */
export function getSessionWinners<T extends { playerId: string; isWinner?: boolean; rank?: number } = any>(
  session?: PlaySession | null,
  game?: BoardGame | null
): T[] {
  if (!session || !Array.isArray(session.players) || session.players.length === 0) {
    return [];
  }

  const isCoop = isCoopSession(session, game);
  if (isCoop) {
    const isTeamWin = session.coopOutcome === 'won' || session.players.some((p) => p.isWinner);
    if (!isTeamWin) return [];
    return session.players.filter((p) => p.isWinner || session.coopOutcome === 'won') as unknown as T[];
  }

  // Competitive (points or win_only)
  return session.players.filter(
    (p) => Boolean(p.isWinner || (session.winnerId && p.playerId === session.winnerId))
  ) as unknown as T[];
}

/**
 * Resolves whether the lowest score wins for a game (e.g. Durian, Rebel Princess, Golf).
 */
export function resolveLowestScoreWins(game?: BoardGame | null): boolean {
  if (!game) return false;
  if (typeof game.lowestScoreWins === 'boolean') {
    return game.lowestScoreWins;
  }
  const preset = getGameScoringPreset(game);
  if (preset && typeof preset.lowestScoreWins === 'boolean') {
    return preset.lowestScoreWins;
  }
  const template = getScoringTemplateForGame(game.name);
  if (template && typeof template.lowestScoreWins === 'boolean') {
    return template.lowestScoreWins;
  }
  return false;
}
