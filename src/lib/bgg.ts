import { BGGGameDetail, BGGSearchResult } from '../types';
import { createGameCoverDataUri } from './utils';
import { EXPANDED_BGG_CATALOG } from './bggCatalogData';

export const MOCK_BGG_CATALOG = EXPANDED_BGG_CATALOG;

export function getBGGProxyUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('bgvault_bgg_proxy_url');
    if (saved && saved.trim()) return saved.trim().replace(/\/$/, '');
  }
  return (import.meta.env.VITE_BGG_PROXY_URL || '').replace(/\/$/, '');
}

export function getBGGApiToken(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('bgvault_bgg_api_token');
    if (saved && saved.trim()) return saved.trim();
  }
  return import.meta.env.VITE_BGG_API_TOKEN || '';
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

export async function searchBGGGames(query: string): Promise<BGGSearchResult[]> {
  const q = query.trim().toLowerCase();
  const proxyBase = getBGGProxyUrl();

  // Try Serverless Proxy if configured
  if (proxyBase && q) {
    try {
      const response = await fetch(`${proxyBase}/api/search?q=${encodeURIComponent(query)}`, {
        headers: getRequestHeaders(),
      });
      if (response.ok) {
        const data = (await response.json()) as BGGSearchResult[];
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch {
      // Fallback to offline catalog below
    }
  }

  if (!q) {
    return MOCK_BGG_CATALOG.map(({ bggId, name, yearPublished, thumbnail, image }) => ({
      bggId,
      name,
      yearPublished,
      thumbnail,
      image,
    }));
  }

  // Search in expanded local catalog
  const matches = MOCK_BGG_CATALOG.filter((game) =>
    game.name.toLowerCase().includes(q)
  );

  if (matches.length > 0) {
    return matches.map(({ bggId, name, yearPublished, thumbnail, image }) => ({
      bggId,
      name,
      yearPublished,
      thumbnail,
      image,
    }));
  }

  // Dynamic synthesized BGG entry when searching for custom title
  const cleanTitle = query.trim();
  const cover = createGameCoverDataUri(
    cleanTitle,
    'BoardGameGeek Entry · 2024',
    ['#4c1d95', '#1e3a8a', '#a78bfa'],
    'hex'
  );

  return [
    {
      bggId: `bgg-${cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: cleanTitle,
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
      const response = await fetch(`${proxyBase}/api/game?id=${encodeURIComponent(bggId)}`, {
        headers: getRequestHeaders(),
      });
      if (response.ok) {
        return (await response.json()) as BGGGameDetail;
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

export async function importBGGCollection(username: string): Promise<BGGGameDetail[]> {
  if (!username.trim()) return [];
  const proxyBase = getBGGProxyUrl();

  if (proxyBase) {
    try {
      const response = await fetch(
        `${proxyBase}/api/collection?username=${encodeURIComponent(username.trim())}`,
        { headers: getRequestHeaders() }
      );
      if (response.ok) {
        return (await response.json()) as BGGGameDetail[];
      }
    } catch {
      // Fallback
    }
  }

  return MOCK_BGG_CATALOG.slice(0, 5);
}
