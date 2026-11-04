import type { IncomingMessage, ServerResponse } from 'http';

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#10;/g, '\n')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-BGG-Token');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const query = (req.query?.q || req.query?.query || '') as string;
  if (!query.trim()) {
    return res.status(400).json({ error: 'Parameter q is required' });
  }

  const token =
    req.headers['x-bgg-token'] ||
    (req.headers['authorization']?.replace(/^Bearer\s+/i, '')) ||
    req.query?.token ||
    process.env.BGG_API_TOKEN;

  const headers: Record<string, string> = {
    'User-Agent': 'BoardGameVaultApp/1.0 (+https://github.com/nguyenquochuydl96/Boardgame-Collection)',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const url = `https://boardgamegeek.com/xmlapi2/search?type=boardgame&query=${encodeURIComponent(query.trim())}`;
    const bggRes = await fetch(url, { headers });

    if (bggRes.status === 401) {
      return res.status(401).json({
        error: 'BGG API requires authorization. Please configure your BGG Access Token in Settings.',
        requiresToken: true,
      });
    }

    if (!bggRes.ok) {
      return res.status(bggRes.status).json({
        error: `BGG API returned HTTP ${bggRes.status}`,
      });
    }

    const xml = await bggRes.text();
    const results: Array<{ bggId: string; name: string; yearPublished?: number }> = [];
    const itemRegex = /<item\s+[^>]*id="(\d+)"[^>]*>([\s\S]*?)<\/item>/gi;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(xml)) !== null) {
      const bggId = match[1];
      const body = match[2];

      const primaryNameMatch = /<name\s+[^>]*type="primary"[^>]*value="([^"]+)"/i.exec(body);
      const fallbackNameMatch = /<name\s+[^>]*value="([^"]+)"/i.exec(body);
      const name = primaryNameMatch ? primaryNameMatch[1] : fallbackNameMatch ? fallbackNameMatch[1] : 'Unknown';

      const yearMatch = /<yearpublished\s+[^>]*value="(\d+)"/i.exec(body);
      const yearPublished = yearMatch ? parseInt(yearMatch[1], 10) : undefined;

      results.push({
        bggId,
        name: decodeHtml(name),
        yearPublished,
      });
    }

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
    return res.status(200).json(results);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal proxy error' });
  }
}
