import { BoardGame, GameStatus } from '../types';
import { createGameCoverDataUri, generateId } from './utils';

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

/**
 * Parse CSV text into array of rows
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
        i++; // skip escaped quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n in CRLF
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
 * Automatically parses imported CSV or JSON text from BG Catalog or BGG
 */
export function parseImportFile(content: string): ImportPreviewItem[] {
  const trimmed = content.trim();

  // 1. Try parsing as JSON first
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed) ? parsed : parsed.games || parsed.items || [];
      return list.map((item: any) => ({
        name: item.name || item.title || 'Untitled Game',
        yearPublished: item.yearPublished || item.year ? Number(item.yearPublished || item.year) : undefined,
        bggId: item.bggId ? String(item.bggId) : undefined,
        minPlayers: Number(item.minPlayers) || 1,
        maxPlayers: Number(item.maxPlayers) || 4,
        playingTime: Number(item.playingTime) || 60,
        bggRating: item.bggRating ? Number(item.bggRating) : undefined,
        status: normalizeStatus(item.status),
        purchasePrice: item.purchasePrice ? Number(item.purchasePrice) : undefined,
        lentToName: item.lentToName || item.lentTo || undefined,
        notes: item.notes || item.comment || undefined,
        thumbnail: item.thumbnail || item.image || undefined,
        selected: true,
      }));
    } catch {
      // Fallback to CSV parsing below
    }
  }

  // 2. Parse as CSV
  const rows = parseCSV(trimmed);
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  // Header index resolution
  const nameIdx = headers.findIndex((h) => ['name', 'objectname', 'title', 'gamename'].includes(h));
  const idIdx = headers.findIndex((h) => ['objectid', 'bggid', 'id'].includes(h));
  const yearIdx = headers.findIndex((h) => ['yearpublished', 'year', 'published'].includes(h));
  const ratingIdx = headers.findIndex((h) => ['rating', 'bggrating', 'average', 'userrating'].includes(h));
  const minPlayIdx = headers.findIndex((h) => ['minplayers', 'minplayer', 'min'].includes(h));
  const maxPlayIdx = headers.findIndex((h) => ['maxplayers', 'maxplayer', 'max'].includes(h));
  const playTimeIdx = headers.findIndex((h) => ['playingtime', 'playtime', 'duration', 'time'].includes(h));
  const statusIdx = headers.findIndex((h) => ['status', 'own', 'collectionstatus', 'ownership'].includes(h));
  const priceIdx = headers.findIndex((h) => ['purchaseprice', 'price', 'cost', 'buyprice'].includes(h));
  const lentIdx = headers.findIndex((h) => ['lentto', 'lenttoname', 'borrower', 'lent'].includes(h));
  const notesIdx = headers.findIndex((h) => ['notes', 'comment', 'description', 'memo'].includes(h));
  const thumbIdx = headers.findIndex((h) => ['thumbnail', 'image', 'cover', 'picture'].includes(h));

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
      // Check BGG specific boolean columns
      const ownIdx = headers.indexOf('own');
      const wishlistIdx = headers.indexOf('wishlist');
      const forTradeIdx = headers.indexOf('fortrade');
      if (wishlistIdx !== -1 && row[wishlistIdx] === '1') status = 'wishlist';
      else if (forTradeIdx !== -1 && row[forTradeIdx] === '1') status = 'sold';
      else if (ownIdx !== -1 && row[ownIdx] === '0') status = 'previously_owned';
    }

    items.push({
      name: name.trim(),
      bggId: idIdx !== -1 && row[idIdx] ? row[idIdx].trim() : undefined,
      yearPublished: yearIdx !== -1 && row[yearIdx] ? parseInt(row[yearIdx], 10) : undefined,
      bggRating: ratingIdx !== -1 && row[ratingIdx] ? Math.round(parseFloat(row[ratingIdx]) * 10) / 10 : undefined,
      minPlayers: minPlayIdx !== -1 && row[minPlayIdx] ? parseInt(row[minPlayIdx], 10) : 1,
      maxPlayers: maxPlayIdx !== -1 && row[maxPlayIdx] ? parseInt(row[maxPlayIdx], 10) : 4,
      playingTime: playTimeIdx !== -1 && row[playTimeIdx] ? parseInt(row[playTimeIdx], 10) : 60,
      status,
      purchasePrice: priceIdx !== -1 && row[priceIdx] ? parseFloat(row[priceIdx].replace(/[^0-9.]/g, '')) : undefined,
      lentToName: lentIdx !== -1 && row[lentIdx] ? row[lentIdx].trim() : undefined,
      notes: notesIdx !== -1 && row[notesIdx] ? row[notesIdx].trim() : undefined,
      thumbnail: thumbIdx !== -1 && row[thumbIdx] ? row[thumbIdx].trim() : undefined,
      selected: true,
    });
  }

  return items;
}

function normalizeStatus(val: string): GameStatus {
  if (!val) return 'own';
  const v = val.toLowerCase().trim();
  if (v.includes('lent') || v.includes('cho mượn') || v.includes('loaned')) return 'lent_out';
  if (v.includes('borrow') || v.includes('mượn')) return 'borrowed';
  if (v.includes('sold') || v.includes('bán') || v.includes('trade')) return 'sold';
  if (v.includes('wish') || v.includes('muốn mua')) return 'wishlist';
  if (v.includes('prev') || v.includes('từng')) return 'previously_owned';
  return 'own';
}
