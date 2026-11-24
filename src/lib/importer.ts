import JSZip from 'jszip';
import { BoardGame, GameStatus, Player, PlaySession, GameLocation } from '../types';
import { generateId, compressImage } from './utils';
import { saveMediaImage } from './mediaStorage';

export interface ImportPreviewItem {
  name: string;
  yearPublished?: number;
  bggId?: string;
  minPlayers: number;
  maxPlayers: number;
  playingTime: number;
  bggRating?: number;
  status: GameStatus;
  purchasePrice?: number;
  lentToName?: string;
  notes?: string;
  thumbnail?: string;
  selected: boolean;
}

export interface FullBGCatalogImportResult {
  games: BoardGame[];
  players: Player[];
  sessions: PlaySession[];
  locations?: GameLocation[];
  summary: {
    gameCount: number;
    playCount: number;
    playerCount: number;
    locationCount?: number;
    ownCount: number;
    rentedCount?: number;
    soldCount: number;
    prevOwnedCount: number;
    wishlistCount: number;
  };
}

const PLAYER_COLORS = [
  '#7c3aed',
  '#ec4899',
  '#22d3ee',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#e11d48',
  '#84cc16',
  '#3b82f6',
  '#d946ef',
  '#14b8a6',
];

export interface RawBGCatalogGame {
  id: number | string;
  bggId?: number | string;
  name?: string;
  urlThumb?: string;
  urlImage?: string;
  designers?: string;
  artists?: string;
  minPlayers?: number | string;
  maxPlayers?: number | string;
  minPlayTime?: number | string;
  maxPlayTime?: number | string;
  yearPublished?: number | string;
  average?: number | string;
  own?: number;
  fortrade?: number;
  prevowned?: number;
  wishlist?: number;
  addedDate?: string;
  notes?: string;
  expansion?: number;
}

export interface RawBGCatalogPlayer {
  id: number | string;
  name?: string;
  isAnonymous?: boolean | number;
  image?: string;
  me?: number;
}

export interface RawBGCatalogPlay {
  id: number | string;
  gameId: number | string;
  locationId?: number | string;
  playDate?: string;
  length?: number | string;
  image?: string;
  notes?: string;
}

export interface RawBGCatalogPlayerPlay {
  playId: number | string;
  playerId: number | string;
  nickname?: string;
  score?: number | string | null;
  winner?: number;
  startPlayer?: number;
}

export interface RawBGCatalogLocation {
  id: number | string;
  name?: string;
}

export interface RawBGCatalogExport {
  games?: RawBGCatalogGame[];
  players?: RawBGCatalogPlayer[];
  plays?: RawBGCatalogPlay[];
  playersPlays?: RawBGCatalogPlayerPlay[];
  locations?: RawBGCatalogLocation[];
}

interface RawSimpleImportItem {
  name?: string;
  title?: string;
  yearPublished?: number | string;
  year?: number | string;
  bggId?: number | string;
  minPlayers?: number | string;
  maxPlayers?: number | string;
  playingTime?: number | string;
  bggRating?: number | string;
  status?: string;
  purchasePrice?: number | string;
  lentToName?: string;
  lentTo?: string;
  notes?: string;
  comment?: string;
  thumbnail?: string;
  image?: string;
  urlThumb?: string;
}

/**
 * Safely normalizes arbitrary BG Catalog / ISO / SQLite date strings to a valid ISO 8601 string.
 * Never throws RangeError when strings already end with 'Z' or contain timezone offsets.
 */
export function safeParseIsoDate(raw?: string | null, fallbackIso?: string): string {
  const fallback = fallbackIso ?? new Date().toISOString();
  if (!raw || typeof raw !== 'string') return fallback;

  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  // Already has 'Z' or explicit timezone offset (+HH:MM / -HH:MM / +HHMM)
  const hasTz = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  let normalized = trimmed;
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(trimmed)) {
    normalized = trimmed.replace(/\s+/, 'T') + (hasTz ? '' : 'Z');
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    normalized = `${trimmed}T00:00:00.000Z`;
  } else if (trimmed.includes(' ') && !hasTz) {
    normalized = trimmed.replace(' ', 'T') + 'Z';
  }

  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  // Last-chance direct Date parse (e.g. RFC2822 / locale formats)
  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) {
    return direct.toISOString();
  }

  return fallback;
}

/**
 * Parses a BG Catalog export ZIP file containing BGGCatalogExport.json and optional player/play images
 */
export async function parseBGCatalogZip(
  file: File | ArrayBuffer
): Promise<FullBGCatalogImportResult> {
  const zip = await JSZip.loadAsync(file);
  const imageMap: Record<string, string> = {};

  // Extract all jpg/png files into base64 data URIs, compress, and store to IndexedDB
  const imageFileNames = Object.keys(zip.files).filter((fn) =>
    /\.(jpe?g|png|webp)$/i.test(fn)
  );

  for (const fileName of imageFileNames) {
    const entry = zip.files[fileName];
    if (entry && !entry.dir) {
      const cleanName = fileName.replace(/^.*[\\/]/, '');
      try {
        const blob = await entry.async('blob');
        const compressed = await compressImage(blob, 1024, 1024, 0.7);
        if (compressed) {
          const idbRef = await saveMediaImage(compressed);
          imageMap[cleanName] = idbRef;
        }
      } catch (err) {
        console.warn(`Failed to compress zip image ${fileName}, falling back to direct save:`, err);
        const base64 = await entry.async('base64');
        const ext = fileName.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
        const dataUrl = `data:image/${ext};base64,${base64}`;
        const idbRef = await saveMediaImage(dataUrl);
        imageMap[cleanName] = idbRef;
      }
    }
  }

  // Find the JSON export file
  let jsonString: string | null = null;
  const jsonEntry =
    zip.files['BGGCatalogExport.json'] ||
    Object.values(zip.files).find((f) => f.name.endsWith('.json'));

  if (jsonEntry) {
    jsonString = await jsonEntry.async('string');
  }

  if (!jsonString) {
    throw new Error('No valid JSON export file found in this ZIP archive.');
  }

  const rawData = JSON.parse(jsonString) as RawBGCatalogExport;
  return parseBGCatalogJsonObject(rawData, imageMap);
}

/**
 * Parses raw JSON exported from BG Catalog (iOS)
 */
export function parseBGCatalogJsonObject(
  data: RawBGCatalogExport,
  imageMap: Record<string, string> = {}
): FullBGCatalogImportResult {
  const rawGames = data.games || [];
  const rawPlayers = data.players || [];
  const rawPlays = data.plays || [];
  const rawPlayersPlays = data.playersPlays || [];
  const rawLocations = data.locations || [];

  // 1. Build lookup tables
  const gameMap = new Map<number | string, RawBGCatalogGame>();
  rawGames.forEach((g) => gameMap.set(g.id, g));

  const playerMap = new Map<number | string, RawBGCatalogPlayer>();
  rawPlayers
    .filter((p) => !p.isAnonymous && p.name && p.name.trim())
    .forEach((p) => playerMap.set(p.id, p));

  const locationMap = new Map<number | string, string>();
  rawLocations.forEach((l) => {
    if (l.name) locationMap.set(l.id, l.name);
  });

  const playersPlaysByPlayId = new Map<number | string, RawBGCatalogPlayerPlay[]>();
  rawPlayersPlays.forEach((pp) => {
    if (!playersPlaysByPlayId.has(pp.playId)) {
      playersPlaysByPlayId.set(pp.playId, []);
    }
    playersPlaysByPlayId.get(pp.playId)!.push(pp);
  });

  // 2. Convert Games
  let ownCount = 0;
  let soldCount = 0;
  let prevOwnedCount = 0;
  let wishlistCount = 0;

  const games: BoardGame[] = rawGames.map((g) => {
    let status: GameStatus = 'own';
    if (g.own === 1) {
      status = 'own';
      ownCount++;
    } else if (g.fortrade === 1) {
      status = 'sold';
      soldCount++;
    } else if (g.prevowned === 1) {
      status = 'previously_owned';
      prevOwnedCount++;
    } else if (g.wishlist === 1) {
      status = 'wishlist';
      wishlistCount++;
    } else {
      status = 'own';
      ownCount++;
    }

    const bggId = g.bggId ? String(g.bggId) : undefined;
    const addedDate = safeParseIsoDate(g.addedDate);

    return {
      id: `bgg-${bggId || g.id}`,
      bggId,
      name: g.name || 'Untitled Game',
      thumbnail: g.urlThumb || g.urlImage || '',
      image: g.urlImage || g.urlThumb || '',
      description: g.designers
        ? `Designed by ${g.designers}. ${g.artists ? `Art by ${g.artists}.` : ''}`
        : 'Imported from BG Catalog',
      minPlayers: Number(g.minPlayers) || 1,
      maxPlayers: Number(g.maxPlayers) || 4,
      playingTime: Number(g.maxPlayTime || g.minPlayTime) || 45,
      yearPublished: Number(g.yearPublished) || 2020,
      bggRating: g.average ? Math.round(Number(g.average) * 10) / 10 : undefined,
      status,
      purchasePrice: undefined,
      addedDate,
      notes: g.notes || undefined,
      tags: g.expansion === 1 ? ['Expansion'] : undefined,
    };
  });

  // 3. Convert Players
  let colorIdx = 0;
  const players: Player[] = Array.from(playerMap.values()).map((p) => {
    // Resolve avatar: check if in imageMap (from zip), else fallback
    const imageName = p.image ? p.image.replace(/^.*[\\/]/, '') : null;
    const avatar =
      (imageName && imageMap[imageName]) || (p.me === 1 ? '👑' : '🎲');

    return {
      id: `player-${p.id}`,
      name: (p.name || 'Player').trim(),
      avatar,
      color: PLAYER_COLORS[colorIdx++ % PLAYER_COLORS.length],
      createdAt: new Date().toISOString(),
    };
  });

  // 4. Convert Sessions & Scores
  const sessions: PlaySession[] = rawPlays.map((play) => {
    const g = gameMap.get(play.gameId);
    const pps = playersPlaysByPlayId.get(play.id) || [];

    const scores = pps.map((pp) => {
      const pl = playerMap.get(pp.playerId);
      return {
        playerId: `player-${pp.playerId}`,
        playerName: pl?.name || pp.nickname || 'Guest',
        score:
          pp.score !== null &&
          pp.score !== undefined &&
          String(pp.score).trim() !== '' &&
          !isNaN(Number(pp.score))
            ? Number(pp.score)
            : undefined,
        isWinner: pp.winner === 1,
        rank: 1,
      };
    });

    // Rank sorting - competition ranking (1, 1, 3 for ties)
    const sorted = [...scores].sort(
      (a, b) => (b.score ?? -999999) - (a.score ?? -999999)
    );
    sorted.forEach((item, idx) => {
      if (idx > 0 && item.score !== undefined && item.score === sorted[idx - 1].score) {
        item.rank = sorted[idx - 1].rank;
      } else {
        item.rank = idx + 1;
      }
    });

    const winner = pps.find((pp) => pp.winner === 1);
    const starter = pps.find((pp) => pp.startPlayer === 1);

    const datePlayed = safeParseIsoDate(play.playDate);

    const photoName = play.image ? play.image.replace(/^.*[\\/]/, '') : null;
    const photos =
      photoName && imageMap[photoName] ? [imageMap[photoName]] : undefined;

    return {
      id: `play-${play.id}`,
      gameId: g ? `bgg-${g.bggId || g.id}` : `game-${play.gameId}`,
      gameName: g?.name || 'Board Game',
      gameThumbnail: g ? g.urlThumb || g.urlImage || '' : '',
      datePlayed,
      location: play.locationId !== undefined ? locationMap.get(play.locationId) || undefined : undefined,
      durationMinutes: play.length ? Number(play.length) : undefined,
      firstPlayerMethod: starter ? 'manual' : 'random_wheel',
      firstPlayerId: starter ? `player-${starter.playerId}` : undefined,
      winnerId: winner ? `player-${winner.playerId}` : undefined,
      players: scores,
      photos,
      notes: (play.notes || '').replace(/#BGCatalog/g, '').trim() || undefined,
      createdAt: datePlayed,
    };
  });

  // Convert Locations
  const nowIso = new Date().toISOString();
  const locations: GameLocation[] = rawLocations
    .filter((l) => l && l.name && String(l.name).trim())
    .map((l) => ({
      id: `location-${l.id}`,
      name: String(l.name).trim(),
      createdAt: nowIso,
    }));

  return {
    games,
    players,
    sessions,
    locations,
    summary: {
      gameCount: games.length,
      playCount: sessions.length,
      playerCount: players.length,
      locationCount: locations.length,
      ownCount,
      soldCount,
      prevOwnedCount,
      wishlistCount,
    },
  };
}

/**
 * Legacy CSV parser for standalone CSV file uploads
 */
export function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

/**
 * Automatically parses imported CSV or simple JSON list
 */
export function parseImportFile(content: string): ImportPreviewItem[] {
  const trimmed = content.trim();

  // 1. Try parsing as JSON first
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as
        | RawSimpleImportItem[]
        | { games?: RawSimpleImportItem[]; items?: RawSimpleImportItem[] };
      const list: RawSimpleImportItem[] = Array.isArray(parsed)
        ? parsed
        : parsed.games || parsed.items || [];
      return list.map((item) => ({
        name: item.name || item.title || 'Untitled Game',
        yearPublished:
          item.yearPublished || item.year
            ? Number(item.yearPublished || item.year)
            : undefined,
        bggId: item.bggId ? String(item.bggId) : undefined,
        minPlayers: Number(item.minPlayers) || 1,
        maxPlayers: Number(item.maxPlayers) || 4,
        playingTime: Number(item.playingTime) || 60,
        bggRating: item.bggRating ? Number(item.bggRating) : undefined,
        status: normalizeStatus(item.status || ''),
        purchasePrice: item.purchasePrice
          ? Number(item.purchasePrice)
          : undefined,
        lentToName: item.lentToName || item.lentTo || undefined,
        notes: item.notes || item.comment || undefined,
        thumbnail: item.thumbnail || item.image || item.urlThumb || undefined,
        selected: true,
      }));
    } catch {
      // Fallback to CSV
    }
  }

  // 2. Parse as CSV
  const rows = parseCSV(trimmed);
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) =>
    h.toLowerCase().replace(/[^a-z0-9]/g, '')
  );

  const nameIdx = headers.findIndex((h) =>
    ['name', 'objectname', 'title', 'gamename'].includes(h)
  );
  const idIdx = headers.findIndex((h) =>
    ['objectid', 'bggid', 'id'].includes(h)
  );
  const yearIdx = headers.findIndex((h) =>
    ['yearpublished', 'year', 'published'].includes(h)
  );
  const ratingIdx = headers.findIndex((h) =>
    ['rating', 'bggrating', 'average', 'userrating'].includes(h)
  );
  const minPlayIdx = headers.findIndex((h) =>
    ['minplayers', 'minplayer', 'min'].includes(h)
  );
  const maxPlayIdx = headers.findIndex((h) =>
    ['maxplayers', 'maxplayer', 'max'].includes(h)
  );
  const playTimeIdx = headers.findIndex((h) =>
    ['playingtime', 'playtime', 'duration', 'time'].includes(h)
  );
  const statusIdx = headers.findIndex((h) =>
    ['status', 'own', 'collectionstatus', 'ownership'].includes(h)
  );
  const priceIdx = headers.findIndex((h) =>
    ['purchaseprice', 'price', 'cost', 'buyprice'].includes(h)
  );
  const lentIdx = headers.findIndex((h) =>
    ['lentto', 'lenttoname', 'borrower', 'lent'].includes(h)
  );
  const notesIdx = headers.findIndex((h) =>
    ['notes', 'comment', 'description', 'memo'].includes(h)
  );
  const thumbIdx = headers.findIndex((h) =>
    ['thumbnail', 'image', 'cover', 'picture'].includes(h)
  );

  if (nameIdx === -1) return [];

  const items: ImportPreviewItem[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = row[nameIdx];
    if (!name || name.trim() === '') continue;

    let status: GameStatus = 'own';
    if (statusIdx !== -1 && row[statusIdx]) {
      status = normalizeStatus(row[statusIdx]);
    } else {
      const ownIdx = headers.indexOf('own');
      const wishlistIdx = headers.indexOf('wishlist');
      const forTradeIdx = headers.indexOf('fortrade');
      if (wishlistIdx !== -1 && row[wishlistIdx] === '1') status = 'wishlist';
      else if (forTradeIdx !== -1 && row[forTradeIdx] === '1') status = 'sold';
      else if (ownIdx !== -1 && row[ownIdx] === '0')
        status = 'previously_owned';
    }

    items.push({
      name: name.trim(),
      bggId: idIdx !== -1 && row[idIdx] ? row[idIdx].trim() : undefined,
      yearPublished:
        yearIdx !== -1 && row[yearIdx] ? parseInt(row[yearIdx], 10) : undefined,
      bggRating:
        ratingIdx !== -1 && row[ratingIdx]
          ? Math.round(parseFloat(row[ratingIdx]) * 10) / 10
          : undefined,
      minPlayers:
        minPlayIdx !== -1 && row[minPlayIdx]
          ? parseInt(row[minPlayIdx], 10)
          : 1,
      maxPlayers:
        maxPlayIdx !== -1 && row[maxPlayIdx]
          ? parseInt(row[maxPlayIdx], 10)
          : 4,
      playingTime:
        playTimeIdx !== -1 && row[playTimeIdx]
          ? parseInt(row[playTimeIdx], 10)
          : 60,
      status,
      purchasePrice:
        priceIdx !== -1 && row[priceIdx]
          ? parseFloat(row[priceIdx].replace(/[^0-9.]/g, ''))
          : undefined,
      lentToName:
        lentIdx !== -1 && row[lentIdx] ? row[lentIdx].trim() : undefined,
      notes: notesIdx !== -1 && row[notesIdx] ? row[notesIdx].trim() : undefined,
      thumbnail:
        thumbIdx !== -1 && row[thumbIdx] ? row[thumbIdx].trim() : undefined,
      selected: true,
    });
  }

  return items;
}

function normalizeStatus(val: string): GameStatus {
  if (!val) return 'own';
  const v = val.toLowerCase().trim();
  if (v.includes('rent') || v.includes('thuê') || v.includes('thue') || v.includes('quán') || v.includes('quan')) return 'rented';
  if (v.includes('lent') || v.includes('cho mượn') || v.includes('loaned'))
    return 'lent_out';
  if (v.includes('borrow') || v.includes('mượn')) return 'borrowed';
  if (v.includes('sold') || v.includes('bán') || v.includes('trade'))
    return 'sold';
  if (v.includes('wish') || v.includes('muốn mua')) return 'wishlist';
  if (v.includes('prev') || v.includes('từng')) return 'previously_owned';
  return 'own';
}
