import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameLocation, PlaySession } from '../types';
import { generateId } from '../lib/utils';

export const INITIAL_LOCATIONS: GameLocation[] = [
  {
    id: 'loc-huy-room',
    name: 'Huy’s Game Room, District 3',
    address: 'District 3, Ho Chi Minh City',
    notes: 'Main gaming room with 8-player table and AC',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'loc-boardgame-loft',
    name: 'The Boardgame Loft Cafe',
    address: 'District 1, Ho Chi Minh City',
    notes: 'Cozy boardgame cafe with extensive drink menu',
    isDefault: false,
    createdAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'loc-quan-apt',
    name: 'Minh Quân’s Apartment',
    address: 'Binh Thanh District, Ho Chi Minh City',
    notes: 'High-floor apartment with city view, 6-player table',
    isDefault: false,
    createdAt: '2026-01-03T00:00:00.000Z',
  },
  {
    id: 'loc-linh-studio',
    name: 'Linh’s Studio',
    address: 'District 7, Ho Chi Minh City',
    notes: 'Quiet creative studio, great for long strategy games',
    isDefault: false,
    createdAt: '2026-01-04T00:00:00.000Z',
  },
  {
    id: 'loc-huy-vn',
    name: 'Huy’s House (District 3)',
    address: 'District 3, Ho Chi Minh City',
    notes: 'Favorite weekend tabletop spot',
    isDefault: false,
    createdAt: '2026-01-05T00:00:00.000Z',
  },
  {
    id: 'loc-boardgame-cafe',
    name: 'The Boardgame Cafe',
    address: 'Ho Chi Minh City',
    notes: 'Public boardgame cafe',
    isDefault: false,
    createdAt: '2026-01-06T00:00:00.000Z',
  },
  {
    id: 'loc-loc',
    name: 'Loc’s House',
    address: 'Ho Chi Minh City',
    notes: 'Private home with ample parking',
    isDefault: false,
    createdAt: '2026-01-07T00:00:00.000Z',
  },
  {
    id: 'loc-cafe',
    name: 'Board Game Cafe / Tea Lounge',
    address: 'Ho Chi Minh City',
    notes: 'Casual cafe meetup',
    isDefault: false,
    createdAt: '2026-01-08T00:00:00.000Z',
  },
  {
    id: 'loc-office',
    name: 'Company Office',
    address: 'Ho Chi Minh City',
    notes: 'Office game room for after-work sessions',
    isDefault: false,
    createdAt: '2026-01-09T00:00:00.000Z',
  },
];

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
          if (replaceExisting) {
            return { locations: newLocs, hasSyncedHistory: true };
          }
          const existingNames = new Set(state.locations.map((l) => l.name.trim().toLowerCase()));
          const toAdd = newLocs.filter((l) => !existingNames.has(l.name.trim().toLowerCase()));
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
        if (get().hasSyncedHistory && !force) return;

        const current = get().locations;
        const existingNames = new Set(
          current.map((l) => l.name.trim().toLowerCase())
        );
        const newLocs: GameLocation[] = [];

        // First, also ensure all INITIAL_LOCATIONS exist on initial seed
        if (!get().hasSyncedHistory || force) {
          for (const initLoc of INITIAL_LOCATIONS) {
            const key = initLoc.name.trim().toLowerCase();
            if (!existingNames.has(key)) {
              existingNames.add(key);
              newLocs.push({ ...initLoc });
            }
          }
        }

        // Then check all sessions in history
        for (const s of sessions) {
          if (!s.location || !s.location.trim()) continue;
          const trimmed = s.location.trim();
          const key = trimmed.toLowerCase();
          if (!existingNames.has(key)) {
            existingNames.add(key);
            newLocs.push({
              id: `loc-${generateId()}`,
              name: trimmed,
              address:
                trimmed.includes('District 3') || trimmed.includes('Quận 3')
                  ? 'District 3, Ho Chi Minh City'
                  : undefined,
              notes: 'Automatically extracted from session history',
              isDefault: false,
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
        // Automatically make sure initial seeds exist when rehydrated
        if (state) {
          const existingNames = new Set(
            state.locations.map((l) => l.name.trim().toLowerCase())
          );
          const missing = INITIAL_LOCATIONS.filter(
            (l) => !existingNames.has(l.name.trim().toLowerCase())
          );
          if (missing.length > 0) {
            state.locations = [...state.locations, ...missing];
          }
          // Ensure at least one default exists
          if (!state.locations.some((l) => l.isDefault) && state.locations.length > 0) {
            state.locations[0].isDefault = true;
          }
        }
      },
    }
  )
);
