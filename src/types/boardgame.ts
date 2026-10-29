export type CabinetType = 'real' | 'fake';
export type GameStatus = 'On Hand' | 'OOS';

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
  rating: number; // Current rating (1 - 10)
  bggRating?: number; // Official BoardGameGeek rating score (1 - 10)
  bggId?: number; // BGG Thing ID
  bggUrl?: string; // Direct link to BoardGameGeek page
  addedDate?: string;
  status?: GameStatus; // Inventory status: On Hand or Out of Stock (OOS)
  gameType?: 'Base Game' | 'Expansion'; // Base Game or Expansion
  spineImageUrl?: string; // Optional spine / shelf-side box art
  spineWidth?: 'narrow' | 'medium' | 'wide'; // Box thickness on shelf
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


export interface PlayerScore {
  playerId: string;
  playerName: string;
  score: number;
  isWinner: boolean;
  roleOrFaction?: string;
}

export interface PlaySession {
  id: string;
  gameId: string;
  gameName: string;
  gameImageUrl: string;
  date: string;
  durationMinutes: number;
  players: PlayerScore[];
  location?: string;
  notes?: string;
  createdAt: string;
}
