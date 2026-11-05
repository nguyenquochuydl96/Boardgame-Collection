export interface BoardgameThemedAvatar {
  emoji: string;
  name: string;
  color: string;
}

export const BOARDGAME_THEMED_AVATARS: BoardgameThemedAvatar[] = [
  { emoji: '🎲', name: 'Dice', color: '#f59e0b' },
  { emoji: '♟️', name: 'Meeple', color: '#3b82f6' },
  { emoji: '👑', name: 'Monarch', color: '#eab308' },
  { emoji: '🐉', name: 'Dragon', color: '#ef4444' },
  { emoji: '🧙‍♂️', name: 'Wizard', color: '#8b5cf6' },
  { emoji: '🦊', name: 'Tricky Fox', color: '#f97316' },
  { emoji: '🦉', name: 'Wise Owl', color: '#06b6d4' },
  { emoji: '🏰', name: 'Castle', color: '#64748b' },
  { emoji: '🛡️', name: 'Knight', color: '#10b981' },
  { emoji: '💎', name: 'Gemstone', color: '#ec4899' },
  { emoji: '🦁', name: 'Lion', color: '#d97706' },
  { emoji: '🃏', name: 'Joker', color: '#a855f7' },
  { emoji: '🏴‍☠️', name: 'Captain', color: '#334155' },
  { emoji: '🏹', name: 'Archer', color: '#84cc16' },
  { emoji: '⚔️', name: 'Warrior', color: '#f43f5e' },
  { emoji: '🐺', name: 'Werewolf', color: '#6366f1' },
  { emoji: '🧌', name: 'Goblin', color: '#14b8a6' },
  { emoji: '🦄', name: 'Unicorn', color: '#f472b6' },
  { emoji: '🐸', name: 'Frog Mage', color: '#22c55e' },
  { emoji: '🐼', name: 'Panda', color: '#0ea5e9' },
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
    label: 'Deep Strategy / Euro Builder',
    emoji: '🧠',
    tagline: 'Strategic Mastermind',
    description: 'Engine builder, long-term resource optimizer, planning 3 turns ahead.',
  },
  {
    id: 'aggressive',
    label: 'High Interaction / Cutthroat',
    emoji: '⚔️',
    tagline: 'Tabletop Menace',
    description: 'Loves direct conflict, blocking routes, and brewing spicy table drama.',
  },
  {
    id: 'social_deduction',
    label: 'Hidden Roles / Deduction',
    emoji: '🎭',
    tagline: 'Mind Game Master',
    description: 'Master bluffer, sharp psychologist, loves sniffing out traitors.',
  },
  {
    id: 'coop_master',
    label: 'Co-op Champion / Team Anchor',
    emoji: '🤝',
    tagline: 'Team Pillar',
    description: 'Loves coordinating teamwork, quarterbacking smoothly, saving the group.',
  },
  {
    id: 'gambler',
    label: 'Push Your Luck / High Roller',
    emoji: '🎲',
    tagline: 'Risk Taker',
    description: 'Goes all-in, trusts the dice rolls, lives on pure adrenaline.',
  },
  {
    id: 'party_animal',
    label: 'Party Animal / Chaos Agent',
    emoji: '🎉',
    tagline: 'Game Night Comedian',
    description: 'Here for the laughs and good times, winning comes second to banter.',
  },
  {
    id: 'wargamer',
    label: 'Area Control / Wargamer',
    emoji: '👑',
    tagline: 'Map Dominator',
    description: 'Commanding troops, expanding territories, conquering the board.',
  },
  {
    id: 'speedster',
    label: 'Speed & Reflex / Quick Thinker',
    emoji: '⚡',
    tagline: 'Blitz Player',
    description: 'Lightning-fast turns, despises Analysis Paralysis, plays by instinct.',
  },
];

export function getPlayStyleInfo(styleId?: string): PlayStyleOption | undefined {
  if (!styleId) return undefined;
  return PLAY_STYLES.find((s) => s.id === styleId);
}
