import { BoardGame, CabinetType } from '../types/boardgame';
import { INITIAL_BOARDGAMES } from '../data/defaultGames';
import {
  findInBggCatalog,
  getGenerativeBoardGameBoxArt,
  cleanGameTitleForSearch,
} from './bggService';

export interface SheetParseResult {
  success: boolean;
  games: BoardGame[];
  error?: string;
  sourceType: 'gviz' | 'csv' | 'sample';
  rowCount: number;
}

// Sample Google Sheet URL for demo purposes
export const SAMPLE_GOOGLE_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1iA_55rTj66iH_vA9T1aWbOqF-Z_0c4zL-demo/edit#gid=0';

/**
 * Extracts spreadsheet ID and optional GID from various Google Sheet URL styles
 */
export function parseGoogleSheetUrl(url: string): {
  sheetId: string | null;
  gid: string;
  sheetName: string;
  isPublished: boolean;
} {
  if (!url) return { sheetId: null, gid: '0', sheetName: 'Boardgame Collection', isPublished: false };

  const trimmed = url.trim();

  // Check gid parameter
  let gid = '0';
  const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/i);
  if (gidMatch && gidMatch[1]) {
    gid = gidMatch[1];
  }

  // Check sheet tab name parameter
  let sheetName = 'Boardgame Collection';
  const sheetMatch = trimmed.match(/[#&?]sheet=([^&#]+)/i);
  if (sheetMatch && sheetMatch[1]) {
    sheetName = decodeURIComponent(sheetMatch[1].replace(/\+/g, ' '));
  }

  // 1. MUST check published web link FIRST (/spreadsheets/d/e/...) BEFORE standard (/spreadsheets/d/...)
  const pubMatch = trimmed.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/i);
  if (pubMatch && pubMatch[1]) {
    return { sheetId: pubMatch[1], gid, sheetName, isPublished: true };
  }

  // 2. Check standard Google Sheet ID: /spreadsheets/d/([a-zA-Z0-9-_]+)
  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i);
  if (idMatch && idMatch[1] && idMatch[1] !== 'e') {
    return { sheetId: idMatch[1], gid, sheetName, isPublished: false };
  }

  // 3. Raw spreadsheet ID
  const rawIdMatch = trimmed.match(/^[a-zA-Z0-9-_]{20,}$/);
  if (rawIdMatch) {
    return { sheetId: rawIdMatch[0], gid, sheetName, isPublished: false };
  }

  return { sheetId: null, gid, sheetName, isPublished: false };
}

/**
 * Helper to normalize string for column header comparison
 */
function normalizeHeader(h: string): string {
  return (h || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove Vietnamese accents for fuzzy matching
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Maps a column name to a standard BoardGame field
 */
function identifyColumnField(header: string): keyof BoardGame | 'cabinetType' | 'unknown' {
  const norm = normalizeHeader(header);

  if (
    norm.includes('tengame') ||
    norm.includes('ten') ||
    norm === 'name' ||
    norm === 'title' ||
    norm === 'boardgame' ||
    norm === 'game'
  ) {
    return 'name';
  }

  // Check Status column (On Hand / OOS)
  if (
    norm === 'status' ||
    norm.includes('onhand') ||
    norm.includes('oos') ||
    norm.includes('tinhtranghang') ||
    norm.includes('stock') ||
    (norm.includes('trangthai') && !norm.includes('tu') && !norm.includes('loai'))
  ) {
    return 'status';
  }

  if (
    norm.includes('loai') ||
    norm.includes('tu') ||
    norm.includes('phanloai') ||
    norm.includes('realfake') ||
    norm.includes('type') ||
    norm.includes('authentic') ||
    norm.includes('chinhhang') ||
    norm.includes('replica') ||
    norm.includes('replicas') ||
    norm.includes('collection') ||
    norm.includes('fake')
  ) {
    return 'cabinetType';
  }

  if (
    norm.includes('anh') ||
    norm.includes('hinhanh') ||
    norm.includes('image') ||
    norm.includes('img') ||
    norm.includes('photo') ||
    norm.includes('cover') ||
    norm.includes('thumbnail') ||
    norm.includes('linkanh') ||
    norm.includes('picture')
  ) {
    return 'imageUrl';
  }

  if (
    norm.includes('songuoi') ||
    norm.includes('nguoichoi') ||
    norm.includes('players') ||
    norm.includes('playercount') ||
    norm.includes('songuoichoi')
  ) {
    return 'players';
  }

  if (
    norm.includes('thoigian') ||
    norm.includes('thoiluong') ||
    norm.includes('playtime') ||
    norm.includes('duration') ||
    norm.includes('phut') ||
    norm.includes('time')
  ) {
    return 'playtime';
  }

  if (
    norm.includes('theloai') ||
    norm.includes('danhmuc') ||
    norm.includes('category') ||
    norm.includes('genre') ||
    norm.includes('kieu')
  ) {
    return 'category';
  }

  if (
    norm.includes('gia') ||
    norm.includes('giatien') ||
    norm.includes('giamua') ||
    norm.includes('price') ||
    norm.includes('cost') ||
    norm.includes('tientrieu')
  ) {
    return 'price';
  }

  if (
    norm.includes('nhaphathanh') ||
    norm.includes('publisher') ||
    norm.includes('hang') ||
    norm.includes('tacgia') ||
    norm.includes('designer')
  ) {
    return 'publisher';
  }

  if (norm.includes('nam') || norm.includes('year') || norm.includes('phathanh')) {
    return 'year';
  }

  if (
    norm.includes('tinhtrang') ||
    norm.includes('condition') ||
    norm.includes('chatluong') ||
    norm.includes('dohoanthien')
  ) {
    return 'condition';
  }

  if (
    norm.includes('gameplay') ||
    norm.includes('boicanh') ||
    norm.includes('mota') ||
    norm.includes('cotruyen') ||
    norm.includes('noidung') ||
    norm.includes('description') ||
    norm.includes('story') ||
    norm.includes('lore') ||
    norm.includes('gioithieu')
  ) {
    return 'gameplayStory';
  }

  if (
    norm.includes('dauhieu') ||
    norm.includes('ghichu') ||
    norm.includes('notes') ||
    norm.includes('nhanbiet') ||
    norm.includes('chitiet') ||
    norm.includes('lydofake') ||
    norm.includes('authenticnote')
  ) {
    return 'authenticityNotes';
  }

  if (
    norm.includes('danhgia') ||
    norm.includes('rating') ||
    norm.includes('score') ||
    norm.includes('diem')
  ) {
    return 'rating';
  }

  return 'unknown';
}

/**
 * Determines if a value indicates 'real' or 'fake'
 */
export function parseCabinetType(val: string): CabinetType {
  if (!val) return 'real';
  const norm = normalizeHeader(val);
  if (
    norm.includes('fake') ||
    norm.includes('replica') ||
    norm.includes('replicas') ||
    norm.includes('nhai') ||
    norm.includes('f1') ||
    norm.includes('rep') ||
    norm.includes('bootleg') ||
    norm.includes('khongbanquyen') ||
    norm.includes('inlau') ||
    norm.includes('hangfake') ||
    norm.includes('bannhai') ||
    norm.includes('baninloi') ||
    norm.includes('copy') ||
    norm.includes('counterfeit') ||
    norm === '2' ||
    norm === 'f'
  ) {
    return 'fake';
  }
  return 'real';
}

/**
 * Determines inventory status: 'On Hand' or 'OOS'
 */
export function parseStatus(val: string): 'On Hand' | 'OOS' {
  if (!val) return 'On Hand';
  const norm = normalizeHeader(val);
  if (
    norm.includes('oos') ||
    norm.includes('outofstock') ||
    norm.includes('hethang') ||
    norm.includes('soldout') ||
    norm.includes('het') ||
    norm.includes('tamhet') ||
    norm.includes('chayhang') ||
    norm.includes('daban') ||
    norm.includes('khongcosan')
  ) {
    return 'OOS';
  }
  return 'On Hand';
}

/**
 * Parses numeric price from string like "1.250.000 đ", "1250000", "$50"
 */
function parsePrice(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleanStr = String(val).replace(/[^0-9]/g, '');
  return cleanStr ? parseInt(cleanStr, 10) : 0;
}

/**
 * Parses number of players
 */
function parsePlayerCount(val: string): { min: number; max: number; text: string } {
  if (!val) return { min: 2, max: 4, text: '2 - 4 người' };
  const str = String(val).trim();
  const nums = str.match(/\d+/g);
  if (nums && nums.length >= 2) {
    return { min: parseInt(nums[0], 10), max: parseInt(nums[1], 10), text: str };
  } else if (nums && nums.length === 1) {
    const single = parseInt(nums[0], 10);
    return { min: single, max: single, text: `${single} người` };
  }
  return { min: 2, max: 4, text: str };
}

import { getSpreadsheetDetails, fetchSpreadsheetGamesViaApi } from './googleWorkspace';

/**
 * Parse Google Visualization JSON response to BoardGame[]
 */
export function parseGvizResponse(text: string): BoardGame[] {
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) return [];

  const jsonStr = text.substring(jsonStart, jsonEnd + 1);
  const parsed = JSON.parse(jsonStr);

  if (parsed.status === 'error') {
    return [];
  }

  const table = parsed.table;
  if (!table || !table.rows || table.rows.length === 0) {
    return [];
  }

  // Column mapping
  const colMap: Record<number, keyof BoardGame | 'cabinetType' | 'unknown'> = {};
  table.cols.forEach((col: any, idx: number) => {
    const label = col.label || (table.rows[0]?.c?.[idx]?.v ? String(table.rows[0]?.c?.[idx]?.v) : `col_${idx}`);
    colMap[idx] = identifyColumnField(label);
  });

  const hasLabels = table.cols.some((c: any) => c.label && c.label.trim().length > 0);
  const startRow = hasLabels ? 0 : 1;
  const games: BoardGame[] = [];

  for (let r = startRow; r < table.rows.length; r++) {
    const row = table.rows[r];
    if (!row || !row.c) continue;

    let name = '';
    let cabinetType: CabinetType = 'real' as CabinetType;
    let statusRaw = '';
    let status: 'On Hand' | 'OOS' = 'On Hand';
    let imageUrl = '';
    let players = '2 - 4 người';
    let playtime = '30 - 60 phút';
    let category = 'Chiến thuật';
    let price = 500000;
    let publisher = 'Đang cập nhật';
    let year = new Date().getFullYear();
    let condition = 'Mới 99%';
    let gameplayStory = '';
    let authenticityNotes = '';
    let rating = 8.0;
    let hasExplicitRating = false;

    row.c.forEach((cell: any, cIdx: number) => {
      if (!cell || cell.v === null || cell.v === undefined) return;
      const val = String(cell.v).trim();
      const field = colMap[cIdx];

      if (field === 'name') name = val;
      else if (field === 'cabinetType') cabinetType = parseCabinetType(val);
      else if (field === 'status') {
        statusRaw = val;
        status = parseStatus(val);
        // If status column contains fake keywords, set cabinetType to fake
        if (parseCabinetType(val) === 'fake') {
          cabinetType = 'fake';
        }
      } else if (field === 'imageUrl') imageUrl = val;
      else if (field === 'players') players = val;
      else if (field === 'playtime') playtime = val;
      else if (field === 'category') category = val;
      else if (field === 'price') price = parsePrice(val);
      else if (field === 'publisher') publisher = val;
      else if (field === 'year') {
        const y = parseInt(val, 10);
        if (!isNaN(y) && y > 1900 && y < 2050) year = y;
      } else if (field === 'condition') {
        condition = val;
        if (parseCabinetType(val) === 'fake') cabinetType = 'fake';
      } else if (field === 'gameplayStory') gameplayStory = val;
      else if (field === 'authenticityNotes') {
        authenticityNotes = val;
        if (parseCabinetType(val) === 'fake') cabinetType = 'fake';
      } else if (field === 'rating') {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          rating = Math.min(10, Math.max(1, num));
          hasExplicitRating = true;
        }
      }
    });

    if (name) {
      // 1. Cross-field fake detection (name, notes, status, condition)
      const { isMarkedFake } = cleanGameTitleForSearch(name);
      const fakeKeywords = ['fake', 'nhai', 'nhái', 'rep', 'replica', 'f1', 'in lau', 'in lậu', 'bootleg', 'copy', 'bản nhái', 'hàng nhái', 'không bản quyền'];
      const anyFieldFake =
        isMarkedFake ||
        fakeKeywords.some(
          (k) =>
            statusRaw.toLowerCase().includes(k) ||
            condition.toLowerCase().includes(k) ||
            authenticityNotes.toLowerCase().includes(k) ||
            category.toLowerCase().includes(k)
        );

      if (anyFieldFake || cabinetType === 'fake') {
        cabinetType = 'fake';
        if (condition === 'Brand New' || !condition) {
          condition = statusRaw && parseCabinetType(statusRaw) === 'fake' ? statusRaw : 'Replica / Fake Edition';
        }
        if (!authenticityNotes) {
          authenticityNotes = 'Non-official replica / bootleg copy without official publisher copyright.';
        }
      }

      // 2. Look up BoardGameGeek data based on game title
      const bggMatch = findInBggCatalog(name);
      const bggRating = bggMatch?.rating;
      const bggId = bggMatch?.bggId;
      const bggUrl = bggMatch?.bggUrl;

      // Assign verified BGG rating if no explicit score was given in Google Sheet
      const finalRating = hasExplicitRating ? rating : (bggRating ?? rating);

      // Auto-match cover image based on title
      let finalImageUrl = imageUrl;
      if (!finalImageUrl || finalImageUrl.trim().length === 0 || finalImageUrl.includes('Catan-2015-boxart.jpg')) {
        if (bggMatch && bggMatch.imageUrl) {
          finalImageUrl = bggMatch.imageUrl;
        } else {
          finalImageUrl = getFallbackImage(name, cabinetType);
        }
      }

      const { min, max } = parsePlayerCount(players);
      const color = cabinetType === 'real' ? '#0f766e' : '#b45309';

      games.push({
        id: `sheet-${r}-${Date.now().toString(36)}`,
        name,
        cabinetType,
        status,
        imageUrl: finalImageUrl,
        players: players || (bggMatch ? `${bggMatch.minPlayers} - ${bggMatch.maxPlayers} người` : `${min} - ${max} người`),
        minPlayers: bggMatch?.minPlayers || min,
        maxPlayers: bggMatch?.maxPlayers || max,
        playtime: playtime || (bggMatch ? `${bggMatch.playtimeMinutes} phút` : '45 phút'),
        playtimeMinutes: bggMatch?.playtimeMinutes || parseInt(playtime, 10) || 45,
        category: category || bggMatch?.category || 'Chiến thuật',
        price: price || (cabinetType === 'real' ? 850000 : 120000),
        publisher: publisher && publisher !== 'Đang cập nhật' ? publisher : (bggMatch?.publisher || 'Chưa rõ'),
        year: year || bggMatch?.year || 2023,
        condition: condition || (cabinetType === 'real' ? 'Mới nguyên seal' : 'Bản Fake / Replica'),
        gameplayStory:
          gameplayStory ||
          `Trò chơi ${name} thuộc thể loại ${category || bggMatch?.category || 'chiến thuật'}, với lối chơi kịch tính và chiều sâu hấp dẫn.`,
        authenticityNotes:
          authenticityNotes ||
          (cabinetType === 'real'
            ? 'Sản phẩm chính hãng với tem kiểm định, chất liệu cao cấp.'
            : 'Dấu hiệu: Bản replica / in lậu không có bản quyền chính thức.'),
        boxColor: color,
        rating: finalRating,
        bggRating,
        bggId,
        bggUrl,
        addedDate: new Date().toISOString().split('T')[0],
      });
    }
  }

  return games;
}

/**
 * Fetch and parse data from Google Sheet using Google Sheets API (if authenticated) or Visualization API (gviz)
 */
export async function fetchFromGoogleSheet(
  url: string,
  accessToken?: string | null,
  customSheetName?: string
): Promise<SheetParseResult> {
  const { sheetId, gid, sheetName, isPublished } = parseGoogleSheetUrl(url);

  // If user is running with the demo URL or empty ID, gracefully return sample games
  if (!sheetId || sheetId.includes('demo') || url.includes('demo')) {
    return {
      success: true,
      games: INITIAL_BOARDGAMES,
      sourceType: 'sample',
      rowCount: INITIAL_BOARDGAMES.length,
    };
  }

  const targetTab = customSheetName || sheetName || 'Boardgame Collection';

  // 1. If user is authenticated with Google OAuth token, use the official Google Sheets API
  if (accessToken && !isPublished) {
    try {
      const details = await getSpreadsheetDetails(sheetId, accessToken);
      const matchTab = details.sheets.find(
        (s) =>
          normalizeHeader(s.title) === normalizeHeader(targetTab) ||
          normalizeHeader(s.title).includes('boardgame')
      );
      const tabName = matchTab?.title || details.sheets[0]?.title || targetTab;
      const { games } = await fetchSpreadsheetGamesViaApi(sheetId, tabName, accessToken);
      if (games && games.length > 0) {
        return {
          success: true,
          games,
          sourceType: 'gviz',
          rowCount: games.length,
        };
      }
    } catch (apiErr: any) {
      console.warn('Authenticated Sheets API call failed, falling back to public methods:', apiErr);
    }
  }

  // 2. If it's a published web link (/spreadsheets/d/e/...)
  if (isPublished) {
    const pubUrls = [
      `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=csv${gid !== '0' ? `&gid=${gid}` : ''}`,
      `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=csv`,
    ];
    for (const pubUrl of pubUrls) {
      try {
        const pubRes = await fetch(pubUrl);
        if (pubRes.ok) {
          const csvText = await pubRes.text();
          const games = parseCsvToGames(csvText);
          if (games.length > 0) {
            return {
              success: true,
              games,
              sourceType: 'csv',
              rowCount: games.length,
            };
          }
        }
      } catch (e) {
        // continue to next
      }
    }
  }

  // 3. Multi-strategy waterfall for standard public sheets
  const candidateUrls: { url: string; type: 'gviz' | 'csv' }[] = [
    // A: gviz with target sheet tab name
    { url: `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(targetTab)}`, type: 'gviz' },
    // B: gviz with gid
    { url: `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`, type: 'gviz' },
    // C: gviz without sheet or gid (default sheet)
    { url: `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`, type: 'gviz' },
    // D: CSV export by sheet name
    { url: `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(targetTab)}`, type: 'csv' },
    // E: CSV export by gid
    { url: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`, type: 'csv' },
    // F: CSV export default
    { url: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`, type: 'csv' },
  ];

  let lastStatus = 0;

  for (const candidate of candidateUrls) {
    try {
      const res = await fetch(candidate.url, { headers: { Accept: 'text/plain,application/json,*/*' } });
      if (!res.ok) {
        lastStatus = res.status;
        continue;
      }
      const text = await res.text();
      if (!text || text.trim().length === 0) continue;

      if (candidate.type === 'gviz') {
        if (text.includes('"status":"error"')) continue;
        const parsedGames = parseGvizResponse(text);
        if (parsedGames.length > 0) {
          return {
            success: true,
            games: parsedGames,
            sourceType: 'gviz',
            rowCount: parsedGames.length,
          };
        }
      } else {
        const parsedGames = parseCsvToGames(text);
        if (parsedGames.length > 0) {
          return {
            success: true,
            games: parsedGames,
            sourceType: 'csv',
            rowCount: parsedGames.length,
          };
        }
      }
    } catch {
      continue;
    }
  }

  // If all strategies failed, provide descriptive guidance based on HTTP status
  if (lastStatus === 404) {
    throw new Error(
      'Không tìm thấy Google Sheet (HTTP 404). Vui lòng kiểm tra lại link Google Sheet và quyền truy cập (Chia sẻ -> Bất kỳ ai có liên kết -> Người xem). Nếu sheet thuộc tài khoản riêng tư, hãy bấm Đăng nhập Google để đồng bộ qua Google Drive.'
    );
  } else if (lastStatus === 403 || lastStatus === 401) {
    throw new Error(
      'Google Sheet bị giới hạn quyền riêng tư (HTTP 403). Vui lòng mở quyền Chia sẻ: "Bất kỳ ai có đường liên kết đều có thể xem", hoặc Đăng nhập Google để đồng bộ tự động.'
    );
  }

  throw new Error(
    'Không thể đọc dữ liệu từ liên kết Google Sheet này. Vui lòng đảm bảo Sheet đã mở quyền "Bất kỳ ai có liên kết đều có thể xem", hoặc nhập/tải file CSV trực tiếp.'
  );
}

/**
 * RFC-compliant CSV line parser handling quotes, commas, and newlines
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Parses raw CSV text into BoardGame array
 */
export function parseCsvToGames(csvText: string): BoardGame[] {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0];
  const colMap: Record<number, keyof BoardGame | 'cabinetType' | 'unknown'> = {};
  headers.forEach((h, idx) => {
    colMap[idx] = identifyColumnField(h);
  });

  const games: BoardGame[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    let name = '';
    let cabinetType: CabinetType = 'real' as CabinetType;
    let statusRaw = '';
    let status: 'On Hand' | 'OOS' = 'On Hand';
    let imageUrl = '';
    let players = '2 - 4 người';
    let playtime = '45 phút';
    let category = 'Chiến thuật';
    let price = 500000;
    let publisher = 'Chưa rõ';
    let year = 2023;
    let condition = 'Mới 99%';
    let gameplayStory = '';
    let authenticityNotes = '';
    let rating = 8.0;
    let hasExplicitRating = false;

    row.forEach((val, cIdx) => {
      const field = colMap[cIdx];
      if (!val) return;
      if (field === 'name') name = val;
      else if (field === 'cabinetType') cabinetType = parseCabinetType(val);
      else if (field === 'status') {
        statusRaw = val;
        status = parseStatus(val);
        if (parseCabinetType(val) === 'fake') {
          cabinetType = 'fake';
        }
      } else if (field === 'imageUrl') imageUrl = val;
      else if (field === 'players') players = val;
      else if (field === 'playtime') playtime = val;
      else if (field === 'category') category = val;
      else if (field === 'price') price = parsePrice(val);
      else if (field === 'publisher') publisher = val;
      else if (field === 'year') {
        const y = parseInt(val, 10);
        if (!isNaN(y)) year = y;
      } else if (field === 'condition') {
        condition = val;
        if (parseCabinetType(val) === 'fake') cabinetType = 'fake';
      } else if (field === 'gameplayStory') gameplayStory = val;
      else if (field === 'authenticityNotes') {
        authenticityNotes = val;
        if (parseCabinetType(val) === 'fake') cabinetType = 'fake';
      } else if (field === 'rating') {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          rating = num;
          hasExplicitRating = true;
        }
      }
    });

    if (name) {
      // 1. Cross-field fake detection (name, notes, status, condition)
      const { isMarkedFake } = cleanGameTitleForSearch(name);
      const fakeKeywords = ['fake', 'nhai', 'nhái', 'rep', 'replica', 'f1', 'in lau', 'in lậu', 'bootleg', 'copy', 'bản nhái', 'hàng nhái', 'không bản quyền'];
      const anyFieldFake =
        isMarkedFake ||
        fakeKeywords.some(
          (k) =>
            statusRaw.toLowerCase().includes(k) ||
            condition.toLowerCase().includes(k) ||
            authenticityNotes.toLowerCase().includes(k) ||
            category.toLowerCase().includes(k)
        );

      if (anyFieldFake || cabinetType === 'fake') {
        cabinetType = 'fake';
        if (condition === 'Brand New' || !condition) {
          condition = statusRaw && parseCabinetType(statusRaw) === 'fake' ? statusRaw : 'Replica / Fake Edition';
        }
        if (!authenticityNotes) {
          authenticityNotes = 'Non-official replica / bootleg copy without official publisher copyright.';
        }
      }

      // 2. Look up BoardGameGeek data based on game title
      const bggMatch = findInBggCatalog(name);
      const bggRating = bggMatch?.rating;
      const bggId = bggMatch?.bggId;
      const bggUrl = bggMatch?.bggUrl;

      // Assign verified BGG rating if no explicit score was given in Google Sheet
      const finalRating = hasExplicitRating ? rating : (bggRating ?? rating);

      // Auto-match cover image based on title
      let finalImageUrl = imageUrl;
      if (!finalImageUrl || finalImageUrl.trim().length === 0 || finalImageUrl.includes('Catan-2015-boxart.jpg')) {
        if (bggMatch && bggMatch.imageUrl) {
          finalImageUrl = bggMatch.imageUrl;
        } else {
          finalImageUrl = getFallbackImage(name, cabinetType);
        }
      }

      const { min, max } = parsePlayerCount(players);
      games.push({
        id: `csv-${r}-${Date.now().toString(36)}`,
        name,
        cabinetType,
        status,
        imageUrl: finalImageUrl,
        players: players || (bggMatch ? `${bggMatch.minPlayers} - ${bggMatch.maxPlayers} người` : `${min} - ${max} người`),
        minPlayers: bggMatch?.minPlayers || min,
        maxPlayers: bggMatch?.maxPlayers || max,
        playtime: playtime || (bggMatch ? `${bggMatch.playtimeMinutes} phút` : '45 phút'),
        playtimeMinutes: bggMatch?.playtimeMinutes || parseInt(playtime, 10) || 45,
        category: category || bggMatch?.category || 'Chiến thuật',
        price: price || (cabinetType === 'real' ? 850000 : 120000),
        publisher: publisher && publisher !== 'Chưa rõ' ? publisher : (bggMatch?.publisher || 'Chưa rõ'),
        year: year || bggMatch?.year || 2023,
        condition: condition || (cabinetType === 'real' ? 'Mới nguyên seal' : 'Bản Fake / Replica'),
        gameplayStory:
          gameplayStory ||
          `Trò chơi ${name} thuộc thể loại ${category || bggMatch?.category || 'chiến thuật'}, với lối chơi kịch tính và chiều sâu hấp dẫn.`,
        authenticityNotes:
          authenticityNotes ||
          (cabinetType === 'real'
            ? 'Sản phẩm chính hãng với tem kiểm định, chất liệu cao cấp.'
            : 'Dấu hiệu: Bản replica / in lậu không có bản quyền chính thức.'),
        boxColor: cabinetType === 'real' ? '#0f766e' : '#991b1b',
        rating: finalRating,
        bggRating,
        bggId,
        bggUrl,
        addedDate: new Date().toISOString().split('T')[0],
      });
    }
  }

  return games;
}

/**
 * Return a visually matching curated game cover image based on title
 */
export function getFallbackImage(title: string, type: CabinetType): string {
  // 1. First check our extensive BGG catalog
  const bgg = findInBggCatalog(title);
  if (bgg && bgg.imageUrl) {
    return bgg.imageUrl;
  }

  // 2. Generate a custom tailored SVG cover art based on title
  return getGenerativeBoardGameBoxArt(title);
}

/**
 * Generates sample CSV template for users to copy/paste directly into Google Sheets
 */
export function generateSampleCsvContent(): string {
  const headers = [
    'Tên game',
    'Tủ (Real Collection / Replicas & Fake)',
    'Trạng thái (On Hand / OOS)',
    'Hình ảnh (URL)',
    'Số người chơi',
    'Thời gian chơi',
    'Thể loại',
    'Giá tiền (VND)',
    'Nhà phát hành',
    'Năm phát hành',
    'Tình trạng',
    'Dấu hiệu nhận biết / Ghi chú',
    'Đánh giá',
  ];

  const sampleRows = [
    [
      'Catan (Settlers of Catan)',
      'Real Collection',
      'On Hand',
      'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=800&q=80',
      '3 - 4 người',
      '75 phút',
      'Chiến thuật / Giao thương',
      '1250000',
      'KOSMOS',
      '1995',
      'Mới nguyên seal',
      'Hộp nén dày dặn ép vân linen, quân gỗ mịn màng, thẻ lõi đen chống soi',
      '8.8',
    ],
    [
      'Catan (Bản Nhái Trung Quốc)',
      'Replicas & Fake',
      'On Hand',
      'https://images.unsplash.com/photo-1585503418537-88331351ad99?auto=format&fit=crop&w=800&q=80',
      '3 - 4 người',
      '75 phút',
      'Chiến thuật / Giao thương',
      '180000',
      'Hàng xưởng không tên',
      '2023',
      'Bản in lỗi',
      'Dấu hiệu fake: Hộp carton mỏng ọp ẹp, quân gỗ méo có dăm gai, thẻ mỏng dễ gãy gập',
      '4.2',
    ],
    [
      'Splendor',
      'Real Collection',
      'On Hand',
      'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
      '2 - 4 người',
      '30 phút',
      'Xây dựng engine',
      '950000',
      'Space Cowboys',
      '2014',
      'Likenew 99%',
      'Chip đá quý có lõi kim loại nặng 13.5g đầm tay, chữ in laser sắc nét',
      '8.5',
    ],
    [
      'Splendor (Token Nhựa Rỗng)',
      'Replicas & Fake',
      'OOS',
      'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?auto=format&fit=crop&w=800&q=80',
      '2 - 4 người',
      '30 phút',
      'Xây dựng engine',
      '135000',
      'Shopee F1',
      '2022',
      'Đã chơi vài lần',
      'Dấu hiệu fake: Chip nhựa rỗng siêu nhẹ chỉ 4.5g, thẻ bài trơn bóng không cán màng UV',
      '5.0',
    ],
    [
      'The Resistance: Avalon',
      'Real Collection',
      'On Hand',
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
      '5 - 10 người',
      '30 phút',
      'Ẩn vai / Suy luận',
      '480000',
      'Indie Boards & Cards',
      '2012',
      'Mới 99%',
      'Lưng thẻ bài đồng màu tuyệt đối, bìa thẻ nhân vật dày 2mm',
      '8.9',
    ],
    [
      'The Resistance: Avalon (Bản In Lỗi)',
      'Replicas & Fake',
      'OOS',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
      '5 - 10 người',
      '30 phút',
      'Ẩn vai / Suy luận',
      '49000',
      'In lậu',
      '2021',
      'Hộp cũ xước',
      'Dấu hiệu fake: Lưng lá bài Merlin lệch tone màu xanh, lộ vai trò ngay khi chia bài',
      '3.8',
    ],
  ];

  const escapeCell = (cell: string) => {
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  };

  return [
    headers.map(escapeCell).join(','),
    ...sampleRows.map((r) => r.map(escapeCell).join(',')),
  ].join('\n');
}

/**
 * Exports current games collection to downloadable CSV string
 */
export function exportGamesToCsv(games: BoardGame[]): string {
  const headers = [
    'Tên game',
    'Tủ (Real Collection / Replicas & Fake)',
    'Trạng thái (On Hand / OOS)',
    'Hình ảnh (URL)',
    'Số người chơi',
    'Thời gian',
    'Thể loại',
    'Giá (VND)',
    'Nhà phát hành',
    'Năm',
    'Tình trạng',
    'Ghi chú / Dấu hiệu nhận biết',
    'Đánh giá',
  ];

  const escapeCell = (cell: any) => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = games.map((g) => [
    escapeCell(g.name),
    escapeCell(g.cabinetType === 'real' ? 'Real Collection' : 'Replicas & Fake'),
    escapeCell(g.status || 'On Hand'),
    escapeCell(g.imageUrl),
    escapeCell(g.players),
    escapeCell(g.playtime),
    escapeCell(g.category),
    escapeCell(g.price),
    escapeCell(g.publisher),
    escapeCell(g.year),
    escapeCell(g.condition),
    escapeCell(g.authenticityNotes),
    escapeCell(g.rating),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
