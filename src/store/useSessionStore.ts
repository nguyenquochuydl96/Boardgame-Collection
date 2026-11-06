import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PlaySession } from '../types';
import { createGameCoverDataUri, generateId } from '../lib/utils';

const COVER_WINGSPAN = createGameCoverDataUri('Wingspan', 'Engine Building · 2019', ['#0f766e', '#0369a1', '#38bdf8'], 'bird');
const COVER_CATAN = createGameCoverDataUri('Catan', 'Trade & Build · 1995', ['#b45309', '#9a3412', '#fbbf24'], 'hex');
const COVER_TTR = createGameCoverDataUri('Ticket to Ride', 'Route Building · 2004', ['#1e3a8a', '#312e81', '#60a5fa'], 'train');
const COVER_7W = createGameCoverDataUri('7 Wonders', 'Card Drafting · 2010', ['#581c87', '#7c2d12', '#f59e0b'], 'temple');
const COVER_PANDEMIC = createGameCoverDataUri('Pandemic', 'Cooperative · 2008', ['#0f172a', '#155e75', '#22d3ee'], 'globe');
const COVER_VITICULTURE = createGameCoverDataUri('Viticulture', 'Worker Placement · 2015', ['#4c1d95', '#831843', '#c084fc'], 'vine');

export const INITIAL_SESSIONS: PlaySession[] = [
  {
    id: 'session-1',
    gameId: 'game-wingspan',
    gameName: 'Wingspan',
    gameThumbnail: COVER_WINGSPAN,
    datePlayed: '2026-10-30T19:30:00.000Z',
    location: 'Lafam',
    durationMinutes: 75,
    firstPlayerMethod: 'random_wheel',
    firstPlayerId: 'player-linh',
    winnerId: 'player-linh',
    players: [
      { playerId: 'player-linh', playerName: 'Linh Trần', score: 94, rank: 1, isWinner: true },
      { playerId: 'player-huy', playerName: 'Huy Nguyễn', score: 88, rank: 2, isWinner: false },
      { playerId: 'player-thao', playerName: 'Phương Thảo', score: 79, rank: 3, isWinner: false },
    ],
    notes: 'Linh drafted the Common Raven + Chihuahuan Raven combo in Round 1 and snowballed eggs in the final round!',
    createdAt: '2026-10-30T21:00:00.000Z',
  },
  {
    id: 'session-2',
    gameId: 'game-viticulture',
    gameName: 'Viticulture Essential Edition',
    gameThumbnail: COVER_VITICULTURE,
    datePlayed: '2026-10-25T15:00:00.000Z',
    location: 'Lafam',
    durationMinutes: 95,
    firstPlayerMethod: 'random_wheel',
    firstPlayerId: 'player-huy',
    winnerId: 'player-huy',
    players: [
      { playerId: 'player-huy', playerName: 'Huy Nguyễn', score: 26, rank: 1, isWinner: true },
      { playerId: 'player-quan', playerName: 'Minh Quân', score: 23, rank: 2, isWinner: false },
      { playerId: 'player-linh', playerName: 'Linh Trần', score: 21, rank: 3, isWinner: false },
      { playerId: 'player-thao', playerName: 'Phương Thảo', score: 19, rank: 4, isWinner: false },
    ],
    notes: 'Tight race to 20 VP! Huy fulfilled two Champagne orders in Year 6 winter to close out the game.',
    createdAt: '2026-10-25T17:00:00.000Z',
  },
  {
    id: 'session-3',
    gameId: 'game-7wonders',
    gameName: '7 Wonders',
    gameThumbnail: COVER_7W,
    datePlayed: '2026-10-19T20:00:00.000Z',
    location: 'Lafam',
    durationMinutes: 35,
    firstPlayerMethod: 'manual',
    firstPlayerId: 'player-quan',
    winnerId: 'player-thao',
    players: [
      { playerId: 'player-thao', playerName: 'Phương Thảo', score: 68, rank: 1, isWinner: true },
      { playerId: 'player-huy', playerName: 'Huy Nguyễn', score: 61, rank: 2, isWinner: false },
      { playerId: 'player-linh', playerName: 'Linh Trần', score: 57, rank: 3, isWinner: false },
      { playerId: 'player-quan', playerName: 'Minh Quân', score: 52, rank: 4, isWinner: false },
    ],
    notes: 'Nobody blocked Thảo from collecting all green science symbols—she scored 38 points from science alone.',
    createdAt: '2026-10-19T21:00:00.000Z',
  },
  {
    id: 'session-4',
    gameId: 'game-catan',
    gameName: 'Catan',
    gameThumbnail: COVER_CATAN,
    datePlayed: '2026-10-12T16:00:00.000Z',
    location: 'Lafam',
    durationMinutes: 85,
    firstPlayerMethod: 'random_wheel',
    firstPlayerId: 'player-quan',
    winnerId: 'player-quan',
    players: [
      { playerId: 'player-quan', playerName: 'Minh Quân', score: 10, rank: 1, isWinner: true },
      { playerId: 'player-huy', playerName: 'Huy Nguyễn', score: 9, rank: 2, isWinner: false },
      { playerId: 'player-linh', playerName: 'Linh Trần', score: 8, rank: 3, isWinner: false },
      { playerId: 'player-thao', playerName: 'Phương Thảo', score: 7, rank: 4, isWinner: false },
    ],
    notes: 'Quân stole Longest Road on the final turn using a Monopoly card on brick. Legendary betrayal!',
    createdAt: '2026-10-12T18:00:00.000Z',
  },
  {
    id: 'session-5',
    gameId: 'game-ttr',
    gameName: 'Ticket to Ride',
    gameThumbnail: COVER_TTR,
    datePlayed: '2026-09-28T19:00:00.000Z',
    location: 'Lafam',
    durationMinutes: 55,
    firstPlayerMethod: 'previous_loser',
    firstPlayerId: 'player-thao',
    winnerId: 'player-huy',
    players: [
      { playerId: 'player-huy', playerName: 'Huy Nguyễn', score: 134, rank: 1, isWinner: true },
      { playerId: 'player-linh', playerName: 'Linh Trần', score: 121, rank: 2, isWinner: false },
      { playerId: 'player-thao', playerName: 'Phương Thảo', score: 108, rank: 3, isWinner: false },
    ],
    notes: 'Completed 6 coast-to-coast destination tickets without a single negative ticket penalty.',
    createdAt: '2026-09-28T20:15:00.000Z',
  },
  {
    id: 'session-6',
    gameId: 'game-wingspan',
    gameName: 'Wingspan',
    gameThumbnail: COVER_WINGSPAN,
    datePlayed: '2026-09-18T20:00:00.000Z',
    location: 'Lafam',
    durationMinutes: 68,
    firstPlayerMethod: 'random_wheel',
    firstPlayerId: 'player-huy',
    winnerId: 'player-huy',
    players: [
      { playerId: 'player-huy', playerName: 'Huy Nguyễn', score: 97, rank: 1, isWinner: true },
      { playerId: 'player-linh', playerName: 'Linh Trần', score: 86, rank: 2, isWinner: false },
      { playerId: 'player-quan', playerName: 'Minh Quân', score: 74, rank: 3, isWinner: false },
    ],
    notes: 'Wetland tucking engine with Mute Swan + Sandhill Crane generated 29 tucked cards.',
    createdAt: '2026-09-18T21:30:00.000Z',
  },
  {
    id: 'session-7',
    gameId: 'game-viticulture',
    gameName: 'Viticulture Essential Edition',
    gameThumbnail: COVER_VITICULTURE,
    datePlayed: '2026-09-07T14:30:00.000Z',
    location: 'Lafam',
    durationMinutes: 100,
    firstPlayerMethod: 'random_wheel',
    firstPlayerId: 'player-linh',
    winnerId: 'player-linh',
    players: [
      { playerId: 'player-linh', playerName: 'Linh Trần', score: 25, rank: 1, isWinner: true },
      { playerId: 'player-huy', playerName: 'Huy Nguyễn', score: 22, rank: 2, isWinner: false },
      { playerId: 'player-thao', playerName: 'Phương Thảo', score: 20, rank: 3, isWinner: false },
    ],
    notes: 'Summer visitor cards carried Linh early before her cellar was even upgraded.',
    createdAt: '2026-09-07T16:30:00.000Z',
  },
  {
    id: 'session-8',
    gameId: 'game-7wonders',
    gameName: '7 Wonders',
    gameThumbnail: COVER_7W,
    datePlayed: '2026-08-24T19:30:00.000Z',
    location: 'Lafam',
    durationMinutes: 32,
    firstPlayerMethod: 'random_wheel',
    firstPlayerId: 'player-huy',
    winnerId: 'player-huy',
    players: [
      { playerId: 'player-huy', playerName: 'Huy Nguyễn', score: 64, rank: 1, isWinner: true },
      { playerId: 'player-quan', playerName: 'Minh Quân', score: 59, rank: 2, isWinner: false },
      { playerId: 'player-linh', playerName: 'Linh Trần', score: 55, rank: 3, isWinner: false },
      { playerId: 'player-thao', playerName: 'Phương Thảo', score: 51, rank: 4, isWinner: false },
    ],
    notes: 'Halikarnassos discard pile resurrection in Age III grabbed the Builders Guild for 11 points.',
    createdAt: '2026-08-24T20:15:00.000Z',
  },
  {
    id: 'session-9',
    gameId: 'game-wingspan',
    gameName: 'Wingspan',
    gameThumbnail: COVER_WINGSPAN,
    datePlayed: '2026-08-14T20:00:00.000Z',
    location: 'Lafam',
    durationMinutes: 65,
    firstPlayerMethod: 'previous_winner',
    firstPlayerId: 'player-huy',
    winnerId: 'player-huy',
    players: [
      { playerId: 'player-huy', playerName: 'Huy Nguyễn', score: 91, rank: 1, isWinner: true },
      { playerId: 'player-linh', playerName: 'Linh Trần', score: 89, rank: 2, isWinner: false },
    ],
    notes: '2-player duel decided by a 2-point bonus card tiebreaker.',
    createdAt: '2026-08-14T21:15:00.000Z',
  },
  {
    id: 'session-10',
    gameId: 'game-pandemic',
    gameName: 'Pandemic',
    gameThumbnail: COVER_PANDEMIC,
    datePlayed: '2026-07-29T19:00:00.000Z',
    location: 'Lafam',
    durationMinutes: 50,
    firstPlayerMethod: 'random_wheel',
    firstPlayerId: 'player-thao',
    winnerId: 'player-thao',
    players: [
      { playerId: 'player-thao', playerName: 'Phương Thảo', score: 100, rank: 1, isWinner: true },
      { playerId: 'player-huy', playerName: 'Huy Nguyễn', score: 100, rank: 1, isWinner: true },
      { playerId: 'player-quan', playerName: 'Minh Quân', score: 100, rank: 1, isWinner: true },
    ],
    notes: 'Cooperative victory with 5 Epidemic cards! Cured the final blue disease with only 2 cards left in the player deck.',
    createdAt: '2026-07-29T20:00:00.000Z',
  },
  {
    id: 'session-11',
    gameId: 'game-ttr',
    gameName: 'Ticket to Ride',
    gameThumbnail: COVER_TTR,
    datePlayed: '2026-07-15T18:30:00.000Z',
    location: 'Lafam',
    durationMinutes: 60,
    firstPlayerMethod: 'random_wheel',
    firstPlayerId: 'player-quan',
    winnerId: 'player-linh',
    players: [
      { playerId: 'player-linh', playerName: 'Linh Trần', score: 128, rank: 1, isWinner: true },
      { playerId: 'player-quan', playerName: 'Minh Quân', score: 115, rank: 2, isWinner: false },
      { playerId: 'player-huy', playerName: 'Huy Nguyễn', score: 104, rank: 3, isWinner: false },
    ],
    notes: 'Linh hoarded rainbow locomotives and claimed every 6-train route on the West Coast.',
    createdAt: '2026-07-15T19:45:00.000Z',
  },
];

export interface SessionStore {
  sessions: PlaySession[];
  addSession: (session: Omit<PlaySession, 'id' | 'createdAt'>) => PlaySession;
  bulkAddSessions: (sessions: PlaySession[], replaceExisting?: boolean) => void;
  updateSession: (id: string, updates: Partial<PlaySession>) => void;
  deleteSession: (id: string) => void;
  getSessionById: (id: string) => PlaySession | undefined;
  getSessionsByGame: (gameId: string) => PlaySession[];
  getSessionsByPlayer: (playerId: string) => PlaySession[];
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      sessions: INITIAL_SESSIONS,
      addSession: (sessionData) => {
        const newSession: PlaySession = {
          ...sessionData,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          sessions: [newSession, ...state.sessions],
        }));
        return newSession;
      },
      bulkAddSessions: (newSessions, replaceExisting = false) => {
        set((state) => {
          if (replaceExisting) {
            return { sessions: newSessions };
          }
          const existingIds = new Set(state.sessions.map((s) => s.id));
          const toAdd = newSessions.filter((s) => !existingIds.has(s.id));
          return { sessions: [...toAdd, ...state.sessions] };
        });
      },
      updateSession: (id, updates) => {
        set((state) => ({
          sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        }));
      },
      deleteSession: (id) => {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
        }));
      },
      getSessionById: (id) => get().sessions.find((s) => s.id === id),
      getSessionsByGame: (gameId) =>
        get()
          .sessions.filter((s) => s.gameId === gameId)
          .sort((a, b) => (b.datePlayed || '').localeCompare(a.datePlayed || '')),
      getSessionsByPlayer: (playerId) =>
        get()
          .sessions.filter((s) => s.players.some((p) => p.playerId === playerId))
          .sort((a, b) => (b.datePlayed || '').localeCompare(a.datePlayed || '')),
    }),
    {
      name: 'bg-vault-sessions-v2',
    }
  )
);

export default useSessionStore;
