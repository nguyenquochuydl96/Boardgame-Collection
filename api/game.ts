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

  const id = (req.query?.id || req.query?.bggId || '') as string;
  if (!id.trim()) {
    return res.status(400).json({ error: 'Parameter id is required' });
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
    const url = `https://boardgamegeek.com/xmlapi2/thing?id=${encodeURIComponent(id.trim())}&stats=1`;
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
    const itemMatch = /<item\s+[^>]*id="(\d+)"[^>]*>([\s\S]*?)<\/item>/i.exec(xml);
    if (!itemMatch) {
      return res.status(404).json({ error: `Game with id ${id} not found` });
    }

    const bggId = itemMatch[1];
    const body = itemMatch[2];

    const primaryNameMatch = /<name\s+[^>]*type="primary"[^>]*value="([^"]+)"/i.exec(body);
    const fallbackNameMatch = /<name\s+[^>]*value="([^"]+)"/i.exec(body);
    const name = primaryNameMatch ? primaryNameMatch[1] : fallbackNameMatch ? fallbackNameMatch[1] : 'Unknown';

    const thumbMatch = /<thumbnail>([\s\S]*?)<\/thumbnail>/i.exec(body);
    const imageMatch = /<image>([\s\S]*?)<\/image>/i.exec(body);
    const thumbnail = thumbMatch ? thumbMatch[1].trim() : '';
    const image = imageMatch ? imageMatch[1].trim() : thumbnail;

    const descMatch = /<description>([\s\S]*?)<\/description>/i.exec(body);
    const description = descMatch ? decodeHtml(descMatch[1].trim()) : '';

    const yearMatch = /<yearpublished\s+[^>]*value="(\d+)"/i.exec(body);
    const minPlayMatch = /<minplayers\s+[^>]*value="(\d+)"/i.exec(body);
    const maxPlayMatch = /<maxplayers\s+[^>]*value="(\d+)"/i.exec(body);
    const playTimeMatch = /<playingtime\s+[^>]*value="(\d+)"/i.exec(body);
    const ratingMatch = /<ratings>[\s\S]*?<average\s+[^>]*value="([\d.]+)"/i.exec(body);

    const tags: string[] = [];
    const linkRegex = /<link\s+[^>]*type="(?:boardgamecategory|boardgamemechanic)"\s+[^>]*value="([^"]+)"/gi;
    let linkMatch: RegExpExecArray | null;
    while ((linkMatch = linkRegex.exec(body)) !== null) {
      tags.push(decodeHtml(linkMatch[1]));
    }

    const detail = {
      bggId,
      name: decodeHtml(name),
      yearPublished: yearMatch ? parseInt(yearMatch[1], 10) : undefined,
      minPlayers: minPlayMatch ? parseInt(minPlayMatch[1], 10) : 1,
      maxPlayers: maxPlayMatch ? parseInt(maxPlayMatch[1], 10) : 4,
      playingTime: playTimeMatch ? parseInt(playTimeMatch[1], 10) : 60,
      bggRating: ratingMatch ? Math.round(parseFloat(ratingMatch[1]) * 10) / 10 : undefined,
      description,
      thumbnail,
      image,
      tags: tags.slice(0, 6),
    };

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
    return res.status(200).json(detail);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal proxy error' });
  }
}
