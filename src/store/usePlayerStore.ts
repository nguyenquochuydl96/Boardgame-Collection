import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Player } from '../types';
import { generateId } from '../lib/utils';
import { getRandomBoardgameAvatar, getDeterministicAvatar } from '../lib/boardgameAvatars';

declare module '../types' {
  interface Player {
    isGuest?: boolean;
  }
}

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
  registerGuestPlayer: (guest: Player) => void;
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
        const defaultBg = getRandomBoardgameAvatar();
        const newPlayer: Player = {
          ...playerData,
          avatar: playerData.avatar?.trim() || defaultBg.emoji,
          color: playerData.color || defaultBg.color,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          players: [...state.players, newPlayer],
        }));
        return newPlayer;
      },
      registerGuestPlayer: (guest) => {
        set((state) => {
          if (state.players.some((p) => p.id === guest.id)) {
            return state;
          }
          const bg = !guest.avatar || !guest.avatar.trim() ? getDeterministicAvatar(guest.name || guest.id) : null;
          const registeredGuest: Player = {
            ...guest,
            avatar: guest.avatar?.trim() || bg?.emoji || '🎲',
            color: guest.color || bg?.color || '#a855f7',
            isGuest: true,
          };
          return {
            players: [...state.players, registeredGuest],
          };
        });
      },
      bulkAddPlayers: (newPlayers, replaceExisting = false) => {
        set((state) => {
          if (replaceExisting) {
            // Preserve guest players so remote sync does not break guest match links or details
            const guestPlayers = state.players.filter((p) => p.isGuest || p.id.startsWith('guest-'));
            const incomingIds = new Set(newPlayers.map((p) => p.id));
            const preservedGuests = guestPlayers.filter((g) => !incomingIds.has(g.id));
            const mapped = newPlayers.map((p) => {
              if (!p.avatar || !p.avatar.trim()) {
                const bg = getDeterministicAvatar(p.name || p.id);
                return { ...p, avatar: bg.emoji, color: p.color || bg.color };
              }
              return p;
            });
            return {
              players: [...mapped, ...preservedGuests],
            };
          }
          const existingNames = new Set(state.players.map((p) => p.name.toLowerCase()));
          const existingIds = new Set(state.players.map((p) => p.id));
          const toAdd = newPlayers
            .filter((p) => !existingNames.has(p.name.toLowerCase()) && !existingIds.has(p.id))
            .map((p) => {
              if (!p.avatar || !p.avatar.trim()) {
                const bg = getDeterministicAvatar(p.name || p.id);
                return { ...p, avatar: bg.emoji, color: p.color || bg.color };
              }
              return p;
            });
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
