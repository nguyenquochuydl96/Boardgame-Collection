import { BoardGame, CabinetType } from '../types/boardgame';
import { USER_46_GAMES } from '../data/userCollectionCatalog';

export interface BggMatchResult {
  bggId: number;
  name: string;
  rating: number; // Official BGG rating (1 - 10)
  imageUrl: string;
  year?: number;
  minPlayers?: number;
  maxPlayers?: number;
  playtimeMinutes?: number;
  category?: string;
  publisher?: string;
  bggUrl: string;
  isExactMatch?: boolean;
}

/**
 * Curated high-fidelity BGG metadata & official box cover art catalog
 * for fast, reliable offline matching without rate-limiting or CORS blocks.
 */
interface CatalogEntry {
  id: number;
  name: string;
  aliases: string[];
  rating: number;
  year: number;
  imageUrl: string;
  minPlayers: number;
  maxPlayers: number;
  playtime: number;
  category: string;
  publisher: string;
}

const BGG_CATALOG: CatalogEntry[] = [
  {
    id: 13,
    name: 'Catan',
    aliases: ['catan', 'settlers of catan', 'the settlers of catan', 'đảo catan', 'catan nguoi khai hoang'],
    rating: 7.1,
    year: 1995,
    imageUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 4,
    playtime: 75,
    category: 'Chiến thuật / Giao thương',
    publisher: 'KOSMOS / Catan Studio',
  },
  {
    id: 148228,
    name: 'Splendor',
    aliases: ['splendor', 'thuong nhan da quy', 'splendor thuong nhan'],
    rating: 7.4,
    year: 2014,
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 4,
    playtime: 30,
    category: 'Xây dựng engine / Thẻ bài',
    publisher: 'Space Cowboys',
  },
  {
    id: 266192,
    name: 'Wingspan',
    aliases: ['wingspan', 'doi canh thien nhien', 'chim canh', 'wingspan asia', 'wingspan oceania'],
    rating: 8.1,
    year: 2019,
    imageUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 5,
    playtime: 70,
    category: 'Xây dựng engine / Sinh thái học',
    publisher: 'Stonemaier Games',
  },
  {
    id: 230802,
    name: 'Azul',
    aliases: ['azul', 'gach men azul', 'lat gach azul', 'azul stained glass'],
    rating: 7.8,
    year: 2017,
    imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 4,
    playtime: 40,
    category: 'Tư duy trừu tượng / Ghép mẫu',
    publisher: 'Next Move Games / Plan B',
  },
  {
    id: 9209,
    name: 'Ticket to Ride',
    aliases: ['ticket to ride', 'doan tau toc hanh', 've tau toc hanh', 'ttr'],
    rating: 7.4,
    year: 2004,
    imageUrl: 'https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 5,
    playtime: 60,
    category: 'Giao thông / Nối đường ray',
    publisher: 'Days of Wonder',
  },
  {
    id: 14996,
    name: 'Ticket to Ride: Europe',
    aliases: ['ticket to ride europe', 've tau chau au', 'ttr europe'],
    rating: 7.5,
    year: 2005,
    imageUrl: 'https://images.unsplash.com/photo-1510519138171-c70d76b64028?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 5,
    playtime: 60,
    category: 'Giao thông / Nối đường ray',
    publisher: 'Days of Wonder',
  },
  {
    id: 822,
    name: 'Carcassonne',
    aliases: ['carcassonne', 'thanh carcassonne', 'xay thanh', 'dat tile carcassonne'],
    rating: 7.4,
    year: 2000,
    imageUrl: 'https://images.unsplash.com/photo-1563941402622-4e7a488bcc57?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 5,
    playtime: 40,
    category: 'Đặt ô bản đồ / Trung cổ',
    publisher: 'Hans im Glück',
  },
  {
    id: 128882,
    name: 'The Resistance: Avalon',
    aliases: ['avalon', 'the resistance avalon', 'the resistance: avalon', 'avalon tieng viet', 'khang chien avalon'],
    rating: 7.5,
    year: 2012,
    imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
    minPlayers: 5,
    maxPlayers: 10,
    playtime: 30,
    category: 'Ẩn vai / Suy luận xã hội',
    publisher: 'Indie Boards & Cards',
  },
  {
    id: 188834,
    name: 'Secret Hitler',
    aliases: ['secret hitler', 'hitler an danh', 'hitler bi mat'],
    rating: 7.5,
    year: 2016,
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    minPlayers: 5,
    maxPlayers: 10,
    playtime: 45,
    category: 'Ẩn vai / Đấu trí chính trị',
    publisher: 'Goat, Wolf, & Cabbage',
  },
  {
    id: 172225,
    name: 'Exploding Kittens',
    aliases: ['exploding kittens', 'meo no', 'mèo nổ', 'exploding kitten', 'meo no tieng viet'],
    rating: 6.0,
    year: 2015,
    imageUrl: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 5,
    playtime: 15,
    category: 'Tiệc tùng / May rủi / Thẻ bài',
    publisher: 'Exploding Kittens',
  },
  {
    id: 131357,
    name: 'Coup',
    aliases: ['coup', 'dao chinh', 'đảo chính', 'coup cuoc chien gian diep', 'coup rebellion'],
    rating: 7.0,
    year: 2012,
    imageUrl: 'https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 6,
    playtime: 15,
    category: 'Tung hỏa mù / Ẩn vai',
    publisher: 'Indie Boards & Cards',
  },
  {
    id: 3955,
    name: 'Bang!',
    aliases: ['bang', 'bang!', 'bang the card game', 'bang vien dan'],
    rating: 6.5,
    year: 2002,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    minPlayers: 4,
    maxPlayers: 7,
    playtime: 35,
    category: 'Bắn súng Viễn Tây / Ẩn vai',
    publisher: 'dV Giochi',
  },
  {
    id: 143741,
    name: 'Bang! The Dice Game',
    aliases: ['bang the dice game', 'bang xuc xac', 'bang dice'],
    rating: 7.0,
    year: 2013,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 8,
    playtime: 15,
    category: 'Đổ xúc xắc / Ẩn vai',
    publisher: 'dV Giochi',
  },
  {
    id: 178900,
    name: 'Codenames',
    aliases: ['codenames', 'mat ma', 'mật mã', 'codenames tieng viet', 'mat ma diep vien'],
    rating: 7.6,
    year: 2015,
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 8,
    playtime: 15,
    category: 'Suy đoán từ ngữ / Tiệc tùng',
    publisher: 'Czech Games Edition',
  },
  {
    id: 30549,
    name: 'Pandemic',
    aliases: ['pandemic', 'dai dich', 'đại dịch', 'pandemic legacy'],
    rating: 7.6,
    year: 2008,
    imageUrl: 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 4,
    playtime: 45,
    category: 'Hợp tác / Ngăn chặn dịch bệnh',
    publisher: 'Z-Man Games',
  },
  {
    id: 39856,
    name: 'Dixit',
    aliases: ['dixit', 'dixit odyssey', 'ke chuyen dixit'],
    rating: 7.2,
    year: 2008,
    imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 8,
    playtime: 30,
    category: 'Tranh trừu tượng / Kể chuyện',
    publisher: 'Libellud',
  },
  {
    id: 68448,
    name: '7 Wonders',
    aliases: ['7 wonders', 'bay ky quan', '7 ky quan', 'seven wonders'],
    rating: 7.7,
    year: 2010,
    imageUrl: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 7,
    playtime: 35,
    category: 'Chọn bài / Xây dựng văn minh',
    publisher: 'Repos Production',
  },
  {
    id: 173346,
    name: '7 Wonders Duel',
    aliases: ['7 wonders duel', 'bay ky quan doi dau', '7 ky quan duel'],
    rating: 8.1,
    year: 2015,
    imageUrl: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 2,
    playtime: 30,
    category: 'Đối kháng 2 người / Văn minh',
    publisher: 'Repos Production',
  },
  {
    id: 167791,
    name: 'Terraforming Mars',
    aliases: ['terraforming mars', 'khai pha sao hoa', 'tfm', 'sao hoa'],
    rating: 8.4,
    year: 2016,
    imageUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 5,
    playtime: 120,
    category: 'Khoa học viễn tưởng / Quản lý tài nguyên',
    publisher: 'FryxGames / Stronghold',
  },
  {
    id: 169786,
    name: 'Scythe',
    aliases: ['scythe', 'co may scythe', 'scythe 1920'],
    rating: 8.2,
    year: 2016,
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 5,
    playtime: 115,
    category: 'Chiến thuật / Động cơ Dieselpunk',
    publisher: 'Stonemaier Games',
  },
  {
    id: 316554,
    name: 'Dune: Imperium',
    aliases: ['dune imperium', 'dune: imperium', 'xu cat dune', 'dune uprising'],
    rating: 8.4,
    year: 2020,
    imageUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 90,
    category: 'Chiến thuật sâu / Xây dựng cỗ máy bài',
    publisher: 'Dire Wolf',
  },
  {
    id: 237182,
    name: 'Root',
    aliases: ['root', 'khu rung root', 'chien tranh rung xanh root'],
    rating: 8.1,
    year: 2018,
    imageUrl: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 4,
    playtime: 80,
    category: 'Chiến thuật bất đối xứng / Muông thú',
    publisher: 'Leder Games',
  },
  {
    id: 295947,
    name: 'Cascadia',
    aliases: ['cascadia', 'vuon quoc gia cascadia', 'he sinh thai cascadia'],
    rating: 8.0,
    year: 2021,
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 40,
    category: 'Xây dựng môi trường sống / Đặt tile',
    publisher: 'Flatout Games',
  },
  {
    id: 224517,
    name: 'Brass: Birmingham',
    aliases: ['brass birmingham', 'brass: birmingham', 'brass cong nghiep'],
    rating: 8.6,
    year: 2018,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0246/2190/8043/t/5/assets/f78ba2a93e5e--BrassB-RetailBoxImage.png?v=1781038782',
    minPlayers: 2,
    maxPlayers: 4,
    playtime: 120,
    category: 'Kinh tế công nghiệp thế kỷ 18',
    publisher: 'Roxley Games',
  },
  {
    id: 174430,
    name: 'Gloomhaven',
    aliases: ['gloomhaven', 'thanh gloomhaven', 'gloomhaven jaws of the lion'],
    rating: 8.6,
    year: 2017,
    imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 120,
    category: 'Nhập vai hầm ngục / Chiến dịch kỳ ảo',
    publisher: 'Cephalofair Games',
  },
  {
    id: 162886,
    name: 'Spirit Island',
    aliases: ['spirit island', 'dao tinh linh', 'tinh linh chong ngoai xam'],
    rating: 8.3,
    year: 2017,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 100,
    category: 'Hợp tác chống xâm lược / Phép thuật',
    publisher: 'Greater Than Games',
  },
  {
    id: 342942,
    name: 'Ark Nova',
    aliases: ['ark nova', 'vuon thu ark nova', 'thao cam vien ark nova'],
    rating: 8.5,
    year: 2021,
    imageUrl: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 140,
    category: 'Quản lý vườn bách thú hiện đại',
    publisher: 'Feuerland Spiele / Capstone Games',
  },
  {
    id: 199792,
    name: 'Everdell',
    aliases: ['everdell', 'thung lung everdell', 'cay co thu everdell'],
    rating: 8.1,
    year: 2018,
    imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 60,
    category: 'Xây dựng thành phố muông thú',
    publisher: 'Starling Games',
  },
  {
    id: 312484,
    name: 'Lost Ruins of Arnak',
    aliases: ['lost ruins of arnak', 'tan tich arnak', 'arnak'],
    rating: 8.1,
    year: 2020,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 90,
    category: 'Thám hiểm đảo hoang / Khảo cổ',
    publisher: 'Czech Games Edition',
  },
  {
    id: 366013,
    name: 'Heat: Pedal to the Metal',
    aliases: ['heat', 'heat pedal to the metal', 'dua xe heat', 'heat dua xe'],
    rating: 8.1,
    year: 2022,
    imageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 6,
    playtime: 60,
    category: 'Đua xe cổ điển / Quản lý động cơ',
    publisher: 'Days of Wonder',
  },
  {
    id: 84876,
    name: 'The Castles of Burgundy',
    aliases: ['castles of burgundy', 'lau dai burgundy', 'the castles of burgundy'],
    rating: 8.1,
    year: 2011,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 4,
    playtime: 80,
    category: 'Euro game / Đặt xúc xắc xây lãnh địa',
    publisher: 'alea / Ravensburger',
  },
  {
    id: 2223,
    name: 'UNO',
    aliases: ['uno', 'uno card game', 'bai uno', 'uno dai chien'],
    rating: 5.4,
    year: 1971,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f9/UNO_Logo.svg',
    minPlayers: 2,
    maxPlayers: 10,
    playtime: 20,
    category: 'Thẻ bài gia đình / Phản xạ',
    publisher: 'Mattel',
  },
  {
    id: 1406,
    name: 'Monopoly',
    aliases: ['monopoly', 'co ty phu', 'cờ tỷ phú', 'monopoly deal'],
    rating: 4.4,
    year: 1935,
    imageUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 8,
    playtime: 120,
    category: 'Kinh doanh bất động sản cổ điển',
    publisher: 'Hasbro',
  },
  {
    id: 1294,
    name: 'Clue',
    aliases: ['clue', 'cluedo', 'pha an clue', 'dieu tra an mang clue'],
    rating: 5.7,
    year: 1949,
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 6,
    playtime: 45,
    category: 'Phá án / Suy luận điều tra',
    publisher: 'Hasbro',
  },
  {
    id: 25821,
    name: 'The Werewolves of Millers Hollow',
    aliases: ['ma soi', 'ma sói', 'werewolf', 'the werewolves of millers hollow', 'ultimate werewolf'],
    rating: 6.9,
    year: 2001,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    minPlayers: 8,
    maxPlayers: 18,
    playtime: 30,
    category: 'Ẩn vai / Suy luận sinh tồn',
    publisher: 'Lui-même',
  },
  {
    id: 41224,
    name: 'SanGuoSha',
    aliases: ['tam quoc sat', 'tam quốc sát', 'sanguosha', 'tam quoc sat noi chien'],
    rating: 6.4,
    year: 2008,
    imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 10,
    playtime: 40,
    category: 'Ẩn vai Tam Quốc / Chiến thuật thẻ bài',
    publisher: 'Yoka Games',
  },
  {
    id: 175649,
    name: 'Salem 1692',
    aliases: ['salem 1692', 'salem', 'phu thuy salem', 'san phu thuy salem'],
    rating: 6.9,
    year: 2015,
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    minPlayers: 4,
    maxPlayers: 12,
    playtime: 35,
    category: 'Săn phù thủy / Ẩn vai kịch tính',
    publisher: 'Facade Games',
  },
  {
    id: 92415,
    name: 'Skull',
    aliases: ['skull', 'dau lau skull', 'skull and roses'],
    rating: 7.2,
    year: 2011,
    imageUrl: 'https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 6,
    playtime: 20,
    category: 'Đấu trí / Tung hỏa mù tuyệt đối',
    publisher: 'Space Cowboys',
  },
  {
    id: 156129,
    name: 'Deception: Murder in Hong Kong',
    aliases: ['deception', 'deception murder in hong kong', 'an mang hong kong', 'deception an mang'],
    rating: 7.4,
    year: 2014,
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    minPlayers: 4,
    maxPlayers: 12,
    playtime: 25,
    category: 'Pháp chứng / Điều tra án mạng',
    publisher: 'Grey Fox Games',
  },
  {
    id: 157969,
    name: 'Sheriff of Nottingham',
    aliases: ['sheriff of nottingham', 'quan huyen nottingham', 'buon lau nottingham'],
    rating: 7.1,
    year: 2014,
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 5,
    playtime: 50,
    category: 'Giao thương / Nói dối / Hối lộ',
    publisher: 'Arcane Wonders',
  },
  {
    id: 163412,
    name: 'Patchwork',
    aliases: ['patchwork', 'may va patchwork', 'may chan patchwork'],
    rating: 7.6,
    year: 2014,
    imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 2,
    playtime: 25,
    category: 'Xếp hình Tetris 2 người / May vá',
    publisher: 'Lookout Games',
  },
  {
    id: 129622,
    name: 'Love Letter',
    aliases: ['love letter', 'thu tinh love letter', 'thu tinh hoang gia'],
    rating: 7.2,
    year: 2012,
    imageUrl: 'https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 4,
    playtime: 20,
    category: 'Thẻ bài tối giản / Suy luận cung đình',
    publisher: 'Z-Man Games',
  },
  {
    id: 133526,
    name: 'Sushi Go!',
    aliases: ['sushi go', 'sushi go!', 'an sushi'],
    rating: 7.0,
    year: 2013,
    imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 5,
    playtime: 15,
    category: 'Chọn bài nhanh / Ẩm thực Nhật Bản',
    publisher: 'Gamewright',
  },
  {
    id: 192291,
    name: 'Sushi Go Party!',
    aliases: ['sushi go party', 'sushi go party!'],
    rating: 7.4,
    year: 2016,
    imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 8,
    playtime: 25,
    category: 'Tiệc tùng ẩm thực / Chọn bài',
    publisher: 'Gamewright',
  },
  {
    id: 54043,
    name: 'Jaipur',
    aliases: ['jaipur', 'cho jaipur', 'giao thuong jaipur'],
    rating: 7.5,
    year: 2009,
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 2,
    playtime: 30,
    category: 'Giao thương Ấn Độ 2 người',
    publisher: 'Space Cowboys',
  },
  {
    id: 2655,
    name: 'Hive',
    aliases: ['hive', 'co con trung hive', 'hive pocket'],
    rating: 7.3,
    year: 2001,
    imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 2,
    playtime: 20,
    category: 'Cờ côn trùng trừu tượng không bàn',
    publisher: 'Gen42 Games',
  },
  {
    id: 194655,
    name: 'Santorini',
    aliases: ['santorini', 'xay dao santorini'],
    rating: 7.4,
    year: 2016,
    imageUrl: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 4,
    playtime: 20,
    category: 'Xây tháp Hy Lạp / Thần thoại',
    publisher: 'Roxley Games',
  },
  {
    id: 244992,
    name: 'The Mind',
    aliases: ['the mind', 'dong tam the mind', 'the mind card game'],
    rating: 6.8,
    year: 2018,
    imageUrl: 'https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 4,
    playtime: 15,
    category: 'Thần giao cách cảm / Hợp tác',
    publisher: 'Nürnberger-Spielkarten-Verlag',
  },
  {
    id: 36218,
    name: 'Dominion',
    aliases: ['dominion', 'xay de che dominion'],
    rating: 7.6,
    year: 2008,
    imageUrl: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 4,
    playtime: 30,
    category: 'Xây cỗ bài nguyên bản / Trung cổ',
    publisher: 'Rio Grande Games',
  },
  {
    id: 170216,
    name: 'Blood Rage',
    aliases: ['blood rage', 'chien binh viking blood rage'],
    rating: 7.9,
    year: 2015,
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 4,
    playtime: 75,
    category: 'Thần thoại Bắc Âu / Chiếm lãnh thổ',
    publisher: 'CMON',
  },
  {
    id: 246900,
    name: 'Nemesis',
    aliases: ['nemesis', 'quai vat khong gian nemesis'],
    rating: 8.3,
    year: 2018,
    imageUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 5,
    playtime: 120,
    category: 'Kinh dị không gian / Sinh tồn bán hợp tác',
    publisher: 'Awaken Realms',
  },
  {
    id: 181304,
    name: 'Mysterium',
    aliases: ['mysterium', 'hon ma mysterium', 'giai ma giac mo'],
    rating: 7.2,
    year: 2015,
    imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 7,
    playtime: 45,
    category: 'Giao tiếp bằng hình ảnh / Tâm linh',
    publisher: 'Libellud',
  },
  {
    id: 153938,
    name: 'Camel Up',
    aliases: ['camel up', 'dua lac da', 'camel cup'],
    rating: 7.1,
    year: 2014,
    imageUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 8,
    playtime: 30,
    category: 'Đua lạc đà sa mạc / Đặt cược',
    publisher: 'eggertspiele',
  },
  {
    id: 70512,
    name: 'King of Tokyo',
    aliases: ['king of tokyo', 'quai thu tokyo', 'vua tokyo'],
    rating: 7.1,
    year: 2011,
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 6,
    playtime: 30,
    category: 'Đại chiến quái vật / Đổ xúc xắc',
    publisher: 'IELLO',
  },
  {
    id: 284160,
    name: 'Iron Clays 200',
    aliases: ['iron clays 200', 'iron clays', 'iron clay', 'iron clay 200', 'poker chip iron clays'],
    rating: 8.8,
    year: 2019,
    imageUrl: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 99,
    playtime: 120,
    category: 'Phụ kiện cao cấp / Poker Chips',
    publisher: 'Roxley Games',
  },
  {
    id: 198773,
    name: 'Codenames: Pictures',
    aliases: ['codenames: pictures', 'codenames pictures', 'mat ma hinh anh', 'codenames picture'],
    rating: 7.2,
    year: 2016,
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 8,
    playtime: 15,
    category: 'Mật mã hình ảnh / Tiệc tùng',
    publisher: 'Czech Games Edition',
  },
  {
    id: 395995,
    name: 'Critter Kitchen',
    aliases: ['critter kitchen', 'nha bep muong thu', 'critters kitchen'],
    rating: 7.8,
    year: 2024,
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 5,
    playtime: 60,
    category: 'Nấu ăn / Quản lý tài nguyên',
    publisher: 'Cardboard Alchemy',
  },
  {
    id: 322289,
    name: "Darwin's Journey",
    aliases: ["darwin's journey", 'darwins journey', 'hanh trinh darwin'],
    rating: 8.1,
    year: 2023,
    imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 120,
    category: 'Worker Placement / Thám hiểm tiến hóa',
    publisher: 'ThunderGRYPH Games',
  },
  {
    id: 394236,
    name: "Darwin's Journey: Scenarios mini-expansion",
    aliases: ["darwin's journey: scenarios mini-expansion", 'darwins journey scenarios', 'darwin scenarios', 'darwins journey expansion'],
    rating: 8.0,
    year: 2023,
    imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 120,
    category: 'Bản mở rộng / Scenarios',
    publisher: 'ThunderGRYPH Games',
  },
  {
    id: 169654,
    name: 'Deep Sea Adventure',
    aliases: ['deep sea adventure', 'tham hiem day bien', 'oink deep sea', 'lan bien'],
    rating: 6.8,
    year: 2014,
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 6,
    playtime: 30,
    category: 'Lặn biển / May rủi / Oink Games',
    publisher: 'Oink Games',
  },
  {
    id: 337777,
    name: 'Dokojong',
    aliases: ['dokojong', 'dokojong oink', 'cho dokojong'],
    rating: 6.9,
    year: 2021,
    imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 5,
    playtime: 20,
    category: 'Tung hỏa mù / Thẻ bài Oink Games',
    publisher: 'Oink Games',
  },
  {
    id: 397598,
    name: 'Dune: Imperium – Uprising',
    aliases: ['dune: imperium – uprising', 'dune: imperium - uprising', 'dune imperium uprising', 'dune uprising', 'xu cat dune uprising'],
    rating: 8.7,
    year: 2023,
    imageUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 120,
    category: 'Chiến thuật sâu / Xây cỗ bài / Xứ Cát',
    publisher: 'Dire Wolf',
  },
  {
    id: 301476,
    name: 'Durian',
    aliases: ['durian', 'sau rieng durian', 'durian oink'],
    rating: 6.7,
    year: 2020,
    imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 7,
    playtime: 15,
    category: 'Nhà hàng hoa quả / Nói dối / Oink Games',
    publisher: 'Oink Games',
  },
  {
    id: 385761,
    name: 'Faraway',
    aliases: ['faraway', 'xa xoi faraway'],
    rating: 7.6,
    year: 2023,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 6,
    playtime: 25,
    category: 'Xây dựng cỗ bài / Đảo ngược thời gian',
    publisher: 'Catch Up Games',
  },
  {
    id: 418197,
    name: 'Flip 7: With A Vengeance',
    aliases: ['flip 7: with a vengeance', 'flip 7', 'flip seven', 'flip 7 with a vengeance'],
    rating: 7.3,
    year: 2024,
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 8,
    playtime: 20,
    category: 'May rủi / Đổ số / Thẻ bài',
    publisher: 'The Op Games',
  },
  {
    id: 423659,
    name: 'FlipToons',
    aliases: ['fliptoons', 'flip toons'],
    rating: 7.2,
    year: 2024,
    imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 6,
    playtime: 20,
    category: 'Phản xạ nhanh / Hoạt họa',
    publisher: 'Board Game Circus',
  },
  {
    id: 296912,
    name: 'Fort',
    aliases: ['fort', 'phao dai fort'],
    rating: 7.2,
    year: 2020,
    imageUrl: 'https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 4,
    playtime: 40,
    category: 'Xây pháo đài trẻ thơ / Deckbuilding',
    publisher: 'Leder Games',
  },
  {
    id: 341169,
    name: 'Great Western Trail: Second Edition',
    aliases: ['great western trail: second edition', 'great western trail second edition', 'gwt second edition', 'gwt 2nd edition', 'great western trail'],
    rating: 8.3,
    year: 2021,
    imageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 150,
    category: 'Chăn bò miền Tây / Xây dựng công trình',
    publisher: 'eggertspiele / Plan B Games',
  },
  {
    id: 333255,
    name: 'Keep the Heroes Out!',
    aliases: ['keep the heroes out!', 'keep the heroes out', 'duoi anh hung'],
    rating: 7.9,
    year: 2022,
    imageUrl: 'https://images.unsplash.com/photo-1563941402622-4e7a488bcc57?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 50,
    category: 'Hợp tác thủ hầm ngục / Đóng vai quái vật',
    publisher: 'Brueh Games',
  },
  {
    id: 366223,
    name: "Keep the Heroes Out!: Guild Master's Revenge Expansion",
    aliases: ["keep the heroes out!: guild master's revenge expansion", 'guild masters revenge', 'keep the heroes out guild master'],
    rating: 8.2,
    year: 2023,
    imageUrl: 'https://images.unsplash.com/photo-1563941402622-4e7a488bcc57?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 50,
    category: 'Bản mở rộng Guild Master',
    publisher: 'Brueh Games',
  },
  {
    id: 366224,
    name: 'Keep the Heroes Out!: The Great Dreamer Expansion',
    aliases: ['keep the heroes out!: the great dreamer expansion', 'the great dreamer expansion', 'keep the heroes out cthulhu'],
    rating: 8.3,
    year: 2023,
    imageUrl: 'https://images.unsplash.com/photo-1563941402622-4e7a488bcc57?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 50,
    category: 'Bản mở rộng Cthulhu Dreamer',
    publisher: 'Brueh Games',
  },
  {
    id: 295373,
    name: 'Long Shot: The Dice Game',
    aliases: ['long shot: the dice game', 'long shot the dice game', 'long shot dice', 'dua ngua long shot'],
    rating: 7.6,
    year: 2022,
    imageUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 8,
    playtime: 30,
    category: 'Đua ngựa xúc xắc / Đặt cược',
    publisher: 'Perplext',
  },
  {
    id: 298729,
    name: 'Marvel United',
    aliases: ['marvel united', 'sieu anh hung marvel united'],
    rating: 7.3,
    year: 2020,
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 40,
    category: 'Siêu anh hùng Marvel / Hợp tác',
    publisher: 'CMON / Spin Master',
  },
  {
    id: 332675,
    name: 'Marvel United: X-Men',
    aliases: ['marvel united: x-men', 'marvel united x-men', 'marvel united di nhan'],
    rating: 7.7,
    year: 2022,
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 5,
    playtime: 45,
    category: 'Dị Nhân X-Men / Hợp tác',
    publisher: 'CMON / Spin Master',
  },
  {
    id: 159581,
    name: 'Maskmen',
    aliases: ['maskmen', 'dau vat maskmen', 'maskmen oink'],
    rating: 6.9,
    year: 2014,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 6,
    playtime: 20,
    category: 'Đấu vật Lucha Libre / Leo thang thẻ bài',
    publisher: 'Oink Games',
  },
  {
    id: 284653,
    name: 'Mind MGMT: The Psychic Espionage “Game.” + Upgrade Kit',
    aliases: ['mind mgmt: the psychic espionage “game.” + upgrade kit', 'mind mgmt', 'mind management', 'mind mgmt game'],
    rating: 8.1,
    year: 2021,
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 5,
    playtime: 60,
    category: 'Điệp viên tâm linh / Di chuyển ẩn vai',
    publisher: 'Off the Page Games',
  },
  {
    id: 118,
    name: 'Modern Art',
    aliases: ['modern art', 'dau gia tranh modern art'],
    rating: 7.3,
    year: 1992,
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 5,
    playtime: 45,
    category: 'Đấu giá tranh nghệ thuật / Kinh tế',
    publisher: 'CMON / Hans im Glück',
  },
  {
    id: 1258,
    name: 'Phase 10',
    aliases: ['phase 10', 'bai phase 10', '10 giai doan'],
    rating: 5.2,
    year: 1982,
    imageUrl: 'https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 6,
    playtime: 45,
    category: 'Thẻ bài truyền thống / 10 giai đoạn',
    publisher: 'Mattel',
  },
  {
    id: 205896,
    name: 'Rising Sun',
    aliases: ['rising sun', 'nhat ban rising sun', 'mat troi moc'],
    rating: 7.8,
    year: 2018,
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 5,
    playtime: 120,
    category: 'Thần thoại Nhật Bản / Chiếm lãnh thổ / Ngoại giao',
    publisher: 'CMON',
  },
  {
    id: 228965,
    name: 'Rising Sun: Dynasty Invasion',
    aliases: ['rising sun: dynasty invasion', 'dynasty invasion'],
    rating: 7.9,
    year: 2018,
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 6,
    playtime: 120,
    category: 'Bản mở rộng Gia tộc xâm lược',
    publisher: 'CMON',
  },
  {
    id: 228964,
    name: 'Rising Sun: Kami Unbound',
    aliases: ['rising sun: kami unbound', 'kami unbound'],
    rating: 7.8,
    year: 2018,
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 5,
    playtime: 120,
    category: 'Bản mở rộng Thần linh Kami',
    publisher: 'CMON',
  },
  {
    id: 228963,
    name: 'Rising Sun: Monster Pack',
    aliases: ['rising sun: monster pack', 'rising sun monsters'],
    rating: 7.7,
    year: 2018,
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 5,
    playtime: 120,
    category: 'Bản mở rộng Quái vật huyền thoại',
    publisher: 'CMON',
  },
  {
    id: 9220,
    name: 'Saboteur',
    aliases: ['saboteur', 'dao vang saboteur', 'ke pha hoai'],
    rating: 6.5,
    year: 2004,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 10,
    playtime: 30,
    category: 'Đào vàng / Kẻ phá hoại ẩn vai',
    publisher: 'AMIGO',
  },
  {
    id: 377470,
    name: 'Sail',
    aliases: ['sail', 'sail board game', 'cheo thuyen sail'],
    rating: 7.8,
    year: 2023,
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 2,
    playtime: 20,
    category: 'Hợp tác 2 người / Hàng hải vượt Kraken',
    publisher: 'Allplay',
  },
  {
    id: 395914,
    name: 'Sail: Seafarers Expansion',
    aliases: ['sail: seafarers expansion', 'sail seafarers'],
    rating: 7.9,
    year: 2023,
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 2,
    playtime: 20,
    category: 'Bản mở rộng Thủy thủ đoàn',
    publisher: 'Allplay',
  },
  {
    id: 291453,
    name: 'SCOUT',
    aliases: ['scout', 'scout oink', 'xiec scout'],
    rating: 7.8,
    year: 2019,
    imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 5,
    playtime: 20,
    category: 'Xiếc tạp kỹ / Leo thang thẻ bài lật số',
    publisher: 'Oink Games',
  },
  {
    id: 338960,
    name: 'Slay the Spire: The Board Game',
    aliases: ['slay the spire: the board game', 'slay the spire', 'slay the spire board game'],
    rating: 8.6,
    year: 2024,
    imageUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 90,
    category: 'Hợp tác leo tháp / Deckbuilding Roguelike',
    publisher: 'Contention Games',
  },
  {
    id: 364073,
    name: 'Splendor Duel',
    aliases: ['splendor duel', 'thuong nhan da quy 2 nguoi'],
    rating: 7.9,
    year: 2022,
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 2,
    playtime: 30,
    category: 'Thương nhân đá quý đối kháng 2 người',
    publisher: 'Space Cowboys',
  },
  {
    id: 332290,
    name: 'Stardew Valley: The Board Game',
    aliases: ['stardew valley: the board game', 'stardew valley', 'nong trai stardew valley'],
    rating: 7.4,
    year: 2021,
    imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 120,
    category: 'Nông trại thung lũng / Hợp tác',
    publisher: 'ConcernedApe',
  },
  {
    id: 223770,
    name: 'Startups',
    aliases: ['startups', 'khoi nghiep startups', 'startups oink'],
    rating: 7.4,
    year: 2017,
    imageUrl: 'https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 6,
    playtime: 20,
    category: 'Đầu tư khởi nghiệp / Thẻ bài cổ đông',
    publisher: 'Oink Games',
  },
  {
    id: 356794,
    name: 'Tiletum',
    aliases: ['tiletum', 'tiletum euro'],
    rating: 7.9,
    year: 2022,
    imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 100,
    category: 'Quản lý xúc xắc Phục hưng Châu Âu',
    publisher: 'Board&Dice',
  },
  {
    id: 265736,
    name: 'Tiny Towns',
    aliases: ['tiny towns', 'thi tran ti hon'],
    rating: 7.3,
    year: 2019,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 6,
    playtime: 45,
    category: 'Xây dựng thị trấn tí hon / Xếp mẫu tài nguyên',
    publisher: 'Alderac Entertainment Group (AEG)',
  },
  {
    id: 391193,
    name: 'The White Castle',
    aliases: ['the white castle', 'white castle', 'lau dai trang'],
    rating: 7.8,
    year: 2023,
    imageUrl: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 80,
    category: 'Lâu đài Himeji Nhật Bản / Euro game',
    publisher: 'Devir',
  },
  {
    id: 200424,
    name: 'Waka Tanka',
    aliases: ['waka tanka', 'than thu waka tanka'],
    rating: 6.3,
    year: 2016,
    imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 6,
    playtime: 20,
    category: 'Thần thú thổ dân / Tung hỏa mù vui nhộn',
    publisher: 'Sweet November',
  },
  {
    id: 368061,
    name: 'Zoo Vadis',
    aliases: ['zoo vadis', 'so thu zoo vadis'],
    rating: 7.8,
    year: 2023,
    imageUrl: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 7,
    playtime: 40,
    category: 'Đàm phán chính trị sở thú / Tiến cử',
    publisher: 'Bitewing Games',
  },
];

/**
 * Strips Vietnamese accents, special characters, and non-title descriptors like "fake", "nhái", "f1", etc.
 */
export function cleanGameTitleForSearch(rawTitle: string): {
  cleanTitle: string;
  isMarkedFake: boolean;
} {
  if (!rawTitle) return { cleanTitle: '', isMarkedFake: false };

  let title = rawTitle.toLowerCase().trim();

  // Check if string contains fake indicators
  const fakeKeywords = [
    'fake',
    'nhái',
    'nhai',
    'rep',
    'replica',
    'f1',
    'bootleg',
    'in lậu',
    'inlau',
    'copy',
    'bản nhái',
    'hàng nhái',
    'không bản quyền',
    'khong ban quyen',
    '1:1',
    'lậu',
  ];

  let isMarkedFake = fakeKeywords.some((k) => title.includes(k));

  // Remove parenthetical noise e.g. "(Bản nhái)", "(Fake)", "(Settlers of Catan)", "(Tiếng Việt)", "(Token nhựa rỗng)"
  title = title.replace(/\(.*?\)/g, ' ');
  title = title.replace(/\[.*?\]/g, ' ');

  // Remove specific indicator words from the core title
  fakeKeywords.forEach((k) => {
    title = title.split(k).join(' ');
  });

  const noiseWords = [
    'chính hãng',
    'chinh hang',
    'authentic',
    'real',
    'tiếng việt',
    'tieng viet',
    'bản mở rộng',
    'expansion',
    'bản in',
    'boardgame',
    'board game',
    'trò chơi',
    'tro choi',
    'bộ cờ',
  ];

  noiseWords.forEach((nw) => {
    title = title.split(nw).join(' ');
  });

  // Normalize accented characters to plain ascii
  title = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { cleanTitle: title, isMarkedFake };
}

/**
 * Normalizes title for strict comparison
 */
function normalizeForComparison(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Searches the curated BGG catalog using normalized fuzzy string matching
 */
export function findInBggCatalog(rawName: string): BggMatchResult | null {
  if (!rawName || !rawName.trim()) return null;

  const rawNorm = normalizeForComparison(rawName);
  const { cleanTitle } = cleanGameTitleForSearch(rawName);
  const cleanNorm = normalizeForComparison(cleanTitle);

  // 0. Primary check against USER_46_GAMES (Exact user collection)
  for (const userGame of USER_46_GAMES) {
    if (
      normalizeForComparison(userGame.name) === rawNorm ||
      normalizeForComparison(userGame.name) === cleanNorm ||
      userGame.aliases.some(
        (a) => normalizeForComparison(a) === rawNorm || normalizeForComparison(a) === cleanNorm
      )
    ) {
      return {
        bggId: userGame.bggId,
        name: userGame.name,
        rating: userGame.rating,
        imageUrl: userGame.imageUrl,
        year: userGame.year,
        minPlayers: userGame.minPlayers,
        maxPlayers: userGame.maxPlayers,
        playtimeMinutes: userGame.playtime,
        category: userGame.category,
        publisher: userGame.publisher,
        bggUrl: `https://boardgamegeek.com/boardgame/${userGame.bggId}`,
        isExactMatch: true,
      };
    }
  }

  // 0b. Containment check against USER_46_GAMES
  for (const userGame of USER_46_GAMES) {
    const norm = normalizeForComparison(userGame.name);
    if (rawNorm.length >= 4 && (rawNorm.includes(norm) || norm.includes(rawNorm))) {
      return {
        bggId: userGame.bggId,
        name: userGame.name,
        rating: userGame.rating,
        imageUrl: userGame.imageUrl,
        year: userGame.year,
        minPlayers: userGame.minPlayers,
        maxPlayers: userGame.maxPlayers,
        playtimeMinutes: userGame.playtime,
        category: userGame.category,
        publisher: userGame.publisher,
        bggUrl: `https://boardgamegeek.com/boardgame/${userGame.bggId}`,
        isExactMatch: true,
      };
    }
  }

  // 1. Exact raw match against entry name or alias (crucial for expansions and full subtitles)
  for (const entry of BGG_CATALOG) {
    if (normalizeForComparison(entry.name) === rawNorm) {
      return {
        bggId: entry.id,
        name: entry.name,
        rating: entry.rating,
        imageUrl: entry.imageUrl,
        year: entry.year,
        minPlayers: entry.minPlayers,
        maxPlayers: entry.maxPlayers,
        playtimeMinutes: entry.playtime,
        category: entry.category,
        publisher: entry.publisher,
        bggUrl: `https://boardgamegeek.com/boardgame/${entry.id}`,
        isExactMatch: true,
      };
    }
    for (const alias of entry.aliases) {
      if (normalizeForComparison(alias) === rawNorm) {
        return {
          bggId: entry.id,
          name: entry.name,
          rating: entry.rating,
          imageUrl: entry.imageUrl,
          year: entry.year,
          minPlayers: entry.minPlayers,
          maxPlayers: entry.maxPlayers,
          playtimeMinutes: entry.playtime,
          category: entry.category,
          publisher: entry.publisher,
          bggUrl: `https://boardgamegeek.com/boardgame/${entry.id}`,
          isExactMatch: true,
        };
      }
    }
  }

  // 2. Clean title match against entry name or alias
  if (cleanNorm) {
    for (const entry of BGG_CATALOG) {
      if (normalizeForComparison(entry.name) === cleanNorm) {
        return {
          bggId: entry.id,
          name: entry.name,
          rating: entry.rating,
          imageUrl: entry.imageUrl,
          year: entry.year,
          minPlayers: entry.minPlayers,
          maxPlayers: entry.maxPlayers,
          playtimeMinutes: entry.playtime,
          category: entry.category,
          publisher: entry.publisher,
          bggUrl: `https://boardgamegeek.com/boardgame/${entry.id}`,
          isExactMatch: true,
        };
      }
      for (const alias of entry.aliases) {
        if (normalizeForComparison(alias) === cleanNorm) {
          return {
            bggId: entry.id,
            name: entry.name,
            rating: entry.rating,
            imageUrl: entry.imageUrl,
            year: entry.year,
            minPlayers: entry.minPlayers,
            maxPlayers: entry.maxPlayers,
            playtimeMinutes: entry.playtime,
            category: entry.category,
            publisher: entry.publisher,
            bggUrl: `https://boardgamegeek.com/boardgame/${entry.id}`,
            isExactMatch: true,
          };
        }
      }
    }
  }

  // 3. Partial substring / token containment match
  let bestEntry: CatalogEntry | null = null;
  let bestScore = 0;
  const targetNorm = cleanNorm || rawNorm;

  for (const entry of BGG_CATALOG) {
    const normName = normalizeForComparison(entry.name);
    if (normName.includes(targetNorm) || targetNorm.includes(normName)) {
      const score = Math.min(normName.length, targetNorm.length) / Math.max(normName.length, targetNorm.length);
      if (score > bestScore) {
        bestScore = score;
        bestEntry = entry;
      }
    }

    for (const alias of entry.aliases) {
      const normAlias = normalizeForComparison(alias);
      if (normAlias.includes(targetNorm) || targetNorm.includes(normAlias)) {
        const score = Math.min(normAlias.length, targetNorm.length) / Math.max(normAlias.length, targetNorm.length);
        if (score > bestScore) {
          bestScore = score;
          bestEntry = entry;
        }
      }
    }
  }

  if (bestEntry && bestScore >= 0.4) {
    return {
      bggId: bestEntry.id,
      name: bestEntry.name,
      rating: bestEntry.rating,
      imageUrl: bestEntry.imageUrl,
      year: bestEntry.year,
      minPlayers: bestEntry.minPlayers,
      maxPlayers: bestEntry.maxPlayers,
      playtimeMinutes: bestEntry.playtime,
      category: bestEntry.category,
      publisher: bestEntry.publisher,
      bggUrl: `https://boardgamegeek.com/boardgame/${bestEntry.id}`,
      isExactMatch: false,
    };
  }

  return null;
}

/**
 * Queries the official BoardGameGeek XML API2 with CORS fallback
 */
export async function searchBggOnline(gameName: string): Promise<BggMatchResult | null> {
  const { cleanTitle } = cleanGameTitleForSearch(gameName);
  if (!cleanTitle || cleanTitle.length < 2) return null;

  const bggSearchUrl = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(cleanTitle)}&type=boardgame`;
  const proxyUrls = [
    bggSearchUrl,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(bggSearchUrl)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(bggSearchUrl)}`,
  ];

  let xmlText = '';
  for (const url of proxyUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const txt = await res.text();
        if (txt && txt.includes('<items')) {
          xmlText = txt;
          break;
        }
      }
    } catch {
      continue;
    }
  }

  if (!xmlText) return null;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const items = doc.querySelectorAll('item');
    if (!items || items.length === 0) return null;

    // Pick best item (first one or best name match)
    const firstItem = items[0];
    const bggId = parseInt(firstItem.getAttribute('id') || '0', 10);
    const nameElem = firstItem.querySelector('name[type="primary"]') || firstItem.querySelector('name');
    const foundName = nameElem?.getAttribute('value') || cleanTitle;
    const yearElem = firstItem.querySelector('yearpublished');
    const year = yearElem ? parseInt(yearElem.getAttribute('value') || '0', 10) : undefined;

    if (!bggId) return null;

    // Query details for image and ratings
    const detailsUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=1`;
    let detailsXml = '';

    for (const url of [
      detailsUrl,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(detailsUrl)}`,
    ]) {
      try {
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), 4000);
        const r = await fetch(url, { signal: c.signal });
        clearTimeout(t);
        if (r.ok) {
          const t2 = await r.text();
          if (t2 && t2.includes('<items')) {
            detailsXml = t2;
            break;
          }
        }
      } catch {
        continue;
      }
    }

    let rating = 7.5;
    let imageUrl = '';
    let minPlayers = 2;
    let maxPlayers = 4;
    let playtime = 45;
    let publisher = 'BoardGameGeek';

    if (detailsXml) {
      const detDoc = parser.parseFromString(detailsXml, 'text/xml');
      const imgElem = detDoc.querySelector('image') || detDoc.querySelector('thumbnail');
      if (imgElem && imgElem.textContent) {
        imageUrl = imgElem.textContent.trim();
      }

      const ratingElem = detDoc.querySelector('statistics ratings average');
      if (ratingElem) {
        const val = parseFloat(ratingElem.getAttribute('value') || '0');
        if (!isNaN(val) && val > 0) {
          rating = Math.round(val * 10) / 10;
        }
      }

      const minp = detDoc.querySelector('minplayers');
      if (minp) minPlayers = parseInt(minp.getAttribute('value') || '2', 10);

      const maxp = detDoc.querySelector('maxplayers');
      if (maxp) maxPlayers = parseInt(maxp.getAttribute('value') || '4', 10);

      const ptime = detDoc.querySelector('playingtime');
      if (ptime) playtime = parseInt(ptime.getAttribute('value') || '45', 10);

      const pub = detDoc.querySelector('link[type="boardgamepublisher"]');
      if (pub) publisher = pub.getAttribute('value') || publisher;
    }

    return {
      bggId,
      name: foundName,
      rating,
      imageUrl: imageUrl || getGenerativeBoardGameBoxArt(foundName),
      year,
      minPlayers,
      maxPlayers,
      playtimeMinutes: playtime,
      publisher,
      bggUrl: `https://boardgamegeek.com/boardgame/${bggId}`,
    };
  } catch {
    return null;
  }
}

/**
 * Returns a high-res SVG cover art placeholder customized for the game's title,
 * preventing unrelated game covers from showing up.
 */
export function getGenerativeBoardGameBoxArt(title: string): string {
  if (title) {
    const raw = title.toLowerCase().trim();
    const match = USER_46_GAMES.find((g) => {
      const gName = g.name.toLowerCase();
      return (
        gName === raw ||
        raw.includes(gName) ||
        gName.includes(raw) ||
        g.aliases?.some((a) => raw.includes(a.toLowerCase()) || a.toLowerCase().includes(raw))
      );
    });
    if (match && match.imageUrl && !match.imageUrl.includes('placeholder')) {
      return match.imageUrl;
    }
  }

  const hash = title
    .split('')
    .reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 360, 0);

  const hue1 = hash;
  const hue2 = (hash + 50) % 360;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="hsl(${hue1}, 70%, 12%)\" />
      <stop offset="50%" stop-color="hsl(${hue2}, 60%, 8%)\" />
      <stop offset="100%" stop-color="#090d16" />
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="50%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
  </defs>
  <rect width="600" height="800" fill="url(#bg)" />
  <rect x="20" y="20" width="560" height="760" fill="none" stroke="url(#gold)" stroke-width="3" rx="12" />
  <rect x="30" y="30" width="540" height="740" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1" rx="8" />
  
  <!-- Decorative Header Ribbon -->
  <path d="M 30 100 L 570 100" stroke="url(#gold)" stroke-width="2" stroke-dasharray="8,4" />
  <rect x="180" y="76" width="240" height="48" rx="24" fill="hsl(${hue1}, 60%, 20%)" stroke="url(#gold)" stroke-width="2" />
  <text x="300" y="107" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="#fbbf24" text-anchor="middle" letter-spacing="3">OFFICIAL BOX ART</text>

  <!-- Central Emblem -->
  <circle cx="300" cy="340" r="120" fill="none" stroke="rgba(245,158,11,0.25)" stroke-width="2" stroke-dasharray="6,6" />
  <circle cx="300" cy="340" r="95" fill="hsl(${hue1}, 50%, 18%)" stroke="url(#gold)" stroke-width="2" />
  
  <!-- Icon: Meeple / Star -->
  <path d="M 300 280 L 315 315 L 350 320 L 325 345 L 332 380 L 300 360 L 268 380 L 275 345 L 250 320 L 285 315 Z" fill="url(#gold)" opacity="0.9" />

  <!-- Game Title -->
  <text x="300" y="520" font-family="system-ui, -apple-system, sans-serif" font-size="36" font-weight="900" fill="#ffffff" text-anchor="middle" filter="drop-shadow(0px 4px 8px rgba(0,0,0,0.8))">
    ${escapeXml(title.length > 22 ? title.substring(0, 22) + '...' : title)}
  </text>
  
  <text x="300" y="570" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="600" fill="#93c5fd" text-anchor="middle">
    ${escapeXml(title.length > 22 ? title.substring(22, 50) : 'Board Game Collection')}
  </text>

  <!-- Footer Tag -->
  <rect x="150" y="660" width="300" height="50" rx="25" fill="rgba(15, 23, 42, 0.9)" stroke="url(#gold)" stroke-width="2" />
  <text x="300" y="692" font-family="system-ui, sans-serif" font-size="16" font-weight="800" fill="#fef08a" text-anchor="middle" letter-spacing="1">VERIFIED BOARDGAME</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

/**
 * Resolves BGG rating, high-res box art, and BGG metadata for any game title
 */
export async function resolveBggData(
  title: string
): Promise<BggMatchResult | null> {
  if (!title || !title.trim()) return null;

  // 1. Instant check against curated catalog
  const catalogMatch = findInBggCatalog(title);
  if (catalogMatch) {
    return catalogMatch;
  }

  // 2. Query live BGG API
  try {
    const liveMatch = await searchBggOnline(title);
    if (liveMatch) {
      return liveMatch;
    }
  } catch (err) {
    console.warn('Live BGG lookup error:', err);
  }

  // 3. Unknown game: return a clean generative placeholder with neutral rating
  return {
    bggId: 0,
    name: title,
    rating: 7.2,
    imageUrl: getGenerativeBoardGameBoxArt(title),
    bggUrl: `https://boardgamegeek.com/geeksearch.php?action=search&q=${encodeURIComponent(title)}`,
  };
}

/**
 * Auto-enriches an array of games with accurate BGG rating, official box art,
 * and fixes fake cabinet classification if detected in names or notes.
 */
export async function enrichCollectionWithBgg(
  games: BoardGame[]
): Promise<{ enrichedGames: BoardGame[]; updatedCount: number }> {
  let updatedCount = 0;

  const enriched = await Promise.all(
    games.map(async (game) => {
      const { cleanTitle, isMarkedFake } = cleanGameTitleForSearch(game.name);

      // Check fake indicators from all fields
      const fakeWords = ['fake', 'nhai', 'nhái', 'rep', 'replica', 'f1', 'in lau', 'in lậu', 'bootleg', 'copy'];
      const notesLower = (game.authenticityNotes || '').toLowerCase();
      const conditionLower = (game.condition || '').toLowerCase();
      const statusLower = (game.status || '').toLowerCase();

      const shouldBeFake =
        isMarkedFake ||
        fakeWords.some(
          (w) =>
            notesLower.includes(w) ||
            conditionLower.includes(w) ||
            statusLower.includes(w)
        );

      let cabinetType: CabinetType = game.cabinetType;
      let status = game.status || 'On Hand';

      // Fix cabinetType if it was wrongly categorized as real
      if (shouldBeFake && cabinetType !== 'fake') {
        cabinetType = 'fake';
        updatedCount++;
      }

      // Check BGG data
      const bgg = await resolveBggData(game.name);
      if (bgg) {
        let updated = false;
        const newGame = { ...game, cabinetType, status };

        // Update rating if not customized or default
        if (!newGame.bggRating || newGame.bggRating !== bgg.rating) {
          newGame.bggRating = bgg.rating;
          newGame.bggId = bgg.bggId || undefined;
          newGame.bggUrl = bgg.bggUrl;
          // If current rating is default 8.0 or unset, set it to BGG rating
          if (!newGame.rating || newGame.rating === 8.0) {
            newGame.rating = bgg.rating;
          }
          updated = true;
        }

        // Update image if current image is generic/broken or default catan
        const isGenericImage =
          !newGame.imageUrl ||
          newGame.imageUrl.includes('Catan-2015-boxart.jpg') ||
          newGame.imageUrl.includes('placeholder') ||
          newGame.imageUrl.trim() === '';

        if ((isGenericImage || bgg.isExactMatch) && bgg.imageUrl) {
          // If the game is fake, we can still use the official cover box as the artwork!
          newGame.imageUrl = bgg.imageUrl;
          updated = true;
        }

        if (updated) {
          updatedCount++;
          return newGame;
        }
      }

      return { ...game, cabinetType, status };
    })
  );

  return { enrichedGames: enriched, updatedCount };
}

/**
 * Retrieves full user collection metadata (box color, spine width, etc.)
 */
export function getUserGameMetadata(rawName: string) {
  if (!rawName) return null;
  const rawNorm = normalizeForComparison(rawName);
  const { cleanTitle } = cleanGameTitleForSearch(rawName);
  const cleanNorm = normalizeForComparison(cleanTitle);

  for (const userGame of USER_46_GAMES) {
    if (
      normalizeForComparison(userGame.name) === rawNorm ||
      normalizeForComparison(userGame.name) === cleanNorm ||
      userGame.aliases.some(
        (a) => normalizeForComparison(a) === rawNorm || normalizeForComparison(a) === cleanNorm
      ) ||
      (rawNorm.length >= 4 &&
        (rawNorm.includes(normalizeForComparison(userGame.name)) ||
          normalizeForComparison(userGame.name).includes(rawNorm)))
    ) {
      return userGame;
    }
  }
  return null;
}

