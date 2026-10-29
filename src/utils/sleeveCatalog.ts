import { BoardGame, SleeveSpec, UpgradeItem } from '../types/boardgame';

// Known board game sleeve specifications database
export const KNOWN_SLEEVE_SPECS: Record<string, { sleeves: SleeveSpec[]; upgrades?: UpgradeItem[] }> = {
  'dune-imperium-uprising': {
    sleeves: [
      { size: '63.5 x 88 mm (Standard)', cardCount: 162, sleevedCount: 162, brand: 'Sultan Onyx 90µ' },
    ],
    upgrades: [
      { id: 'u1', name: 'Custom 3D Insert Organizer (Folded Space)', category: 'Insert', costVnd: 450000, installed: true },
      { id: 'u2', name: 'Deluxe Acrylic Spice & Water Tokens', category: 'Tokens', costVnd: 280000, installed: true },
    ],
  },
  'brass-birmingham': {
    sleeves: [
      { size: '63.5 x 88 mm (Standard)', cardCount: 77, sleevedCount: 77, brand: 'Mayday Premium 90µ' },
    ],
    upgrades: [
      { id: 'u3', name: 'Iron Clays 200 Luxury Gaming Counters', category: 'Coins', costVnd: 1850000, installed: true },
      { id: 'u4', name: 'Laser-cut Birch Wood Insert', category: 'Insert', costVnd: 550000, installed: true },
    ],
  },
  'spirit-island': {
    sleeves: [
      { size: '63.5 x 88 mm (Standard)', cardCount: 119, sleevedCount: 119, brand: 'Ultimate Guard Supreme' },
      { size: '44 x 67 mm (Mini European)', cardCount: 15, sleevedCount: 15, brand: 'Mayday Mini' },
    ],
    upgrades: [
      { id: 'u5', name: 'Premium Cast Resin Dahan Huts & Invaders', category: 'Tokens', costVnd: 380000, installed: true },
    ],
  },
  'great-western-trail-second-edition': {
    sleeves: [
      { size: '56 x 87 mm (Standard USA)', cardCount: 120, sleevedCount: 120, brand: 'Sultan Amethyst' },
    ],
    upgrades: [
      { id: 'u6', name: 'Dual-layer Player Board Overlays', category: 'Other', costVnd: 320000, installed: true },
    ],
  },
  'darwin-s-journey': {
    sleeves: [
      { size: '59 x 92 mm (Standard European)', cardCount: 140, sleevedCount: 140, brand: 'Mayday Euro' },
    ],
    upgrades: [
      { id: 'u7', name: 'Custom Wax Seal Evolution Tokens', category: 'Tokens', costVnd: 250000, installed: true },
    ],
  },
  'secret-hitler': {
    sleeves: [
      { size: '57 x 89 mm (Chimera)', cardCount: 42, sleevedCount: 42, brand: 'Sultan Amber' },
    ],
    upgrades: [
      { id: 'u8', name: 'Carved Wooden President / Chancellor Placards', category: 'Other', costVnd: 180000, installed: true },
    ],
  },
  'the-white-castle': {
    sleeves: [
      { size: '44 x 68 mm (Mini European)', cardCount: 77, sleevedCount: 77, brand: 'Mayday Mini Euro' },
    ],
  },
  'modern-art': {
    sleeves: [
      { size: '70 x 120 mm (Tarot)', cardCount: 70, sleevedCount: 70, brand: 'Mayday Tarot Premium' },
    ],
    upgrades: [
      { id: 'u9', name: 'Handcrafted Wooden Auctioneer Gavel', category: 'Other', costVnd: 150000, installed: true },
    ],
  },
  'mind-mgmt-the-psychic-espionage-game': {
    sleeves: [
      { size: '63.5 x 88 mm (Standard)', cardCount: 16, sleevedCount: 16, brand: 'Dragon Shield Clear Matte' },
    ],
  },
  'fort': {
    sleeves: [
      { size: '63.5 x 88 mm (Standard)', cardCount: 68, sleevedCount: 0, brand: 'Chưa bọc' },
    ],
  },
  'keep-the-heroes-out': {
    sleeves: [
      { size: '63.5 x 88 mm (Standard)', cardCount: 128, sleevedCount: 70, brand: 'Partially Sleeved' },
    ],
  },
  'camel-up': {
    sleeves: [
      { size: '44 x 68 mm (Mini European)', cardCount: 40, sleevedCount: 0, brand: 'Chưa bọc' },
    ],
  },
  'codenames': {
    sleeves: [
      { size: '44 x 68 mm (Mini European)', cardCount: 200, sleevedCount: 200, brand: 'Mayday Mini Euro' },
    ],
  },
  'the-resistance-avalon': {
    sleeves: [
      { size: '63.5 x 88 mm (Standard)', cardCount: 26, sleevedCount: 26, brand: 'Sultan Onyx' },
    ],
  },
  'exploding-kittens': {
    sleeves: [
      { size: '63.5 x 88 mm (Standard)', cardCount: 56, sleevedCount: 56, brand: 'Mayday Standard' },
    ],
  },
  'splendor': {
    sleeves: [
      { size: '63.5 x 88 mm (Standard)', cardCount: 90, sleevedCount: 90, brand: 'Mayday Premium' },
    ],
    upgrades: [
      { id: 'u10', name: 'Heavy Composite Ceramic Gem Chips', category: 'Coins', costVnd: 280000, installed: true },
    ],
  },
};

function cleanSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Generate default sleeve spec for any game
export function getGameSleeveSpecs(game: BoardGame): SleeveSpec[] {
  if (game.sleeves && game.sleeves.length > 0) return game.sleeves;

  const nameLower = String(game.name || '').toLowerCase();
  const cat = String(game.category || '').toLowerCase();

  // If item is purely an accessory (like Iron Clays poker chips)
  if (nameLower.includes('iron clay') || cat.includes('accessories') || cat.includes('accessory')) {
    return [];
  }

  const nameSlug = cleanSlug(game.name || '');
  const idSlug = cleanSlug(game.id || '');

  // Search by known game ID or name keyword
  for (const [key, data] of Object.entries(KNOWN_SLEEVE_SPECS)) {
    const keySlug = cleanSlug(key);
    if (keySlug.length >= 3) {
      if (
        (nameSlug.length >= 3 && (nameSlug.includes(keySlug) || keySlug.includes(nameSlug))) ||
        (idSlug.length >= 3 && (idSlug.includes(keySlug) || keySlug.includes(idSlug)))
      ) {
        return data.sleeves;
      }
    }
  }

  // Fallback estimation based on game category
  if (cat.includes('card') || cat.includes('deck') || cat.includes('deduction')) {
    return [
      { size: '63.5 x 88 mm (Standard)', cardCount: 60, sleevedCount: 60, brand: 'Standard Sleeves' },
    ];
  } else if (cat.includes('strategy') || cat.includes('economic')) {
    return [
      { size: '63.5 x 88 mm (Standard)', cardCount: 80, sleevedCount: 80, brand: 'Premium Sleeves' },
    ];
  }

  return [
    { size: '63.5 x 88 mm (Standard)', cardCount: 45, sleevedCount: 45, brand: 'Standard Sleeves' },
  ];
}

export function getGameUpgrades(game: BoardGame): UpgradeItem[] {
  if (game.upgrades && game.upgrades.length > 0) return game.upgrades;

  const nameSlug = cleanSlug(game.name || '');
  const idSlug = cleanSlug(game.id || '');

  for (const [key, data] of Object.entries(KNOWN_SLEEVE_SPECS)) {
    const keySlug = cleanSlug(key);
    if (keySlug.length >= 3 && data.upgrades && data.upgrades.length > 0) {
      if (
        (nameSlug.length >= 3 && (nameSlug.includes(keySlug) || keySlug.includes(nameSlug))) ||
        (idSlug.length >= 3 && (idSlug.includes(keySlug) || keySlug.includes(idSlug)))
      ) {
        return data.upgrades;
      }
    }
  }
  return [];
}

export interface SleeveShoppingItem {
  size: string;
  totalCards: number;
  sleevedCards: number;
  missingCards: number;
  packsNeeded50: number; // number of 50-card packs to buy
  gamesAffected: string[];
}

export interface SleeveInventorySummary {
  totalCards: number;
  totalSleeved: number;
  missingTotal: number;
  sleevedPercentage: number;
  fullySleevedGamesCount: number;
  partiallyOrUnsleevedCount: number;
  shoppingList: SleeveShoppingItem[];
}

export function calculateSleeveSummary(games: BoardGame[]): SleeveInventorySummary {
  let totalCards = 0;
  let totalSleeved = 0;
  let fullySleevedGamesCount = 0;
  let partiallyOrUnsleevedCount = 0;

  const sizeBuckets: Record<string, { total: number; sleeved: number; games: Set<string> }> = {};

  games.forEach((game) => {
    const specs = getGameSleeveSpecs(game);
    let gameTotal = 0;
    let gameSleeved = 0;

    specs.forEach((s) => {
      gameTotal += s.cardCount;
      gameSleeved += s.sleevedCount;
      totalCards += s.cardCount;
      totalSleeved += s.sleevedCount;

      if (!sizeBuckets[s.size]) {
        sizeBuckets[s.size] = { total: 0, sleeved: 0, games: new Set() };
      }
      sizeBuckets[s.size].total += s.cardCount;
      sizeBuckets[s.size].sleeved += s.sleevedCount;
      if (s.cardCount > s.sleevedCount) {
        sizeBuckets[s.size].games.add(game.name);
      }
    });

    if (gameTotal > 0) {
      if (gameSleeved >= gameTotal) {
        fullySleevedGamesCount += 1;
      } else {
        partiallyOrUnsleevedCount += 1;
      }
    }
  });

  const missingTotal = Math.max(0, totalCards - totalSleeved);
  const sleevedPercentage = totalCards > 0 ? Math.round((totalSleeved / totalCards) * 100) : 100;

  const shoppingList: SleeveShoppingItem[] = Object.entries(sizeBuckets)
    .filter(([_, data]) => data.total > data.sleeved)
    .map(([size, data]) => {
      const missing = data.total - data.sleeved;
      return {
        size,
        totalCards: data.total,
        sleevedCards: data.sleeved,
        missingCards: missing,
        packsNeeded50: Math.ceil(missing / 50),
        gamesAffected: Array.from(data.games),
      };
    })
    .sort((a, b) => b.missingCards - a.missingCards);

  return {
    totalCards,
    totalSleeved,
    missingTotal,
    sleevedPercentage,
    fullySleevedGamesCount,
    partiallyOrUnsleevedCount,
    shoppingList,
  };
}
