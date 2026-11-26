import type { BoardGame, Player, PlaySession, GameLocation } from '../types';
import { isSyncApplyingRemote, setSyncApplyingRemote } from './syncGuard';
import { useSyncStore } from '../store/useSyncStore';

export type RestoreCategory = 'games' | 'players' | 'sessions' | 'locations';
export type RestoreSelection = Record<RestoreCategory, boolean>;
export type RestoreData = {
  games: BoardGame[];
  players: Player[];
  sessions: PlaySession[];
  locations: GameLocation[];
};
export type RestoreResult = { ok: true } | { ok: false; errors: string[] };

export const restoreCategories: RestoreCategory[] = ['games', 'players', 'sessions', 'locations'];
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const nonempty = (value: unknown): boolean => typeof value === 'string' && value.trim().length > 0;
const text = (value: unknown): boolean => typeof value === 'string';
const finite = (value: unknown): boolean => typeof value === 'number' && Number.isFinite(value);
const bool = (value: unknown): boolean => typeof value === 'boolean';
const stringArray = (value: unknown): boolean => Array.isArray(value) && value.every(text);
// Device-local or ephemeral URLs cannot be safely restored from an archive.
const portableMedia: Check = (value) => text(value) && !/^(?:idb:\/\/|blob:)/i.test(value as string);
const portableMediaArray: Check = (value) => Array.isArray(value) && value.every(portableMedia);
const oneOf = (...choices: string[]) => (value: unknown): boolean => typeof value === 'string' && choices.includes(value);
const date = (value: unknown): boolean => nonempty(value) && !Number.isNaN(Date.parse(value as string));
type Check = (value: unknown) => boolean;

function checkFields(value: unknown, path: string, required: Record<string, Check>, optional: Record<string, Check>, errors: string[]): void {
  if (!record(value)) { errors.push(`${path} must be an object`); return; }
  for (const [key, check] of Object.entries(required)) {
    if (!check(value[key])) errors.push(`${path}.${key} is invalid or missing`);
  }
  for (const [key, check] of Object.entries(optional)) {
    if (value[key] !== undefined && !check(value[key])) errors.push(`${path}.${key} is invalid`);
  }
}

const strings = (...names: string[]): Record<string, Check> => Object.fromEntries(names.map((name) => [name, text]));
const ids = (...names: string[]): Record<string, Check> => Object.fromEntries(names.map((name) => [name, nonempty]));
const scores = (value: unknown): boolean => record(value) && Object.values(value).every(finite);
const gameRequired = { ...ids('id', 'name'), thumbnail: portableMedia, image: portableMedia, description: text, minPlayers: finite, maxPlayers: finite, playingTime: finite, yearPublished: finite, status: oneOf('own', 'lent_out', 'borrowed', 'rented', 'sold', 'wishlist', 'previously_owned'), addedDate: date };
const gameOptional = { bggId: nonempty, bggRating: finite, scoringMode: oneOf('points', 'win_only', 'coop'), lowestScoreWins: bool, purchasePrice: finite, sellPrice: finite, ...strings('lentToName', 'lentDate', 'notes'), tags: stringArray };
const playerRequired = { ...ids('id', 'name'), color: nonempty, createdAt: date };
const playerOptional = { ...strings('nickname', 'bio', 'playStyle', 'specialtyGameId', 'specialtyGameName', 'weaknessGameId', 'weaknessGameName', 'favoriteGameId', 'favoriteGameName'), avatar: portableMedia, isGuest: bool };
const locationRequired = { ...ids('id', 'name'), createdAt: date };
const locationOptional = { ...strings('address', 'notes'), isDefault: bool };
const sessionRequired = { ...ids('id', 'gameId', 'gameName'), gameThumbnail: portableMedia, datePlayed: date, players: Array.isArray, firstPlayerMethod: oneOf('random_wheel', 'manual', 'previous_loser', 'previous_winner'), createdAt: date };
const sessionOptional = { status: oneOf('completed', 'in_progress', 'draft'), ...strings('location', 'notes'), ...ids('winnerId', 'firstPlayerId'), durationMinutes: finite, isCoop: bool, scoringMode: oneOf('points', 'win_only', 'coop'), coopOutcome: oneOf('won', 'lost'), photos: portableMediaArray };
const playerScoreRequired = { ...ids('playerId', 'playerName'), isWinner: bool };
const playerScoreOptional = { score: finite, rank: finite, scoreBreakdown: scores };

/** A category not present in a backup must never be silently replaced with []. */
export function getRestorePresence(data: unknown): RestoreSelection {
  const source = record(data) ? data : {};
  const metadata = record(source.present) ? source.present : undefined;
  return Object.fromEntries(restoreCategories.map((key) => [key,
    metadata ? metadata[key] === true : Object.prototype.hasOwnProperty.call(source, key),
  ])) as RestoreSelection;
}

export function getRestoreCounts(data: unknown): Record<RestoreCategory, number | null> {
  const source = record(data) ? data : {};
  return Object.fromEntries(restoreCategories.map((key) => [key, Array.isArray(source[key]) ? source[key].length : null])) as Record<RestoreCategory, number | null>;
}

/** Validate every selected record before any writer is invoked. */
export function validateRestoreData(data: unknown, selection: RestoreSelection): RestoreResult {
  if (!record(data)) return { ok: false, errors: ['Backup must be an object.'] };
  if (!restoreCategories.some((key) => selection[key])) return { ok: false, errors: ['Select at least one available category.'] };
  const present = getRestorePresence(data);
  const errors: string[] = [];
  const shapes = {
    games: [gameRequired, gameOptional], players: [playerRequired, playerOptional],
    sessions: [sessionRequired, sessionOptional], locations: [locationRequired, locationOptional],
  } as const;
  for (const key of restoreCategories) {
    if (!selection[key]) continue;
    if (!present[key]) { errors.push(`${key} is absent from this backup`); continue; }
    const items = data[key];
    if (!Array.isArray(items)) { errors.push(`${key} must be an array`); continue; }
    const seen = new Set<string>();
    items.forEach((item, index) => {
      const path = `${key}[${index}]`;
      checkFields(item, path, shapes[key][0], shapes[key][1], errors);
      if (!record(item)) return;
      if (nonempty(item.id)) {
        if (seen.has(item.id as string)) errors.push(`${path}.id is duplicated`);
        seen.add(item.id as string);
      }
      if (key === 'sessions' && Array.isArray(item.players)) {
        item.players.forEach((score, scoreIndex) => checkFields(score, `${path}.players[${scoreIndex}]`, playerScoreRequired, playerScoreOptional, errors));
      }
    });
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

/** Zustand may silently skip storage when unavailable, so verify the written value. */
export function assertRestorePersisted(read: (key: string) => string | null, key: string, category: RestoreCategory, expected: unknown[]): void {
  let stored: unknown;
  try {
    const raw = read(key);
    stored = raw === null ? null : JSON.parse(raw);
  } catch {
    throw new Error(`Could not verify ${category} persistence`);
  }
  if (!record(stored) || !record(stored.state) || JSON.stringify(stored.state[category]) !== JSON.stringify(expected)) {
    throw new Error(`Could not verify ${category} persistence`);
  }
}

type RestoreWriters = { [K in RestoreCategory]: (items: RestoreData[K], replace: boolean) => void };

/** Synchronous guard reduces automatic pushes between writes; it is not a transaction. */
export function applyValidatedRestore(data: unknown, selection: RestoreSelection, replace: boolean, writers: RestoreWriters): RestoreResult {
  const validation = validateRestoreData(data, selection);
  if (!validation.ok) return validation;
  if (isSyncApplyingRemote()) return { ok: false, errors: ['A sync is applying data. Wait for it to finish.'] };
  const backup = data as RestoreData;
  setSyncApplyingRemote(true);
  try {
    if (selection.games) writers.games(backup.games, replace);
    if (selection.players) writers.players(backup.players, replace);
    if (selection.sessions) writers.sessions(backup.sessions, replace);
    if (selection.locations) writers.locations(backup.locations, replace);
    return { ok: true };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, errors: [`Restore was interrupted and may be partially applied: ${detail}. Review local data and use your pre-restore backup if needed.`] };
  } finally {
    setSyncApplyingRemote(false);
    // Suppression above also suppresses dirty tracking. Record even partial writes.
    useSyncStore.getState().markLocalChange();
  }
}

/** Validate BG Catalog input before conversion can coerce or discard malformed fields. */
export function assertValidBGCatalogInput(data: unknown): void {
  if (!record(data)) throw new Error('Invalid BG Catalog backup: expected an object.');
  const errors: string[] = [];
  const rawId: Check = (value) => nonempty(value) || finite(value);
  const rawNumber: Check = (value) => finite(value) || (nonempty(value) && Number.isFinite(Number(value)));
  const rawFlag: Check = (value) => finite(value) || bool(value);
  const rawScore: Check = (value) => value === null || rawNumber(value) || value === '';
  const checks = {
    games: [{ id: rawId }, { bggId: rawId, ...strings('name', 'urlThumb', 'urlImage', 'designers', 'artists', 'addedDate', 'notes'), minPlayers: rawNumber, maxPlayers: rawNumber, minPlayTime: rawNumber, maxPlayTime: rawNumber, yearPublished: rawNumber, average: rawNumber, own: rawFlag, fortrade: rawFlag, prevowned: rawFlag, wishlist: rawFlag, expansion: rawFlag }],
    players: [{ id: rawId }, { ...strings('name', 'image'), isAnonymous: rawFlag, me: rawFlag }],
    plays: [{ id: rawId, gameId: rawId }, { locationId: rawId, ...strings('playDate', 'image', 'notes'), length: rawNumber }],
    playersPlays: [{ playId: rawId, playerId: rawId }, { nickname: text, score: rawScore, winner: rawFlag, startPlayer: rawFlag }],
    locations: [{ id: rawId }, { name: text }],
  } as Record<string, [Record<string, Check>, Record<string, Check>]>;
  for (const [key, [required, optional]] of Object.entries(checks)) {
    if (!(key in data)) continue;
    const items = data[key];
    if (!Array.isArray(items)) { errors.push(`${key} must be an array`); continue; }
    const seen = new Set<string>();
    items.forEach((item, index) => {
      const path = `${key}[${index}]`;
      checkFields(item, path, required, optional, errors);
      if (key !== 'playersPlays' && record(item) && rawId(item.id)) {
        const id = String(item.id);
        if (seen.has(id)) errors.push(`${path}.id is duplicated`);
        seen.add(id);
      }
    });
  }
  if (errors.length) throw new Error(`Invalid BG Catalog backup: ${errors.slice(0, 5).join('; ')}`);
}
