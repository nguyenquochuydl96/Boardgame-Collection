/**
 * Parse BGG XML search response into BGGSearchResult[]
 */
export function parseBGGSearchXml(xml: string): Array<{
  bggId: string;
  name: string;
  yearPublished?: number;
  thumbnail?: string;
  image?: string;
}> {
  const results: Array<{
    bggId: string;
    name: string;
    yearPublished?: number;
    thumbnail?: string;
    image?: string;
  }> = [];

  const itemRegex = /<item\s+[^>]*id="(\d+)"[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const bggId = match[1];
    const body = match[2];

    // Primary name
    const primaryNameMatch = /<name\s+[^>]*type="primary"[^>]*value="([^"]+)"/i.exec(body);
    const fallbackNameMatch = /<name\s+[^>]*value="([^"]+)"/i.exec(body);
    const name = primaryNameMatch ? primaryNameMatch[1] : fallbackNameMatch ? fallbackNameMatch[1] : 'Unknown Game';

    // Year published
    const yearMatch = /<yearpublished\s+[^>]*value="(\d+)"/i.exec(body);
    const yearPublished = yearMatch ? parseInt(yearMatch[1], 10) : undefined;

    results.push({
      bggId,
      name: decodeHtmlEntities(name),
      yearPublished,
    });
  }

  return results;
}

/**
 * Parse BGG XML thing response into BGGGameDetail
 */
export function parseBGGThingXml(xml: string, requestedId?: string): {
  bggId: string;
  name: string;
  yearPublished?: number;
  minPlayers: number;
  maxPlayers: number;
  playingTime: number;
  bggRating?: number;
  description: string;
  thumbnail: string;
  image: string;
  tags: string[];
} | null {
  const itemMatch = /<item\s+[^>]*id="(\d+)"[^>]*>([\s\S]*?)<\/item>/i.exec(xml);
  if (!itemMatch) return null;

  const bggId = itemMatch[1] || requestedId || '';
  const body = itemMatch[2];

  // Name
  const primaryNameMatch = /<name\s+[^>]*type="primary"[^>]*value="([^"]+)"/i.exec(body);
  const fallbackNameMatch = /<name\s+[^>]*value="([^"]+)"/i.exec(body);
  const name = primaryNameMatch ? primaryNameMatch[1] : fallbackNameMatch ? fallbackNameMatch[1] : 'Unknown Game';

  // Thumbnail & Image
  const thumbMatch = /<thumbnail>([\s\S]*?)<\/thumbnail>/i.exec(body);
  const imageMatch = /<image>([\s\S]*?)<\/image>/i.exec(body);
  const thumbnail = thumbMatch ? thumbMatch[1].trim() : '';
  const image = imageMatch ? imageMatch[1].trim() : thumbnail;

  // Description
  const descMatch = /<description>([\s\S]*?)<\/description>/i.exec(body);
  const description = descMatch ? decodeHtmlEntities(descMatch[1].trim()) : '';

  // Numbers
  const yearMatch = /<yearpublished\s+[^>]*value="(\d+)"/i.exec(body);
  const minPlayMatch = /<minplayers\s+[^>]*value="(\d+)"/i.exec(body);
  const maxPlayMatch = /<maxplayers\s+[^>]*value="(\d+)"/i.exec(body);
  const playTimeMatch = /<playingtime\s+[^>]*value="(\d+)"/i.exec(body);
  const ratingMatch = /<ratings>[\s\S]*?<average\s+[^>]*value="([\d.]+)"/i.exec(body);

  // Tags (categories & mechanics)
  const tags: string[] = [];
  const linkRegex = /<link\s+[^>]*type="(?:boardgamecategory|boardgamemechanic)"\s+[^>]*value="([^"]+)"/gi;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = linkRegex.exec(body)) !== null) {
    tags.push(decodeHtmlEntities(linkMatch[1]));
  }

  return {
    bggId,
    name: decodeHtmlEntities(name),
    yearPublished: yearMatch ? parseInt(yearMatch[1], 10) : undefined,
    minPlayers: minPlayMatch ? parseInt(minPlayMatch[1], 10) : 1,
    maxPlayers: maxPlayMatch ? parseInt(maxPlayMatch[1], 10) : 4,
    playingTime: playTimeMatch ? parseInt(playTimeMatch[1], 10) : 60,
    bggRating: ratingMatch ? Math.round(parseFloat(ratingMatch[1]) * 10) / 10 : undefined,
    description,
    thumbnail,
    image,
    tags: tags.slice(0, 5),
  };
}

/**
 * Parse BGG XML collection response
 */
export function parseBGGCollectionXml(xml: string): Array<{
  bggId: string;
  name: string;
  yearPublished?: number;
  minPlayers: number;
  maxPlayers: number;
  playingTime: number;
  bggRating?: number;
  thumbnail: string;
  image: string;
  numPlays?: number;
}> {
  const results: Array<{
    bggId: string;
    name: string;
    yearPublished?: number;
    minPlayers: number;
    maxPlayers: number;
    playingTime: number;
    bggRating?: number;
    thumbnail: string;
    image: string;
    numPlays?: number;
  }> = [];

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
    const numPlaysMatch = /<numplays>(\d+)<\/numplays>/i.exec(body);

    const thumbnail = thumbMatch ? thumbMatch[1].trim() : '';
    const image = imageMatch ? imageMatch[1].trim() : thumbnail;

    results.push({
      bggId,
      name: nameMatch ? decodeHtmlEntities(nameMatch[1].trim()) : 'Unknown Game',
      yearPublished: yearMatch ? parseInt(yearMatch[1], 10) : undefined,
      minPlayers: minPlayersMatch ? parseInt(minPlayersMatch[1], 10) : 1,
      maxPlayers: maxPlayersMatch ? parseInt(maxPlayersMatch[1], 10) : 4,
      playingTime: playTimeMatch ? parseInt(playTimeMatch[1], 10) : 60,
      bggRating: ratingMatch ? Math.round(parseFloat(ratingMatch[1]) * 10) / 10 : undefined,
      thumbnail,
      image,
      numPlays: numPlaysMatch ? parseInt(numPlaysMatch[1], 10) : 0,
    });
  }

  return results;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#10;/g, '\n')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}
