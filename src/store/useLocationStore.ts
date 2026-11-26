import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameLocation, PlaySession } from '../types';
import { generateId, normalizeLocationKey, deduplicateLocationsList } from '../lib/utils';

export const INITIAL_LOCATIONS: GameLocation[] = [];

export interface LocationStore {
  locations: GameLocation[];
  hasSyncedHistory: boolean;
  addLocation: (name: string, address?: string, notes?: string, isDefault?: boolean) => GameLocation;
  updateLocation: (
    id: string,
    updates: { name: string; address?: string; notes?: string; isDefault?: boolean }
  ) => void;
  deleteLocation: (id: string) => void;
  setDefaultLocation: (id: string) => void;
  syncHistoricalLocations: (sessions: PlaySession[], force?: boolean) => void;
  bulkAddLocations: (newLocs: GameLocation[], replaceExisting?: boolean) => void;
  deduplicateLocations: (sessions?: PlaySession[]) => void;
}

export const useLocationStore = create<LocationStore>()(
  persist(
    (set, get) => ({
      locations: INITIAL_LOCATIONS,
      hasSyncedHistory: false,
      deduplicateLocations: (sessions) => {
        set((state) => ({
          locations: deduplicateLocationsList(state.locations, sessions),
        }));
      },
      bulkAddLocations: (newLocs, replaceExisting = false) => {
        set((state) => {
          // A name or ID prefix alone cannot distinguish a sample from a real venue.
          const base = replaceExisting ? [] : state.locations;
          const deduped = deduplicateLocationsList([...base, ...newLocs]);

          // Ensure default exists
          if (!deduped.some((l) => l.isDefault) && deduped.length > 0) {
            deduped[0].isDefault = true;
          }

          return { locations: deduped, hasSyncedHistory: true };
        });
      },
      addLocation: (name, address, notes, isDefault) => {
        const trimmed = name
          .normalize('NFC')
          .replace(/[\u200B-\u200D\uFEFF]/g, '')
          .replace(/[–—]/g, '-')
          .trim()
          .replace(/\s+/g, ' ');
        const key = normalizeLocationKey(trimmed);
        const currentLocs = get().locations;
        const existing = currentLocs.find(
          (l) => normalizeLocationKey(l.name) === key
        );
        if (existing) {
          if ((address && !existing.address) || (notes && !existing.notes) || isDefault) {
            get().updateLocation(existing.id, {
              name: existing.name,
              address: existing.address || address?.trim() || undefined,
              notes: existing.notes || notes?.trim() || undefined,
              isDefault: isDefault ?? existing.isDefault,
            });
          }
          if (isDefault) {
            get().setDefaultLocation(existing.id);
          }
          return existing;
        }

        const shouldBeDefault = isDefault ?? currentLocs.length === 0;

        const newLoc: GameLocation = {
          id: `loc-${generateId()}`,
          name: trimmed,
          address: address?.trim() || undefined,
          notes: notes?.trim() || undefined,
          isDefault: shouldBeDefault,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          locations: deduplicateLocationsList([
            ...state.locations.map((loc) =>
              shouldBeDefault ? { ...loc, isDefault: false } : loc
            ),
            newLoc,
          ]),
        }));
        return newLoc;
      },
      updateLocation: (id, updates) => {
        set((state) => {
          const isSettingDefault = updates.isDefault === true;
          const cleanName = updates.name
            .normalize('NFC')
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/[–—]/g, '-')
            .trim()
            .replace(/\s+/g, ' ');
          const key = normalizeLocationKey(cleanName);
          // Sessions refer to names, so reject a conflicting rename rather than merge
          // two venues and silently discard their distinct metadata.
          if (state.locations.some((loc) => loc.id !== id && normalizeLocationKey(loc.name) === key)) {
            return state;
          }
          return {
            locations: state.locations.map((loc) => {
              if (loc.id === id) {
                return {
                  ...loc,
                  name: cleanName,
                  address: updates.address?.trim() || undefined,
                  notes: updates.notes?.trim() || undefined,
                  isDefault: isSettingDefault ? true : (updates.isDefault ?? loc.isDefault),
                };
              }
              if (isSettingDefault) {
                return { ...loc, isDefault: false };
              }
              return loc;
            }),
          };
        });
      },
      deleteLocation: (id) => {
        set((state) => {
          const remaining = state.locations.filter((loc) => loc.id !== id);
          // If we deleted the default location, set first remaining as default
          const wasDefault = state.locations.find((l) => l.id === id)?.isDefault;
          if (wasDefault && remaining.length > 0) {
            remaining[0] = { ...remaining[0], isDefault: true };
          }
          return { locations: remaining };
        });
      },
      setDefaultLocation: (id) => {
        set((state) => ({
          locations: state.locations.map((loc) => ({
            ...loc,
            isDefault: loc.id === id,
          })),
        }));
      },
      syncHistoricalLocations: (sessions: PlaySession[], force = false) => {
        const current = get().locations;
        if (get().hasSyncedHistory && current.length > 0 && !force) return;

        const existingKeys = new Set(
          current.map((l) => normalizeLocationKey(l.name))
        );
        const newLocs: GameLocation[] = [];

        // Recover venues from session history without classifying names as fake.
        for (const s of sessions) {
          if (!s.location || !s.location.trim()) continue;
          const trimmed = s.location
            .normalize('NFC')
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/[–—]/g, '-')
            .trim()
            .replace(/\s+/g, ' ');
          const key = normalizeLocationKey(trimmed);
          if (!key) continue;

          if (!existingKeys.has(key)) {
            existingKeys.add(key);
            newLocs.push({
              id: `loc-${generateId()}`,
              name: trimmed,
              address: undefined,
              isDefault: current.length === 0 && newLocs.length === 0,
              createdAt: s.datePlayed || new Date().toISOString(),
            });
          }
        }

        set((state) => ({
          locations: deduplicateLocationsList([...state.locations, ...newLocs], sessions),
          hasSyncedHistory: true,
        }));
      },
    }),
    {
      name: 'boardgame_locations_v2',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.locations = deduplicateLocationsList(state.locations);
          // Ensure at least one default exists
          if (!state.locations.some((l) => l.isDefault) && state.locations.length > 0) {
            state.locations[0].isDefault = true;
          }
        }
      },
    }
  )
);
