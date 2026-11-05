/**
 * Cloudflare Worker Proxy for BoardGameGeek XMLAPI2
 * Bypasses browser CORS restrictions and attaches BGG Bearer Authorization.
 * Free tier: 100,000 requests/day.
 */
export default {
  async fetch(request) {
    // 1. Handle CORS Preflight OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    try {
      const url = new URL(request.url);

      // Clean pathname: map /api/... endpoints to BGG XMLAPI2
      let bggPath = url.pathname;
      let queryString = url.search;

      if (bggPath.startsWith('/api/search') || bggPath === '/search') {
        const q = url.searchParams.get('query') || url.searchParams.get('q') || '';
        const exact = url.searchParams.get('exact');
        const type = url.searchParams.get('type') || 'boardgame,boardgameexpansion';
        bggPath = '/search';
        queryString = `?query=${encodeURIComponent(q)}&type=${type}${exact ? '&exact=' + exact : ''}`;
      } else if (bggPath.startsWith('/api/game') || bggPath === '/thing') {
        const id = url.searchParams.get('id') || '';
        const stats = url.searchParams.get('stats') || '1';
        bggPath = '/thing';
        // Keep commas unencoded for BGG multi-id batch support (e.g. 13,1797)
        const cleanIds = id.split(',').map((s) => s.trim()).filter(Boolean).join(',');
        queryString = `?id=${cleanIds}&stats=${stats}`;
      } else if (bggPath.startsWith('/api/collection') || bggPath === '/collection') {
        const username = url.searchParams.get('username') || '';
        bggPath = '/collection';
        queryString = `?username=${encodeURIComponent(username)}&stats=1`;
      }

      // Strip leading /xmlapi2 if present
      bggPath = bggPath.replace(/^\/xmlapi2/, '');
      if (!bggPath.startsWith('/')) bggPath = '/' + bggPath;

      const targetUrl = `https://boardgamegeek.com/xmlapi2${bggPath}${queryString}`;

      // Forward headers (including Bearer token)
      const headers = new Headers();
      const auth = request.headers.get('Authorization') || request.headers.get('X-BGG-Token');
      if (auth) {
        headers.set('Authorization', auth.startsWith('Bearer ') ? auth : `Bearer ${auth}`);
      }
      headers.set('User-Agent', 'BoardgameVault-App/1.0 (BGG-Approved)');

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers,
      });

      // Inject CORS headers for browser
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Access-Control-Allow-Origin', '*');
      newHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      newHeaders.set('Access-Control-Allow-Headers', '*');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};
