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
  // 1. Wondrous Creatures (User's #1 most played - 317 plays)
  {
    gameNameKeyword: 'wondrous creatures',
    displayName: 'Wondrous Creatures',
    categories: [
      { id: 'creatures', name: 'Thẻ Sinh Vật (Creature Cards)', icon: '🐾', multiplier: 1 },
      { id: 'crew', name: 'Phi Hành Đoàn (Crew Cards)', icon: '🧑‍🚀', multiplier: 1 },
      { id: 'trophies', name: 'Danh Hiệu & Cúp (Trophies & Badges)', icon: '🏆', multiplier: 1 },
      { id: 'eggs', name: 'Trứng & Nở Tổ (Eggs & Hatching)', icon: '🥚', multiplier: 1 },
      { id: 'resources', name: 'Năng Lượng & Tài Nguyên Dư (Energy & Leftovers)', icon: '⚡', multiplier: 1 },
      { id: 'bonus', name: 'Điểm Thưởng Khác (Bonus Points)', icon: '✨', multiplier: 1 },
    ],
  },

  // 2. Faraway (User's #2 most played - 226 plays)
  {
    gameNameKeyword: 'faraway',
    displayName: 'Faraway (Tính 8 Vùng Đất Ngược)',
    categories: [
      { id: 'region_8_7', name: 'Vùng Đất 8 & 7 (Regions 8 & 7)', icon: '🌅', multiplier: 1 },
      { id: 'region_6_5', name: 'Vùng Đất 6 & 5 (Regions 6 & 5)', icon: '🌄', multiplier: 1 },
      { id: 'region_4_3', name: 'Vùng Đất 4 & 3 (Regions 4 & 3)', icon: '🏞️', multiplier: 1 },
      { id: 'region_2_1', name: 'Vùng Đất 2 & 1 (Regions 2 & 1)', icon: '🏕️', multiplier: 1 },
      { id: 'sanctuaries', name: 'Điện Thờ (Sanctuary Cards)', icon: '🏛️', multiplier: 1 },
      { id: 'clues_bonus', name: 'Manh Mối & Thưởng Màu (Clues & Color Bonus)', icon: '📜', multiplier: 1 },
    ],
  },

  // 3. Everdell series (300+ plays: Base, Collector's, Duo, Farshore, Silverfrost, Newleaf, etc.)
  {
    gameNameKeyword: 'everdell',
    displayName: 'Everdell (Bao gồm các bản mở rộng)',
    categories: [
      { id: 'base_cards', name: 'Điểm Trên Thẻ Bài Thành Phố (Card Points)', icon: '🃏', multiplier: 1 },
      { id: 'vp_tokens', name: 'Điểm Xu Chiến Thắng (Point Tokens)', icon: '🪙', multiplier: 1 },
      { id: 'prosperity', name: 'Công Trình Phồn Vinh (Prosperity Purple Cards)', icon: '🏰', multiplier: 1 },
      { id: 'basic_events', name: 'Sự Kiện Cơ Bản (Basic Events · 3 pts)', icon: '📜', multiplier: 1 },
      { id: 'special_events', name: 'Sự Kiện Đặc Biệt (Special Events)', icon: '🎪', multiplier: 1 },
      { id: 'journey', name: 'Hành Trình Cuối Thu (Journey Points)', icon: '🧳', multiplier: 1 },
    ],
  },

  // 4. Darwin's Journey (70 plays)
  {
    gameNameKeyword: 'darwin',
    displayName: "Darwin's Journey",
    categories: [
      { id: 'museum', name: 'Bảo Tàng Tiêu Bản (Museum Specimens)', icon: '🏛️', multiplier: 1 },
      { id: 'correspondence', name: 'Thư Tín & Học Thuật (Correspondence Track)', icon: '✉️', multiplier: 1 },
      { id: 'beagle', name: 'Hải Trình Tàu Beagle (Beagle Voyage Points)', icon: '🚢', multiplier: 1 },
      { id: 'objectives', name: 'Nhật Ký & Thẻ Mục Tiêu (Journals & Objectives)', icon: '📔', multiplier: 1 },
      { id: 'tokens_cash', name: 'Huy Hiệu Đóng Dấu & Tiền Dư (Seals & Leftover Cash)', icon: '🪙', multiplier: 1 },
      { id: 'penalties', name: 'Phạt Tàu Beagle Đi Trễ (Beagle Penalty)', icon: '⚠️', multiplier: -1 },
    ],
  },

  // 5. Dune: Imperium & Dune: Imperium – Uprising (46 plays)
  {
    gameNameKeyword: 'dune',
    displayName: 'Dune: Imperium / Uprising',
    categories: [
      { id: 'vp_track', name: 'Vạch Điểm Chiến Thắng Cơ Bản (VP Track)', icon: '🏆', multiplier: 1 },
      { id: 'alliances', name: 'Liên Minh Phe Phái (Fremen, Bene, Guild, Emperor)', icon: '🤝', multiplier: 1 },
      { id: 'endgame_conflict', name: 'Xung Đột Vòng Cuối (Final Conflict)', icon: '⚔️', multiplier: 1 },
      { id: 'intrigue', name: 'Thẻ Âm Mưu Kết Thúc Trận (Endgame Intrigue Cards)', icon: '🗡️', multiplier: 1 },
      { id: 'uprising_bonus', name: 'Hợp Đồng & Giun Cát (Uprising / Sandworm VP)', icon: '🪱', multiplier: 1 },
    ],
  },

  // 6. Castle Combo (40 plays)
  {
    gameNameKeyword: 'castle combo',
    displayName: 'Castle Combo',
    categories: [
      { id: 'grid_characters', name: 'Lưới Nhân Vật 3x3 (Castle Grid Characters)', icon: '🏰', multiplier: 1 },
      { id: 'keys_badges', name: 'Chìa Khóa & Huy Hiệu (Keys & Badges)', icon: '🔑', multiplier: 1 },
      { id: 'coins', name: 'Tiền Xu Dư (Remaining Coins)', icon: '🪙', multiplier: 1 },
      { id: 'penalties', name: 'Trừ Điểm Điều Kiện (Penalties)', icon: '⚠️', multiplier: -1 },
    ],
  },

  // 7. Parks (38 plays)
  {
    gameNameKeyword: 'parks',
    displayName: 'Parks (Second Edition)',
    categories: [
      { id: 'visited_parks', name: 'Công Viên Đã Ghé Thăm (Visited Parks)', icon: '🌲', multiplier: 1 },
      { id: 'year_cards', name: 'Thẻ Mục Tiêu Năm (Year Bonus Cards)', icon: '🎯', multiplier: 1 },
      { id: 'photos', name: 'Ảnh Chụp Kỷ Niệm (Photos · 1 pt/ảnh)', icon: '📷', multiplier: 1 },
      { id: 'first_hiker', name: 'Huy Hiệu Đi Đầu (First Hiker Token · 1 pt)', icon: '🥾', multiplier: 1 },
    ],
  },

  // 8. The White Castle (33 plays)
  {
    gameNameKeyword: 'white castle',
    displayName: 'The White Castle (Lâu Đài Trắng Himeji)',
    categories: [
      { id: 'castle_rooms', name: 'Gian Phòng Lâu Đài (Castle Chambers & Keep)', icon: '🏯', multiplier: 1 },
      { id: 'gardens', name: 'Cây Cầu & Vườn Nhật (Gardens & Bridges)', icon: '🎋', multiplier: 1 },
      { id: 'daimyo_grounds', name: 'Võ Sĩ & Doanh Trại Daimyo (Training Grounds)', icon: '🥋', multiplier: 1 },
      { id: 'clan_seals', name: 'Con Dấu Gia Tộc (Clan Seals Scoring)', icon: '📜', multiplier: 1 },
      { id: 'resources', name: 'Tiền Xu & Tài Nguyên Dư (Leftover Coins & Resources)', icon: '🪙', multiplier: 1 },
    ],
  },

  // 9. Stardew Valley: The Board Game (31 plays)
  {
    gameNameKeyword: 'stardew',
    displayName: 'Stardew Valley: The Board Game',
    categories: [
      { id: 'grandpa_goals', name: "Mục Tiêu Của Ông (Grandpa's Goals Completed)", icon: '👴', multiplier: 1 },
      { id: 'community_center', name: 'Gói Quà Nhà Cộng Đồng (Community Center Bundles)', icon: '📦', multiplier: 1 },
      { id: 'hearts_friendship', name: 'Trái Tim Tình Bạn (Heart Tokens)', icon: '❤️', multiplier: 1 },
      { id: 'bonus_gold', name: 'Vàng & Khoáng Sản Dư (Gold & Minerals)', icon: '🪙', multiplier: 1 },
    ],
  },

  // 10. Slay the Spire: The Board Game (30 plays)
  {
    gameNameKeyword: 'slay the spire',
    displayName: 'Slay the Spire: The Board Game',
    categories: [
      { id: 'boss_kills', name: 'Diệt Boss Các Act (Bosses Defeated)', icon: '👹', multiplier: 1 },
      { id: 'relics_deck', name: 'Di Vật & Bộ Bài Nâng Cấp (Relics & Upgraded Cards)', icon: '🔮', multiplier: 1 },
      { id: 'keys_heart', name: 'Chìa Khóa Tim (Act 4 Corrupt Heart Progress)', icon: '🗝️', multiplier: 1 },
      { id: 'ascension_score', name: 'Điểm Bậc Thăng Hoa (Ascension & Survival Score)', icon: '🏆', multiplier: 1 },
    ],
  },

  // 11. Forest Shuffle (10 plays)
  {
    gameNameKeyword: 'forest shuffle',
    displayName: 'Forest Shuffle (Khu Rừng Rộn Rã)',
    categories: [
      { id: 'trees', name: 'Điểm Các Cây Rừng (Tree Species Points)', icon: '🌳', multiplier: 1 },
      { id: 'top_bottom', name: 'Cư Dân Ngọn & Gốc (Chim, Bướm, Dơi, Nấm)', icon: '🦉', multiplier: 1 },
      { id: 'sides', name: 'Cư Dân 2 Bên (Hươu, Nai, Sói, Cáo)', icon: '🦌', multiplier: 1 },
      { id: 'caves_bonus', name: 'Hang Động & Thẻ Bài Dưới Tổ (Cave Cards)', icon: '🕳️', multiplier: 1 },
    ],
  },

  // 12. Ark Nova (10 plays)
  {
    gameNameKeyword: 'ark nova',
    displayName: 'Ark Nova (Vườn Thú Thế Kỷ)',
    categories: [
      { id: 'appeal', name: 'Điểm Thu Hút Khách (Appeal Track)', icon: '🎟️', multiplier: 1 },
      { id: 'conservation', name: 'Điểm Bảo Tồn x3 (Conservation Projects · x3)', icon: '🌿', multiplier: 3 },
      { id: 'final_scoring', name: 'Thẻ Điểm Kết Trận (Final Scoring Cards)', icon: '🎯', multiplier: 1 },
      { id: 'penalties', name: 'Điểm Trừ / Tiền Âm (Penalties)', icon: '⚠️', multiplier: -1 },
    ],
  },

  // 13. Brass: Birmingham (9 plays)
  {
    gameNameKeyword: 'brass',
    displayName: 'Brass: Birmingham',
    categories: [
      { id: 'canal_vps', name: 'Thời Kỳ Kênh Đào (Canal Era VPs)', icon: '🚣', multiplier: 1 },
      { id: 'rail_vps', name: 'Thời Kỳ Đường Sắt (Rail Era VPs)', icon: '🚂', multiplier: 1 },
      { id: 'flipped_tiles', name: 'Nhà Xưởng Lật Mặt (Flipped Industry Tiles)', icon: '🏭', multiplier: 1 },
      { id: 'network_links', name: 'Điểm Liên Kết Mạng Lưới (Network Link Points)', icon: '🛤️', multiplier: 1 },
      { id: 'cash_bonus', name: 'Tiền Dư Cuối Trận (1 pt mỗi £10)', icon: '💰', multiplier: 1 },
    ],
  },

  // 14. Tiletum (10 plays)
  {
    gameNameKeyword: 'tiletum',
    displayName: 'Tiletum',
    categories: [
      { id: 'fairs', name: 'Hội Chợ Triển Lãm (Fair Scoring)', icon: '🎪', multiplier: 1 },
      { id: 'cathedrals', name: 'Nhà Thờ & Tháp Cột (Cathedrals & Columns)', icon: '⛪', multiplier: 1 },
      { id: 'contracts', name: 'Hợp Đồng Hoàn Thành (Completed Contracts)', icon: '📜', multiplier: 1 },
      { id: 'helpers', name: 'Quý Nhân Trợ Giúp (Helpers in Houses)', icon: '👥', multiplier: 1 },
      { id: 'crests_gold', name: 'Huy Hiệu Gia Tộc & Vàng Dư (Crests & Gold)', icon: '🛡️', multiplier: 1 },
    ],
  },

  // 15. The Castles of Burgundy
  {
    gameNameKeyword: 'burgundy',
    displayName: 'The Castles of Burgundy (Lâu Đài Xứ Burgundy)',
    categories: [
      { id: 'placed_tiles', name: 'Mảnh Đất Đặt Lên Bản Đồ (Placed Hex Tiles)', icon: '🏰', multiplier: 1 },
      { id: 'regions_cleared', name: 'Hoàn Thành Khu Vực Vùng (Completed Regions)', icon: '🗺️', multiplier: 1 },
      { id: 'goods_sold', name: 'Hàng Hóa Đã Bán (Sold Goods)', icon: '📦', multiplier: 1 },
      { id: 'yellow_monasteries', name: 'Mảnh Vàng Tu Viện & Khoa Học (Yellow Monasteries)', icon: '⭐', multiplier: 1 },
      { id: 'silver_workers', name: 'Bạc & Thợ Dư Lại (Leftover Silver & Workers)', icon: '🪙', multiplier: 1 },
    ],
  },

  // 16. Harmonies
  {
    gameNameKeyword: 'harmonies',
    displayName: 'Harmonies (Bản Hòa Ca Thiên Nhiên)',
    categories: [
      { id: 'animals', name: 'Thẻ Động Vật Hoàn Thành (Completed Animal Cards)', icon: '🦊', multiplier: 1 },
      { id: 'trees', name: 'Cây Cối Cao Tầng (Trees & Foliage)', icon: '🌲', multiplier: 1 },
      { id: 'mountains', name: 'Dãy Núi Liền Kề (Mountain Chains)', icon: '⛰️', multiplier: 1 },
      { id: 'rivers', name: 'Dòng Sông Kéo Dài (Rivers & Water)', icon: '🌊', multiplier: 1 },
      { id: 'buildings', name: 'Khu Dân Cư Bao Quanh (Buildings & Towns)', icon: '🏠', multiplier: 1 },
    ],
  },

  // 17. Sea Salt & Paper
  {
    gameNameKeyword: 'sea salt',
    displayName: 'Sea Salt & Paper',
    categories: [
      { id: 'card_points', name: 'Điểm Các Cặp Bài & Đơn Lẻ (Card Points)', icon: '🦀', multiplier: 1 },
      { id: 'color_bonus', name: 'Bộ Sưu Tập Màu Sắc (Color Majorities)', icon: '🎨', multiplier: 1 },
      { id: 'bet_bonus', name: 'Thưởng Đặt Cược Dừng Vòng (Last Chance Bet)', icon: '⚓', multiplier: 1 },
    ],
  },

  // 18. The Vale of Eternity
  {
    gameNameKeyword: 'vale of eternity',
    displayName: 'The Vale of Eternity (Thung Lũng Bất Tử)',
    categories: [
      { id: 'creature_powers', name: 'Điểm Tích Lũy Từ Thần Thú (Creature Scoring)', icon: '🐉', multiplier: 1 },
      { id: 'endgame_bonuses', name: 'Hiệu Ứng Vòng 10 Kết Trận (Round 10 Effects)', icon: '✨', multiplier: 1 },
      { id: 'magic_stones', name: 'Đá Ma Thuật Dư (Leftover Magic Stones)', icon: '💎', multiplier: 1 },
    ],
  },

  // 19. Great Western Trail
  {
    gameNameKeyword: 'great western trail',
    displayName: 'Great Western Trail',
    categories: [
      { id: 'cash', name: 'Tiền Mặt (1 pt mỗi $5)', icon: '💵', multiplier: 1 },
      { id: 'buildings', name: 'Công Trình Đã Dựng (Built Buildings)', icon: '🏠', multiplier: 1 },
      { id: 'cities', name: 'Thành Phố Đã Giao Bò (Delivered Cities)', icon: '🚂', multiplier: 1 },
      { id: 'train_stations', name: 'Trạm Ga Xe Lửa (Train Stations Claimed)', icon: '🚉', multiplier: 1 },
      { id: 'hazards', name: 'Vượt Chướng Ngại Vật (Hazards Cleared)', icon: '⚠️', multiplier: 1 },
      { id: 'cattle_cards', name: 'Đàn Bò Quý Hiếm (Purchased Cattle Cards)', icon: '🐄', multiplier: 1 },
      { id: 'objective_cards', name: 'Thẻ Mục Tiêu Hoàn Thành (Objective Cards)', icon: '🎯', multiplier: 1 },
    ],
  },

  // 20. Tiny Towns
  {
    gameNameKeyword: 'tiny towns',
    displayName: 'Tiny Towns',
    categories: [
      { id: 'cottages', name: 'Nhà Ở Đã Cung Ứng (Fed Cottages · 3 pts)', icon: '🏡', multiplier: 3 },
      { id: 'buildings', name: 'Các Công Trình Khác (Other Buildings)', icon: '🏛️', multiplier: 1 },
      { id: 'monument', name: 'Kỳ Quan Riêng (Monument)', icon: '🗿', multiplier: 1 },
      { id: 'empty_spaces', name: 'Ô Đất Trống (-1 pt mỗi ô trống)', icon: '❌', multiplier: -1 },
    ],
  },

  // 21. Wingspan
  {
    gameNameKeyword: 'wingspan',
    displayName: 'Wingspan Scoring Sheet',
    categories: [
      { id: 'birds', name: 'Điểm Chim Trên Tổ (Birds)', icon: '🐦', multiplier: 1 },
      { id: 'bonus', name: 'Thẻ Thưởng (Bonus Cards)', icon: '⭐', multiplier: 1 },
      { id: 'goals', name: 'Mục Tiêu Cuối Vòng (End-of-Round Goals)', icon: '🎯', multiplier: 1 },
      { id: 'eggs', name: 'Trứng (Eggs · 1 pt)', icon: '🥚', multiplier: 1 },
      { id: 'food', name: 'Thức Ăn Dự Trữ (Cached Food · 1 pt)', icon: '🌾', multiplier: 1 },
      { id: 'tucked', name: 'Bài Kẹp Dưới (Tucked Cards · 1 pt)', icon: '🗂️', multiplier: 1 },
    ],
  },

  // 22. Cascadia
  {
    gameNameKeyword: 'cascadia',
    displayName: 'Cascadia Scoring Sheet',
    categories: [
      { id: 'bear', name: 'Điểm Gấu (Bears)', icon: '🐻', multiplier: 1 },
      { id: 'elk', name: 'Điểm Hươu (Elk)', icon: '🦌', multiplier: 1 },
      { id: 'salmon', name: 'Điểm Cá Hồi (Salmon)', icon: '🐟', multiplier: 1 },
      { id: 'hawk', name: 'Điểm Diều Hâu (Hawks)', icon: '🦅', multiplier: 1 },
      { id: 'fox', name: 'Điểm Cáo (Foxes)', icon: '🦊', multiplier: 1 },
      { id: 'habitats', name: 'Sinh Cảnh Liền Kề (Habitats & Majorities)', icon: '🌲', multiplier: 1 },
      { id: 'cones', name: 'Nón Thông (Nature Cones · 1 pt)', icon: '🌰', multiplier: 1 },
    ],
  },

  // 23. 7 Wonders
  {
    gameNameKeyword: '7 wonders',
    displayName: '7 Wonders Scoring Sheet',
    categories: [
      { id: 'wonder', name: 'Kỳ Quan (Wonder Stages)', icon: '🏛️', multiplier: 1 },
      { id: 'coins', name: 'Tiền Tệ (Coins · 1 pt mỗi 3 tiền)', icon: '🪙', multiplier: 1 },
      { id: 'military', name: 'Quân Sự (Military Conflict)', icon: '🛡️', multiplier: 1 },
      { id: 'civilian', name: 'Công Trình Dân Sự (Blue Cards)', icon: '🏛️', multiplier: 1 },
      { id: 'commercial', name: 'Thương Nghiệp (Yellow Cards)', icon: '💰', multiplier: 1 },
      { id: 'guilds', name: 'Bang Hội (Purple Cards)', icon: '🤝', multiplier: 1 },
      { id: 'science', name: 'Khoa Học (Green Cards Sets)', icon: '⚗️', multiplier: 1 },
    ],
  },

  // 24. Catan
  {
    gameNameKeyword: 'catan',
    displayName: 'Catan Scoring Sheet',
    categories: [
      { id: 'settlements', name: 'Khu Định Cư (Settlements · 1 pt)', icon: '🏠', multiplier: 1 },
      { id: 'cities', name: 'Thành Phố (Cities · 2 pts)', icon: '🏰', multiplier: 2 },
      { id: 'road', name: 'Đường Dài Nhất (Longest Road · 2 pts)', icon: '🛤️', multiplier: 2 },
      { id: 'army', name: 'Quân Đội Mạnh Nhất (Largest Army · 2 pts)', icon: '⚔️', multiplier: 2 },
      { id: 'vp_cards', name: 'Thẻ Phát Triển Điểm (VP Cards · 1 pt)', icon: '📜', multiplier: 1 },
    ],
  },

  // 25. SCOUT
  {
    gameNameKeyword: 'scout',
    displayName: 'SCOUT Scoring Sheet',
    categories: [
      { id: 'scouted', name: 'Bài Thu Thập Được (Scouted / Showed Cards · 1 pt)', icon: '🃏', multiplier: 1 },
      { id: 'tokens', name: 'Thẻ Scout & Show (Tokens · 1 pt)', icon: '🪙', multiplier: 1 },
      { id: 'hand_penalty', name: 'Bài Còn Lại Trên Tay (Trừ -1 pt mỗi lá)', icon: '⚠️', multiplier: -1 },
    ],
  },

  // 26. Splendor / Splendor Duel
  {
    gameNameKeyword: 'splendor',
    displayName: 'Splendor / Splendor Duel',
    categories: [
      { id: 'cards', name: 'Điểm Trên Thẻ Đá Quý (Gem Cards)', icon: '💎', multiplier: 1 },
      { id: 'nobles', name: 'Quý Tộc Viếng Thăm (Noble / Royal Tiles)', icon: '👑', multiplier: 1 },
      { id: 'crowns', name: 'Vương Miện (Crown Points nếu chơi Duel)', icon: '👑', multiplier: 1 },
    ],
  },

  // 27. Carcassonne
  {
    gameNameKeyword: 'carcassonne',
    displayName: 'Carcassonne Scoring Sheet',
    categories: [
      { id: 'cities', name: 'Thành Trì Hoàn Thành (Completed Cities)', icon: '🏰', multiplier: 1 },
      { id: 'roads', name: 'Đường Sá (Roads)', icon: '🛤️', multiplier: 1 },
      { id: 'monasteries', name: 'Tu Viện (Monasteries)', icon: '⛪', multiplier: 1 },
      { id: 'farms', name: 'Nông Trang Đồng Cỏ (Farms · 3 pts mỗi thành)', icon: '🌾', multiplier: 1 },
    ],
  },

  // 28. Ticket to Ride
  {
    gameNameKeyword: 'ticket to ride',
    displayName: 'Ticket to Ride Scoring Sheet',
    categories: [
      { id: 'routes', name: 'Điểm Nối Tuyến Đường Ray (Claimed Routes)', icon: '🚂', multiplier: 1 },
      { id: 'completed_tickets', name: 'Vé Đích Hoàn Thành (Completed Tickets)', icon: '🎫', multiplier: 1 },
      { id: 'longest_route', name: 'Đường Ray Dài Nhất / Ga Châu Âu (Bonus)', icon: '🛤️', multiplier: 1 },
      { id: 'uncompleted_tickets', name: 'Vé Chưa Hoàn Thành (Trừ điểm vé dở)', icon: '❌', multiplier: -1 },
    ],
  },

  // 29. Flip 7 / FlipToons
  {
    gameNameKeyword: 'flip',
    displayName: 'Flip 7 / FlipToons',
    categories: [
      { id: 'cards_scored', name: 'Tổng Điểm Các Thẻ Bài (Cards Scored)', icon: '🃏', multiplier: 1 },
      { id: 'flip7_bonus', name: 'Thưởng Flip 7 Thành Công (Flip 7 Bonus)', icon: '✨', multiplier: 1 },
    ],
  },

  // 30. Generic Fallback
  {
    gameNameKeyword: 'generic',
    displayName: 'Bảng Điểm Tiêu Chuẩn',
    categories: [
      { id: 'base', name: 'Điểm Cơ Bản (Base Score)', icon: '🎲', multiplier: 1 },
      { id: 'bonus', name: 'Điểm Thưởng (Bonus Points)', icon: '⭐', multiplier: 1 },
      { id: 'penalty', name: 'Điểm Phạt (Penalties)', icon: '⚠️', multiplier: -1 },
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
      displayName: `Bảng Điểm ${gameName}`,
      categories: [
        { id: 'cat_1', name: 'Điểm Vòng Chơi (Round Points)', icon: '🎲', multiplier: 1 },
        { id: 'cat_2', name: 'Mục Tiêu Kết Trận (End Goals)', icon: '🎯', multiplier: 1 },
        { id: 'bonus', name: 'Điểm Thưởng / Thẻ Đặc Biệt (Bonus)', icon: '✨', multiplier: 1 },
        { id: 'penalty', name: 'Điểm Phạt / Trừ (Penalties)', icon: '⚠️', multiplier: -1 },
      ],
    }
  );
}
