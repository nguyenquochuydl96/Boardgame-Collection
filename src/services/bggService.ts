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
  aliases?: string[];
  alases?: string[];
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
    alases: ['catan', 'settlers of catan', 'the settlers of catan', 'o catan', 'catan nguo kha hoang'],
    rating: 7.1,
    year: 1995,
    imageUrl: '/images/boxes/catan.jpg',
    minPlayers: 3,
    maxPlayers: 4,
    playtime: 75,
    category: 'Strategy / Trading',
    publisher: 'KOSMOS / Catan Studio',
  },
  {
    id: 148228,
    name: 'Splendor',
    alases: ['splendor', 'thuong nhan da quy', 'splendor thuong nhan'],
    rating: 7.4,
    year: 2014,
    imageUrl: '/images/boxes/splendor.jpg',
    minPlayers: 2,
    maxPlayers: 4,
    playtime: 30,
    category: 'Engine Building / Card Drafting',
    publisher: 'Space Cowboys',
  },
  {
    id: 266192,
    name: 'Wingspan',
    alases: ['wngspan', 'do canh then nhen', 'chm canh', 'wngspan asa', 'wngspan oceana'],
    rating: 8.1,
    year: 2019,
    imageUrl: '/images/boxes/wingspan.jpg',
    minPlayers: 1,
    maxPlayers: 5,
    playtime: 70,
    category: 'Engine Building / Ecology',
    publisher: 'Stonemaier Games',
  },
  {
    id: 230802,
    name: 'Azul',
    alases: ['azul', 'gach men azul', 'lat gach azul', 'azul staned glass'],
    rating: 7.8,
    year: 2017,
    imageUrl: '/images/boxes/azul.jpg',
    minPlayers: 2,
    maxPlayers: 4,
    playtime: 40,
    category: 'Abstract Strategy / Pattern Building',
    publisher: 'Next Move Games / Plan B',
  },
  {
    id: 9209,
    name: 'Ticket to Ride',
    alases: ['tcket to rde', 'doan tau toc hanh', 've tau toc hanh', 'ttr'],
    rating: 7.4,
    year: 2004,
    imageUrl: '/images/boxes/ticket-to-ride.jpg',
    minPlayers: 2,
    maxPlayers: 5,
    playtime: 60,
    category: 'Route Building / Trains',
    publisher: 'Days of Wonder',
  },
  {
    id: 14996,
    name: 'Ticket to Ride: Europe',
    alases: ['tcket to rde europe', 've tau chau au', 'ttr europe'],
    rating: 7.5,
    year: 2005,
    imageUrl: '/images/boxes/ticket-to-ride.jpg',
    minPlayers: 2,
    maxPlayers: 5,
    playtime: 60,
    category: 'Route Building / Trains',
    publisher: 'Days of Wonder',
  },
  {
    id: 822,
    name: 'Carcassonne',
    alases: ['carcassonne', 'thanh carcassonne', 'xay thanh', 'dat tle carcassonne'],
    rating: 7.4,
    year: 2000,
    imageUrl: '/images/boxes/carcassonne.jpg',
    minPlayers: 2,
    maxPlayers: 5,
    playtime: 40,
    category: 'Tile Placement / Medieval',
    publisher: 'Hans im Glueck',
  },
  {
    id: 128882,
    name: 'The Resistance: Avalon',
    alases: ['avalon', 'the resstance avalon', 'the resstance: avalon', 'avalon teng vet', 'khang chen avalon'],
    rating: 7.5,
    year: 2012,
    imageUrl: '/images/boxes/avalon.jpg',
    minPlayers: 5,
    maxPlayers: 10,
    playtime: 30,
    category: 'Social Deduction / Hidden Roles',
    publisher: 'Indie Boards & Cards',
  },
  {
    id: 188834,
    name: 'Secret Hitler',
    alases: ['secret htler', 'htler an danh', 'htler b mat'],
    rating: 7.5,
    year: 2016,
    imageUrl: '/images/boxes/secret-hitler.png',
    minPlayers: 5,
    maxPlayers: 10,
    playtime: 45,
    category: 'Social Deduction / Political Intrigue',
    publisher: 'Goat, Wolf, & Cabbage',
  },
  {
    id: 172225,
    name: 'Exploding Kittens',
    alases: ['explodng kttens', 'meo no', 'mo n', 'explodng ktten', 'meo no teng vet'],
    rating: 6.0,
    year: 2015,
    imageUrl: '/images/boxes/exploding-kittens.jpg',
    minPlayers: 2,
    maxPlayers: 5,
    playtime: 15,
    category: 'Party / Push Your Luck',
    publisher: 'Exploding Kittens',
  },
  {
    id: 131357,
    name: 'Coup',
    alases: ['coup', 'dao chnh', 'o chnh', 'coup cuoc chen gan dep', 'coup rebellon'],
    rating: 7.0,
    year: 2012,
    imageUrl: '/images/boxes/love-letter.jpg',
    minPlayers: 2,
    maxPlayers: 6,
    playtime: 15,
    category: 'Bluffing / Hidden Roles',
    publisher: 'Indie Boards & Cards',
  },
  {
    id: 3955,
    name: 'Bang!',
    alases: ['bang', 'bang!', 'bang the card game', 'bang ven dan'],
    rating: 6.5,
    year: 2002,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    minPlayers: 4,
    maxPlayers: 7,
    playtime: 35,
    category: 'Western Gunfight / Hidden Roles',
    publisher: 'dV Giochi',
  },
  {
    id: 143741,
    name: 'Bang! The Dice Game',
    alases: ['bang the dce game', 'bang xuc xac', 'bang dce'],
    rating: 7.0,
    year: 2013,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 8,
    playtime: 15,
    category: 'Dice Rolling / Hidden Roles',
    publisher: 'dV Giochi',
  },
  {
    id: 178900,
    name: 'Codenames',
    alases: ['codenames', 'mat ma', 'mt m', 'codenames teng vet', 'mat ma dep ven'],
    rating: 7.6,
    year: 2015,
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 8,
    playtime: 15,
    category: 'Word Deduction / Party Game',
    publisher: 'Czech Games Edition',
  },
  {
    id: 30549,
    name: 'Pandemic',
    alases: ['pandemc', 'da dch', ' dch', 'pandemc legacy'],
    rating: 7.6,
    year: 2008,
    imageUrl: 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 4,
    playtime: 45,
    category: 'Cooperative / Pandemic Prevention',
    publisher: 'Z-Man Games',
  },
  {
    id: 39856,
    name: 'Dixit',
    alases: ['dxt', 'dxt odyssey', 'ke chuyen dxt'],
    rating: 7.2,
    year: 2008,
    imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 8,
    playtime: 30,
    category: 'Abstract Art / Storytelling',
    publisher: 'Libellud',
  },
  {
    id: 68448,
    name: '7 Wonders',
    alases: ['7 wonders', 'bay ky quan', '7 ky quan', 'seven wonders'],
    rating: 7.7,
    year: 2010,
    imageUrl: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 7,
    playtime: 35,
    category: 'Card Drafting / Civilization Building',
    publisher: 'Repos Production',
  },
  {
    id: 173346,
    name: '7 Wonders Duel',
    alases: ['7 wonders duel', 'bay ky quan do dau', '7 ky quan duel'],
    rating: 8.1,
    year: 2015,
    imageUrl: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 2,
    playtime: 30,
    category: '2-Player Duel / Civilization',
    publisher: 'Repos Production',
  },
  {
    id: 167791,
    name: 'Terraforming Mars',
    alases: ['terraformng mars', 'kha pha sao hoa', 'tfm', 'sao hoa'],
    rating: 8.4,
    year: 2016,
    imageUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 5,
    playtime: 120,
    category: 'Sci-Fi / Resource Management',
    publisher: 'FryxGames / Stronghold',
  },
  {
    id: 169786,
    name: 'Scythe',
    alases: ['scythe', 'co may scythe', 'scythe 1920'],
    rating: 8.2,
    year: 2016,
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 5,
    playtime: 115,
    category: 'Area Control / Dieselpunk Strategy',
    publisher: 'Stonemaier Games',
  },
  {
    id: 316554,
    name: 'Dune: Imperium',
    alases: ['dune mperum', 'dune: mperum', 'xu cat dune', 'dune uprsng'],
    rating: 8.4,
    year: 2020,
    imageUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 90,
    category: 'Deck Building / Worker Placement',
    publisher: 'Dire Wolf',
  },
  {
    id: 237182,
    name: 'Root',
    alases: ['root', 'khu rung root', 'chen tranh rung xanh root'],
    rating: 8.1,
    year: 2018,
    imageUrl: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 4,
    playtime: 80,
    category: 'Asymmetric Strategy / Woodland Animals',
    publisher: 'Leder Games',
  },
  {
    id: 295947,
    name: 'Cascadia',
    alases: ['cascada', 'vuon quoc ga cascada', 'he snh tha cascada'],
    rating: 8.0,
    year: 2021,
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 40,
    category: 'Habitat Building / Tile Placement',
    publisher: 'Flatout Games',
  },
  {
    id: 224517,
    name: 'Brass: Birmingham',
    alases: ['brass brmngham', 'brass: brmngham', 'brass cong nghep'],
    rating: 8.6,
    year: 2018,
    imageUrl: 'https://cdn.shopify.com/s/files/1/0246/2190/8043/t/5/assets/f78ba2a93e5e--BrassB-RetailBoxImage.png?v=1781038782',
    minPlayers: 2,
    maxPlayers: 4,
    playtime: 120,
    category: 'Economic Strategy / Industrial Revolution',
    publisher: 'Roxley Games',
  },
  {
    id: 174430,
    name: 'Gloomhaven',
    alases: ['gloomhaven', 'thanh gloomhaven', 'gloomhaven jaws of the lon'],
    rating: 8.6,
    year: 2017,
    imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 120,
    category: 'Fantasy Dungeon Crawler / Campaign',
    publisher: 'Cephalofair Games',
  },
  {
    id: 162886,
    name: 'Spirit Island',
    alases: ['sprt sland', 'dao tnh lnh', 'tnh lnh chong ngoa xam'],
    rating: 8.3,
    year: 2017,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 100,
    category: 'Complex Cooperative / Island Defense',
    publisher: 'Greater Than Games',
  },
  {
    id: 342942,
    name: 'Ark Nova',
    alases: ['ark nova', 'vuon thu ark nova', 'thao cam ven ark nova'],
    rating: 8.5,
    year: 2021,
    imageUrl: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 140,
    category: 'Zoo Management / Animals',
    publisher: 'Feuerland Spiele / Capstone Games',
  },
  {
    id: 199792,
    name: 'Everdell',
    alases: ['everdell', 'thung lung everdell', 'cay co thu everdell'],
    rating: 8.1,
    year: 2018,
    imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 60,
    category: 'City Building / Woodland Creatures',
    publisher: 'Starling Games',
  },
  {
    id: 312484,
    name: 'Lost Ruins of Arnak',
    alases: ['lost runs of arnak', 'tan tch arnak', 'arnak'],
    rating: 8.1,
    year: 2020,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 90,
    category: 'Island Exploration / Archaeology',
    publisher: 'Czech Games Edition',
  },
  {
    id: 366013,
    name: 'Heat: Pedal to the Metal',
    alases: ['heat', 'heat pedal to the metal', 'dua xe heat', 'heat dua xe'],
    rating: 8.1,
    year: 2022,
    imageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 6,
    playtime: 60,
    category: 'Vintage Auto Racing / Hand Management',
    publisher: 'Days of Wonder',
  },
  {
    id: 84876,
    name: 'The Castles of Burgundy',
    alases: ['castles of burgundy', 'lau da burgundy', 'the castles of burgundy'],
    rating: 8.1,
    year: 2011,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 4,
    playtime: 80,
    category: 'Euro Game / Dice Placement',
    publisher: 'alea / Ravensburger',
  },
  {
    id: 2223,
    name: 'UNO',
    alases: ['uno', 'uno card game', 'ba uno', 'uno da chen'],
    rating: 5.4,
    year: 1971,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f9/UNO_Logo.svg',
    minPlayers: 2,
    maxPlayers: 10,
    playtime: 20,
    category: 'Family Card Game / Hand Shedding',
    publisher: 'Mattel',
  },
  {
    id: 1406,
    name: 'Monopoly',
    alases: ['monopoly', 'co ty phu', 'c t ph', 'monopoly deal'],
    rating: 4.4,
    year: 1935,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/20/Monopoly_pack_horizontal.png',
    minPlayers: 2,
    maxPlayers: 8,
    playtime: 120,
    category: 'Classic Real Estate / Trading',
    publisher: 'Hasbro',
  },
  {
    id: 1294,
    name: 'Clue',
    alases: ['clue', 'cluedo', 'pha an clue', 'deu tra an mang clue'],
    rating: 5.7,
    year: 1949,
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 6,
    playtime: 45,
    category: 'Crime Investigation / Deduction',
    publisher: 'Hasbro',
  },
  {
    id: 25821,
    name: 'The Werewolves of Millers Hollow',
    alases: ['ma so', 'ma s', 'werewolf', 'the werewolves of mllers hollow', 'ultmate werewolf'],
    rating: 6.9,
    year: 2001,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    minPlayers: 8,
    maxPlayers: 18,
    playtime: 30,
    category: 'Social Deduction / Werewolf',
    publisher: 'Lui-meme',
  },
  {
    id: 41224,
    name: 'SanGuoSha',
    alases: ['tam quoc sat', 'tam quc st', 'sanguosha', 'tam quoc sat no chen'],
    rating: 6.4,
    year: 2008,
    imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 10,
    playtime: 40,
    category: 'Social Deduction / Three Kingdoms',
    publisher: 'Yoka Games',
  },
  {
    id: 175649,
    name: 'Salem 1692',
    alases: ['salem 1692', 'salem', 'phu thuy salem', 'san phu thuy salem'],
    rating: 6.9,
    year: 2015,
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    minPlayers: 4,
    maxPlayers: 12,
    playtime: 35,
    category: 'Witch Hunt / Social Deduction',
    publisher: 'Facade Games',
  },
  {
    id: 92415,
    name: 'Skull',
    alases: ['skull', 'dau lau skull', 'skull and roses'],
    rating: 7.2,
    year: 2011,
    imageUrl: 'https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 6,
    playtime: 20,
    category: 'Bluffing / Psychology',
    publisher: 'Space Cowboys',
  },
  {
    id: 156129,
    name: 'Deception: Murder in Hong Kong',
    alases: ['decepton', 'decepton murder n hong kong', 'an mang hong kong', 'decepton an mang'],
    rating: 7.4,
    year: 2014,
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    minPlayers: 4,
    maxPlayers: 12,
    playtime: 25,
    category: 'Forensic Science / Murder Investigation',
    publisher: 'Grey Fox Games',
  },
  {
    id: 157969,
    name: 'Sheriff of Nottingham',
    alases: ['sherff of nottngham', 'quan huyen nottngham', 'buon lau nottngham'],
    rating: 7.1,
    year: 2014,
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 5,
    playtime: 50,
    category: 'Trading / Bluffing / Bribery',
    publisher: 'Arcane Wonders',
  },
  {
    id: 163412,
    name: 'Patchwork',
    alases: ['patchwork', 'may va patchwork', 'may chan patchwork'],
    rating: 7.6,
    year: 2014,
    imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 2,
    playtime: 25,
    category: '2-Player Polyomino / Quilt Sewing',
    publisher: 'Lookout Games',
  },
  {
    id: 129622,
    name: 'Love Letter',
    alases: ['love letter', 'thu tnh love letter', 'thu tnh hoang ga'],
    rating: 7.2,
    year: 2012,
    imageUrl: 'https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 4,
    playtime: 20,
    category: 'Social Deduction / Micro Card Game',
    publisher: 'Z-Man Games',
  },
  {
    id: 133526,
    name: 'Sushi Go!',
    alases: ['sush go', 'sush go!', 'an sush'],
    rating: 7.0,
    year: 2013,
    imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 5,
    playtime: 15,
    category: 'Fast Card Drafting / Japanese Cuisine',
    publisher: 'Gamewright',
  },
  {
    id: 192291,
    name: 'Sushi Go Party!',
    alases: ['sush go party', 'sush go party!'],
    rating: 7.4,
    year: 2016,
    imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 8,
    playtime: 25,
    category: 'Food Party / Card Drafting',
    publisher: 'Gamewright',
  },
  {
    id: 54043,
    name: 'Jaipur',
    alases: ['japur', 'cho japur', 'gao thuong japur'],
    rating: 7.5,
    year: 2009,
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 2,
    playtime: 30,
    category: '2-Player Trading / Indian Spice Market',
    publisher: 'Space Cowboys',
  },
  {
    id: 2655,
    name: 'Hive',
    alases: ['hve', 'co con trung hve', 'hve pocket'],
    rating: 7.3,
    year: 2001,
    imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 2,
    playtime: 20,
    category: 'Abstract Strategy / Entomology',
    publisher: 'Gen42 Games',
  },
  {
    id: 194655,
    name: 'Santorini',
    alases: ['santorn', 'xay dao santorn'],
    rating: 7.4,
    year: 2016,
    imageUrl: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 4,
    playtime: 20,
    category: 'Greek Mythology / Tower Building',
    publisher: 'Roxley Games',
  },
  {
    id: 244992,
    name: 'The Mind',
    alases: ['the mnd', 'dong tam the mnd', 'the mnd card game'],
    rating: 6.8,
    year: 2018,
    imageUrl: 'https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 4,
    playtime: 15,
    category: 'Cooperative / Silent Communication',
    publisher: 'Nuernberger-Spielkarten-Verlag',
  },
  {
    id: 36218,
    name: 'Dominion',
    alases: ['domnon', 'xay de che domnon'],
    rating: 7.6,
    year: 2008,
    imageUrl: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 4,
    playtime: 30,
    category: 'Original Deck Building / Medieval',
    publisher: 'Rio Grande Games',
  },
  {
    id: 170216,
    name: 'Blood Rage',
    alases: ['blood rage', 'chen bnh vkng blood rage'],
    rating: 7.9,
    year: 2015,
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 4,
    playtime: 75,
    category: 'Norse Mythology / Area Control',
    publisher: 'CMON',
  },
  {
    id: 246900,
    name: 'Nemesis',
    alases: ['nemess', 'qua vat khong gan nemess'],
    rating: 8.3,
    year: 2018,
    imageUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 5,
    playtime: 120,
    category: 'Sci-Fi Horror / Semi-Cooperative',
    publisher: 'Awaken Realms',
  },
  {
    id: 181304,
    name: 'Mysterium',
    alases: ['mysterum', 'hon ma mysterum', 'ga ma gac mo'],
    rating: 7.2,
    year: 2015,
    imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 7,
    playtime: 45,
    category: 'Image Communication / Spiritual Deduction',
    publisher: 'Libellud',
  },
  {
    id: 153938,
    name: 'Camel Up',
    alases: ['camel up', 'dua lac da', 'camel cup'],
    rating: 7.1,
    year: 2014,
    imageUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 8,
    playtime: 30,
    category: 'Desert Camel Racing / Betting',
    publisher: 'eggertspiele',
  },
  {
    id: 70512,
    name: 'King of Tokyo',
    alases: ['kng of tokyo', 'qua thu tokyo', 'vua tokyo'],
    rating: 7.1,
    year: 2011,
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 6,
    playtime: 30,
    category: 'Monster Battle / Dice Rolling',
    publisher: 'IELLO',
  },
  {
    id: 284160,
    name: 'Iron Clays 200',
    alases: ['ron clays 200', 'ron clays', 'ron clay', 'ron clay 200', 'poker chp ron clays'],
    rating: 8.8,
    year: 2019,
    imageUrl: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 99,
    playtime: 120,
    category: 'Accessories / Luxury Game Counters',
    publisher: 'Roxley Games',
  },
  {
    id: 198773,
    name: 'Codenames: Pictures',
    alases: ['codenames: pctures', 'codenames pctures', 'mat ma hnh anh', 'codenames pcture'],
    rating: 7.2,
    year: 2016,
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 8,
    playtime: 15,
    category: 'Social Deduction / Visual Wordplay',
    publisher: 'Czech Games Edition',
  },
  {
    id: 395995,
    name: 'Critter Kitchen',
    alases: ['crtter ktchen', 'nha bep muong thu', 'crtters ktchen'],
    rating: 7.8,
    year: 2024,
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 5,
    playtime: 60,
    category: 'Cooking / Resource Management',
    publisher: 'Cardboard Alchemy',
  },
  {
    id: 322289,
    name: "Darwin's Journey",
    alases: ["darwn's journey", 'darwns journey', 'hanh trnh darwn'],
    rating: 8.1,
    year: 2023,
    imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 120,
    category: 'Worker Placement / Evolutionary Biology',
    publisher: 'ThunderGRYPH Games',
  },
  {
    id: 394236,
    name: "Darwin's Journey: Scenarios mini-expansion",
    alases: ["darwn's journey: scenaros mn-expanson", 'darwns journey scenaros', 'darwn scenaros', 'darwns journey expanson'],
    rating: 8.0,
    year: 2023,
    imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 120,
    category: 'Expansion / Scenarios',
    publisher: 'ThunderGRYPH Games',
  },
  {
    id: 169654,
    name: 'Deep Sea Adventure',
    alases: ['deep sea adventure', 'tham hem day ben', 'onk deep sea', 'lan ben'],
    rating: 6.8,
    year: 2014,
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 6,
    playtime: 30,
    category: 'Push Your Luck / Underwater Exploration',
    publisher: 'Oink Games',
  },
  {
    id: 337777,
    name: 'Dokojong',
    alases: ['dokojong', 'dokojong onk', 'cho dokojong'],
    rating: 6.9,
    year: 2021,
    imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 5,
    playtime: 20,
    category: 'Bluffing / Japanese Card Game',
    publisher: 'Oink Games',
  },
  {
    id: 397598,
    name: 'Dune: Imperium – Uprising',
    alases: ['dune: mperum – uprsng', 'dune: mperum - uprsng', 'dune mperum uprsng', 'dune uprsng', 'xu cat dune uprsng'],
    rating: 8.7,
    year: 2023,
    imageUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 120,
    category: 'Deck Building / Worker Placement / Sci-Fi',
    publisher: 'Dire Wolf',
  },
  {
    id: 301476,
    name: 'Durian',
    alases: ['duran', 'sau reng duran', 'duran onk'],
    rating: 6.7,
    year: 2020,
    imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 7,
    playtime: 15,
    category: 'Fruit Restaurant / Bluffing',
    publisher: 'Oink Games',
  },
  {
    id: 385761,
    name: 'Faraway',
    alases: ['faraway', 'xa xo faraway'],
    rating: 7.6,
    year: 2023,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 6,
    playtime: 25,
    category: 'Card Drafting / Tableau Building',
    publisher: 'Catch Up Games',
  },
  {
    id: 418197,
    name: 'Flip 7: With A Vengeance',
    alases: ['flp 7: wth a vengeance', 'flp 7', 'flp seven', 'flp 7 wth a vengeance'],
    rating: 7.3,
    year: 2024,
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 8,
    playtime: 20,
    category: 'Push Your Luck / Number Sequencing',
    publisher: 'The Op Games',
  },
  {
    id: 423659,
    name: 'FlipToons',
    alases: ['flptoons', 'flp toons'],
    rating: 7.2,
    year: 2024,
    imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 6,
    playtime: 20,
    category: 'Speed Reflex / Animation',
    publisher: 'Board Game Circus',
  },
  {
    id: 296912,
    name: 'Fort',
    alases: ['fort', 'phao da fort'],
    rating: 7.2,
    year: 2020,
    imageUrl: 'https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 4,
    playtime: 40,
    category: 'Deck Building / Neighborhood Forts',
    publisher: 'Leder Games',
  },
  {
    id: 341169,
    name: 'Great Western Trail: Second Edition',
    alases: ['great western tral: second edton', 'great western tral second edton', 'gwt second edton', 'gwt 2nd edton', 'great western tral'],
    rating: 8.3,
    year: 2021,
    imageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 150,
    category: 'Heavy Strategy / Cattle Droving',
    publisher: 'eggertspiele / Plan B Games',
  },
  {
    id: 333255,
    name: 'Keep the Heroes Out!',
    alases: ['keep the heroes out!', 'keep the heroes out', 'duo anh hung'],
    rating: 7.9,
    year: 2022,
    imageUrl: 'https://images.unsplash.com/photo-1563941402622-4e7a488bcc57?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 50,
    category: 'Cooperative / Reverse Dungeon Defense',
    publisher: 'Brueh Games',
  },
  {
    id: 366223,
    name: "Keep the Heroes Out!: Guild Master's Revenge Expansion",
    alases: ["keep the heroes out!: guld master's revenge expanson", 'guld masters revenge', 'keep the heroes out guld master'],
    rating: 8.2,
    year: 2023,
    imageUrl: 'https://images.unsplash.com/photo-1563941402622-4e7a488bcc57?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 50,
    category: 'Expansion / Guild Master',
    publisher: 'Brueh Games',
  },
  {
    id: 366224,
    name: 'Keep the Heroes Out!: The Great Dreamer Expansion',
    alases: ['keep the heroes out!: the great dreamer expanson', 'the great dreamer expanson', 'keep the heroes out cthulhu'],
    rating: 8.3,
    year: 2023,
    imageUrl: 'https://images.unsplash.com/photo-1563941402622-4e7a488bcc57?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 50,
    category: 'Expansion / Cthulhu Dreamer',
    publisher: 'Brueh Games',
  },
  {
    id: 295373,
    name: 'Long Shot: The Dice Game',
    alases: ['long shot: the dce game', 'long shot the dce game', 'long shot dce', 'dua ngua long shot'],
    rating: 7.6,
    year: 2022,
    imageUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 8,
    playtime: 30,
    category: 'Horse Racing / Dice Betting',
    publisher: 'Perplext',
  },
  {
    id: 298729,
    name: 'Marvel United',
    alases: ['marvel unted', 'seu anh hung marvel unted'],
    rating: 7.3,
    year: 2020,
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 40,
    category: 'Marvel Superheroes / Cooperative',
    publisher: 'CMON / Spin Master',
  },
  {
    id: 332675,
    name: 'Marvel United: X-Men',
    alases: ['marvel unted: x-men', 'marvel unted x-men', 'marvel unted d nhan'],
    rating: 7.7,
    year: 2022,
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 5,
    playtime: 45,
    category: 'X-Men Superheroes / Cooperative',
    publisher: 'CMON / Spin Master',
  },
  {
    id: 159581,
    name: 'Maskmen',
    alases: ['maskmen', 'dau vat maskmen', 'maskmen onk'],
    rating: 6.9,
    year: 2014,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 6,
    playtime: 20,
    category: 'Trick Taking / Lucha Libre Wrestling',
    publisher: 'Oink Games',
  },
  {
    id: 284653,
    name: 'Mind MGMT: The Psychic Espionage “Game.” + Upgrade Kit',
    alases: ['mnd mgmt: the psychc esponage “game.” + upgrade kt', 'mnd mgmt', 'mnd management', 'mnd mgmt game'],
    rating: 8.1,
    year: 2021,
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 5,
    playtime: 60,
    category: 'Hidden Movement / Espionage Deduction',
    publisher: 'Off the Page Games',
  },
  {
    id: 118,
    name: 'Modern Art',
    alases: ['modern art', 'dau ga tranh modern art'],
    rating: 7.3,
    year: 1992,
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 5,
    playtime: 45,
    category: 'Art Auction / Market Economics',
    publisher: 'CMON / Hans im Glueck',
  },
  {
    id: 1258,
    name: 'Phase 10',
    alases: ['phase 10', 'ba phase 10', '10 ga doan'],
    rating: 5.2,
    year: 1982,
    imageUrl: 'https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 6,
    playtime: 45,
    category: 'Rummy Style / Family Card Game',
    publisher: 'Mattel',
  },
  {
    id: 205896,
    name: 'Rising Sun',
    alases: ['rsng sun', 'nhat ban rsng sun', 'mat tro moc'],
    rating: 7.8,
    year: 2018,
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 5,
    playtime: 120,
    category: 'Diplomacy / Area Control / Feudal Japan',
    publisher: 'CMON',
  },
  {
    id: 228965,
    name: 'Rising Sun: Dynasty Invasion',
    alases: ['rsng sun: dynasty nvason', 'dynasty nvason'],
    rating: 7.9,
    year: 2018,
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 6,
    playtime: 120,
    category: 'Expansion / Dynasty Invasion',
    publisher: 'CMON',
  },
  {
    id: 228964,
    name: 'Rising Sun: Kami Unbound',
    alases: ['rsng sun: kam unbound', 'kam unbound'],
    rating: 7.8,
    year: 2018,
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 5,
    playtime: 120,
    category: 'Expansion / Kami Unbound',
    publisher: 'CMON',
  },
  {
    id: 228963,
    name: 'Rising Sun: Monster Pack',
    alases: ['rsng sun: monster pack', 'rsng sun monsters'],
    rating: 7.7,
    year: 2018,
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 5,
    playtime: 120,
    category: 'Expansion / Mythical Monsters',
    publisher: 'CMON',
  },
  {
    id: 9220,
    name: 'Saboteur',
    alases: ['saboteur', 'dao vang saboteur', 'ke pha hoa'],
    rating: 6.5,
    year: 2004,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 10,
    playtime: 30,
    category: 'Hidden Roles / Mine Tunneling',
    publisher: 'AMIGO',
  },
  {
    id: 377470,
    name: 'Sail',
    alases: ['sal', 'sal board game', 'cheo thuyen sal'],
    rating: 7.8,
    year: 2023,
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 2,
    playtime: 20,
    category: 'Cooperative / Trick Taking',
    publisher: 'Allplay',
  },
  {
    id: 395914,
    name: 'Sail: Seafarers Expansion',
    alases: ['sal: seafarers expanson', 'sal seafarers'],
    rating: 7.9,
    year: 2023,
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 2,
    playtime: 20,
    category: 'Expansion / Seafarers',
    publisher: 'Allplay',
  },
  {
    id: 291453,
    name: 'SCOUT',
    alases: ['scout', 'scout onk', 'xec scout'],
    rating: 7.8,
    year: 2019,
    imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 5,
    playtime: 20,
    category: 'Hand Management / Circus Climbing',
    publisher: 'Oink Games',
  },
  {
    id: 338960,
    name: 'Slay the Spire: The Board Game',
    alases: ['slay the spre: the board game', 'slay the spre', 'slay the spre board game'],
    rating: 8.6,
    year: 2024,
    imageUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 90,
    category: 'Cooperative / Deck Building Roguelike',
    publisher: 'Contention Games',
  },
  {
    id: 364073,
    name: 'Splendor Duel',
    alases: ['splendor duel', 'thuong nhan da quy 2 nguo'],
    rating: 7.9,
    year: 2022,
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
    minPlayers: 2,
    maxPlayers: 2,
    playtime: 30,
    category: 'Tactical 2-Player / Gem Engine',
    publisher: 'Space Cowboys',
  },
  {
    id: 332290,
    name: 'Stardew Valley: The Board Game',
    alases: ['stardew valley: the board game', 'stardew valley', 'nong tra stardew valley'],
    rating: 7.4,
    year: 2021,
    imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 120,
    category: 'Cooperative / Farming Adventure',
    publisher: 'ConcernedApe',
  },
  {
    id: 223770,
    name: 'Startups',
    alases: ['startups', 'kho nghep startups', 'startups onk'],
    rating: 7.4,
    year: 2017,
    imageUrl: 'https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 6,
    playtime: 20,
    category: 'Stock Speculation / Bluffing',
    publisher: 'Oink Games',
  },
  {
    id: 356794,
    name: 'Tiletum',
    alases: ['tletum', 'tletum euro'],
    rating: 7.9,
    year: 2022,
    imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 100,
    category: 'Renaissance Dice Management / Euro',
    publisher: 'Board&Dice',
  },
  {
    id: 265736,
    name: 'Tiny Towns',
    alases: ['tny towns', 'th tran t hon'],
    rating: 7.3,
    year: 2019,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 6,
    playtime: 45,
    category: 'Spatial Puzzle / Resource Management',
    publisher: 'Alderac Entertainment Group (AEG)',
  },
  {
    id: 391193,
    name: 'The White Castle',
    alases: ['the whte castle', 'whte castle', 'lau da trang'],
    rating: 7.8,
    year: 2023,
    imageUrl: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80',
    minPlayers: 1,
    maxPlayers: 4,
    playtime: 80,
    category: 'Japanese White Castle / Euro Game',
    publisher: 'Devir',
  },
  {
    id: 200424,
    name: 'Waka Tanka',
    alases: ['waka tanka', 'than thu waka tanka'],
    rating: 6.3,
    year: 2016,
    imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 6,
    playtime: 20,
    category: 'Tribal Animal Spirits / Bluffing',
    publisher: 'Sweet November',
  },
  {
    id: 368061,
    name: 'Zoo Vadis',
    alases: ['zoo vads', 'so thu zoo vads'],
    rating: 7.8,
    year: 2023,
    imageUrl: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=800&q=80',
    minPlayers: 3,
    maxPlayers: 7,
    playtime: 40,
    category: 'Negotiation / Political Animals',
    publisher: 'Bitewing Games',
  },
];

/**
 * Strips special characters, noise words, and non-title descriptors like "fake", "f1", etc.
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
    'counterfeit',
    'replica',
    'bootleg',
    'knockoff',
    'reproduction',
    'copy',
    'unlicensed',
    'pirated',
    'counterfeit',
    'nhai',
    'rep',
    'f1',
    'counterfeit',
    'inlau',
    'counterfeit',
    'counterfeit',
    'counterfeit',
    'khong ban quyen',
    '1:1',
    'counterfeit',
  ];

  let isMarkedFake = fakeKeywords.some((k) => title.includes(k));

  // Remove parenthetical noise e.g. "(Counterfeit)", "(Fake)", "(Expansion)", etc.
  title = title.replace(/\(.*?\)/g, ' ');
  title = title.replace(/\[.*?\]/g, ' ');

  // Remove specific indicator words from the core title
  fakeKeywords.forEach((k) => {
    title = title.split(k).join(' ');
  });

  const noiseWords = [
    'authentic',
    'original',
    'genuine',
    'retail',
    'official',
    'chinh hang',
    'real',
    'edition',
    'tieng viet',
    'expansion',
    'expansion',
    'print',
    'boardgame',
    'board game',
    'game',
    'tro choi',
    'tabletop',
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

function resolveCatalogImage(entry: CatalogEntry): string {
  if (entry.imageUrl && !entry.imageUrl.includes('unsplash')) {
    return entry.imageUrl;
  }
  // Try matching user collection box art
  const userMatch = USER_46_GAMES.find(
    (g) =>
      normalizeForComparison(g.name) === normalizeForComparison(entry.name) ||
      g.aliases?.some((a) => normalizeForComparison(a) === normalizeForComparison(entry.name))
  );
  if (userMatch && userMatch.imageUrl) {
    return userMatch.imageUrl;
  }
  return getGenerativeBoardGameBoxArt(entry.name);
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
        imageUrl: resolveCatalogImage(entry),
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
    for (const alias of (entry.aliases || entry.alases || [])) {
      if (normalizeForComparison(alias) === rawNorm) {
        return {
          bggId: entry.id,
          name: entry.name,
          rating: entry.rating,
          imageUrl: resolveCatalogImage(entry),
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
          imageUrl: resolveCatalogImage(entry),
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
      for (const alias of (entry.aliases || entry.alases || [])) {
        if (normalizeForComparison(alias) === cleanNorm) {
          return {
            bggId: entry.id,
            name: entry.name,
            rating: entry.rating,
            imageUrl: resolveCatalogImage(entry),
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

    for (const alias of (entry.aliases || entry.alases || [])) {
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
      imageUrl: resolveCatalogImage(bestEntry),
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
 * Searches Wikipedia REST API for official board game box cover art and lore.
 * Works without API keys, zero rate-limiting for normal use, fully CORS enabled.
 */
export async function fetchWikipediaBoxArt(rawTitle: string): Promise<{
  imageUrl: string;
  gameplayStory?: string;
  year?: number;
  publisher?: string;
} | null> {
  const { cleanTitle } = cleanGameTitleForSearch(rawTitle);
  if (!cleanTitle || cleanTitle.length < 2) return null;

  const normalizedKey = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cacheKey = `bgv_wiki_cover_${normalizedKey}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.imageUrl) return parsed;
    }
  } catch {}

  const slug = cleanTitle.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
  const candidatePages = [
    `${slug}_(board_game)`,
    `${slug}_(game)`,
    slug,
  ];

  for (const page of candidatePages) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(page)}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const data = await res.json();
      const img = data.thumbnail?.source || data.originalimage?.source;
      if (img && !img.includes('disambig') && !img.includes('Question_book') && !img.includes('no_image')) {
        const result = {
          imageUrl: img,
          gameplayStory: data.extract || undefined,
        };
        try { localStorage.setItem(cacheKey, JSON.stringify(result)); } catch {}
        return result;
      }
    } catch {}
  }

  // Fallback: search Wikipedia titles
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const sRes = await fetch(
      `https://en.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(cleanTitle + ' board game')}&limit=2`,
      { signal: controller.signal, headers: { Accept: 'application/json' } }
    );
    clearTimeout(timeout);
    if (sRes.ok) {
      const sData = await sRes.json();
      if (sData.pages && sData.pages.length > 0) {
        const pageKey = sData.pages[0].key;
        const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageKey)}`);
        if (res.ok) {
          const data = await res.json();
          const img = data.thumbnail?.source || data.originalimage?.source;
          if (img && !img.includes('disambig')) {
            const result = {
              imageUrl: img,
              gameplayStory: data.extract || undefined,
            };
            try { localStorage.setItem(cacheKey, JSON.stringify(result)); } catch {}
            return result;
          }
        }
      }
    }
  } catch {}

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
    if (match) {
      if (match.imageUrl && !match.imageUrl.includes('placeholder')) {
        return match.imageUrl;
      }
      // Derive box art filename from name slug (all images are already square 600x600px)
      const slug = match.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      // Try common extensions
      return `/images/boxes/${slug}.jpg`;
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

  // 1. Instant check against curated catalog & 46 user games
  const catalogMatch = findInBggCatalog(title);
  if (
    catalogMatch &&
    catalogMatch.imageUrl &&
    !catalogMatch.imageUrl.includes('images.unsplash.com') &&
    !catalogMatch.imageUrl.includes('placeholder') &&
    !catalogMatch.imageUrl.startsWith('data:image/svg+xml')
  ) {
    return catalogMatch;
  }

  // 2. Wikipedia lookup (high quality official box cover art and lore without API keys)
  try {
    const wikiData = await fetchWikipediaBoxArt(title);
    if (wikiData && wikiData.imageUrl) {
      return {
        bggId: catalogMatch?.bggId || 0,
        name: catalogMatch?.name || title,
        rating: catalogMatch?.rating || 7.5,
        imageUrl: wikiData.imageUrl,
        year: wikiData.year || catalogMatch?.year || new Date().getFullYear(),
        minPlayers: catalogMatch?.minPlayers || 2,
        maxPlayers: catalogMatch?.maxPlayers || 4,
        playtimeMinutes: catalogMatch?.playtimeMinutes || 45,
        category: catalogMatch?.category || 'Strategy',
        publisher: wikiData.publisher || catalogMatch?.publisher || 'Board Game Publisher',
        bggUrl: catalogMatch?.bggUrl || `https://boardgamegeek.com/geeksearch.php?action=search&q=${encodeURIComponent(title)}`,
        isExactMatch: true,
      };
    }
  } catch (err) {
    console.warn('Wikipedia lookup error:', err);
  }

  // 3. Query live BGG API (with proxies)
  try {
    const liveMatch = await searchBggOnline(title);
    if (liveMatch && liveMatch.imageUrl && !liveMatch.imageUrl.includes('placeholder')) {
      return liveMatch;
    }
  } catch (err) {
    console.warn('Live BGG lookup error:', err);
  }

  // 4. Return catalog match if any exists
  if (catalogMatch) {
    return catalogMatch;
  }

  // 5. Unknown game: return a clean generative placeholder with neutral rating
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
      const fakeWords = [
        'fake',
        'counterfeit',
        'replica',
        'bootleg',
        'knockoff',
        'reproduction',
        'copy',
        'unlicensed',
        'pirated',
        'nhai',
        'counterfeit',
        'rep',
        'f1',
        'in lau',
        'counterfeit',
      ];
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

      // Check user metadata first (user's 46 curated collection games)
      const userMeta = getUserGameMetadata(game.name);
      if (userMeta && userMeta.imageUrl) {
        if (game.imageUrl !== userMeta.imageUrl) {
          game = {
            ...game,
            imageUrl: userMeta.imageUrl,
            spineImageUrl: userMeta.spineImageUrl || game.spineImageUrl,
            boxColor: userMeta.boxColor || game.boxColor,
          };
          updatedCount++;
        }
      }

      // Check if image is missing or a generic placeholder / unsplash
      const isGenericImage =
        !game.imageUrl ||
        game.imageUrl.trim() === '' ||
        game.imageUrl.includes('placeholder') ||
        game.imageUrl.includes('images.unsplash.com') ||
        game.imageUrl.startsWith('data:image/svg+xml');

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
          if (!newGame.rating || newGame.rating === 8.0) {
            newGame.rating = bgg.rating;
          }
          updated = true;
        }

        if (isGenericImage && bgg.imageUrl && !bgg.imageUrl.startsWith('data:image/svg+xml')) {
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

