import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameLocation, PlaySession } from '../types';
import { generateId } from '../lib/utils';

export const INITIAL_LOCATIONS: GameLocation[] = [
  {
    id: 'loc-huy-room',
    name: 'Huy’s Game Room, District 3',
    address: 'Quận 3, TP. Hồ Chí Minh',
    notes: 'Phòng game chính, có bàn lớn 8 người và máy lạnh',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'loc-boardgame-loft',
    name: 'The Boardgame Loft Cafe',
    address: 'Quận 1, TP. Hồ Chí Minh',
    notes: 'Quán cafe boardgame ấm cúng, nhiều món nước ngon',
    isDefault: false,
    createdAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'loc-quan-apt',
    name: 'Minh Quân’s Apartment',
    address: 'Quận Bình Thạnh, TP. Hồ Chí Minh',
    notes: 'Căn hộ chung cư tầng cao view đẹp, bàn chơi 6 người',
    isDefault: false,
    createdAt: '2026-01-03T00:00:00.000Z',
  },
  {
    id: 'loc-linh-studio',
    name: 'Linh’s Studio',
    address: 'Quận 7, TP. Hồ Chí Minh',
    notes: 'Studio yên tĩnh, phù hợp game chiến thuật dài',
    isDefault: false,
    createdAt: '2026-01-04T00:00:00.000Z',
  },
  {
    id: 'loc-huy-vn',
    name: 'Nhà Huy (Quận 3)',
    address: 'Quận 3, TP. Hồ Chí Minh',
    notes: 'Địa điểm quen thuộc cuối tuần',
    isDefault: false,
    createdAt: '2026-01-05T00:00:00.000Z',
  },
  {
    id: 'loc-boardgame-cafe',
    name: 'The Boardgame Cafe',
    address: 'TP. Hồ Chí Minh',
    notes: 'Quán cafe boardgame công cộng',
    isDefault: false,
    createdAt: '2026-01-06T00:00:00.000Z',
  },
  {
    id: 'loc-loc',
    name: 'Nhà Lộc',
    address: 'TP. Hồ Chí Minh',
    notes: 'Nhà riêng, có chỗ đỗ xe thoải mái',
    isDefault: false,
    createdAt: '2026-01-07T00:00:00.000Z',
  },
  {
    id: 'loc-cafe',
    name: 'Quán Cafe / Trà Sữa',
    address: 'TP. Hồ Chí Minh',
    notes: 'Gặp gỡ ngẫu hứng bên ngoài',
    isDefault: false,
    createdAt: '2026-01-08T00:00:00.000Z',
  },
  {
    id: 'loc-office',
    name: 'Văn Phòng Công Ty',
    address: 'TP. Hồ Chí Minh',
    notes: 'Chơi party game sau giờ làm việc',
    isDefault: false,
    createdAt: '2026-01-09T00:00:00.000Z',
  },
];

export interface LocationStore {
  locations: GameLocation[];
  addLocation: (name: string, address?: string, notes?: string, isDefault?: boolean) => GameLocation;
  updateLocation: (
    id: string,
    updates: { name: string; address?: string; notes?: string; isDefault?: boolean }
  ) => void;
  deleteLocation: (id: string) => void;
  setDefaultLocation: (id: string) => void;
  syncHistoricalLocations: (sessions: PlaySession[]) => void;
}

export const useLocationStore = create<LocationStore>()(
  persist(
    (set, get) => ({
      locations: INITIAL_LOCATIONS,
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
      syncHistoricalLocations: (sessions: PlaySession[]) => {
        const current = get().locations;
        const existingNames = new Set(
          current.map((l) => l.name.trim().toLowerCase())
        );
        const newLocs: GameLocation[] = [];

        // First, also ensure all INITIAL_LOCATIONS exist
        for (const initLoc of INITIAL_LOCATIONS) {
          const key = initLoc.name.trim().toLowerCase();
          if (!existingNames.has(key)) {
            existingNames.add(key);
            newLocs.push({ ...initLoc });
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
                  ? 'Quận 3, TP. Hồ Chí Minh'
                  : undefined,
              notes: 'Tự động trích xuất từ lịch sử ván chơi',
              isDefault: false,
              createdAt: s.datePlayed || new Date().toISOString(),
            });
          }
        }

        if (newLocs.length > 0) {
          set((state) => ({
            locations: [...state.locations, ...newLocs],
          }));
        }
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
