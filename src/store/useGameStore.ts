import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BoardGame } from '../types';
import { generateId } from '../lib/utils';

export const INITIAL_GAMES: BoardGame[] = [];

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
