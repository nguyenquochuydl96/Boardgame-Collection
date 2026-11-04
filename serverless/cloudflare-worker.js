/**
 * BoardGame Vault — Cloudflare Worker BGG Proxy
 *
 * Deploy for free on Cloudflare Workers (100,000 free requests/day):
 * 1. Log in to dash.cloudflare.com -> Workers & Pages -> Create Worker
 * 2. Paste this code into the editor and click Deploy
 * 3. (Optional) In Settings -> Variables, add BGG_API_TOKEN with your BGG Bearer token
 * 4. Copy your worker URL (e.g., https://bgg-proxy.yourname.workers.dev) and paste into BoardGame Vault Settings!
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-BGG-Token',
        },
      });
    }

    const token =
      request.headers.get('x-bgg-token') ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      url.searchParams.get('token') ||
      env.BGG_API_TOKEN;

    const bggHeaders = {
      'User-Agent': 'BoardGameVaultApp/1.0 (+https://github.com/nguyenquochuydl96/Boardgame-Collection)',
    };
    if (token) {
      bggHeaders['Authorization'] = `Bearer ${token}`;
    }

    // Router
    const pathname = url.pathname.replace(/\/$/, '');

    // 1. Search endpoint: /api/search?q=wingspan
    if (pathname === '/api/search' || pathname === '/search') {
      const q = url.searchParams.get('q') || url.searchParams.get('query');
      if (!q) {
        return jsonResponse({ error: 'Missing parameter q' }, 400);
      }
      const bggUrl = `https://boardgamegeek.com/xmlapi2/search?type=boardgame&query=${encodeURIComponent(q)}`;
      const res = await fetch(bggUrl, { headers: bggHeaders });
      if (res.status === 401) {
        return jsonResponse({ error: 'BGG Token Required (401)', requiresToken: true }, 401);
      }
      const xml = await res.text();
      const results = parseSearchXml(xml);
      return jsonResponse(results, 200, 86400);
    }

    // 2. Game detail endpoint: /api/game/:id or /api/game?id=13
    if (pathname.startsWith('/api/game') || pathname.startsWith('/game')) {
      const parts = pathname.split('/');
      const id = parts[parts.length - 1] === 'game' ? url.searchParams.get('id') : parts[parts.length - 1];
      if (!id) {
        return jsonResponse({ error: 'Missing game id' }, 400);
      }
      const bggUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${encodeURIComponent(id)}&stats=1`;
      const res = await fetch(bggUrl, { headers: bggHeaders });
      if (res.status === 401) {
        return jsonResponse({ error: 'BGG Token Required (401)', requiresToken: true }, 401);
      }
      const xml = await res.text();
      const detail = parseThingXml(xml, id);
      if (!detail) return jsonResponse({ error: 'Game not found' }, 404);
      return jsonResponse(detail, 200, 86400);
    }

    // 3. User collection endpoint: /api/collection?username=...
    if (pathname === '/api/collection' || pathname === '/collection') {
      const username = url.searchParams.get('username');
      if (!username) {
        return jsonResponse({ error: 'Missing parameter username' }, 400);
      }
      const bggUrl = `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}&own=1&stats=1`;

      let xml = '';
      for (let i = 0; i < 4; i++) {
        const res = await fetch(bggUrl, { headers: bggHeaders });
        if (res.status === 401) return jsonResponse({ error: 'BGG Token Required', requiresToken: true }, 401);
        if (res.status === 202) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        if (!res.ok) return jsonResponse({ error: `BGG status ${res.status}` }, res.status);
        xml = await res.text();
        break;
      }
      if (!xml) return jsonResponse({ error: 'BGG queue timed out' }, 504);
      const items = parseCollectionXml(xml);
      return jsonResponse(items, 200, 3600);
    }

    return jsonResponse({
      name: 'BoardGame Vault BGG Proxy',
      endpoints: ['/api/search?q={name}', '/api/game/{bggId}', '/api/collection?username={user}'],
    });
  },
};

function jsonResponse(data, status = 200, maxAge = 0) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-BGG-Token',
  };
  if (maxAge > 0) {
    headers['Cache-Control'] = `public, max-age=${maxAge}`;
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function decodeHtml(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#10;/g, '\n')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

function parseSearchXml(xml) {
  const results = [];
  const itemRegex = /<item\s+[^>]*id="(\d+)"[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const bggId = match[1];
    const body = match[2];
    const nameMatch = /<name\s+[^>]*type="primary"[^>]*value="([^"]+)"/i.exec(body) || /<name\s+[^>]*value="([^"]+)"/i.exec(body);
    const yearMatch = /<yearpublished\s+[^>]*value="(\d+)"/i.exec(body);
    results.push({
      bggId,
      name: nameMatch ? decodeHtml(nameMatch[1]) : 'Unknown',
      yearPublished: yearMatch ? parseInt(yearMatch[1], 10) : undefined,
    });
  }
  return results;
}

function parseThingXml(xml, fallbackId) {
  const itemMatch = /<item\s+[^>]*id="(\d+)"[^>]*>([\s\S]*?)<\/item>/i.exec(xml);
  if (!itemMatch) return null;
  const bggId = itemMatch[1] || fallbackId;
  const body = itemMatch[2];
  const nameMatch = /<name\s+[^>]*type="primary"[^>]*value="([^"]+)"/i.exec(body) || /<name\s+[^>]*value="([^"]+)"/i.exec(body);
  const thumbMatch = /<thumbnail>([\s\S]*?)<\/thumbnail>/i.exec(body);
  const imageMatch = /<image>([\s\S]*?)<\/image>/i.exec(body);
  const descMatch = /<description>([\s\S]*?)<\/description>/i.exec(body);
  const yearMatch = /<yearpublished\s+[^>]*value="(\d+)"/i.exec(body);
  const minPlayMatch = /<minplayers\s+[^>]*value="(\d+)"/i.exec(body);
  const maxPlayMatch = /<maxplayers\s+[^>]*value="(\d+)"/i.exec(body);
  const playTimeMatch = /<playingtime\s+[^>]*value="(\d+)"/i.exec(body);
  const ratingMatch = /<ratings>[\s\S]*?<average\s+[^>]*value="([\d.]+)"/i.exec(body);

  const tags = [];
  const linkRegex = /<link\s+[^>]*type="(?:boardgamecategory|boardgamemechanic)"\s+[^>]*value="([^"]+)"/gi;
  let lm;
  while ((lm = linkRegex.exec(body)) !== null) {
    tags.push(decodeHtml(lm[1]));
  }

  const thumb = thumbMatch ? thumbMatch[1].trim() : '';
  return {
    bggId,
    name: nameMatch ? decodeHtml(nameMatch[1]) : 'Unknown',
    yearPublished: yearMatch ? parseInt(yearMatch[1], 10) : undefined,
    minPlayers: minPlayMatch ? parseInt(minPlayMatch[1], 10) : 1,
    maxPlayers: maxPlayMatch ? parseInt(maxPlayMatch[1], 10) : 4,
    playingTime: playTimeMatch ? parseInt(playTimeMatch[1], 10) : 60,
    bggRating: ratingMatch ? Math.round(parseFloat(ratingMatch[1]) * 10) / 10 : undefined,
    description: descMatch ? decodeHtml(descMatch[1].trim()) : '',
    thumbnail: thumb,
    image: imageMatch ? imageMatch[1].trim() : thumb,
    tags: tags.slice(0, 6),
  };
}

function parseCollectionXml(xml) {
  const items = [];
  const itemRegex = /<item\s+[^>]*objectid="(\d+)"[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const bggId = match[1];
    const body = match[2];
    const nameMatch = /<name[^>]*>([\s\S]*?)<\/name>/i.exec(body);
    const thumbMatch = /<thumbnail>([\s\S]*?)<\/thumbnail>/i.exec(body);
    const imageMatch = /<image>([\s\S]*?)<\/image>/i.exec(body);
    const yearMatch = /<yearpublished>(\d+)<\/yearpublished>/i.exec(body);
    const minPlayersMatch = /<stats\s+[^>]*minplayers="(\d+)"/i.exec(body);
    const maxPlayersMatch = /<stats\s+[^>]*maxplayers="(\d+)"/i.exec(body);
    const playTimeMatch = /<stats\s+[^>]*playingtime="(\d+)"/i.exec(body);
    const ratingMatch = /<rating\s+[^>]*value="([\d.]+)"/i.exec(body) || /<average\s+[^>]*value="([\d.]+)"/i.exec(body);

    const thumb = thumbMatch ? thumbMatch[1].trim() : '';
    items.push({
      bggId,
      name: nameMatch ? decodeHtml(nameMatch[1].trim()) : 'Unknown Game',
      yearPublished: yearMatch ? parseInt(yearMatch[1], 10) : undefined,
      minPlayers: minPlayersMatch ? parseInt(minPlayersMatch[1], 10) : 1,
      maxPlayers: maxPlayersMatch ? parseInt(maxPlayersMatch[1], 10) : 4,
      playingTime: playTimeMatch ? parseInt(playTimeMatch[1], 10) : 60,
      bggRating: ratingMatch ? Math.round(parseFloat(ratingMatch[1]) * 10) / 10 : undefined,
      thumbnail: thumb,
      image: imageMatch ? imageMatch[1].trim() : thumb,
    });
  }
  return items;
}
