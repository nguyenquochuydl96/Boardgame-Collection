import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Player } from '../types';
import { generateId } from '../lib/utils';

export const INITIAL_PLAYERS: Player[] = [
  {
    id: 'player-huy',
    name: 'Huy Nguyễn',
    avatar: '🦊',
    color: '#7c3aed',
    createdAt: '2026-01-01T10:00:00.000Z',
  },
  {
    id: 'player-linh',
    name: 'Linh Trần',
    avatar: '🦉',
    color: '#ec4899',
    createdAt: '2026-01-05T10:00:00.000Z',
  },
  {
    id: 'player-quan',
    name: 'Minh Quân',
    avatar: '🐉',
    color: '#22d3ee',
    createdAt: '2026-01-12T10:00:00.000Z',
  },
  {
    id: 'player-thao',
    name: 'Phương Thảo',
    avatar: '🐼',
    color: '#10b981',
    createdAt: '2026-02-01T10:00:00.000Z',
  },
];

export interface PlayerStore {
  players: Player[];
  addPlayer: (player: Omit<Player, 'id' | 'createdAt'>) => Player;
  bulkAddPlayers: (players: Player[], replaceExisting?: boolean) => void;
  updatePlayer: (id: string, updates: Partial<Player>) => void;
  deletePlayer: (id: string) => void;
  getPlayerById: (id: string) => Player | undefined;
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      players: INITIAL_PLAYERS,
      addPlayer: (playerData) => {
        const newPlayer: Player = {
          ...playerData,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          players: [...state.players, newPlayer],
        }));
        return newPlayer;
      },
      bulkAddPlayers: (newPlayers, replaceExisting = false) => {
        set((state) => {
          if (replaceExisting) {
            return { players: newPlayers };
          }
          const existingNames = new Set(state.players.map((p) => p.name.toLowerCase()));
          const existingIds = new Set(state.players.map((p) => p.id));
          const toAdd = newPlayers.filter(
            (p) => !existingNames.has(p.name.toLowerCase()) && !existingIds.has(p.id)
          );
          return { players: [...state.players, ...toAdd] };
        });
      },
      updatePlayer: (id, updates) => {
        set((state) => ({
          players: state.players.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
      },
      deletePlayer: (id) => {
        set((state) => ({
          players: state.players.filter((p) => p.id !== id),
        }));
      },
      getPlayerById: (id) => get().players.find((p) => p.id === id),
    }),
    {
      name: 'bg-vault-players-v1',
    }
  )
);

export default usePlayerStore;
