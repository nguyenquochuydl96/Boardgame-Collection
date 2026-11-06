export interface ScoringCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  multiplier?: number; // default 1, can be -1 for penalties
}

export interface GameScoringTemplate {
  gameNameKeyword: string;
  displayName: string;
  categories: ScoringCategory[];
}

export const PRESET_SCORING_TEMPLATES: GameScoringTemplate[] = [
  // 1. Natera: New Beginning (Venture Points Breakdown)
  {
    gameNameKeyword: 'natera',
    displayName: 'Natera: New Beginning (Venture Points)',
    categories: [
      {
        id: 'claim_tokens',
        name: 'Claim Tokens (7 pts 1st / 3 pts 2nd)',
        description: '7 VP per primary Claim flag, 3 VP per duplicate Claim token placed',
        icon: '🚩',
        multiplier: 1,
      },
      {
        id: 'settlements',
        name: 'Settlements (3 pts each)',
        description: '3 VP for each settlement established on the map',
        icon: '🏕️',
        multiplier: 1,
      },
      {
        id: 'science_board',
        name: 'Science Board & Technology',
        description: 'Victory points unlocked from human science track & tech tiles',
        icon: '🔬',
        multiplier: 1,
      },
      {
        id: 'authority_tracks',
        name: 'Authority Tracks (4 Regions Area Control)',
        description: '1st: 7 VP, 2nd: 3 VP, 3rd: 1 VP across the 4 district tracks',
        icon: '👑',
        multiplier: 1,
      },
      {
        id: 'specialist_cards',
        name: 'Specialist Cards',
        description: 'Venture points on active Specialist cards in tableau',
        icon: '🧑‍🔬',
        multiplier: 1,
      },
      {
        id: 'exploration_cards',
        name: 'Exploration Cards',
        description: 'Venture points from basic and advanced Exploration cards',
        icon: '🧭',
        multiplier: 1,
      },
      {
        id: 'resources_bonus',
        name: 'Bonus & Remaining Resources',
        description: 'Any end-game bonuses or leftover material crates',
        icon: '📦',
        multiplier: 1,
      },
    ],
  },

  // 2. Wondrous Creatures (User's #1 most played - 317 plays)
  {
    gameNameKeyword: 'wondrous creatures',
    displayName: 'Wondrous Creatures',
    categories: [
      { id: 'creatures', name: 'Creature Cards', icon: '🐾', multiplier: 1 },
      { id: 'crew', name: 'Crew Cards', icon: '🧑‍🚀', multiplier: 1 },
      { id: 'trophies', name: 'Trophies & Badges', icon: '🏆', multiplier: 1 },
      { id: 'eggs', name: 'Eggs & Hatching', icon: '🥚', multiplier: 1 },
      { id: 'resources', name: 'Energy & Leftover Resources', icon: '⚡', multiplier: 1 },
      { id: 'bonus', name: 'Bonus Points', icon: '✨', multiplier: 1 },
    ],
  },

  // 2. Faraway (User's #2 most played - 226 plays)
  {
    gameNameKeyword: 'faraway',
    displayName: 'Faraway (8 Reverse Regions)',
    categories: [
      { id: 'region_8_7', name: 'Regions 8 & 7', icon: '🌅', multiplier: 1 },
      { id: 'region_6_5', name: 'Regions 6 & 5', icon: '🌄', multiplier: 1 },
      { id: 'region_4_3', name: 'Regions 4 & 3', icon: '🏞️', multiplier: 1 },
      { id: 'region_2_1', name: 'Regions 2 & 1', icon: '🏕️', multiplier: 1 },
      { id: 'sanctuaries', name: 'Sanctuary Cards', icon: '🏛️', multiplier: 1 },
      { id: 'clues_bonus', name: 'Clues & Color Bonus', icon: '📜', multiplier: 1 },
    ],
  },

  // 3. Everdell series (300+ plays: Base, Collector's, Duo, Farshore, Silverfrost, Newleaf, etc.)
  {
    gameNameKeyword: 'everdell',
    displayName: 'Everdell (Base & Expansions)',
    categories: [
      { id: 'base_cards', name: 'City Card Points', icon: '🃏', multiplier: 1 },
      { id: 'vp_tokens', name: 'Point Tokens', icon: '🪙', multiplier: 1 },
      { id: 'prosperity', name: 'Prosperity Purple Cards', icon: '🏰', multiplier: 1 },
      { id: 'basic_events', name: 'Basic Events (3 pts)', icon: '📜', multiplier: 1 },
      { id: 'special_events', name: 'Special Events', icon: '🎪', multiplier: 1 },
      { id: 'journey', name: 'Journey Points', icon: '🧳', multiplier: 1 },
    ],
  },

  // 4. Darwin's Journey (70 plays)
  {
    gameNameKeyword: 'darwin',
    displayName: "Darwin's Journey",
    categories: [
      { id: 'museum', name: 'Museum Specimens', icon: '🏛️', multiplier: 1 },
      { id: 'correspondence', name: 'Correspondence Track', icon: '✉️', multiplier: 1 },
      { id: 'beagle', name: 'Beagle Voyage Points', icon: '🚢', multiplier: 1 },
      { id: 'objectives', name: 'Journals & Objectives', icon: '📔', multiplier: 1 },
      { id: 'tokens_cash', name: 'Seals & Leftover Cash', icon: '🪙', multiplier: 1 },
      { id: 'penalties', name: 'Beagle Penalty', icon: '⚠️', multiplier: -1 },
    ],
  },

  // 5. Dune: Imperium & Dune: Imperium – Uprising (46 plays)
  {
    gameNameKeyword: 'dune',
    displayName: 'Dune: Imperium / Uprising',
    categories: [
      { id: 'vp_track', name: 'Victory Points Track', icon: '🏆', multiplier: 1 },
      { id: 'alliances', name: 'Faction Alliances', icon: '🤝', multiplier: 1 },
      { id: 'endgame_conflict', name: 'Final Conflict', icon: '⚔️', multiplier: 1 },
      { id: 'intrigue', name: 'Endgame Intrigue Cards', icon: '🗡️', multiplier: 1 },
      { id: 'uprising_bonus', name: 'Contracts & Sandworms', icon: '🪱', multiplier: 1 },
    ],
  },

  // 6. Castle Combo (40 plays)
  {
    gameNameKeyword: 'castle combo',
    displayName: 'Castle Combo',
    categories: [
      { id: 'grid_characters', name: '3x3 Castle Characters', icon: '🏰', multiplier: 1 },
      { id: 'keys_badges', name: 'Keys & Badges', icon: '🔑', multiplier: 1 },
      { id: 'coins', name: 'Remaining Coins', icon: '🪙', multiplier: 1 },
      { id: 'penalties', name: 'Penalties', icon: '⚠️', multiplier: -1 },
    ],
  },

  // 7. Parks (38 plays)
  {
    gameNameKeyword: 'parks',
    displayName: 'Parks (Second Edition)',
    categories: [
      { id: 'visited_parks', name: 'Visited Parks', icon: '🌲', multiplier: 1 },
      { id: 'year_cards', name: 'Year Bonus Cards', icon: '🎯', multiplier: 1 },
      { id: 'photos', name: 'Photos (1 pt each)', icon: '📷', multiplier: 1 },
      { id: 'first_hiker', name: 'First Hiker Token (1 pt)', icon: '🥾', multiplier: 1 },
    ],
  },

  // 8. The White Castle (33 plays)
  {
    gameNameKeyword: 'white castle',
    displayName: 'The White Castle',
    categories: [
      { id: 'castle_rooms', name: 'Castle Chambers & Keep', icon: '🏯', multiplier: 1 },
      { id: 'gardens', name: 'Gardens & Bridges', icon: '🎋', multiplier: 1 },
      { id: 'daimyo_grounds', name: 'Daimyo Training Grounds', icon: '🥋', multiplier: 1 },
      { id: 'clan_seals', name: 'Clan Seals Scoring', icon: '📜', multiplier: 1 },
      { id: 'resources', name: 'Leftover Coins & Resources', icon: '🪙', multiplier: 1 },
    ],
  },

  // 9. Stardew Valley: The Board Game (31 plays)
  {
    gameNameKeyword: 'stardew',
    displayName: 'Stardew Valley: The Board Game',
    categories: [
      { id: 'grandpa_goals', name: "Grandpa's Goals Completed", icon: '👴', multiplier: 1 },
      { id: 'community_center', name: 'Community Center Bundles', icon: '📦', multiplier: 1 },
      { id: 'hearts_friendship', name: 'Heart Tokens', icon: '❤️', multiplier: 1 },
      { id: 'bonus_gold', name: 'Gold & Minerals', icon: '🪙', multiplier: 1 },
    ],
  },

  // 10. Slay the Spire: The Board Game (30 plays)
  {
    gameNameKeyword: 'slay the spire',
    displayName: 'Slay the Spire: The Board Game',
    categories: [
      { id: 'boss_kills', name: 'Bosses Defeated', icon: '👹', multiplier: 1 },
      { id: 'relics_deck', name: 'Relics & Upgraded Cards', icon: '🔮', multiplier: 1 },
      { id: 'keys_heart', name: 'Corrupt Heart Progress', icon: '🗝️', multiplier: 1 },
      { id: 'ascension_score', name: 'Ascension & Survival Score', icon: '🏆', multiplier: 1 },
    ],
  },

  // 11. Forest Shuffle (10 plays)
  {
    gameNameKeyword: 'forest shuffle',
    displayName: 'Forest Shuffle',
    categories: [
      { id: 'trees', name: 'Tree Species Points', icon: '🌳', multiplier: 1 },
      { id: 'top_bottom', name: 'Canopy & Roots (Birds, Butterflies, Bats, Mushrooms)', icon: '🦉', multiplier: 1 },
      { id: 'sides', name: 'Side Forest Dwellers (Deer, Wolves, Foxes)', icon: '🦌', multiplier: 1 },
      { id: 'caves_bonus', name: 'Cave Cards & Tucked Cards', icon: '🕳️', multiplier: 1 },
    ],
  },

  // 12. Ark Nova (10 plays)
  {
    gameNameKeyword: 'ark nova',
    displayName: 'Ark Nova',
    categories: [
      { id: 'appeal', name: 'Appeal Track', icon: '🎟️', multiplier: 1 },
      { id: 'conservation', name: 'Conservation Projects (x3)', icon: '🌿', multiplier: 3 },
      { id: 'final_scoring', name: 'Final Scoring Cards', icon: '🎯', multiplier: 1 },
      { id: 'penalties', name: 'Penalties', icon: '⚠️', multiplier: -1 },
    ],
  },

  // 13. Brass: Birmingham (9 plays)
  {
    gameNameKeyword: 'brass',
    displayName: 'Brass: Birmingham',
    categories: [
      { id: 'canal_vps', name: 'Canal Era VPs', icon: '🚣', multiplier: 1 },
      { id: 'rail_vps', name: 'Rail Era VPs', icon: '🚂', multiplier: 1 },
      { id: 'flipped_tiles', name: 'Flipped Industry Tiles', icon: '🏭', multiplier: 1 },
      { id: 'network_links', name: 'Network Link Points', icon: '🛤️', multiplier: 1 },
      { id: 'cash_bonus', name: 'Endgame Cash (1 pt per £10)', icon: '💰', multiplier: 1 },
    ],
  },

  // 14. Tiletum (10 plays)
  {
    gameNameKeyword: 'tiletum',
    displayName: 'Tiletum',
    categories: [
      { id: 'fairs', name: 'Fair Scoring', icon: '🎪', multiplier: 1 },
      { id: 'cathedrals', name: 'Cathedrals & Columns', icon: '⛪', multiplier: 1 },
      { id: 'contracts', name: 'Completed Contracts', icon: '📜', multiplier: 1 },
      { id: 'helpers', name: 'Helpers in Houses', icon: '👥', multiplier: 1 },
      { id: 'crests_gold', name: 'Clan Crests & Gold', icon: '🛡️', multiplier: 1 },
    ],
  },

  // 15. The Castles of Burgundy
  {
    gameNameKeyword: 'burgundy',
    displayName: 'The Castles of Burgundy',
    categories: [
      { id: 'placed_tiles', name: 'Placed Hex Tiles', icon: '🏰', multiplier: 1 },
      { id: 'regions_cleared', name: 'Completed Regions', icon: '🗺️', multiplier: 1 },
      { id: 'goods_sold', name: 'Sold Goods', icon: '📦', multiplier: 1 },
      { id: 'yellow_monasteries', name: 'Yellow Monastery Tiles', icon: '⭐', multiplier: 1 },
      { id: 'silver_workers', name: 'Leftover Silver & Workers', icon: '🪙', multiplier: 1 },
    ],
  },

  // 16. Harmonies
  {
    gameNameKeyword: 'harmonies',
    displayName: 'Harmonies',
    categories: [
      { id: 'animals', name: 'Completed Animal Cards', icon: '🦊', multiplier: 1 },
      { id: 'trees', name: 'Trees & Foliage', icon: '🌲', multiplier: 1 },
      { id: 'mountains', name: 'Mountain Chains', icon: '⛰️', multiplier: 1 },
      { id: 'rivers', name: 'Rivers & Water', icon: '🌊', multiplier: 1 },
      { id: 'buildings', name: 'Buildings & Towns', icon: '🏠', multiplier: 1 },
    ],
  },

  // 17. Sea Salt & Paper
  {
    gameNameKeyword: 'sea salt',
    displayName: 'Sea Salt & Paper',
    categories: [
      { id: 'card_points', name: 'Card Combos & Multipliers', icon: '🦀', multiplier: 1 },
      { id: 'color_bonus', name: 'Color Majorities', icon: '🎨', multiplier: 1 },
      { id: 'bet_bonus', name: 'Last Chance Bet Bonus', icon: '⚓', multiplier: 1 },
    ],
  },

  // 18. The Vale of Eternity
  {
    gameNameKeyword: 'vale of eternity',
    displayName: 'The Vale of Eternity',
    categories: [
      { id: 'creature_powers', name: 'Creature Scoring Powers', icon: '🐉', multiplier: 1 },
      { id: 'endgame_bonuses', name: 'Round 10 Endgame Effects', icon: '✨', multiplier: 1 },
      { id: 'magic_stones', name: 'Leftover Magic Stones', icon: '💎', multiplier: 1 },
    ],
  },

  // 19. Great Western Trail
  {
    gameNameKeyword: 'great western trail',
    displayName: 'Great Western Trail',
    categories: [
      { id: 'cash', name: 'Cash (1 pt per $5)', icon: '💵', multiplier: 1 },
      { id: 'buildings', name: 'Built Buildings', icon: '🏠', multiplier: 1 },
      { id: 'cities', name: 'Delivered Cities', icon: '🚂', multiplier: 1 },
      { id: 'train_stations', name: 'Train Stations Claimed', icon: '🚉', multiplier: 1 },
      { id: 'hazards', name: 'Hazards Cleared', icon: '⚠️', multiplier: 1 },
      { id: 'cattle_cards', name: 'Purchased Cattle Cards', icon: '🐄', multiplier: 1 },
      { id: 'objective_cards', name: 'Objective Cards', icon: '🎯', multiplier: 1 },
    ],
  },

  // 20. Tiny Towns
  {
    gameNameKeyword: 'tiny towns',
    displayName: 'Tiny Towns',
    categories: [
      { id: 'cottages', name: 'Fed Cottages (3 pts)', icon: '🏡', multiplier: 3 },
      { id: 'buildings', name: 'Other Buildings', icon: '🏛️', multiplier: 1 },
      { id: 'monument', name: 'Monument', icon: '🗿', multiplier: 1 },
      { id: 'empty_spaces', name: 'Empty Spaces (-1 pt each)', icon: '❌', multiplier: -1 },
    ],
  },

  // 21. Wingspan
  {
    gameNameKeyword: 'wingspan',
    displayName: 'Wingspan Scoring Sheet',
    categories: [
      { id: 'birds', name: 'Bird Cards', icon: '🐦', multiplier: 1 },
      { id: 'bonus', name: 'Bonus Cards', icon: '⭐', multiplier: 1 },
      { id: 'goals', name: 'End-of-Round Goals', icon: '🎯', multiplier: 1 },
      { id: 'eggs', name: 'Eggs (1 pt each)', icon: '🥚', multiplier: 1 },
      { id: 'food', name: 'Cached Food (1 pt each)', icon: '🌾', multiplier: 1 },
      { id: 'tucked', name: 'Tucked Cards (1 pt each)', icon: '🗂️', multiplier: 1 },
    ],
  },

  // 22. Cascadia
  {
    gameNameKeyword: 'cascadia',
    displayName: 'Cascadia Scoring Sheet',
    categories: [
      { id: 'bear', name: 'Bears', icon: '🐻', multiplier: 1 },
      { id: 'elk', name: 'Elk', icon: '🦌', multiplier: 1 },
      { id: 'salmon', name: 'Salmon', icon: '🐟', multiplier: 1 },
      { id: 'hawk', name: 'Hawks', icon: '🦅', multiplier: 1 },
      { id: 'fox', name: 'Foxes', icon: '🦊', multiplier: 1 },
      { id: 'habitats', name: 'Habitats & Majorities', icon: '🌲', multiplier: 1 },
      { id: 'cones', name: 'Nature Cones (1 pt each)', icon: '🌰', multiplier: 1 },
    ],
  },

  // 23. 7 Wonders
  {
    gameNameKeyword: '7 wonders',
    displayName: '7 Wonders Scoring Sheet',
    categories: [
      { id: 'wonder', name: 'Wonder Stages', icon: '🏛️', multiplier: 1 },
      { id: 'coins', name: 'Coins (1 pt per 3 coins)', icon: '🪙', multiplier: 1 },
      { id: 'military', name: 'Military Conflict', icon: '🛡️', multiplier: 1 },
      { id: 'civilian', name: 'Civilian Structures (Blue)', icon: '🏛️', multiplier: 1 },
      { id: 'commercial', name: 'Commercial Structures (Yellow)', icon: '💰', multiplier: 1 },
      { id: 'guilds', name: 'Guilds (Purple)', icon: '🤝', multiplier: 1 },
      { id: 'science', name: 'Science Structures (Green)', icon: '⚗️', multiplier: 1 },
    ],
  },

  // 24. Catan
  {
    gameNameKeyword: 'catan',
    displayName: 'Catan Scoring Sheet',
    categories: [
      { id: 'settlements', name: 'Settlements (1 pt)', icon: '🏠', multiplier: 1 },
      { id: 'cities', name: 'Cities (2 pts)', icon: '🏰', multiplier: 2 },
      { id: 'road', name: 'Longest Road (2 pts)', icon: '🛤️', multiplier: 2 },
      { id: 'army', name: 'Largest Army (2 pts)', icon: '⚔️', multiplier: 2 },
      { id: 'vp_cards', name: 'Victory Point Cards (1 pt)', icon: '📜', multiplier: 1 },
    ],
  },

  // 25. SCOUT
  {
    gameNameKeyword: 'scout',
    displayName: 'SCOUT Scoring Sheet',
    categories: [
      { id: 'scouted', name: 'Scouted & Showed Cards (1 pt)', icon: '🃏', multiplier: 1 },
      { id: 'tokens', name: 'Scout & Show Tokens (1 pt)', icon: '🪙', multiplier: 1 },
      { id: 'hand_penalty', name: 'Cards Left in Hand (-1 pt each)', icon: '⚠️', multiplier: -1 },
    ],
  },

  // 26. Splendor / Splendor Duel
  {
    gameNameKeyword: 'splendor',
    displayName: 'Splendor / Splendor Duel',
    categories: [
      { id: 'cards', name: 'Gem Development Cards', icon: '💎', multiplier: 1 },
      { id: 'nobles', name: 'Noble & Royal Tiles', icon: '👑', multiplier: 1 },
      { id: 'crowns', name: 'Crown Points (Duel)', icon: '👑', multiplier: 1 },
    ],
  },

  // 27. Carcassonne
  {
    gameNameKeyword: 'carcassonne',
    displayName: 'Carcassonne Scoring Sheet',
    categories: [
      { id: 'cities', name: 'Completed Cities', icon: '🏰', multiplier: 1 },
      { id: 'roads', name: 'Roads', icon: '🛤️', multiplier: 1 },
      { id: 'monasteries', name: 'Monasteries', icon: '⛪', multiplier: 1 },
      { id: 'farms', name: 'Farms (3 pts per city)', icon: '🌾', multiplier: 1 },
    ],
  },

  // 28. Ticket to Ride
  {
    gameNameKeyword: 'ticket to ride',
    displayName: 'Ticket to Ride Scoring Sheet',
    categories: [
      { id: 'routes', name: 'Claimed Routes', icon: '🚂', multiplier: 1 },
      { id: 'completed_tickets', name: 'Completed Destination Tickets', icon: '🎫', multiplier: 1 },
      { id: 'longest_route', name: 'Longest Continuous Path / Stations Bonus', icon: '🛤️', multiplier: 1 },
      { id: 'uncompleted_tickets', name: 'Uncompleted Tickets (-points)', icon: '❌', multiplier: -1 },
    ],
  },

  // 29. Flip 7 / FlipToons
  {
    gameNameKeyword: 'flip',
    displayName: 'Flip 7 / FlipToons',
    categories: [
      { id: 'cards_scored', name: 'Cards Scored', icon: '🃏', multiplier: 1 },
      { id: 'flip7_bonus', name: 'Flip 7 Bonus', icon: '✨', multiplier: 1 },
    ],
  },

  // 30. Generic Fallback
  {
    gameNameKeyword: 'generic',
    displayName: 'Standard Score Sheet',
    categories: [
      { id: 'base', name: 'Base Score', icon: '🎲', multiplier: 1 },
      { id: 'bonus', name: 'Bonus Points', icon: '⭐', multiplier: 1 },
      { id: 'penalty', name: 'Penalties', icon: '⚠️', multiplier: -1 },
    ],
  },
];

/**
 * Find matching scoring template for a game by name
 */
export function getScoringTemplateForGame(gameName?: string): GameScoringTemplate {
  if (!gameName) return PRESET_SCORING_TEMPLATES[PRESET_SCORING_TEMPLATES.length - 1];

  const lower = gameName.toLowerCase();
  const match = PRESET_SCORING_TEMPLATES.find((t) =>
    t.gameNameKeyword !== 'generic' && lower.includes(t.gameNameKeyword)
  );

  return (
    match || {
      gameNameKeyword: 'custom',
      displayName: `${gameName} Score Sheet`,
      categories: [
        { id: 'cat_1', name: 'Round Points', icon: '🎲', multiplier: 1 },
        { id: 'cat_2', name: 'End-Game Objectives', icon: '🎯', multiplier: 1 },
        { id: 'bonus', name: 'Bonus / Special Cards', icon: '✨', multiplier: 1 },
        { id: 'penalty', name: 'Penalties', icon: '⚠️', multiplier: -1 },
      ],
    }
  );
}
