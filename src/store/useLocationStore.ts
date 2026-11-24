import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameLocation, PlaySession } from '../types';
import { generateId, normalizeLocationKey, deduplicateLocationsList } from '../lib/utils';

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
].map((n) => normalizeLocationKey(n)));

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
          const filtered = newLocs.filter(
            (l) =>
              !FAKE_LOCATION_NAMES.has(normalizeLocationKey(l.name)) &&
              !l.id.startsWith('loc-huy') &&
              !l.id.startsWith('loc-boardgame') &&
              !l.id.startsWith('loc-quan') &&
              !l.id.startsWith('loc-linh') &&
              !l.id.startsWith('loc-loc') &&
              !l.id.startsWith('loc-cafe') &&
              !l.id.startsWith('loc-office')
          );
          const base = replaceExisting ? [] : state.locations;
          const deduped = deduplicateLocationsList([...base, ...filtered]);

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

        // Check real sessions in history (ignore any fake location names)
        for (const s of sessions) {
          if (!s.location || !s.location.trim()) continue;
          const trimmed = s.location
            .normalize('NFC')
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/[–—]/g, '-')
            .trim()
            .replace(/\s+/g, ' ');
          const key = normalizeLocationKey(trimmed);
          if (!key || FAKE_LOCATION_NAMES.has(key)) continue;

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
          // Permanently purge any fake locations that might have been saved in browser cache
          const nonFake = state.locations.filter(
            (l) =>
              !FAKE_LOCATION_NAMES.has(normalizeLocationKey(l.name)) &&
              !l.id.startsWith('loc-huy') &&
              !l.id.startsWith('loc-boardgame') &&
              !l.id.startsWith('loc-quan') &&
              !l.id.startsWith('loc-linh') &&
              !l.id.startsWith('loc-loc') &&
              !l.id.startsWith('loc-cafe') &&
              !l.id.startsWith('loc-office')
          );
          state.locations = deduplicateLocationsList(nonFake);
          // Ensure at least one default exists
          if (!state.locations.some((l) => l.isDefault) && state.locations.length > 0) {
            state.locations[0].isDefault = true;
          }
        }
      },
    }
  )
);
