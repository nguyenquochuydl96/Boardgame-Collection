import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BoardGame } from '../types';
import {
  generateId,
  getGameThumbnail,
  isLowResBGGThumbnail,
  BGG_OFFICIAL_IRON_CLAYS,
} from '../lib/utils';

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
        if (!state || !Array.isArray(state.games)) return;

        let changed = false;
        const nextGames = state.games.map((g) => {
          let updated = g;
          const lowerName = (g.name || '').toLowerCase();

          // 1. Guaranteed official high-res cover for Iron Clays
          if (lowerName.includes('iron clay')) {
            if (
              !g.image ||
              g.image !== BGG_OFFICIAL_IRON_CLAYS ||
              !g.thumbnail ||
              g.thumbnail !== BGG_OFFICIAL_IRON_CLAYS
            ) {
              changed = true;
              updated = {
                ...updated,
                image: BGG_OFFICIAL_IRON_CLAYS,
                thumbnail: BGG_OFFICIAL_IRON_CLAYS,
              };
            }
          } else {
            // 2. Auto-heal any games with low-res thumbnails matching catalog
            const sharp = getGameThumbnail(g);
            if (
              sharp &&
              (!g.image || isLowResBGGThumbnail(g.image) || g.image.startsWith('data:image/svg'))
            ) {
              changed = true;
              updated = {
                ...updated,
                image: sharp,
                thumbnail: g.thumbnail && !isLowResBGGThumbnail(g.thumbnail) ? g.thumbnail : sharp,
              };
            }
          }
          return updated;
        });

        if (changed) {
          state.games = nextGames;
          useGameStore.setState({ games: nextGames });
        }
      },
    }
  )
);

export default useGameStore;
