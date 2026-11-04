export interface BoardgameThemedAvatar {
  emoji: string;
  name: string;
  color: string;
}

export const BOARDGAME_THEMED_AVATARS: BoardgameThemedAvatar[] = [
  { emoji: '🎲', name: 'Xúc Xắc', color: '#f59e0b' },
  { emoji: '♟️', name: 'Meeple', color: '#3b82f6' },
  { emoji: '👑', name: 'Vương Giả', color: '#eab308' },
  { emoji: '🐉', name: 'Rồng Thần', color: '#ef4444' },
  { emoji: '🧙‍♂️', name: 'Phù Thủy', color: '#8b5cf6' },
  { emoji: '🦊', name: 'Cáo Mẹo', color: '#f97316' },
  { emoji: '🦉', name: 'Cú Trí Tuệ', color: '#06b6d4' },
  { emoji: '🏰', name: 'Lâu Đài', color: '#64748b' },
  { emoji: '🛡️', name: 'Hiệp Sĩ', color: '#10b981' },
  { emoji: '💎', name: 'Bảo Ngọc', color: '#ec4899' },
  { emoji: '🦁', name: 'Sư Tử', color: '#d97706' },
  { emoji: '🃏', name: 'Quân Bài Joker', color: '#a855f7' },
  { emoji: '🏴‍☠️', name: 'Thuyền Trưởng', color: '#334155' },
  { emoji: '🏹', name: 'Cung Thủ', color: '#84cc16' },
  { emoji: '⚔️', name: 'Chiến Binh', color: '#f43f5e' },
  { emoji: '🐺', name: 'Ma Sói', color: '#6366f1' },
  { emoji: '🧌', name: 'Yêu Tinh Quỷ', color: '#14b8a6' },
  { emoji: '🦄', name: 'Kỳ Lân', color: '#f472b6' },
  { emoji: '🐸', name: 'Ếch Pháp Sư', color: '#22c55e' },
  { emoji: '🐼', name: 'Gấu Trúc', color: '#0ea5e9' },
];

/**
 * Returns a random boardgame themed avatar
 */
export function getRandomBoardgameAvatar(): BoardgameThemedAvatar {
  const index = Math.floor(Math.random() * BOARDGAME_THEMED_AVATARS.length);
  return BOARDGAME_THEMED_AVATARS[index];
}

/**
 * Deterministically maps any string (player name or ID) to a consistent boardgame avatar
 */
export function getDeterministicAvatar(seed: string): BoardgameThemedAvatar {
  if (!seed) return BOARDGAME_THEMED_AVATARS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % BOARDGAME_THEMED_AVATARS.length;
  return BOARDGAME_THEMED_AVATARS[index];
}


export interface PlayStyleOption {
  id: string;
  label: string;
  emoji: string;
  tagline: string;
  description: string;
}

export const PLAY_STYLES: PlayStyleOption[] = [
  {
    id: 'strategist',
    label: 'Chiến thuật sâu / Euro Builder',
    emoji: '🧠',
    tagline: 'Bộ óc chiến thuật',
    description: 'Tối ưu hóa tài nguyên, tính toán trước nhiều nước, điềm đạm xây dựng cơ đồ.',
  },
  {
    id: 'aggressive',
    label: 'Tương tác cao / Cà khịa',
    emoji: '⚔️',
    tagline: 'Chuyên gia cà khịa',
    description: 'Thích chặt chém, chặn đường, đối đầu trực tiếp và tạo drama bàn chơi.',
  },
  {
    id: 'social_deduction',
    label: 'Ẩn vai / Suy luận',
    emoji: '🎭',
    tagline: 'Bậc thầy tâm lý',
    description: 'Đọc vị đối thủ, bluff đỉnh cao, thao túng tâm lý và lật kèo ngoạn mục.',
  },
  {
    id: 'coop_master',
    label: 'Đồng đội / Co-op Master',
    emoji: '🤝',
    tagline: 'Trụ cột gánh team',
    description: 'Thích gánh team, phối hợp ăn ý để cả bàn cùng vượt qua thử thách.',
  },
  {
    id: 'gambler',
    label: 'Thánh đỏ đen / Push Your Luck',
    emoji: '🎲',
    tagline: 'Thánh nhân phẩm',
    description: 'Tất tay, tin vào linh tính xúc xắc và nhân phẩm vô cực.',
  },
  {
    id: 'party_animal',
    label: 'Chúa hề / Party Animal',
    emoji: '🎉',
    tagline: 'Cây hài bàn chơi',
    description: 'Chơi vì tiếng cười và sự náo nhiệt, thắng thua không bằng tấu hài.',
  },
  {
    id: 'wargamer',
    label: 'Thống trị / Wargamer',
    emoji: '👑',
    tagline: 'Bá chủ lãnh thổ',
    description: 'Điều binh khiển tướng, chiếm đất mở rộng lãnh thổ và áp đảo thế trận.',
  },
  {
    id: 'speedster',
    label: 'Phản xạ nhanh / Quick Thinker',
    emoji: '⚡',
    tagline: 'Tốc chiến tốc thắng',
    description: 'Ra quyết định chớp nhoáng, ghét AP (Analysis Paralysis), tốc chiến tốc thắng.',
  },
];

export function getPlayStyleInfo(styleId?: string): PlayStyleOption | undefined {
  if (!styleId) return undefined;
  return PLAY_STYLES.find((s) => s.id === styleId);
}
