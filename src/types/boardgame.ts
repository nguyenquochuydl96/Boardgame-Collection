export type CabinetType = 'real' | 'fake';

export interface BoardGame {
  id: string;
  name: string;
  vietnameseName?: string;
  cabinetType: CabinetType;
  imageUrl: string;
  players: string;
  minPlayers: number;
  maxPlayers: number;
  playtime: string;
  playtimeMinutes: number;
  category: string;
  price: number; // in VND
  publisher: string;
  year: number;
  condition: string;
  gameplayStory: string; // Brief gameplay hook, lore and theme
  authenticityNotes: string; // Key traits: Real features or Fake flaws
  boxColor: string; // Accent color for 3D box spine / fallback
  rating: number; // Scale 1 - 10
  addedDate?: string;
  counterpartId?: string; // Link to the matching real/fake version if any
  rulesUrl?: string;
  barcode?: string;
  weightGrams?: number;
}

export interface SheetConfig {
  url: string;
  sheetId: string;
  gid: string;
  lastSyncedAt?: string;
  autoSync: boolean;
}

export interface ComparisonPair {
  realGame: BoardGame;
  fakeGame: BoardGame;
  keyDifferences: {
    feature: string;
    realDetail: string;
    fakeDetail: string;
  }[];
}
