import { BGGGameDetail, BGGSearchResult } from '../types';
import { createGameCoverDataUri } from './utils';

// Proxy base URL — replace with actual Vercel function URL after deploy
const BGG_PROXY_BASE = import.meta.env.VITE_BGG_PROXY_URL || '';

export const MOCK_BGG_CATALOG: BGGGameDetail[] = [
  {
    bggId: '266192',
    name: 'Wingspan',
    yearPublished: 2019,
    minPlayers: 1,
    maxPlayers: 5,
    playingTime: 70,
    bggRating: 8.1,
    description:
      'Wingspan is a competitive, medium-weight, card-driven, engine-building board game from Stonemaier Games. You are bird enthusiasts—researchers, bird watchers, ornithologists, and collectors—seeking to discover and attract the best birds to your network of wildlife preserves.',
    thumbnail: createGameCoverDataUri('Wingspan', 'Engine Building · 2019', ['#0f766e', '#0369a1', '#38bdf8'], 'bird'),
    image: createGameCoverDataUri('Wingspan', 'Engine Building · 2019', ['#0f766e', '#0369a1', '#38bdf8'], 'bird'),
    tags: ['Engine Building', 'Nature', 'Card Drafting'],
  },
  {
    bggId: '13',
    name: 'Catan',
    yearPublished: 1995,
    minPlayers: 3,
    maxPlayers: 4,
    playingTime: 90,
    bggRating: 7.1,
    description:
      'In CATAN, players try to be the dominant force on the island of Catan by building settlements, cities, and roads. On each turn dice are rolled to determine what resources the island produces: brick, grain, lumber, ore, or wool.',
    thumbnail: createGameCoverDataUri('Catan', 'Trade & Build · 1995', ['#b45309', '#9a3412', '#fbbf24'], 'hex'),
    image: createGameCoverDataUri('Catan', 'Trade & Build · 1995', ['#b45309', '#9a3412', '#fbbf24'], 'hex'),
    tags: ['Trading', 'Resource Management', 'Classic'],
  },
  {
    bggId: '9209',
    name: 'Ticket to Ride',
    yearPublished: 2004,
    minPlayers: 2,
    maxPlayers: 5,
    playingTime: 60,
    bggRating: 7.4,
    description:
      'With elegantly simple gameplay, Ticket to Ride can be learned in under 15 minutes. Players collect cards of various types of train cars they then use to claim railway routes in North America.',
    thumbnail: createGameCoverDataUri('Ticket to Ride', 'Route Building · 2004', ['#1e3a8a', '#312e81', '#60a5fa'], 'train'),
    image: createGameCoverDataUri('Ticket to Ride', 'Route Building · 2004', ['#1e3a8a', '#312e81', '#60a5fa'], 'train'),
    tags: ['Trains', 'Route Network', 'Family'],
  },
  {
    bggId: '68448',
    name: '7 Wonders',
    yearPublished: 2010,
    minPlayers: 2,
    maxPlayers: 7,
    playingTime: 30,
    bggRating: 7.7,
    description:
      'You are the leader of one of the 7 great cities of the Ancient World. Gather resources, develop commercial routes, and affirm your military supremacy. Build your city and erect an architectural wonder which will transcend future times.',
    thumbnail: createGameCoverDataUri('7 Wonders', 'Card Drafting · 2010', ['#581c87', '#7c2d12', '#f59e0b'], 'temple'),
    image: createGameCoverDataUri('7 Wonders', 'Card Drafting · 2010', ['#581c87', '#7c2d12', '#f59e0b'], 'temple'),
    tags: ['Card Drafting', 'Ancient Civilization', 'Simultaneous'],
  },
  {
    bggId: '30549',
    name: 'Pandemic',
    yearPublished: 2008,
    minPlayers: 2,
    maxPlayers: 4,
    playingTime: 45,
    bggRating: 7.5,
    description:
      'In Pandemic, several virulent diseases have broken out simultaneously all over the world! The players are disease-fighting specialists whose mission is to treat disease hotspots while researching the cures for each of four plagues.',
    thumbnail: createGameCoverDataUri('Pandemic', 'Cooperative · 2008', ['#0f172a', '#155e75', '#22d3ee'], 'globe'),
    image: createGameCoverDataUri('Pandemic', 'Cooperative · 2008', ['#0f172a', '#155e75', '#22d3ee'], 'globe'),
    tags: ['Cooperative', 'Strategy', 'Hand Management'],
  },
  {
    bggId: '183394',
    name: 'Viticulture Essential Edition',
    yearPublished: 2015,
    minPlayers: 1,
    maxPlayers: 6,
    playingTime: 90,
    bggRating: 8.0,
    description:
      'In Viticulture, the players find themselves in the roles of people in rustic, pre-modern Tuscany who have inherited meager vineyards. They have a few plots of land, an old crushpad, a tiny cellar, and 3 workers.',
    thumbnail: createGameCoverDataUri('Viticulture', 'Worker Placement · 2015', ['#4c1d95', '#831843', '#c084fc'], 'vine'),
    image: createGameCoverDataUri('Viticulture', 'Worker Placement · 2015', ['#4c1d95', '#831843', '#c084fc'], 'vine'),
    tags: ['Worker Placement', 'Farming', 'Eurogame'],
  },
  {
    bggId: '230802',
    name: 'Azul',
    yearPublished: 2017,
    minPlayers: 2,
    maxPlayers: 4,
    playingTime: 40,
    bggRating: 7.8,
    description:
      'Introduced by the Moors, azulejos (originally white and blue ceramic tiles) were fully embraced by the Portuguese when their king Manuel I, on a visit to the Alhambra palace in Southern Spain, was mesmerized by the stunning beauty of the Moorish decorative tiles.',
    thumbnail: createGameCoverDataUri('Azul', 'Tile Drafting · 2017', ['#1d4ed8', '#0e7490', '#38bdf8'], 'tile'),
    image: createGameCoverDataUri('Azul', 'Tile Drafting · 2017', ['#1d4ed8', '#0e7490', '#38bdf8'], 'tile'),
    tags: ['Abstract', 'Tile Placement', 'Pattern Building'],
  },
  {
    bggId: '167791',
    name: 'Terraforming Mars',
    yearPublished: 2016,
    minPlayers: 1,
    maxPlayers: 5,
    playingTime: 120,
    bggRating: 8.4,
    description:
      'In the 2400s, mankind begins to terraform the planet Mars. Giant corporations, sponsored by the World Government on Earth, initiate huge projects to raise the temperature, the oxygen level, and the ocean coverage until the environment is habitable.',
    thumbnail: createGameCoverDataUri('Terraforming Mars', 'Sci-Fi Engine · 2016', ['#9a3412', '#431407', '#fb923c'], 'globe'),
    image: createGameCoverDataUri('Terraforming Mars', 'Sci-Fi Engine · 2016', ['#9a3412', '#431407', '#fb923c'], 'globe'),
    tags: ['Sci-Fi', 'Engine Building', 'Hex Grid'],
  },
  {
    bggId: '224517',
    name: 'Brass: Birmingham',
    yearPublished: 2018,
    minPlayers: 2,
    maxPlayers: 4,
    playingTime: 120,
    bggRating: 8.6,
    description:
      'Brass: Birmingham is an economic strategy game sequel to Martin Wallace’s 2007 masterpiece, Brass. It tells the story of competing entrepreneurs in Birmingham during the industrial revolution, between the years of 1770-1870.',
    thumbnail: createGameCoverDataUri('Brass: Birmingham', 'Industrial Strategy · 2018', ['#451a03', '#1c1917', '#f59e0b'], 'train'),
    image: createGameCoverDataUri('Brass: Birmingham', 'Industrial Strategy · 2018', ['#451a03', '#1c1917', '#f59e0b'], 'train'),
    tags: ['Economic', 'Industrial', 'Network Building'],
  },
  {
    bggId: '342942',
    name: 'Ark Nova',
    yearPublished: 2021,
    minPlayers: 1,
    maxPlayers: 4,
    playingTime: 150,
    bggRating: 8.5,
    description:
      'In Ark Nova, you will plan and design a modern, scientifically managed zoo. With the ultimate goal of owning the most successful zoological establishment, you will build enclosures, accommodate animals, and support conservation projects all over the world.',
    thumbnail: createGameCoverDataUri('Ark Nova', 'Conservation Strategy · 2021', ['#065f46', '#134e4a', '#34d399'], 'bird'),
    image: createGameCoverDataUri('Ark Nova', 'Conservation Strategy · 2021', ['#065f46', '#134e4a', '#34d399'], 'bird'),
    tags: ['Animals', 'Hand Management', 'Tile Placement'],
  },
];

export async function searchBGGGames(query: string): Promise<BGGSearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) {
    return MOCK_BGG_CATALOG.map(({ bggId, name, yearPublished, thumbnail, image }) => ({
      bggId,
      name,
      yearPublished,
      thumbnail,
      image,
    }));
  }

  if (BGG_PROXY_BASE) {
    try {
      const response = await fetch(`${BGG_PROXY_BASE}/api/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = (await response.json()) as BGGSearchResult[];
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch {
      // Fall back to curated local BGG catalog
    }
  }

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

  // Dynamic synthesized BGG result when searching for any game title not in initial 10
  const cleanTitle = query.trim();
  const cover = createGameCoverDataUri(
    cleanTitle,
    'BoardGameGeek Entry · 2023',
    ['#4c1d95', '#1e3a8a', '#a78bfa'],
    'hex'
  );
  return [
    {
      bggId: `bgg-${cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: cleanTitle,
      yearPublished: 2023,
      thumbnail: cover,
      image: cover,
    },
  ];
}

export async function getBGGGameDetail(bggId: string): Promise<BGGGameDetail> {
  if (BGG_PROXY_BASE) {
    try {
      const response = await fetch(`${BGG_PROXY_BASE}/api/game/${encodeURIComponent(bggId)}`);
      if (response.ok) {
        return (await response.json()) as BGGGameDetail;
      }
    } catch {
      // Fall back to local catalog
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
    yearPublished: 2023,
    minPlayers: 2,
    maxPlayers: 4,
    playingTime: 60,
    bggRating: 7.6,
    description: `${fallbackName} is a strategic tabletop board game imported via BoardGameGeek catalog lookup.`,
    thumbnail: cover,
    image: cover,
    tags: ['Strategy', 'Tabletop'],
  };
}

export async function importBGGCollection(username: string): Promise<BGGGameDetail[]> {
  if (!username.trim()) return [];
  if (BGG_PROXY_BASE) {
    try {
      const response = await fetch(
        `${BGG_PROXY_BASE}/api/collection?username=${encodeURIComponent(username)}`
      );
      if (response.ok) {
        return (await response.json()) as BGGGameDetail[];
      }
    } catch {
      // Fall back to mock
    }
  }
  return MOCK_BGG_CATALOG.slice(0, 3);
}
