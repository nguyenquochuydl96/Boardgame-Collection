export type GameStatus =
  | 'own'
  | 'lent_out'
  | 'borrowed'
  | 'sold'
  | 'wishlist'
  | 'previously_owned';

export interface BoardGame {
  id: string;                    // local uuid
  bggId?: string;                // BGG game ID (if imported)
  name: string;
  thumbnail: string;             // BGG thumbnail URL
  image: string;                 // BGG full image URL
  description: string;
  minPlayers: number;
  maxPlayers: number;
  playingTime: number;           // minutes
  yearPublished: number;
  bggRating?: number;            // 1-10
  status: GameStatus;
  purchasePrice?: number;        // VND
  sellPrice?: number;            // VND (shown when status = 'sold')
  lentToName?: string;           // name of borrower
  lentDate?: string;             // ISO date
  addedDate: string;             // ISO date
  notes?: string;
  tags?: string[];
}

export interface GameLocation {
  id: string;
  name: string;
  address?: string;
  notes?: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface SessionDraft {
  gameId: string;
  datePlayed: string;
  location: string;
  durationMinutes: string;
  elapsedSeconds: number;
  sessionStartTime: number; // timestamp
  isTimerRunning: boolean;
  pausedDurationMs: number;
  pauseStartTime?: number;
  selectedPlayerIds: string[];
  oneOffPlayers: Player[];
  firstPlayerId?: string;
  firstPlayerMethod: FirstPlayerMethod;
  firstPlayerAnimStyle: 'wheel' | 'card_shuffle' | 'manual';
  scoresByPlayerId: Record<string, number | undefined>;
  breakdownsByPlayerId: Record<string, Record<string, number>>;
  manualWinnerIds: string[];
  lowScoreWins: boolean;
  scoringMode: 'detailed' | 'quick';
  photos: string[];
  notes: string;
  currentStep: number;
  lastUpdated: string;
}

export interface Player {
  id: string;
  name: string;
  nickname?: string;             // Biệt danh (e.g. "Vua Đỏ Đen", "Chúa Tể Euro")
  avatar?: string;               // emoji, image URL, or base64 data
  color: string;                 // hex color for charts/badges
  createdAt: string;
  bio?: string;                  // Châm ngôn / Ghi chú cá nhân
  playStyle?: string;            // Phong cách chơi ('strategist', 'aggressive', 'coop', etc.)
  specialtyGameId?: string;      // Game sở trường (tự ghim)
  specialtyGameName?: string;    // Tên game sở trường
  weaknessGameId?: string;       // Game sở đoản (tự ghim)
  weaknessGameName?: string;     // Tên game sở đoản
  favoriteGameId?: string;       // Game yêu thích tự ghim
  favoriteGameName?: string;     // Tên game yêu thích tự ghim
}

export interface PlayerScore {
  playerId: string;
  playerName: string;
  score?: number;
  rank?: number;
  isWinner: boolean;
  scoreBreakdown?: Record<string, number>; // for custom scoring sheets
}

export type FirstPlayerMethod = 'random_wheel' | 'manual' | 'previous_loser' | 'previous_winner';

export interface PlaySession {
  id: string;
  status?: 'completed' | 'in_progress' | 'draft';
  gameId: string;
  gameName: string;
  gameThumbnail: string;
  datePlayed: string;            // ISO date
  location?: string;
  durationMinutes?: number;
  players: PlayerScore[];
  winnerId?: string;
  firstPlayerMethod: FirstPlayerMethod;
  firstPlayerId?: string;        // who was picked to go first
  photos?: string[];             // base64 or object URLs
  notes?: string;
  createdAt: string;
}

export interface BGGSearchResult {
  bggId: string;
  name: string;
  yearPublished?: number;
  thumbnail?: string;
  image?: string;
}

export interface BGGGameDetail extends BGGSearchResult {
  description: string;
  minPlayers: number;
  maxPlayers: number;
  playingTime: number;
  bggRating?: number;
  tags?: string[];
}
