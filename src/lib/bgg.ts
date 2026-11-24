import { BGGGameDetail, BGGSearchResult } from '../types';
import { createGameCoverDataUri } from './utils';
import { EXPANDED_BGG_CATALOG } from './bggCatalogData';

export const MOCK_BGG_CATALOG = EXPANDED_BGG_CATALOG;

export function getBGGProxyUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('bgvault_bgg_proxy_url');
    if (saved && saved.trim()) return saved.trim().replace(/\/$/, '');
  }
  return (import.meta.env?.VITE_BGG_PROXY_URL || '').replace(/\/$/, '');
}

export function getBGGApiToken(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('bgvault_bgg_api_token');
    if (saved && saved.trim()) return saved.trim();
  }
  return import.meta.env?.VITE_BGG_API_TOKEN || '';
}

export function saveBGGSettings(proxyUrl: string, apiToken: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('bgvault_bgg_proxy_url', proxyUrl.trim());
    localStorage.setItem('bgvault_bgg_api_token', apiToken.trim());
  }
}

function getRequestHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = getBGGApiToken();
  if (token) {
    headers['X-BGG-Token'] = token;
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

const thumbnailCache = new Map<string, { thumbnail?: string; image?: string }>();

/**
 * Batch fetch thumbnails & images from BGG XMLAPI2 /thing?id=... endpoint
 * BGG natively supports comma-separated IDs in a single HTTP request!
 */
async function fetchBatchThumbnails(
  bggIds: string[],
  signal?: AbortSignal
): Promise<Map<string, { thumbnail?: string; image?: string }>> {
  const results = new Map<string, { thumbnail?: string; image?: string }>();
  if (!bggIds.length) return results;

  const missingIds: string[] = [];
  bggIds.forEach((id) => {
    if (thumbnailCache.has(id)) {
      results.set(id, thumbnailCache.get(id)!);
    } else if (/^\d+$/.test(id)) {
      missingIds.push(id);
    }
  });

  if (!missingIds.length) return results;

  const proxyBase = getBGGProxyUrl();
  if (!proxyBase) return results;

  try {
    const isXmlApi = proxyBase.includes('xmlapi2') || !proxyBase.includes('/api');
    // Multi-IDs for BGG should have unencoded commas
    const idsParam = missingIds.slice(0, 20).join(',');
    const thingUrl = isXmlApi
      ? `${proxyBase}/thing?id=${idsParam}`
      : `${proxyBase}/api/game?id=${idsParam}`;

    const response = await fetch(thingUrl, {
      headers: getRequestHeaders(),
      signal,
    });

    if (response.ok) {
      const text = await response.text();
      if (typeof window !== 'undefined' && window.DOMParser) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/xml');
        const items = doc.querySelectorAll('item');

        items.forEach((item) => {
          const id = item.getAttribute('id');
          if (!id) return;
          const thumbEl = item.querySelector('thumbnail');
          const imageEl = item.querySelector('image');
          const thumbnail = thumbEl?.textContent?.trim() || imageEl?.textContent?.trim() || '';
          const image = imageEl?.textContent?.trim() || thumbEl?.textContent?.trim() || '';

          const data = { thumbnail, image };
          thumbnailCache.set(id, data);
          results.set(id, data);
        });
      }
    }
  } catch (err: any) {
    if (err?.name !== 'AbortError') {
      console.warn('Batch fetch thumbnails failed:', err);
    }
  }

  return results;
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const d: number[][] = [];
  for (let i = 0; i <= b.length; i++) d[i] = [i];
  for (let j = 0; j <= a.length; j++) d[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      d[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
        ? d[i - 1][j - 1]
        : Math.min(d[i - 1][j - 1] + 1, d[i][j - 1] + 1, d[i - 1][j] + 1);
    }
  }
  return d[b.length][a.length];
}

/**
 * Checks if query words fuzzily match target words (allowing typos like earthbone -> earthborne)
 */
export function isFuzzyMatch(query: string, target: string): boolean {
  const cleanQ = query.trim().toLowerCase();
  // Fast skip: queries shorter than 3 characters should only use direct substring matching
  if (cleanQ.length < 3) return false;

  const qWords = cleanQ.split(/\s+/).filter(Boolean);
  const tWords = target.toLowerCase().split(/\s+/).filter(Boolean);
  if (!qWords.length) return false;

  return qWords.every((qw) =>
    tWords.some((tw) => {
      if (tw.includes(qw) || qw.includes(tw)) return true;
      if (qw.length < 3) return false;
      const maxDist = qw.length >= 6 ? 2 : 1;
      return levenshteinDistance(qw, tw) <= maxDist;
    })
  );
}

/**
 * Intelligent ranking: sorts exact title matches to the top,
 * followed by prefix matches, and eliminates completely unrelated matches.
 */
export function rankAndSortBGGResults(results: BGGSearchResult[], query: string): BGGSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return results;

  const escapeRegex = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const wordRegex = new RegExp(`\\b${escapeRegex(q)}\\b`, 'i');

  const scored = results.map((item) => {
    const title = item.name.toLowerCase();
    let score = 0;

    if (title === q) {
      // 1. Exact match on full title
      score = 1000;
    } else if (title.startsWith(q + ':') || title.startsWith(q + ' -') || title.startsWith(q + ' ')) {
      // 2. Starts with query as a prefix
      score = 800 - Math.min(title.length, 100);
    } else if (title.startsWith(q)) {
      // 3. Starts with query letters
      score = 700 - Math.min(title.length, 100);
    } else if (wordRegex.test(title)) {
      // 4. Query is a whole word inside title
      score = 500 - Math.min(title.length, 100);
    } else if (isFuzzyMatch(q, title)) {
      // 5. Typo-tolerant fuzzy match (e.g. earthbone ranger -> Earthborne Rangers)
      score = 450 - Math.min(title.length, 100);
    } else if (title.includes(q)) {
      // 6. Query is a substring of title
      score = 300 - Math.min(title.length, 100);
    } else {
      // 7. Matched by BGG alternate names or foreign versions
      score = 50;
    }

    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // If we have title matches (score >= 300), filter out random alternate-name matches
  const goodMatches = scored.filter((s) => s.score >= 300);
  if (goodMatches.length > 0) {
    return goodMatches.map((s) => s.item);
  }

  // If query is a multi-word phrase and nothing matched the title, do not show unrelated single-word hits
  if (q.includes(' ')) {
    return [];
  }

  return scored.map((s) => s.item);
}

/**
 * Parses raw XML returned by BGG XMLAPI2 /search endpoint
 */
function parseBGGSearchXml(xmlText: string): BGGSearchResult[] {
  try {
    if (typeof window === 'undefined' || !window.DOMParser) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const items = doc.querySelectorAll('item');
    const results: BGGSearchResult[] = [];

    items.forEach((item) => {
      const bggId = item.getAttribute('id') || '';
      const nameEl = item.querySelector('name[type="primary"]') || item.querySelector('name');
      const name = nameEl?.getAttribute('value') || 'Untitled';
      const yearEl = item.querySelector('yearpublished');
      const yearPublished = yearEl ? Number(yearEl.getAttribute('value')) || 2024 : 2024;

      // Check if we have cover in local catalog or memory cache
      const cached = thumbnailCache.get(bggId);
      const localMatch = EXPANDED_BGG_CATALOG.find((g) => g.bggId === bggId);

      results.push({
        bggId,
        name,
        yearPublished,
        thumbnail: cached?.thumbnail || localMatch?.thumbnail,
        image: cached?.image || localMatch?.image,
      });
    });

    return results;
  } catch {
    return [];
  }
}

/**
 * Decodes HTML/XML entities commonly returned by BoardGameGeek descriptions and titles.
 */
export function decodeHtml(input: string): string {
  if (!input) return '';
  const namedEntities: Record<string, string> = {
    '&amp;': '&',
    '&quot;': '"',
    '&apos;': "'",
    '&#39;': "'",
    '&#039;': "'",
    '&rsquo;': '’',
    '&lsquo;': '‘',
    '&rdquo;': '”',
    '&ldquo;': '“',
    '&mdash;': '—',
    '&ndash;': '–',
    '&hellip;': '…',
    '&nbsp;': ' ',
    '&lt;': '<',
    '&gt;': '>',
  };

  return input
    .replace(/&#10;|&#x0*a;/gi, '\n')
    .replace(/&#13;|&#x0*d;/gi, '')
    .replace(
      /&(?:amp|quot|apos|#39|#039|rsquo|lsquo|rdquo|ldquo|mdash|ndash|hellip|nbsp|lt|gt);/gi,
      (entity) => namedEntities[entity.toLowerCase()] ?? entity
    )
    .replace(/&#(\d+);/g, (_match, dec) => {
      const code = Number(dec);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : _match;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : _match;
    });
}

/**
 * Parses raw XML returned by BGG XMLAPI2 /thing endpoint
 */
function parseBGGThingXml(xmlText: string, bggId: string): BGGGameDetail | null {
  try {
    if (typeof window === 'undefined' || !window.DOMParser) return null;
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const item = doc.querySelector('item');
    if (!item) return null;

    const nameEl = item.querySelector('name[type="primary"]') || item.querySelector('name');
    const name = nameEl?.getAttribute('value') || 'Untitled';
    const yearEl = item.querySelector('yearpublished');
    const yearPublished = yearEl ? Number(yearEl.getAttribute('value')) || 2024 : 2024;
    const thumbEl = item.querySelector('thumbnail');
    const imageEl = item.querySelector('image');
    const descEl = item.querySelector('description');
    const minPlayersEl = item.querySelector('minplayers');
    const maxPlayersEl = item.querySelector('maxplayers');
    const playTimeEl = item.querySelector('playingtime');
    const ratingEl = item.querySelector('ratings > average');

    const thumbnail = thumbEl?.textContent?.trim() || imageEl?.textContent?.trim() || '';
    const image = imageEl?.textContent?.trim() || thumbEl?.textContent?.trim() || '';
    const description = decodeHtml(descEl?.textContent || '');
    const decodedName = decodeHtml(name);
    const minPlayers = minPlayersEl ? Number(minPlayersEl.getAttribute('value')) || 1 : 1;
    const maxPlayers = maxPlayersEl ? Number(maxPlayersEl.getAttribute('value')) || 4 : 4;
    const playingTime = playTimeEl ? Number(playTimeEl.getAttribute('value')) || 60 : 60;
    const bggRating = ratingEl ? Math.round(Number(ratingEl.getAttribute('value')) * 10) / 10 : 7.5;

    if (thumbnail || image) {
      thumbnailCache.set(bggId, { thumbnail, image });
    }

    const tags: string[] = [];
    const linkEls = item.querySelectorAll('link[type="boardgamecategory"], link[type="boardgamemechanic"]');
    linkEls.forEach((link) => {
      const val = link.getAttribute('value');
      if (val) tags.push(decodeHtml(val.trim()));
    });

    return {
      bggId,
      name: decodedName,
      yearPublished,
      minPlayers,
      maxPlayers,
      playingTime,
      bggRating,
      description,
      thumbnail,
      image,
      tags: tags.length > 0 ? tags.slice(0, 10) : ['Strategy', 'Boardgame'],
    };
  } catch {
    return null;
  }
}

function parseBGGSearchResponse(text: string): BGGSearchResult[] {
  const trimmed = text.trim();
  if (trimmed.startsWith('<')) {
    return parseBGGSearchXml(trimmed);
  }
  try {
    const json = JSON.parse(trimmed);
    if (Array.isArray(json)) return json;
    if (json.items && Array.isArray(json.items)) return json.items;
  } catch {
    //
  }
  return [];
}

function parseBGGDetailResponse(text: string, bggId: string): BGGGameDetail | null {
  const trimmed = text.trim();
  if (trimmed.startsWith('<')) {
    return parseBGGThingXml(trimmed, bggId);
  }
  try {
    const json = JSON.parse(trimmed);
    if (json && json.name) return json;
  } catch {
    //
  }
  return null;
}

/**
 * Fast synchronous search in local 118+ classic game catalog (0ms delay)
 */
export function searchLocalBGG(query: string): BGGSearchResult[] {
  const cleanQ = query.trim();
  const q = cleanQ.toLowerCase();
  if (!q) {
    return EXPANDED_BGG_CATALOG.slice(0, 15).map(({ bggId, name, yearPublished, thumbnail, image }) => ({
      bggId,
      name,
      yearPublished,
      thumbnail,
      image,
    }));
  }

  // 1. Direct substring match
  const direct = EXPANDED_BGG_CATALOG.filter((game) =>
    game.name.toLowerCase().includes(q)
  );

  // 2. Fuzzy match if direct is empty (handles typos like "earthbone ranger" -> "Earthborne Rangers")
  const pool = direct.length > 0
    ? direct
    : EXPANDED_BGG_CATALOG.filter((game) => isFuzzyMatch(cleanQ, game.name));

  const matches = pool.map(({ bggId, name, yearPublished, thumbnail, image }) => ({
    bggId,
    name,
    yearPublished,
    thumbnail,
    image,
  }));

  return rankAndSortBGGResults(matches, cleanQ).slice(0, 15);
}

export async function searchBGGGames(query: string, signal?: AbortSignal): Promise<BGGSearchResult[]> {
  const cleanQ = query.trim();
  const q = cleanQ.toLowerCase();
  const proxyBase = getBGGProxyUrl();

  // 1. Try Live Serverless / Cloudflare Worker Proxy if configured
  if (proxyBase && q) {
    try {
      const isXmlApi = proxyBase.includes('xmlapi2') || !proxyBase.includes('/api');
      const searchUrl = isXmlApi
        ? `${proxyBase}/search?query=${encodeURIComponent(cleanQ)}&type=boardgame,boardgameexpansion`
        : `${proxyBase}/api/search?q=${encodeURIComponent(cleanQ)}`;

      const response = await fetch(searchUrl, {
        headers: getRequestHeaders(),
        signal,
      });

      if (response.ok) {
        const text = await response.text();
        const rawResults = parseBGGSearchResponse(text);

        // Also merge in local catalog games matching query (direct or fuzzy)
        const localDirect = EXPANDED_BGG_CATALOG.filter((g) =>
          g.name.toLowerCase().includes(q)
        );
        const localPool = localDirect.length > 0
          ? localDirect
          : EXPANDED_BGG_CATALOG.filter((g) => isFuzzyMatch(cleanQ, g.name));

        const localMatches = localPool.map(({ bggId, name, yearPublished, thumbnail, image }) => ({
          bggId,
          name,
          yearPublished,
          thumbnail,
          image,
        }));

        // Combine unique by bggId
        const combinedMap = new Map<string, BGGSearchResult>();
        rawResults.forEach((r) => combinedMap.set(r.bggId, r));
        localMatches.forEach((m) => {
          if (!combinedMap.has(m.bggId)) {
            combinedMap.set(m.bggId, m);
          } else if (m.thumbnail && !combinedMap.get(m.bggId)!.thumbnail) {
            // Enrich with local thumbnail if missing
            combinedMap.get(m.bggId)!.thumbnail = m.thumbnail;
            combinedMap.get(m.bggId)!.image = m.image;
          }
        });

        const combinedList = Array.from(combinedMap.values());
        if (combinedList.length > 0) {
          // Rank so exact title matches appear first
          const ranked = rankAndSortBGGResults(combinedList, cleanQ).slice(0, 15);

          // Find items still missing thumbnail and batch fetch from BGG /thing endpoint
          const missingThumbnailIds = ranked
            .filter((item) => !item.thumbnail && /^\d+$/.test(item.bggId))
            .map((item) => item.bggId);

          if (missingThumbnailIds.length > 0) {
            const fetchedThumbs = await fetchBatchThumbnails(missingThumbnailIds, signal);
            ranked.forEach((item) => {
              const thumbData = fetchedThumbs.get(item.bggId);
              if (thumbData?.thumbnail) {
                item.thumbnail = thumbData.thumbnail;
                item.image = thumbData.image || thumbData.thumbnail;
              }
            });
          }

          if (ranked.length > 0) {
            return ranked;
          }
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw err;
      }
      console.warn('Live BGG search error, falling back to offline catalog:', err);
    }
  }

  // 2. Search local expanded BGG catalog (118+ classic games)
  if (!q) {
    return MOCK_BGG_CATALOG.slice(0, 15).map(({ bggId, name, yearPublished, thumbnail, image }) => ({
      bggId,
      name,
      yearPublished,
      thumbnail,
      image,
    }));
  }

  // Search in expanded local catalog with ranking (direct or fuzzy)
  const localDirect = MOCK_BGG_CATALOG.filter((game) =>
    game.name.toLowerCase().includes(q)
  );
  const localPool = localDirect.length > 0
    ? localDirect
    : MOCK_BGG_CATALOG.filter((game) => isFuzzyMatch(cleanQ, game.name));

  if (localPool.length > 0) {
    const mapped = localPool.map(({ bggId, name, yearPublished, thumbnail, image }) => ({
      bggId,
      name,
      yearPublished,
      thumbnail,
      image,
    }));
    return rankAndSortBGGResults(mapped, cleanQ);
  }

  // 3. Dynamic synthesized BGG entry when searching for custom title
  const cover = createGameCoverDataUri(
    cleanQ,
    'BoardGameGeek Entry · 2024',
    ['#4c1d95', '#1e3a8a', '#a78bfa'],
    'hex'
  );

  return [
    {
      bggId: `bgg-${cleanQ.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: cleanQ,
      yearPublished: 2024,
      thumbnail: cover,
      image: cover,
    },
  ];
}

export async function getBGGGameDetail(bggId: string): Promise<BGGGameDetail> {
  const proxyBase = getBGGProxyUrl();

  if (proxyBase) {
    try {
      const isXmlApi = proxyBase.includes('xmlapi2') || !proxyBase.includes('/api');
      const thingUrl = isXmlApi
        ? `${proxyBase}/thing?id=${encodeURIComponent(bggId)}&stats=1`
        : `${proxyBase}/api/game?id=${encodeURIComponent(bggId)}`;

      const response = await fetch(thingUrl, {
        headers: getRequestHeaders(),
      });
      if (response.ok) {
        const text = await response.text();
        const detail = parseBGGDetailResponse(text, bggId);
        if (detail) return detail;
      }
    } catch {
      // Fallback
    }
  }

  const found = MOCK_BGG_CATALOG.find((g) => g.bggId === bggId);
  if (found) return found;

  const fallbackName = bggId
    .replace(/^bgg-/, '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  const cover = createGameCoverDataUri(
    fallbackName || 'Custom Boardgame',
    'Tabletop Strategy',
    ['#4c1d95', '#1e3a8a', '#a78bfa'],
    'hex'
  );

  return {
    bggId,
    name: fallbackName || 'Custom Boardgame',
    yearPublished: 2024,
    minPlayers: 2,
    maxPlayers: 4,
    playingTime: 60,
    bggRating: 7.6,
    description: `${fallbackName} is a strategic tabletop board game imported via BoardGameGeek lookup.`,
    thumbnail: cover,
    image: cover,
    tags: ['Strategy', 'Tabletop'],
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ImportBGGCollectionOptions {
  maxRetries?: number;
  retryDelayMs?: number;
}

export async function importBGGCollection(
  username: string,
  options: ImportBGGCollectionOptions = {}
): Promise<BGGGameDetail[]> {
  const cleanUser = username.trim();
  if (!cleanUser) {
    throw new Error('Please enter a valid BoardGameGeek username.');
  }

  const proxyBase = getBGGProxyUrl();
  if (!proxyBase) {
    throw new Error(
      'BGG API Proxy is not configured. Open BGG API Settings in the sidebar or menu to set your proxy URL before importing.'
    );
  }

  const isXmlApi = proxyBase.includes('xmlapi2') || !proxyBase.includes('/api');
  const collUrl = isXmlApi
    ? `${proxyBase}/collection?username=${encodeURIComponent(cleanUser)}&stats=1`
    : `${proxyBase}/api/collection?username=${encodeURIComponent(cleanUser)}`;

  const maxRetries = options.maxRetries ?? 4;
  const baseRetryDelayMs = options.retryDelayMs ?? 1500;

  let response: Response | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      response = await fetch(collUrl, { headers: getRequestHeaders() });
    } catch (err) {
      throw new Error(
        `Network error connecting to BGG proxy for "${cleanUser}": ${
          err instanceof Error ? err.message : 'Request failed'
        }`
      );
    }

    if (response.status === 202) {
      if (attempt < maxRetries) {
        await delay(baseRetryDelayMs * (attempt + 1));
        continue;
      }
      throw new Error(
        `BoardGameGeek is still preparing "${cleanUser}"'s collection (HTTP 202 Accepted). Please try again in a few seconds.`
      );
    }

    break;
  }

  if (!response || !response.ok) {
    const statusText = response ? `HTTP ${response.status}` : 'No response';
    throw new Error(
      `Failed to fetch BGG collection for "${cleanUser}" (${statusText}). Check the username or your BGG API proxy settings.`
    );
  }

  const text = await response.text();
  const trimmed = text.trim();

  if (trimmed.startsWith('<')) {
    if (typeof window === 'undefined' || !window.DOMParser) {
      throw new Error('XML parser is unavailable in this environment.');
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(trimmed, 'text/xml');

    const errorMsg = doc.querySelector('errors > error > message')?.textContent?.trim();
    if (errorMsg) {
      throw new Error(`BoardGameGeek error: ${decodeHtml(errorMsg)}`);
    }

    const items = doc.querySelectorAll('item');
    const results: BGGGameDetail[] = [];
    items.forEach((item) => {
      const bggId = item.getAttribute('objectid') || '';
      const name = decodeHtml(item.querySelector('name')?.textContent || 'Untitled');
      const yearPublished = Number(item.querySelector('yearpublished')?.textContent) || 2020;
      const thumbnail = item.querySelector('thumbnail')?.textContent?.trim() || '';
      const image = item.querySelector('image')?.textContent?.trim() || '';
      const stats = item.querySelector('stats');
      const minPlayers = Number(stats?.getAttribute('minplayers')) || 1;
      const maxPlayers = Number(stats?.getAttribute('maxplayers')) || 4;
      const playingTime = Number(stats?.getAttribute('playingtime')) || 60;
      const rating = Number(stats?.querySelector('rating > average')?.getAttribute('value')) || 7.5;

      results.push({
        bggId,
        name,
        yearPublished,
        minPlayers,
        maxPlayers,
        playingTime,
        bggRating: Math.round(rating * 10) / 10,
        description: `${name} from ${cleanUser}'s BGG Collection.`,
        thumbnail,
        image,
        tags: ['Strategy'],
      });
    });

    return results;
  }

  try {
    const parsed = JSON.parse(trimmed) as BGGGameDetail[] | { items?: BGGGameDetail[]; error?: string };
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.items)) return parsed.items;
    if (parsed && typeof parsed.error === 'string') {
      throw new Error(parsed.error);
    }
  } catch (err) {
    if (err instanceof Error && !err.message.includes('JSON')) {
      throw err;
    }
    throw new Error(`Unexpected response format returned by BGG proxy for "${cleanUser}".`);
  }

  return [];
}

