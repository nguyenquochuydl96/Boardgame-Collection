import type { BoardGame, GameLocation, Player, PlaySession } from '../types';
import { getMediaImage, isIdbMediaRef } from './mediaStorage';

export interface PortableVaultSnapshot {
  games: BoardGame[];
  players: Player[];
  sessions: PlaySession[];
  locations: GameLocation[];
}

function cloneData<T>(value: T): T {
  if (Array.isArray(value)) return value.map(cloneData) as T;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneData(item)])) as T;
  }
  return value;
}

/** Resolve local media without mutating the snapshot or disclosing media values. */
export async function resolvePortableVaultMedia(snapshot: PortableVaultSnapshot): Promise<PortableVaultSnapshot> {
  const resolutions = new Map<string, Promise<string>>();
  function resolveValue(value: string): Promise<string> {
    if (!isIdbMediaRef(value)) return Promise.resolve(value);
    const existing = resolutions.get(value);
    if (existing) return existing;
    const pending = (async () => {
      const resolved = await getMediaImage(value, { requireStored: true });
      if (!resolved || isIdbMediaRef(resolved)) {
        throw new Error('Could not resolve an IndexedDB media reference for a portable backup.');
      }
      return resolved;
    })();
    resolutions.set(value, pending);
    return pending;
  }

  // Snapshot nested JSON data synchronously, before any IndexedDB awaits, so
  // the result cannot alias (or observe later mutations of) caller state.
  const detached = cloneData(snapshot);
  const [games, players, sessions] = await Promise.all([
    Promise.all(detached.games.map(async (game) => ({
      ...game,
      image: await resolveValue(game.image),
      thumbnail: await resolveValue(game.thumbnail),
    }))),
    Promise.all(detached.players.map(async (player) => ({
      ...player,
      ...(player.avatar === undefined ? {} : { avatar: await resolveValue(player.avatar) }),
    }))),
    Promise.all(detached.sessions.map(async (session) => ({
      ...session,
      gameThumbnail: await resolveValue(session.gameThumbnail),
      ...(session.photos == null ? {} : { photos: await Promise.all(session.photos.map(resolveValue)) }),
    }))),
  ]);
  return { games, players, sessions, locations: detached.locations };
}
