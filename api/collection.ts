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

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-BGG-Token');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const username = (req.query?.username || '') as string;
  if (!username.trim()) {
    return res.status(400).json({ error: 'Parameter username is required' });
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
    const url = `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username.trim())}&own=1&stats=1`;

    let xml = '';
    // BGG often returns 202 while building collection
    for (let attempt = 0; attempt < 4; attempt++) {
      const bggRes = await fetch(url, { headers });

      if (bggRes.status === 401) {
        return res.status(401).json({
          error: 'BGG API requires authorization. Please configure your BGG Access Token in Settings.',
          requiresToken: true,
        });
      }

      if (bggRes.status === 202) {
        // Queue is processing, wait 2 seconds
        await sleep(2000);
        continue;
      }

      if (!bggRes.ok) {
        return res.status(bggRes.status).json({
          error: `BGG API returned HTTP ${bggRes.status}`,
        });
      }

      xml = await bggRes.text();
      break;
    }

    if (!xml) {
      return res.status(504).json({
        error: 'BGG collection is still queuing. Please try again in a few seconds.',
      });
    }

    const results: any[] = [];
    const itemRegex = /<item\s+[^>]*objectid="(\d+)"[^>]*>([\s\S]*?)<\/item>/gi;
    let match: RegExpExecArray | null;

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

      const thumbnail = thumbMatch ? thumbMatch[1].trim() : '';
      const image = imageMatch ? imageMatch[1].trim() : thumbnail;

      results.push({
        bggId,
        name: nameMatch ? decodeHtml(nameMatch[1].trim()) : 'Unknown Game',
        yearPublished: yearMatch ? parseInt(yearMatch[1], 10) : undefined,
        minPlayers: minPlayersMatch ? parseInt(minPlayersMatch[1], 10) : 1,
        maxPlayers: maxPlayersMatch ? parseInt(maxPlayersMatch[1], 10) : 4,
        playingTime: playTimeMatch ? parseInt(playTimeMatch[1], 10) : 60,
        bggRating: ratingMatch ? Math.round(parseFloat(ratingMatch[1]) * 10) / 10 : undefined,
        thumbnail,
        image,
      });
    }

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=1800');
    return res.status(200).json(results);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal proxy error' });
  }
}
