import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PlaySession } from '../types';
import { generateId, normalizeLocationKey } from '../lib/utils';

export const INITIAL_SESSIONS: PlaySession[] = [];

export interface SessionStore {
  sessions: PlaySession[];
  addSession: (session: Omit<PlaySession, 'id' | 'createdAt'>) => PlaySession;
  bulkAddSessions: (sessions: PlaySession[], replaceExisting?: boolean) => void;
  updateSession: (id: string, updates: Partial<PlaySession>) => void;
  renameSessionsAtLocation: (previousName: string, nextName: string) => number;
  clearSessionsAtLocation: (venueName: string) => number;
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
            // Smart Store Merge: Even when replacing with remote cloud data,
            // preserve any local sessions created recently (within last 60s)
            // that are not yet present in the incoming payload.
            const recentThreshold = Date.now() - 60000;
            const recentLocal = state.sessions.filter((s) => {
              const createdTime = s.createdAt ? new Date(s.createdAt).getTime() : 0;
              return !Number.isNaN(createdTime) && createdTime > recentThreshold;
            });
            const incomingIds = new Set(newSessions.map((s) => s.id));
            const toKeep = recentLocal.filter((s) => !incomingIds.has(s.id));
            return { sessions: [...toKeep, ...newSessions] };
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
      renameSessionsAtLocation: (previousName, nextName) => {
        const previousKey = normalizeLocationKey(previousName);
        const cleanNextName = nextName
          .normalize('NFC')
          .replace(/[\u200B-\u200D\uFEFF]/g, '')
          .replace(/[–—]/g, '-')
          .trim()
          .replace(/\s+/g, ' ');
        if (!previousKey || !cleanNextName || previousKey === normalizeLocationKey(cleanNextName)) {
          return 0;
        }

        let updatedCount = 0;
        set((state) => ({
          sessions: state.sessions.map((session) => {
            if (normalizeLocationKey(session.location) !== previousKey) return session;
            updatedCount += 1;
            return { ...session, location: cleanNextName };
          }),
        }));
        return updatedCount;
      },
      clearSessionsAtLocation: (venueName) => {
        const targetKey = normalizeLocationKey(venueName);
        if (!targetKey) return 0;

        let clearedCount = 0;
        set((state) => ({
          sessions: state.sessions.map((session) => {
            if (normalizeLocationKey(session.location) !== targetKey) return session;
            clearedCount += 1;
            return { ...session, location: undefined };
          }),
        }));
        return clearedCount;
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
