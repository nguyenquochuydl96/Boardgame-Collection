import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameLocation, PlaySession } from '../types';
import { generateId } from '../lib/utils';

export const FAKE_LOCATION_NAMES = new Set([
  'huy’s game room, district 3',
  'the boardgame loft cafe',
  'minh quân’s apartment',
  'linh’s studio',
  'nhà huy (quận 3)',
  'the boardgame cafe',
  'nhà lộc',
  'quán cafe / trà sữa',
  'văn phòng công ty',
  'huy’s house (district 3)',
  'loc’s house',
  'board game cafe / tea lounge',
  'company office',
]);

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
}

export const useLocationStore = create<LocationStore>()(
  persist(
    (set, get) => ({
      locations: INITIAL_LOCATIONS,
      hasSyncedHistory: false,
      bulkAddLocations: (newLocs, replaceExisting = false) => {
        set((state) => {
          const filtered = newLocs.filter(
            (l) =>
              !FAKE_LOCATION_NAMES.has(l.name.trim().toLowerCase()) &&
              !l.id.startsWith('loc-huy') &&
              !l.id.startsWith('loc-boardgame') &&
              !l.id.startsWith('loc-quan') &&
              !l.id.startsWith('loc-linh') &&
              !l.id.startsWith('loc-loc') &&
              !l.id.startsWith('loc-cafe') &&
              !l.id.startsWith('loc-office')
          );
          if (replaceExisting) {
            return { locations: filtered, hasSyncedHistory: true };
          }
          const existingNames = new Set(state.locations.map((l) => l.name.trim().toLowerCase()));
          const toAdd = filtered.filter((l) => !existingNames.has(l.name.trim().toLowerCase()));
          return { locations: [...state.locations, ...toAdd], hasSyncedHistory: true };
        });
      },
      addLocation: (name, address, notes, isDefault) => {
        const trimmed = name.trim();
        const currentLocs = get().locations;
        const existing = currentLocs.find(
          (l) => l.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (existing) {
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
          locations: [
            ...state.locations.map((loc) =>
              shouldBeDefault ? { ...loc, isDefault: false } : loc
            ),
            newLoc,
          ],
        }));
        return newLoc;
      },
      updateLocation: (id, updates) => {
        set((state) => {
          const isSettingDefault = updates.isDefault === true;
          return {
            locations: state.locations.map((loc) => {
              if (loc.id === id) {
                return {
                  ...loc,
                  name: updates.name.trim(),
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

        const existingNames = new Set(
          current.map((l) => l.name.trim().toLowerCase())
        );
        const newLocs: GameLocation[] = [];

        // Check real sessions in history (ignore any fake location names)
        for (const s of sessions) {
          if (!s.location || !s.location.trim()) continue;
          const trimmed = s.location.trim();
          const key = trimmed.toLowerCase();
          if (FAKE_LOCATION_NAMES.has(key)) continue;

          if (!existingNames.has(key)) {
            existingNames.add(key);
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
          locations: newLocs.length > 0 ? [...state.locations, ...newLocs] : state.locations,
          hasSyncedHistory: true,
        }));
      },
    }),
    {
      name: 'boardgame_locations_v2',
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Permanently purge any fake locations that might have been saved in browser cache
          state.locations = state.locations.filter(
            (l) =>
              !FAKE_LOCATION_NAMES.has(l.name.trim().toLowerCase()) &&
              !l.id.startsWith('loc-huy') &&
              !l.id.startsWith('loc-boardgame') &&
              !l.id.startsWith('loc-quan') &&
              !l.id.startsWith('loc-linh') &&
              !l.id.startsWith('loc-loc') &&
              !l.id.startsWith('loc-cafe') &&
              !l.id.startsWith('loc-office')
          );
          // Ensure at least one default exists
          if (!state.locations.some((l) => l.isDefault) && state.locations.length > 0) {
            state.locations[0].isDefault = true;
          }
        }
      },
    }
  )
);
