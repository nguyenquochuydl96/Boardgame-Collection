import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BoardGame } from '../types';
import { createGameCoverDataUri, generateId } from '../lib/utils';

export const INITIAL_GAMES: BoardGame[] = [
  {
    id: 'game-wingspan',
    bggId: '266192',
    name: 'Wingspan',
    thumbnail: createGameCoverDataUri('Wingspan', 'Engine Building · 2019', ['#0f766e', '#0369a1', '#38bdf8'], 'bird'),
    image: createGameCoverDataUri('Wingspan', 'Engine Building · 2019', ['#0f766e', '#0369a1', '#38bdf8'], 'bird'),
    description:
      'Wingspan is a competitive, medium-weight, card-driven, engine-building board game from Stonemaier Games. Attract the best birds to your network of wildlife preserves across forest, grassland, and wetland habitats.',
    minPlayers: 1,
    maxPlayers: 5,
    playingTime: 70,
    yearPublished: 2019,
    bggRating: 8.1,
    status: 'own',
    purchasePrice: 1450000,
    addedDate: '2026-04-12T10:00:00.000Z',
    notes: 'Includes European Expansion cards sleeved in matte clear sleeves. Favorite Sunday afternoon engine builder.',
    tags: ['Engine Building', 'Nature', 'Card Drafting'],
  },
  {
    id: 'game-catan',
    bggId: '13',
    name: 'Catan',
    thumbnail: createGameCoverDataUri('Catan', 'Trade & Build · 1995', ['#b45309', '#9a3412', '#fbbf24'], 'hex'),
    image: createGameCoverDataUri('Catan', 'Trade & Build · 1995', ['#b45309', '#9a3412', '#fbbf24'], 'hex'),
    description:
      'Players try to be the dominant force on the island of Catan by building settlements, cities, and roads while trading sheep, wood, brick, ore, and wheat.',
    minPlayers: 3,
    maxPlayers: 4,
    playingTime: 90,
    yearPublished: 1995,
    bggRating: 7.1,
    status: 'lent_out',
    purchasePrice: 1150000,
    lentToName: 'Minh Quân',
    lentDate: '2026-10-18T09:00:00.000Z',
    addedDate: '2026-01-20T10:00:00.000Z',
    notes: 'Lent to Minh Quân for his Da Lat cabin trip. Custom wooden robber token inside.',
    tags: ['Trading', 'Resource Management', 'Gateway'],
  },
  {
    id: 'game-ttr',
    bggId: '9209',
    name: 'Ticket to Ride',
    thumbnail: createGameCoverDataUri('Ticket to Ride', 'Route Building · 2004', ['#1e3a8a', '#312e81', '#60a5fa'], 'train'),
    image: createGameCoverDataUri('Ticket to Ride', 'Route Building · 2004', ['#1e3a8a', '#312e81', '#60a5fa'], 'train'),
    description:
      'Collect cards of various types of train cars to claim railway routes connecting iconic cities across North America. Longer routes earn more points and complete secret destination tickets.',
    minPlayers: 2,
    maxPlayers: 5,
    playingTime: 60,
    yearPublished: 2004,
    bggRating: 7.4,
    status: 'own',
    purchasePrice: 1100000,
    addedDate: '2026-02-15T10:00:00.000Z',
    notes: '1910 expansion big cards included. Always intense competition for the Seattle–New York corridor.',
    tags: ['Trains', 'Route Network', 'Family'],
  },
  {
    id: 'game-7wonders',
    bggId: '68448',
    name: '7 Wonders',
    thumbnail: createGameCoverDataUri('7 Wonders', 'Card Drafting · 2010', ['#581c87', '#7c2d12', '#f59e0b'], 'temple'),
    image: createGameCoverDataUri('7 Wonders', 'Card Drafting · 2010', ['#581c87', '#7c2d12', '#f59e0b'], 'temple'),
    description:
      'Lead one of the seven great cities of the Ancient World. Draft cards over three ages to develop military might, scientific breakthroughs, commercial guilds, and monumental wonders.',
    minPlayers: 2,
    maxPlayers: 7,
    playingTime: 30,
    yearPublished: 2010,
    bggRating: 7.7,
    status: 'own',
    purchasePrice: 1250000,
    addedDate: '2026-03-05T10:00:00.000Z',
    notes: 'Best choice when our whole 6-player group shows up since turns are simultaneous.',
    tags: ['Card Drafting', 'Ancient', 'Simultaneous'],
  },
  {
    id: 'game-pandemic',
    bggId: '30549',
    name: 'Pandemic',
    thumbnail: createGameCoverDataUri('Pandemic', 'Cooperative · 2008', ['#0f172a', '#155e75', '#22d3ee'], 'globe'),
    image: createGameCoverDataUri('Pandemic', 'Cooperative · 2008', ['#0f172a', '#155e75', '#22d3ee'], 'globe'),
    description:
      'Four virulent diseases have broken out across the globe. Work together as Dispatcher, Medic, Scientist, and Researcher to discover all four cures before time runs out.',
    minPlayers: 2,
    maxPlayers: 4,
    playingTime: 45,
    yearPublished: 2008,
    bggRating: 7.5,
    status: 'sold',
    purchasePrice: 950000,
    sellPrice: 700000,
    addedDate: '2026-01-10T10:00:00.000Z',
    notes: 'Sold to upgrade to Pandemic Legacy Season 1.',
    tags: ['Cooperative', 'Strategy', 'Hand Management'],
  },
  {
    id: 'game-viticulture',
    bggId: '183394',
    name: 'Viticulture Essential Edition',
    thumbnail: createGameCoverDataUri('Viticulture', 'Worker Placement · 2015', ['#4c1d95', '#831843', '#c084fc'], 'vine'),
    image: createGameCoverDataUri('Viticulture', 'Worker Placement · 2015', ['#4c1d95', '#831843', '#c084fc'], 'vine'),
    description:
      'Create the most prosperous winery in rustic Tuscany. Plant vines in spring, host tours in summer, harvest grapes in fall, and fill wine orders in winter using your Grande worker.',
    minPlayers: 1,
    maxPlayers: 6,
    playingTime: 90,
    yearPublished: 2015,
    bggRating: 8.0,
    status: 'own',
    purchasePrice: 1650000,
    addedDate: '2026-05-22T10:00:00.000Z',
    notes: 'Metal lira coins included. Pairs wonderfully with an actual bottle of Chianti.',
    tags: ['Worker Placement', 'Eurogame', 'Farming'],
  },
];

export interface GameStore {
  games: BoardGame[];
  addGame: (game: Omit<BoardGame, 'id' | 'addedDate'>) => BoardGame;
  bulkAddGames: (games: BoardGame[], replaceExisting?: boolean) => void;
  updateGame: (id: string, updates: Partial<BoardGame>) => void;
  deleteGame: (id: string) => void;
  getGameById: (id: string) => BoardGame | undefined;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      games: INITIAL_GAMES,
      addGame: (gameData) => {
        const newGame: BoardGame = {
          ...gameData,
          id: generateId(),
          addedDate: new Date().toISOString(),
        };
        set((state) => ({
          games: [newGame, ...state.games],
        }));
        return newGame;
      },
      bulkAddGames: (newGames, replaceExisting = false) => {
        set((state) => {
          if (replaceExisting) {
            return { games: newGames };
          }
          const existingNames = new Set(state.games.map((g) => g.name.toLowerCase()));
          const existingIds = new Set(state.games.map((g) => g.id));
          const toAdd = newGames.filter(
            (g) => !existingNames.has(g.name.toLowerCase()) && !existingIds.has(g.id)
          );
          return { games: [...toAdd, ...state.games] };
        });
      },
      updateGame: (id, updates) => {
        set((state) => ({
          games: state.games.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        }));
      },
      deleteGame: (id) => {
        set((state) => ({
          games: state.games.filter((g) => g.id !== id),
        }));
      },
      getGameById: (id) => get().games.find((g) => g.id === id),
    }),
    {
      name: 'bg-vault-games-v2',
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const bggIronClays =
          'https://cf.geekdo-images.com/2Mv38mPu495buGquy-Irqg__large/img/PWhlasf_TqRSxwf605lU_lDOh-4=/fit-in/1024x1024/filters:no_upscale():strip_icc()/pic9719419.png';
        const bggIronClaysThumb =
          'https://cf.geekdo-images.com/2Mv38mPu495buGquy-Irqg__thumb/img/hP92m4b4s44y5qV5s4XhP75v1e4=/fit-in/200x150/filters:strip_icc()/pic9719419.png';

        let changed = false;
        const nextGames = state.games.map((g) => {
          if (
            g.name.toLowerCase().includes('iron clay') &&
            (!g.image || g.image.startsWith('data:image/svg'))
          ) {
            changed = true;
            return {
              ...g,
              image: bggIronClays,
              thumbnail: bggIronClaysThumb,
            };
          }
          return g;
        });

        if (changed) {
          state.games = nextGames;
        }
      },
    }
  )
);

export default useGameStore;
