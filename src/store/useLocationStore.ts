import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameLocation } from '../types';
import { generateId } from '../lib/utils';

export const INITIAL_LOCATIONS: GameLocation[] = [
  {
    id: 'loc-huy',
    name: 'Nhà Huy (Quận 3)',
    address: 'Quận 3, TP. Hồ Chí Minh',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'loc-boardgame-cafe',
    name: 'The Boardgame Cafe',
    address: 'TP. Hồ Chí Minh',
    isDefault: false,
    createdAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'loc-loc',
    name: 'Nhà Lộc',
    address: 'TP. Hồ Chí Minh',
    isDefault: false,
    createdAt: '2026-01-03T00:00:00.000Z',
  },
  {
    id: 'loc-cafe',
    name: 'Quán Cafe / Trà Sữa',
    address: '',
    isDefault: false,
    createdAt: '2026-01-04T00:00:00.000Z',
  },
  {
    id: 'loc-office',
    name: 'Văn Phòng Công Ty',
    address: '',
    isDefault: false,
    createdAt: '2026-01-05T00:00:00.000Z',
  },
];

export interface LocationStore {
  locations: GameLocation[];
  addLocation: (name: string, address?: string) => GameLocation;
  updateLocation: (id: string, name: string, address?: string) => void;
  deleteLocation: (id: string) => void;
  setDefaultLocation: (id: string) => void;
}

export const useLocationStore = create<LocationStore>()(
  persist(
    (set, get) => ({
      locations: INITIAL_LOCATIONS,
      addLocation: (name, address) => {
        const trimmed = name.trim();
        const existing = get().locations.find(
          (l) => l.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (existing) return existing;

        const newLoc: GameLocation = {
          id: `loc-${generateId()}`,
          name: trimmed,
          address: address?.trim(),
          isDefault: get().locations.length === 0,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          locations: [...state.locations, newLoc],
        }));
        return newLoc;
      },
      updateLocation: (id, name, address) => {
        set((state) => ({
          locations: state.locations.map((loc) =>
            loc.id === id
              ? { ...loc, name: name.trim(), address: address?.trim() }
              : loc
          ),
        }));
      },
      deleteLocation: (id) => {
        set((state) => ({
          locations: state.locations.filter((loc) => loc.id !== id),
        }));
      },
      setDefaultLocation: (id) => {
        set((state) => ({
          locations: state.locations.map((loc) => ({
            ...loc,
            isDefault: loc.id === id,
          })),
        }));
      },
    }),
    {
      name: 'boardgame_locations',
    }
  )
);
